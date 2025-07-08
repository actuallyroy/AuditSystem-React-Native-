const API_BASE_URL = 'http://192.168.1.4:8080/api/v1';
const WS_BASE_URL = 'ws://192.168.1.4:8080/hubs/notifications';

// SignalR Configuration
export const signalRConfig = {
  production: {
    url: WS_BASE_URL,
    heartbeatInterval: 30000, // 30 seconds
    reconnectInterval: 5000, // 5 seconds
    maxReconnectAttempts: 10,
    connectionTimeout: 10000, // 10 seconds
    keepAliveTimeout: 60000 // 60 seconds
  },
  
  development: {
    url: WS_BASE_URL,
    heartbeatInterval: 30000, // 30 seconds
    reconnectInterval: 3000, // 3 seconds (faster for dev)
    maxReconnectAttempts: 15, // More attempts for dev
    connectionTimeout: 8000, // 8 seconds
    keepAliveTimeout: 45000 // 45 seconds
  },
  
  staging: {
    url: WS_BASE_URL,
    heartbeatInterval: 30000, // 30 seconds
    reconnectInterval: 5000, // 5 seconds
    maxReconnectAttempts: 10,
    connectionTimeout: 10000, // 10 seconds
    keepAliveTimeout: 60000 // 60 seconds
  }
};

// Get current environment configuration
export const getSignalRConfig = () => {
  const environment = (global as any).__DEV__ ? 'development' : 'production';
  return signalRConfig[environment];
};

// Connection status constants
export const ConnectionStatus = {
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
} as const;

// Notification types
export const NotificationTypes = {
  AUDIT_ASSIGNED: 'audit_assigned',
  AUDIT_COMPLETED: 'audit_completed',
  AUDIT_REVIEWED: 'audit_reviewed',
  SYSTEM_ALERT: 'system_alert'
} as const;

// SignalR message types
export const SignalRMessageTypes = {
  INVOCATION: 1,
  STREAM_ITEM: 2,
  COMPLETION: 3,
  STREAM_INVOCATION: 4,
  CANCEL_INVOCATION: 5,
  PING: 6,
  CLOSE: 7
} as const; 