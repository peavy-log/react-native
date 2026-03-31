export enum LogLevel {
  Trace = 1,
  Debug = 2,
  Info = 3,
  Warning = 4,
  Error = 5,
}

export function logLevelToString(level: LogLevel): string {
  switch (level) {
    case LogLevel.Trace:
      return 'trace';
    case LogLevel.Debug:
      return 'debug';
    case LogLevel.Info:
      return 'info';
    case LogLevel.Warning:
      return 'warning';
    case LogLevel.Error:
      return 'error';
  }
}
