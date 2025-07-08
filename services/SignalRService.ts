import { HubConnection, HubConnectionBuilder, LogLevel, HttpTransportType } from '@microsoft/signalr';
import { debugLogger } from '../utils/DebugLogger';
import { getSignalRConfig } from '../config/signalR';

const logger = debugLogger;

export interface SignalRConnection {
  isConnected: boolean;
  connectionId: string | null;
  error: string | null;
}

export interface ConnectionStats {
  uptime: number;
  reconnectAttempts: number;
  lastHeartbeat: Date | null;
  pendingMessages: number;
}

class SignalRService {
  private connection: HubConnection | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval = 5000;
  private isReconnecting = false;
  private connectionStartTime: Date | null = null;
  private lastHeartbeat: Date | null = null;
  private pendingMessages = 0;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor() {
    logger.log('SignalR service initialized');
  }

  async connect(token: string): Promise<void> {
    try {
      if (this.connection?.state === 'Connected') {
        logger.log('Already connected to SignalR');
        return;
      }

      const config = getSignalRConfig();
      
      logger.log('Attempting SignalR connection', { url: config.url });

      this.connection = new HubConnectionBuilder()
        .withUrl(config.url, {
          accessTokenFactory: () => token,
          transport: HttpTransportType.WebSockets,
          skipNegotiation: true
        })
        .configureLogging(LogLevel.Information)
        .withAutomaticReconnect([0, 2000, 10000, 30000]) // Retry delays
        .build();

      // Set up connection event handlers
      this.setupConnectionHandlers();

      // Start the connection
      await this.connection.start();
      
      this.connectionStartTime = new Date();
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      
      logger.log('SignalR connection established', { 
        connectionId: this.connection.connectionId 
      });

    } catch (error) {
      logger.error('Failed to connect to SignalR', error);
      throw error;
    }
  }

  private setupConnectionHandlers(): void {
    if (!this.connection) return;

    // Connection state changes
    this.connection.onreconnecting((error) => {
      this.isReconnecting = true;
      this.reconnectAttempts++;
      logger.log('SignalR reconnecting', { 
        attempt: this.reconnectAttempts, 
        error: error?.message 
      });
    });

    this.connection.onreconnected((connectionId) => {
      this.isReconnecting = false;
      this.connectionStartTime = new Date();
      logger.log('SignalR reconnected', { connectionId });
    });

    this.connection.onclose((error) => {
      this.isReconnecting = false;
      logger.log('SignalR connection closed', { 
        error: error?.message,
        wasClean: error?.name === 'CloseEvent'
      });
    });

    // Set up notification handler
    this.connection.on('ReceiveNotification', (notification) => {
      this.lastHeartbeat = new Date();
      logger.log('Received notification via SignalR', notification);
      
      // Notify all registered handlers
      this.messageHandlers.forEach((handler) => {
        try {
          handler(notification);
        } catch (error) {
          logger.error('Error in notification handler', error);
        }
      });
    });

    // Set up heartbeat handler
    this.connection.on('Heartbeat', () => {
      this.lastHeartbeat = new Date();
      logger.log('Received heartbeat from SignalR');
    });
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connection) {
        logger.log('Disconnecting from SignalR');
        await this.connection.stop();
        this.connection = null;
        this.connectionStartTime = null;
        this.lastHeartbeat = null;
        this.pendingMessages = 0;
        this.messageHandlers.clear();
      }
    } catch (error) {
      logger.error('Error disconnecting from SignalR', error);
    }
  }

  async subscribeToUser(userId: string): Promise<void> {
    try {
      if (!this.connection || this.connection.state !== 'Connected') {
        throw new Error('Not connected to SignalR');
      }

      await this.connection.invoke('SubscribeToUser', userId);
      logger.log('Subscribed to user notifications', { userId });
    } catch (error) {
      logger.error('Failed to subscribe to user', error);
      throw error;
    }
  }

  async joinOrganisation(organisationId: string): Promise<void> {
    try {
      if (!this.connection || this.connection.state !== 'Connected') {
        throw new Error('Not connected to SignalR');
      }

      await this.connection.invoke('JoinOrganisation', organisationId);
      logger.log('Joined organisation group', { organisationId });
    } catch (error) {
      logger.error('Failed to join organisation', error);
      throw error;
    }
  }

  async leaveOrganisation(organisationId: string): Promise<void> {
    try {
      if (!this.connection || this.connection.state !== 'Connected') {
        return;
      }

      await this.connection.invoke('LeaveOrganisation', organisationId);
      logger.log('Left organisation group', { organisationId });
    } catch (error) {
      logger.error('Failed to leave organisation', error);
    }
  }

  // Register a handler for incoming notifications
  onNotification(handler: (notification: any) => void): () => void {
    const handlerId = Date.now().toString();
    this.messageHandlers.set(handlerId, handler);
    
    // Return cleanup function
    return () => {
      this.messageHandlers.delete(handlerId);
    };
  }

  // Get connection status
  getConnectionStatus(): SignalRConnection {
    return {
      isConnected: this.connection?.state === 'Connected',
      connectionId: this.connection?.connectionId || null,
      error: this.connection?.state === 'Disconnected' ? 'Disconnected' : null
    };
  }

  // Get connection statistics
  getConnectionStats(): ConnectionStats {
    const uptime = this.connectionStartTime 
      ? Date.now() - this.connectionStartTime.getTime() 
      : 0;

    return {
      uptime,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat,
      pendingMessages: this.pendingMessages
    };
  }

  // Send a test message (for debugging)
  async sendTestMessage(message: string): Promise<void> {
    try {
      if (!this.connection || this.connection.state !== 'Connected') {
        throw new Error('Not connected to SignalR');
      }

      await this.connection.invoke('SendTestMessage', message);
      logger.log('Test message sent', { message });
    } catch (error) {
      logger.error('Failed to send test message', error);
      throw error;
    }
  }

  // Test basic WebSocket connectivity
  async testWebSocketConnectivity(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const config = getSignalRConfig();
      logger.log('Testing WebSocket connectivity', { url: config.url });

      // Create a simple WebSocket connection test
      const testConnection = new HubConnectionBuilder()
        .withUrl(config.url, {
          transport: HttpTransportType.WebSockets,
          skipNegotiation: true
        })
        .configureLogging(LogLevel.Debug)
        .build();

      // Set a short timeout for the test
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 10000);
      });

      const connectionPromise = testConnection.start();

      await Promise.race([connectionPromise, timeoutPromise]);
      
      logger.log('WebSocket connectivity test successful');
      await testConnection.stop();
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('WebSocket connectivity test failed', error);
      return { 
        success: false, 
        error: errorMessage,
        details: {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }
      };
    }
  }
}

export default new SignalRService(); 