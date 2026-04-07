import { ErrorUtils } from "react-native";
import * as RNFS from "@dr.pogodin/react-native-fs";
import { PeavyOptions, DEFAULT_OPTIONS } from "./options/PeavyOptions";
import { Logger } from "./Logger";
import { Storage } from "./Storage";
import { Push } from "./Push";
import { LogLevel } from "./constants/LogLevel";
import { LogEntryBuilder } from "./LogEntry";
import { Debug } from "./Debug";
import { EventType } from "./constants/EventType";
import { EventResult } from "./constants/EventResult";
import { EventStateReporter } from "./EventStateReporter";

const META_PATH = `${RNFS.CachesDirectoryPath}/.peavy/meta.json`;

class PeavyInstance {
  private logger!: Logger;
  private push!: Push;
  private stateReporter!: EventStateReporter;
  private meta: Record<string, any> = {};
  private previousErrorHandler:
    | ((error: Error, isFatal?: boolean) => void)
    | null = null;

  isInitialized: boolean = false;

  init(options: PeavyOptions): void {
    const fullOptions: PeavyOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    Debug.enabled = !!fullOptions.debug;

    const storage = new Storage();
    this.logger = new Logger(fullOptions, storage);
    this.push = new Push(fullOptions, storage);
    this.stateReporter = new EventStateReporter(this);

    Debug.setDependencies(this.logger, this.push);

    if (fullOptions.attachUncaughtHandler) {
      this.attachUncaughtHandler();
    }

    this.restoreMeta();
    this.isInitialized = true;

    this.stateReporter.sendState();
  }

  setOptions(options: Partial<PeavyOptions>): void {
    if (!this.isInitialized) {
      console.warn("Peavy is not initialized. Call Peavy.init() first.");
      return;
    }

    if (options.endpoint !== undefined) {
      this.push.options.endpoint = options.endpoint;
    }
    if (options.logLevel !== undefined) {
      this.logger.options.logLevel = options.logLevel;
    }
    if (options.pushInterval !== undefined) {
      this.push.options.pushInterval = options.pushInterval;
    }
  }

  clearMeta(): void {
    if (!this.isInitialized) {
      console.warn("Peavy is not initialized. Call Peavy.init() first.");
      return;
    }

    this.logger.meta = {};
    this.meta = {};
    RNFS.unlink(META_PATH).catch(() => {});
  }

  setMeta(metas: Record<string, any>): void {
    if (!this.isInitialized) {
      console.warn("Peavy is not initialized. Call Peavy.init() first.");
      return;
    }

    for (const [key, value] of Object.entries(metas)) {
      if (value === null || value === undefined) {
        delete this.logger.meta[key];
        delete this.meta[key];
      } else {
        this.logger.meta[key] = value;
        this.meta[key] = value;
      }
    }
    this.saveMeta();
  }

  private saveMeta(): void {
    RNFS.writeFile(META_PATH, JSON.stringify(this.meta), "utf8").catch(
      (error: Error) => {
        Debug.warn("Failed to save meta", error);
      }
    );
  }

  private restoreMeta(): void {
    RNFS.readFile(META_PATH, "utf8")
      .then((saved: string) => {
        if (saved) {
          this.meta = JSON.parse(saved);
          Object.assign(this.logger.meta, this.meta);
        }
      })
      .catch(() => {
        // File doesn't exist yet — no meta to restore
      });
  }

  private attachUncaughtHandler(): void {
    this.previousErrorHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      const message = isFatal ? "Fatal exception" : "Uncaught exception";
      this.e(message, error);
      this.push.prepareAndPush();

      // Forward to the previous handler
      if (this.previousErrorHandler) {
        this.previousErrorHandler(error, isFatal);
      }
    });
  }

  log(builder: LogEntryBuilder | ((b: LogEntryBuilder) => void)): void {
    if (!this.isInitialized) {
      console.warn("Peavy is not initialized. Call Peavy.init() first.");
      return;
    }
    this.logger.log(builder);
  }

  private _log(
    level: LogLevel,
    message: string,
    errorOrObj?: Record<string, any> | Error | unknown
  ): void {
    if (!this.isInitialized) {
      console.warn("Peavy is not initialized. Call Peavy.init() first.");
      return;
    }

    let error =
      errorOrObj && errorOrObj instanceof Error ? errorOrObj : undefined;
    let json: Record<string, any> | undefined = undefined;
    if (!error && errorOrObj) {
      json = errorOrObj as Record<string, any>;
    }
    if (json && json["error"]) {
      error = json["error"];
      delete json["error"];
    }

    this.logger.log({
      level,
      message,
      error,
      json,
    });
  }

  t(message: string, error?: Error | unknown): void;
  t(message: string, obj: Record<string, any>): void;
  t(
    message: string,
    errorOrObj?: Record<string, any> | Error | unknown
  ): void {
    this._log(LogLevel.Trace, message, errorOrObj);
  }

  d(message: string, error?: Error | unknown): void;
  d(message: string, obj: Record<string, any>): void;
  d(
    message: string,
    errorOrObj?: Record<string, any> | Error | unknown
  ): void {
    this._log(LogLevel.Debug, message, errorOrObj);
  }

  i(message: string, error?: Error | unknown): void;
  i(message: string, obj: Record<string, any>): void;
  i(
    message: string,
    errorOrObj?: Record<string, any> | Error | unknown
  ): void {
    this._log(LogLevel.Info, message, errorOrObj);
  }

  w(message: string, error?: Error | unknown): void;
  w(message: string, obj: Record<string, any>): void;
  w(
    message: string,
    errorOrObj?: Record<string, any> | Error | unknown
  ): void {
    this._log(LogLevel.Warning, message, errorOrObj);
  }

  e(message: string, error?: Error | unknown): void;
  e(message: string, obj: Record<string, any>): void;
  e(
    message: string,
    errorOrObj?: Record<string, any> | Error | unknown
  ): void {
    this._log(LogLevel.Error, message, errorOrObj);
  }

  ev(
    type: EventType,
    category: string,
    name: string,
    ident: string | number | boolean = "",
    durationMs: number = 0,
    result: EventResult = EventResult.Success
  ): void {
    if (!this.isInitialized) {
      console.warn("Peavy is not initialized. Call Peavy.init() first.");
      return;
    }

    this.logger.log({
      level: LogLevel.Info,
      json: {
        __peavy_type: "event",
        message: "",
        type,
        category,
        name,
        ident: String(ident),
        duration: durationMs,
        result,
      },
    });
  }

  action(category: string, name: string): void;
  action(
    category: string,
    name: string,
    ident: string | number | boolean
  ): void;
  action(category: string, name: string, result: EventResult): void;
  action(
    category: string,
    name: string,
    durationMs: number,
    result: EventResult
  ): void;
  action(
    category: string,
    name: string,
    identDurationResult: string | number | boolean | EventResult = "",
    result: EventResult | undefined = undefined
  ): void {
    let ident: string | number | boolean = "";
    let durationMs: number = 0;
    if (result) {
      durationMs =
        typeof identDurationResult === "number" ? identDurationResult : 0;
    } else if (identDurationResult) {
      if (
        typeof identDurationResult === "string" &&
        [
          EventResult.Success,
          EventResult.Failure,
          EventResult.Timeout,
          EventResult.Cancelled,
        ].includes(identDurationResult as EventResult)
      ) {
        result = identDurationResult as EventResult;
      } else {
        ident = identDurationResult;
      }
    }

    this.ev(EventType.Action, category, name, ident, durationMs, result);
  }

  state(name: string, ident: string | number | boolean = ""): void {
    this.ev(EventType.State, "device", name, ident);
  }
}

export const Peavy = new PeavyInstance();
export type Peavy = PeavyInstance;
