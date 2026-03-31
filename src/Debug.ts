import type { Logger } from './Logger';
import type { Push } from './Push';

class DebugLogger {
  enabled: boolean = false;
  private lastSomeWarn: number = 0;
  private logger: Logger | null = null;
  private push: Push | null = null;
  private isInitialized = false;

  setDependencies(logger: Logger, push: Push): void {
    this.logger = logger;
    this.push = push;
    this.isInitialized = true;
  }

  log(message: string): void {
    if (!this.enabled) return;
    console.log(`[Peavy] ${message}`);
  }

  warnSome(message: string, error?: Error): void {
    const now = Date.now();
    if (now - this.lastSomeWarn < 60000) {
      return;
    }
    this.lastSomeWarn = now;
    this.warn(message, error);
  }

  warn(message: string, error?: Error): void {
    if (this.isInitialized) {
      const entry = this.logger?.buildEntry({
        level: 4, // Warning
        message,
        error,
      });

      if (entry) {
        entry.labels['peavy/internal'] = 'true';
        this.logger?.log(entry);
      }
    }

    if (this.enabled) {
      console.warn(`[Peavy] ${message}`, error);
    }
  }
}

export const Debug = new DebugLogger();
