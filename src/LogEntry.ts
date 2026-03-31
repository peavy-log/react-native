import { LogLevel, logLevelToString } from "./constants/LogLevel";

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  error?: Error;
  json?: Record<string, any>;
  labels: Record<string, any>;
}

export interface LogEntryBuilder {
  level?: LogLevel;
  message?: string;
  error?: Error | unknown;
  json?: Record<string, any>;
}

export function logEntryToJson(entry: LogEntry): Record<string, any> {
  const result: Record<string, any> = {
    timestamp: entry.timestamp.toISOString(),
    severity: logLevelToString(entry.level),
    message: entry.message || logLevelToString(entry.level),
  };

  if (entry.error) {
    result.error = entry.error.stack || entry.error.message;
  }

  const labels: Record<string, any> = {};
  for (const [key, value] of Object.entries(entry.labels)) {
    if (value !== null && value !== undefined) {
      labels[key] = value;
    }
  }
  result["peavy/labels"] = labels;

  if (entry.json) {
    delete entry.json["peavy/labels"];
    delete entry.json["timestamp"];
    delete entry.json["severity"];
    Object.assign(result, entry.json);
  }

  return result;
}
