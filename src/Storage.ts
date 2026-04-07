import * as RNFS from "@dr.pogodin/react-native-fs";
import { LogEntry, logEntryToJson } from "./LogEntry";
import { Debug } from "./Debug";

const PEAVY_DIR = ".peavy";
const CURRENT_FILE = "current";
const MAX_FILE_SIZE = 1024 * 1024; // 1 MB
const FLUSH_INTERVAL_MS = 2_000;

export class Storage {
  private buffer: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private baseDir: string;
  private ready: boolean = false;
  private initPromise: Promise<void>;

  constructor() {
    this.baseDir = `${RNFS.CachesDirectoryPath}/${PEAVY_DIR}`;
    this.initPromise = this.initDiskStorage();

    this.flushTimer = setInterval(() => {
      this.flushBufferToDisk();
    }, FLUSH_INTERVAL_MS);
  }

  private async initDiskStorage(): Promise<void> {
    try {
      const exists = await RNFS.exists(this.baseDir);
      if (!exists) {
        await RNFS.mkdir(this.baseDir);
      }
      this.ready = true;
      Debug.log(`Disk storage initialized at ${this.baseDir}`);
    } catch (e) {
      Debug.warn("Failed to init disk storage", e as Error);
      throw e;
    }
  }

  private async ensureReady(): Promise<void> {
    if (!this.ready) {
      await this.initPromise;
    }
  }

  storeEntry(entry: LogEntry): void {
    this.buffer.push(entry);
    Debug.log(`Stored entry (${this.buffer.length} total)`);
  }

  /**
   * Drains the in-memory buffer to the current NDJSON file on disk.
   */
  async flushBufferToDisk(): Promise<void> {
    if (this.buffer.length === 0) return;
    await this.ensureReady();

    const entries = this.buffer.splice(0, this.buffer.length);
    const ndjson = entries
      .map((entry) => JSON.stringify(logEntryToJson(entry)))
      .join("\n") + "\n";

    try {
      const currentPath = `${this.baseDir}/${CURRENT_FILE}`;
      await RNFS.appendFile(currentPath, ndjson, "utf8");
      Debug.log(`Flushed ${entries.length} entries to disk`);
    } catch (e) {
      // Put entries back on failure so they aren't lost
      this.buffer.unshift(...entries);
      Debug.warn("Failed to flush to disk", e as Error);
    }
  }

  /**
   * Roll the current file into a timestamped ended file so it can be
   * iterated and sent by Push. Only called when there's data.
   */
  async rollCurrentFile(): Promise<void> {
    await this.ensureReady();

    const currentPath = `${this.baseDir}/${CURRENT_FILE}`;
    try {
      const exists = await RNFS.exists(currentPath);
      if (!exists) return;

      const stat = await RNFS.stat(currentPath);
      if (Number(stat.size) === 0) return;

      const endedPath = `${this.baseDir}/${Date.now()}`;
      await RNFS.moveFile(currentPath, endedPath);
      Debug.log(`Rolled current file to ${endedPath}`);
    } catch (e) {
      Debug.warn("Failed to roll current file", e as Error);
    }
  }

  /**
   * Returns an array of paths to ended (rolled) files,
   * sorted oldest first, ready to be sent and deleted.
   */
  async getEndedFiles(): Promise<string[]> {
    await this.ensureReady();

    try {
      const files = await RNFS.readDir(this.baseDir);
      return files
        .filter((f) => f.name !== CURRENT_FILE && f.isFile())
        .sort((a, b) => Number(a.name) - Number(b.name))
        .map((f) => f.path);
    } catch (e) {
      Debug.warn("Failed to list ended files", e as Error);
      return [];
    }
  }

  /**
   * Read the contents of a file and delete it.
   * Returns the raw NDJSON string (already serialized).
   */
  async readAndDelete(filePath: string): Promise<string | null> {
    try {
      const content = await RNFS.readFile(filePath, "utf8");
      await RNFS.unlink(filePath);
      return content;
    } catch (e) {
      Debug.warn("Failed to read/delete file", e as Error);
      return null;
    }
  }

  /**
   * Check if the current file exceeds the max size and should be rolled.
   */
  async shouldRoll(): Promise<boolean> {
    await this.ensureReady();
    try {
      const currentPath = `${this.baseDir}/${CURRENT_FILE}`;
      const exists = await RNFS.exists(currentPath);
      if (!exists) return false;
      const stat = await RNFS.stat(currentPath);
      return Number(stat.size) > MAX_FILE_SIZE;
    } catch {
      return false;
    }
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
