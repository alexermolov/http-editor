/**
 * Centralized logger for HTTP Editor extension
 * Provides consistent logging with levels and optional production mode
 */
export class Logger {
    private static instance: Logger;
    private readonly prefix = '[HTTP Editor]';
    private enabled = true;

    private constructor() {
        // Singleton pattern
    }

    /**
     * Get logger instance
     */
    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    /**
     * Enable or disable logging
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Log info message
     */
    public info(message: string, ...args: any[]): void {
        if (!this.enabled) return;
        console.log(`${this.prefix} ${message}`, ...args);
    }

    /**
     * Log error message
     */
    public error(message: string, error?: any): void {
        if (!this.enabled) return;
        if (error) {
            console.error(`${this.prefix} ERROR: ${message}`, error);
        } else {
            console.error(`${this.prefix} ERROR: ${message}`);
        }
    }

    /**
     * Log warning message
     */
    public warn(message: string, ...args: any[]): void {
        if (!this.enabled) return;
        console.warn(`${this.prefix} WARNING: ${message}`, ...args);
    }

    /**
     * Log debug message (only in development)
     */
    public debug(message: string, ...args: any[]): void {
        if (!this.enabled) return;
        console.log(`${this.prefix} DEBUG: ${message}`, ...args);
    }
}

/**
 * Export singleton instance
 */
export const logger = Logger.getInstance();
