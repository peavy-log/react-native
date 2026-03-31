import { AppState, AppStateStatus } from "react-native";
import pako from "pako";
import { PeavyOptions } from "./options/PeavyOptions";
import { Storage } from "./Storage";
import { Debug } from "./Debug";

const MAX_CONSECUTIVE_FAILURES = 3;

export class Push {
  private pushTimer: ReturnType<typeof setInterval> | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private pushing: boolean = false;

  constructor(public options: PeavyOptions, private storage: Storage) {
    this.flushPeriodically();
  }

  private flushPeriodically(): void {
    const interval = this.options.pushInterval || 15000;
    this.pushTimer = setInterval(() => {
      this.prepareAndPush();
    }, interval);

    this.appStateSubscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "background" || nextState === "inactive") {
          this.prepareAndPush();
        }
      }
    );
  }

  async prepareAndPush(): Promise<void> {
    if (this.pushing) return;
    this.pushing = true;
    try {
      // 1. Drain in-memory buffer to disk
      await this.storage.flushBufferToDisk();

      // 2. Roll current file if it has content
      await this.storage.rollCurrentFile();

      // 3. Also roll if current exceeds max size
      if (await this.storage.shouldRoll()) {
        await this.storage.rollCurrentFile();
      }

      // 4. Send each ended file, oldest first
      const files = await this.storage.getEndedFiles();
      let failures = 0;

      for (const filePath of files) {
        if (failures >= MAX_CONSECUTIVE_FAILURES) {
          Debug.log(`Stopping push after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`);
          break;
        }

        const ndjson = await this.storage.readAndDelete(filePath);
        if (!ndjson) {
          failures++;
          continue;
        }

        const success = await this.pushNdjson(ndjson);
        if (success) {
          failures = 0;
        } else {
          failures++;
        }
      }
    } finally {
      this.pushing = false;
    }
  }

  private async pushNdjson(ndjson: string): Promise<boolean> {
    Debug.log(`Pushing ${ndjson.length} bytes`);

    try {
      const compressed = pako.gzip(ndjson);
      Debug.log(
        `Compressed to ${compressed.length} bytes (${(
          (compressed.length / ndjson.length) *
          100
        ).toFixed(1)}% of original)`
      );

      const response = await fetch(this.options.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/ndjson",
          "Content-Encoding": "gzip",
        },
        body: compressed,
      });

      if (response.ok) {
        Debug.log("Successfully sent entries");
        return true;
      } else {
        Debug.log(`Push failed with status ${response.status}`);
        return false;
      }
    } catch (error) {
      Debug.warnSome("Error pushing", error as Error);
      return false;
    }
  }

  destroy(): void {
    if (this.pushTimer) {
      clearInterval(this.pushTimer);
      this.pushTimer = null;
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}
