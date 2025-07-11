import { Alert } from 'react-native';

interface LogEntry {
  timestamp: string;
  level: 'log' | 'error' | 'warn' | 'info';
  message: string;
  data?: any;
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;
  private showAlertsForErrors = true;
  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'warn';
  private isDevModeEnabled = false;

  setLogLevel(level: 'debug' | 'info' | 'warn' | 'error') {
    this.logLevel = level;
  }

  log(message: string, data?: any) {
    if (this.shouldLog('debug')) {
      this.addLog('log', message, data);
      console.log(message, data);
    }
  }

  error(message: string, data?: any) {
    if (this.shouldLog('error')) {
      this.addLog('error', message, data);
      console.error(message, data);
      
      if (this.showAlertsForErrors && this.isDevModeEnabled) {
        Alert.alert(
          'Debug Error',
          `${message}\n\nData: ${data ? JSON.stringify(data, null, 2) : 'None'}`,
          [{ text: 'OK' }]
        );
      }
    }
  }

  warn(message: string, data?: any) {
    if (this.shouldLog('warn')) {
      this.addLog('warn', message, data);
      console.warn(message, data);
    }
  }

  info(message: string, data?: any) {
    if (this.shouldLog('info')) {
      this.addLog('info', message, data);
      console.info(message, data);
    }
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.logLevel];
  }

  private addLog(level: 'log' | 'error' | 'warn' | 'info', message: string, data?: any) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };

    this.logs.unshift(logEntry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  getLogsAsString(): string {
    return this.logs
      .map(log => {
        const dataStr = log.data ? `\nData: ${JSON.stringify(log.data, null, 2)}` : '';
        return `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}${dataStr}`;
      })
      .join('\n\n');
  }

  showLogAlert() {
    const logsString = this.getLogsAsString();
    Alert.alert(
      'Debug Logs',
      logsString || 'No logs available',
      [
        { text: 'Clear Logs', onPress: () => this.clearLogs() },
        { text: 'OK' }
      ]
    );
  }

  setShowAlertsForErrors(show: boolean) {
    this.showAlertsForErrors = show;
  }

  setDevModeEnabled(enabled: boolean) {
    this.isDevModeEnabled = enabled;
  }

  isDevModeActive(): boolean {
    return this.isDevModeEnabled;
  }
}

export const debugLogger = new DebugLogger();

// Function to update debug logger with dev mode state
export const updateDebugLoggerDevMode = (enabled: boolean) => {
  debugLogger.setDevModeEnabled(enabled);
}; 