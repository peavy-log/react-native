import { LogLevel, logLevelToString } from '../constants/LogLevel';

export class VerbosityException extends Error {
  constructor(
    public level: LogLevel | null,
    public minimum: LogLevel
  ) {
    super(
      `Log level ${level !== null ? logLevelToString(level) : 'null'} is below minimum ${logLevelToString(minimum)}`
    );
    this.name = 'VerbosityException';
  }
}
