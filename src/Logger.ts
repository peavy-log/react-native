import { PeavyOptions } from "./options/PeavyOptions";
import { Storage } from "./Storage";
import { LogEntry, LogEntryBuilder } from "./LogEntry";
import { LogLevel, logLevelToString } from "./constants/LogLevel";
import { VerbosityException } from "./exceptions/VerbosityException";
import { Debug } from "./Debug";
import { Device } from "./Device";

const PEAVY_VERSION = '1.0.0';

export class Logger {
  meta: Record<string, string | number | boolean> = {};
  private logLabels: Record<string, string | number | boolean> = {};
  private evLabels: Record<string, string | number | boolean> = {};

  constructor(public options: PeavyOptions, private storage: Storage) {
    this.generateGlobalLabels();
    this.resetSessionId();
  }

  log(builder: LogEntryBuilder | ((b: LogEntryBuilder) => void)): void {
    let builderObj: LogEntryBuilder;

    if (typeof builder === "function") {
      builderObj = {};
      builder(builderObj);
    } else {
      builderObj = builder;
    }

    const entry = this.buildEntry(builderObj);
    if (!entry) return;

    this.storage.storeEntry(entry);

    if (this.options.printToConsole) {
      this.logToConsole(entry);
    }
  }

  buildEntry(builder: LogEntryBuilder): LogEntry | null {
    try {
      const level = builder.level !== undefined ? builder.level : null;
      const minimumLevel = this.options.logLevel || LogLevel.Info;

      if (level === null || level < minimumLevel) {
        throw new VerbosityException(level, minimumLevel);
      }

      if (builder.error && !(builder.error instanceof Error)) {
        builder.error = new Error(String(builder.error));
      }

      const entry: LogEntry = {
        timestamp: new Date(),
        level,
        message: builder.message || "",
        error: builder.error as Error | undefined,
        json: builder.json,
        labels: {},
      };

      if (builder.json && builder.json["__peavy_type"] === "event") {
        Object.assign(entry.labels, this.evLabels);
      } else {
        Object.assign(entry.labels, this.logLabels);
      }

      Object.assign(entry.labels, this.meta);

      return entry;
    } catch (error) {
      if (error instanceof VerbosityException) {
        Debug.log(
          `Discarded log line with level ${
            error.level !== null ? logLevelToString(error.level) : "null"
          } due to verbosity level (${logLevelToString(error.minimum)})`
        );
        return null;
      }
      throw error;
    }
  }

  private logToConsole(entry: LogEntry): void {
    if (entry.json?.__peavy_type === "event") return;
    let message = entry.message;
    if (!message) message = "<no message>";

    switch (entry.level) {
      case LogLevel.Trace:
      case LogLevel.Debug:
        console.debug(message, entry.error ?? entry.json);
        break;
      case LogLevel.Info:
        console.info(message, entry.error ?? entry.json);
        break;
      case LogLevel.Warning:
        console.warn(message, entry.error ?? entry.json);
        break;
      case LogLevel.Error:
        console.error(message, entry.error ?? entry.json);
        break;
    }
  }

  private generateGlobalLabels(): void {
    const deviceInfo = Device.getInfo();

    this.logLabels = {
      "peavy-version": PEAVY_VERSION,
      platform: deviceInfo.platform,
      "platform-version": deviceInfo.platformVersion,
      "app-id": deviceInfo.appId,
      "device-model": deviceInfo.deviceModel,
      "device-language": deviceInfo.deviceLanguage,
      "device-screen-w": deviceInfo.screenWidth,
      "device-screen-h": deviceInfo.screenHeight,
      "app-version": deviceInfo.appVersion.name,
    };

    if (deviceInfo.appVersion.code) {
      this.logLabels["app-version-code"] = deviceInfo.appVersion.code;
    }

    this.evLabels = {
      platform: deviceInfo.platform,
      "app-id": deviceInfo.appId,
    };

    if (deviceInfo.appVersion.code) {
      this.evLabels["app-version-code"] = deviceInfo.appVersion.code;
    }
  }

  private resetSessionId(): void {
    const id = "xxxxxxxxxxxxxxxxxxxxxxxx".replace(/x/g, () =>
      ((Math.random() * 16) | 0).toString(16)
    );
    Debug.log(`Reset session id to ${id}`);
    this.logLabels["session-id"] = id;
    this.evLabels["session-id"] = id;
  }
}
