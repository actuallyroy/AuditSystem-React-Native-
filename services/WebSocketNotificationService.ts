import { debugLogger } from '../utils/DebugLogger';

const logger = debugLogger;

// Base URL for WebSocket connections
const WS_BASE_URL = 'ws://192.168.1.4:8080/hubs/notifications';

export interface WebSocketConnection {
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

export interface NotificationMessage {
  notificationId: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  timestamp: string;
  userId: string;
  organisationId: string;
  isRead?: boolean;
}

export interface DeliveryAcknowledgment {
  notificationId: string;
  acknowledgedAt: string;
}

class WebSocketNotificationService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval = 5000;
  private isReconnecting = false;
  private connectionStartTime: Date | null = null;
  private lastHeartbeat: Date | null = null;
  private pendingMessages = 0;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private unreadCountHandlers: Map<string, (count: number) => void> = new Map();
  private deliveryAcknowledgmentHandlers: Map<string, (data: DeliveryAcknowledgment) => void> = new Map();
  private token: string | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    logger.log('WebSocket notification service initialized');
  }

  async connect(token: string): Promise<void> {
    try {
      if (this.ws?.readyState === WebSocket.OPEN) {
        logger.log('Already connected to WebSocket');
        return;
      }

      this.token = token;
      const url = `${WS_BASE_URL}?access_token=${token}`;
      
      logger.log('Attempting WebSocket connection', { url });

      this.ws = new WebSocket(url);
      this.setupWebSocketHandlers();

      // Wait for connection to open
      await this.waitForConnection();
      
      this.connectionStartTime = new Date();
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      
      logger.log('WebSocket connection established');
      
      // Automatically subscribe to user notifications after connection
      await this.autoSubscribeToUser(token);
      
    } catch (error) {
      logger.error('Failed to connect to WebSocket', error);
      throw error;
    }
  }

  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not initialized'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      let handshakeSent = false;
      let handshakeResponseReceived = false;

      this.ws!.onopen = () => {
        clearTimeout(timeout);
        logger.log('WebSocket opened!');
        
        // Send proper SignalR handshake with record separator
        const handshakeMessage = {
          protocol: "json",
          version: 1
        };
        
        this.ws!.send(JSON.stringify(handshakeMessage) + '\u001e');
        logger.log('Sent handshake:', handshakeMessage);
        handshakeSent = true;
      };

      // Set up a temporary message handler for handshake response
      const originalOnMessage = this.ws!.onmessage;
      this.ws!.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          logger.log('Handshake response received:', data);
          
          if (handshakeSent && !handshakeResponseReceived) {
            handshakeResponseReceived = true;
            // Restore original message handler
            this.ws!.onmessage = originalOnMessage;
            resolve();
          }
        } catch (error) {
          logger.log('Raw handshake message:', event.data);
          if (handshakeSent && !handshakeResponseReceived) {
            handshakeResponseReceived = true;
            // Restore original message handler
            this.ws!.onmessage = originalOnMessage;
            resolve();
          }
        }
      };

      this.ws!.onerror = (error) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${JSON.stringify(error)}`));
      };
    });
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onmessage = (event) => {
      try {
        // Split by record separator and process each message
        const messages = event.data.split('\u001e').filter((msg: string) => msg.trim());
        
        messages.forEach((message: string) => {
          if (!message.trim()) return;
          
          try {
            const data = JSON.parse(message);
            logger.log('Received message:', data);
            
            // Handle different message types
            if (data.type === 1) {
              // Invocation message
              this.handleInvocation(data);
            } else if (data.type === 6) {
              // Ping message
              this.handlePing();
            } else if (data.type === 7) {
              // Close message
              logger.log('Close message received');
            } else if (data.target) {
              // Method invocation
              this.handleMethodInvocation(data);
            }
          } catch (parseError) {
            logger.log('Failed to parse message:', message);
          }
        });
      } catch (error) {
        logger.log('Raw message:', event.data);
      }
    };

    this.ws.onerror = (error) => {
      logger.error('WebSocket error:', error);
      this.handleConnectionError();
    };

    this.ws.onclose = (event) => {
      logger.log(`WebSocket closed: code=${event.code}, reason=${event.reason}`);
      this.handleConnectionClose(event);
    };
  }

  private handleInvocation(data: any): void {
    const { target, arguments: args } = data;
    
    switch (target) {
      case 'ReceiveNotification':
        this.lastHeartbeat = new Date();
        logger.log('Received notification via WebSocket', { notification: args[0] });
        
        // Automatically acknowledge delivery for new notifications
        this.acknowledgeDelivery(args[0].notificationId).catch((error) => {
          logger.error('Failed to automatically acknowledge delivery', error);
        });
        
        // Notify all registered handlers
        this.messageHandlers.forEach((handler) => {
          try {
            handler(args[0]);
          } catch (error) {
            logger.error('Error in notification handler', error);
          }
        });
        break;
        
      case 'UnreadCount':
        const unreadCount = args[0];
        logger.log('Unread count updated:', unreadCount);
        
        // Notify all registered unread count handlers
        this.unreadCountHandlers.forEach((handler) => {
          try {
            handler(unreadCount);
          } catch (error) {
            logger.error('Error in unread count handler', error);
          }
        });
        break;
        
      case 'NotificationMarkedAsRead':
        logger.log('Notification marked as read confirmation:', args[0]);
        // Handle read confirmation if needed
        break;
        
      case 'AllNotificationsMarkedAsRead':
        logger.log('All notifications marked as read confirmation:', args[0]);
        // Handle all read confirmation if needed
        break;
        
      case 'DeliveryAcknowledged':
        const acknowledgment = args[0];
        logger.log('Delivery acknowledgment confirmed:', acknowledgment);
        
        // Notify all registered delivery acknowledgment handlers
        this.deliveryAcknowledgmentHandlers.forEach((handler) => {
          try {
            handler(acknowledgment);
          } catch (error) {
            logger.error('Error in delivery acknowledgment handler', error);
          }
        });
        break;
        
      case 'Heartbeat':
        this.lastHeartbeat = new Date();
        logger.log('Received heartbeat from WebSocket');
        break;
        
      default:
        logger.log('Unknown invocation target:', { target, args });
    }
  }

  private handleMethodInvocation(data: any): void {
    logger.log('Method invocation:', { target: data.target, arguments: data.arguments });
  }

  private handlePing(): void {
    logger.log('Ping received');
    this.lastHeartbeat = new Date();
  }

  private async autoSubscribeToUser(token: string): Promise<void> {
    try {
      // Extract user ID and organisation ID from JWT token
      const { userId, organisationId } = this.extractUserInfoFromToken(token);
      
      if (userId) {
        await this.subscribeToUser(userId);
        logger.log('Auto-subscribed to user notifications', { userId });
      } else {
        logger.warn('Could not extract user ID from token for auto-subscription');
      }
      
      if (organisationId) {
        await this.joinOrganisation(organisationId);
        logger.log('Auto-joined organisation group', { organisationId });
      } else {
        logger.warn('Could not extract organisation ID from token for auto-join');
      }
    } catch (error) {
      logger.error('Failed to auto-subscribe to user notifications', error);
    }
  }

  private extractUserInfoFromToken(token: string): { userId: string | null; organisationId: string | null } {
    try {
      // JWT tokens have 3 parts separated by dots
      const parts = token.split('.');
      if (parts.length !== 3) {
        logger.warn('Invalid JWT token format');
        return { userId: null, organisationId: null };
      }

      // Decode the payload (second part)
      const payload = parts[1];
      // Add padding if needed for base64 decoding
      const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
      const decodedPayload = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
      const claims = JSON.parse(decodedPayload);

      // Extract user ID and organisation ID from claims
      const userId = claims.nameid || claims.sub || claims.userId;
      const organisationId = claims.organisation_id || claims.orgId || claims.organizationId;
      
      if (userId) {
        logger.log('Extracted user info from token', { userId, organisationId });
      } else {
        logger.warn('No user ID found in JWT claims', { claims });
      }
      
      return { userId, organisationId };
    } catch (error) {
      logger.error('Failed to extract user info from token', error);
      return { userId: null, organisationId: null };
    }
  }

  private handleConnectionError(): void {
    this.isReconnecting = true;
    this.scheduleReconnect();
  }

  private handleConnectionClose(event: CloseEvent): void {
    this.isReconnecting = false;
    
    // Don't reconnect if it was a clean close
    if (event.code === 1000) {
      logger.log('Clean connection close');
      return;
    }
    
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectInterval * this.reconnectAttempts, 30000);
    
    logger.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      if (this.token) {
        this.connect(this.token).catch((error) => {
          logger.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  async disconnect(): Promise<void> {
    try {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }

      if (this.ws) {
        logger.log('Disconnecting from WebSocket');
        this.ws.close(1000, 'Client disconnect');
        this.ws = null;
        this.connectionStartTime = null;
        this.lastHeartbeat = null;
        this.pendingMessages = 0;
        this.messageHandlers.clear();
        this.unreadCountHandlers.clear();
        this.deliveryAcknowledgmentHandlers.clear();
        this.token = null;
      }
    } catch (error) {
      logger.error('Error disconnecting from WebSocket', error);
    }
  }

  async subscribeToUser(userId: string): Promise<void> {
    try {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        throw new Error('Not connected to WebSocket');
      }

      const message = {
        type: 1,
        target: 'SubscribeToUser',
        arguments: [userId]
      };

      this.ws.send(JSON.stringify(message) + '\u001e');
      logger.log('Subscribed to user notifications', { userId });
    } catch (error) {
      logger.error('Failed to subscribe to user', error);
      throw error;
    }
  }

  async joinOrganisation(organisationId: string): Promise<void> {
    try {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        throw new Error('Not connected to WebSocket');
      }

      const message = {
        type: 1,
        target: 'JoinOrganisation',
        arguments: [organisationId]
      };

      this.ws.send(JSON.stringify(message) + '\u001e');
      logger.log('Joined organisation group', { organisationId });
    } catch (error) {
      logger.error('Failed to join organisation', error);
      throw error;
    }
  }

  async leaveOrganisation(organisationId: string): Promise<void> {
    try {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return;
      }

      const message = {
        type: 1,
        target: 'LeaveOrganisation',
        arguments: [organisationId]
      };

      this.ws.send(JSON.stringify(message) + '\u001e');
      logger.log('Left organisation group', { organisationId });
    } catch (error) {
      logger.error('Failed to leave organisation', error);
    }
  }

  async sendTestMessage(message: string): Promise<void> {
    try {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        throw new Error('Not connected to WebSocket');
      }

      const msg = {
        type: 1,
        target: 'SendTestMessage',
        arguments: [message]
      };

      this.ws.send(JSON.stringify(msg) + '\u001e');
      logger.log('Test message sent', { message });
    } catch (error) {
      logger.error('Failed to send test message', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        throw new Error('Not connected to WebSocket');
      }

      const message = {
        type: 1,
        target: 'MarkNotificationAsRead',
        arguments: [notificationId]
      };

      this.ws.send(JSON.stringify(message) + '\u001e');
      logger.log('Marked notification as read', { notificationId });
    } catch (error) {
      logger.error('Failed to mark notification as read', error);
      throw error;
    }
  }

  async markAllNotificationsAsRead(): Promise<void> {
    try {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        throw new Error('Not connected to WebSocket');
      }

      const message = {
        type: 1,
        target: 'MarkAllNotificationsAsRead',
        arguments: []
      };

      this.ws.send(JSON.stringify(message) + '\u001e');
      logger.log('Marked all notifications as read');
    } catch (error) {
      logger.error('Failed to mark all notifications as read', error);
      throw error;
    }
  }

  async acknowledgeDelivery(notificationId: string): Promise<void> {
    try {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        throw new Error('Not connected to WebSocket');
      }

      const message = {
        type: 1,
        target: 'AcknowledgeDelivery',
        arguments: [notificationId]
      };

      this.ws.send(JSON.stringify(message) + '\u001e');
      logger.log('Acknowledged delivery for notification', { notificationId });
    } catch (error) {
      logger.error('Failed to acknowledge delivery', error);
      throw error;
    }
  }

  // Register a handler for incoming notifications
  onNotification(handler: (notification: NotificationMessage) => void): () => void {
    const handlerId = Date.now().toString();
    this.messageHandlers.set(handlerId, handler);
    
    // Return cleanup function
    return () => {
      this.messageHandlers.delete(handlerId);
    };
  }

  // Register a handler for unread count updates
  onUnreadCountUpdate(handler: (count: number) => void): () => void {
    const handlerId = Date.now().toString();
    this.unreadCountHandlers.set(handlerId, handler);
    
    // Return cleanup function
    return () => {
      this.unreadCountHandlers.delete(handlerId);
    };
  }

  // Register a handler for delivery acknowledgment confirmations
  onDeliveryAcknowledged(handler: (acknowledgment: DeliveryAcknowledgment) => void): () => void {
    const handlerId = Date.now().toString();
    this.deliveryAcknowledgmentHandlers.set(handlerId, handler);
    
    // Return cleanup function
    return () => {
      this.deliveryAcknowledgmentHandlers.delete(handlerId);
    };
  }

  // Get connection status
  getConnectionStatus(): WebSocketConnection {
    return {
      isConnected: this.ws?.readyState === WebSocket.OPEN,
      connectionId: null, // WebSocket doesn't have connection IDs like SignalR
      error: this.ws?.readyState === WebSocket.CLOSED ? 'Disconnected' : null
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

  // Test basic WebSocket connectivity
  async testWebSocketConnectivity(token?: string): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const testToken = token || this.token;
      if (!testToken) {
        return { 
          success: false, 
          error: 'No token provided for connectivity test' 
        };
      }

      const url = `${WS_BASE_URL}?access_token=${testToken}`;
      logger.log('Testing WebSocket connectivity', { url });

      return new Promise((resolve) => {
        const testWs = new WebSocket(url);
        const timeout = setTimeout(() => {
          testWs.close();
          resolve({ 
            success: false, 
            error: 'Connection timeout',
            details: { message: 'Test connection timed out' }
          });
        }, 8000);

        testWs.onopen = () => {
          clearTimeout(timeout);
          logger.log('WebSocket connectivity test successful');
          
          // Send handshake with record separator
          const handshakeMessage = {
            protocol: "json",
            version: 1
          };
          testWs.send(JSON.stringify(handshakeMessage) + '\u001e');
          
          // Close after successful test
          setTimeout(() => {
            testWs.close();
            resolve({ success: true });
          }, 1000);
        };

        testWs.onerror = (error) => {
          clearTimeout(timeout);
          logger.error('WebSocket connectivity test failed', error);
          resolve({ 
            success: false, 
            error: 'Connection failed',
            details: { message: 'Test connection failed', error }
          });
        };
      });
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

export default new WebSocketNotificationService(); 