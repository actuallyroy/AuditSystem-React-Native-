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

  log(message: string, data?: any) {
    this.addLog('log', message, data);
    console.log(message, data);
  }

  error(message: string, data?: any) {
    this.addLog('error', message, data);
    console.error(message, data);
    
    if (this.showAlertsForErrors) {
      Alert.alert(
        'Debug Error',
        `${message}\n\nData: ${data ? JSON.stringify(data, null, 2) : 'None'}`,
        [{ text: 'OK' }]
      );
    }
  }

  warn(message: string, data?: any) {
    this.addLog('warn', message, data);
    console.warn(message, data);
  }

  info(message: string, data?: any) {
    this.addLog('info', message, data);
    console.info(message, data);
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
}

export const debugLogger = new DebugLogger(); 