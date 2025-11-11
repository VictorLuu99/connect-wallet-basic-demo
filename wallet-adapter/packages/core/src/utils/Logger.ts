/**
 * Log levels for the Phoenix Wallet library
 */
export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  enabled?: boolean;
  level?: LogLevel;
  prefix?: string;
}

/**
 * Logger class for Phoenix Wallet library
 * Provides configurable logging with different log levels
 */
class Logger {
  private enabled: boolean = false;
  private level: LogLevel = LogLevel.INFO;
  private prefix: string = '[Wallet]';

  /**
   * Configure the logger
   * @param config - Logger configuration options
   */
  configure(config: LoggerConfig): void {
    if (config.enabled !== undefined) {
      this.enabled = config.enabled;
    }
    if (config.level !== undefined) {
      this.level = config.level;
    }
    if (config.prefix !== undefined) {
      this.prefix = config.prefix;
    }
  }

  /**
   * Get current logger configuration
   */
  getConfig(): Required<LoggerConfig> {
    return {
      enabled: this.enabled,
      level: this.level,
      prefix: this.prefix,
    };
  }

  /**
   * Check if logging is enabled for a specific level
   */
  private shouldLog(level: LogLevel): boolean {
    return this.enabled && this.level >= level;
  }

  /**
   * Format log message with prefix
   */
  private formatMessage(message: string): string {
    return `${this.prefix} ${message}`;
  }

  /**
   * Log an error message
   */
  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage(message), ...args);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(message), ...args);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(message), ...args);
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage(message), ...args);
    }
  }

  /**
   * Log a message (alias for info)
   */
  log(message: string, ...args: any[]): void {
    this.info(message, ...args);
  }
}

// Export singleton instance
export const logger = new Logger();

