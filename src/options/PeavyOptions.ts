import { LogLevel } from '../constants/LogLevel';

export interface AppVersion {
  name: string;
  code?: number;
}

export interface PeavyOptions {
  /**
   * The remote endpoint to push logs to.
   * Should be a full URL.
   */
  endpoint: string;

  /**
   * Minimum log level to process.
   *
   * Default: LogLevel.Info
   */
  logLevel?: LogLevel;

  /**
   * Enable Peavy to also print the log line to console.
   *
   * Default: false
   */
  printToConsole?: boolean;

  /**
   * Whether to enable library debug mode.
   * This enables logging (to console only) of local Peavy actions.
   *
   * Default: false
   */
  debug?: boolean;

  /**
   * How often to flush buffered logs to server (in milliseconds).
   * Logs are cached in-memory and sent once every pushInterval.
   *
   * Default: 15000 (15 seconds)
   */
  pushInterval?: number;

  /**
   * Attach a handler for uncaught exceptions to immediately send logs.
   *
   * Default: true
   */
  attachUncaughtHandler?: boolean;
}

export const DEFAULT_OPTIONS: Required<Omit<PeavyOptions, 'endpoint'>> = {
  logLevel: LogLevel.Info,
  printToConsole: false,
  debug: false,
  pushInterval: 15000,
  attachUncaughtHandler: true,
};
