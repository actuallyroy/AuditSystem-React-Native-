import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import WebSocketNotificationService, { WebSocketConnection, DeliveryAcknowledgment } from '../services/WebSocketNotificationService';
import PushNotificationService from '../services/PushNotificationService';
import { useAuth } from './AuthContext';
import { debugLogger } from '../utils/DebugLogger';
import { authService } from '../services/AuthService'; // Added import for authService

const logger = debugLogger;

// Notification types
export interface Notification {
  id: string;
  type: 'audit_assigned' | 'audit_completed' | 'audit_reviewed' | 'system_alert';
  title: string;
  message: string;
  data?: any;
  timestamp: string;
  isRead: boolean;
  userId: string;
  deliveryAcknowledged?: boolean;
  acknowledgedAt?: string;
}

// State interface
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  connectionStats: {
    uptime: number;
    reconnectAttempts: number;
    lastHeartbeat: Date | null;
    pendingMessages: number;
  };
  lastUpdate: Date | null;
  error: string | null;
  deliveryAcknowledgedCount: number;
}

// Action types
type NotificationAction =
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_CONNECTION_STATS'; payload: any }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'UPDATE_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'DELETE_NOTIFICATION'; payload: string }
  | { type: 'SET_UNREAD_COUNT'; payload: number }
  | { type: 'RECALCULATE_UNREAD_COUNT' }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'DELIVERY_ACKNOWLEDGED'; payload: DeliveryAcknowledgment };

// Initial state
const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isConnected: false,
  connectionStats: {
    uptime: 0,
    reconnectAttempts: 0,
    lastHeartbeat: null,
    pendingMessages: 0
  },
  lastUpdate: null,
  error: null,
  deliveryAcknowledgedCount: 0
};

// Reducer
function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'SET_CONNECTED':
      return {
        ...state,
        isConnected: action.payload,
        error: action.payload ? null : state.error
      };

    case 'SET_CONNECTION_STATS':
      return {
        ...state,
        connectionStats: action.payload
      };

    case 'ADD_NOTIFICATION':
      const existingIndex = state.notifications.findIndex(n => n.id === action.payload.id);
      if (existingIndex >= 0) {
        // Update existing notification - don't change unread count
        const updatedNotifications = [...state.notifications];
        const existingNotification = updatedNotifications[existingIndex];
        updatedNotifications[existingIndex] = action.payload;
        
        // Only update unread count if the read status actually changed
        let newUnreadCount = state.unreadCount;
        if (existingNotification.isRead !== action.payload.isRead) {
          if (action.payload.isRead) {
            // Notification was marked as read
            newUnreadCount = Math.max(0, state.unreadCount - 1);
          } else {
            // Notification was marked as unread
            newUnreadCount = state.unreadCount + 1;
          }
        }
        
        return {
          ...state,
          notifications: updatedNotifications,
          unreadCount: newUnreadCount,
          lastUpdate: new Date()
        };
      } else {
        // Add new notification
        return {
          ...state,
          notifications: [action.payload, ...state.notifications],
          unreadCount: state.unreadCount + (action.payload.isRead ? 0 : 1),
          lastUpdate: new Date()
        };
      }

    case 'UPDATE_NOTIFICATIONS':
      const unreadCount = action.payload.filter(n => !n.isRead).length;
      return {
        ...state,
        notifications: action.payload,
        unreadCount,
        lastUpdate: new Date()
      };

    case 'MARK_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, isRead: true }
            : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      };

    case 'MARK_ALL_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification => ({
          ...notification,
          isRead: true
        })),
        unreadCount: 0
      };

    case 'DELETE_NOTIFICATION':
      const notificationToDelete = state.notifications.find(n => n.id === action.payload);
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
        unreadCount: state.unreadCount - (notificationToDelete?.isRead ? 0 : 1)
      };

    case 'SET_UNREAD_COUNT':
      return {
        ...state,
        unreadCount: action.payload
      };

    case 'RECALCULATE_UNREAD_COUNT':
      return {
        ...state,
        unreadCount: state.notifications.filter(n => !n.isRead).length
      };

    case 'DELIVERY_ACKNOWLEDGED':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload.notificationId
            ? { 
                ...notification, 
                deliveryAcknowledged: true,
                acknowledgedAt: action.payload.acknowledgedAt
              }
            : notification
        ),
        deliveryAcknowledgedCount: state.deliveryAcknowledgedCount + 1
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
}

// Context interface
interface NotificationContextType {
  state: NotificationState;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refreshNotifications: () => void;
  reconnect: () => Promise<void>;
  getConnectionStats: () => any;
  recalculateUnreadCount: () => void;
  acknowledgeDelivery: (notificationId: string) => Promise<void>;
}

// Create context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Provider component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const { user, isAuthenticated, loading, tokenValidating } = useAuth();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const connectionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationHandlerRef = useRef<(() => void) | null>(null);
  const unreadCountHandlerRef = useRef<(() => void) | null>(null);
  const deliveryAcknowledgmentHandlerRef = useRef<(() => void) | null>(null);
  const pushNotificationResponseListenerRef = useRef<(() => void) | null>(null);
  const pushNotificationReceivedListenerRef = useRef<(() => void) | null>(null);
  // No need for useRef since authService is already a singleton

  // Initialize push notifications
  useEffect(() => {
    const initializePushNotifications = async () => {
      try {
        await PushNotificationService.initialize();
        
        // Set up notification response listener (when user taps notification)
        if (pushNotificationResponseListenerRef.current) {
          pushNotificationResponseListenerRef.current();
        }
        pushNotificationResponseListenerRef.current = PushNotificationService.setupNotificationResponseListener();
        
        // Set up notification received listener (for foreground notifications)
        if (pushNotificationReceivedListenerRef.current) {
          pushNotificationReceivedListenerRef.current();
        }
        pushNotificationReceivedListenerRef.current = PushNotificationService.setupNotificationReceivedListener();
        
        logger.log('Push notifications initialized');
      } catch (error) {
        logger.error('Failed to initialize push notifications', error);
      }
    };

    initializePushNotifications();

    return () => {
      if (pushNotificationResponseListenerRef.current) {
        pushNotificationResponseListenerRef.current();
      }
      if (pushNotificationReceivedListenerRef.current) {
        pushNotificationReceivedListenerRef.current();
      }
    };
  }, []);

  // Handle authentication changes
  useEffect(() => {
    if (isAuthenticated && user?.token && !loading && !tokenValidating) {
      connectToSignalR();
    } else {
      disconnectFromSignalR();
    }

    return () => {
      disconnectFromSignalR();
    };
  }, [isAuthenticated, user?.token, loading, tokenValidating]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        logger.log('App came to foreground, checking SignalR connection');
        if (isAuthenticated && user?.token && !loading && !tokenValidating) {
          connectToSignalR();
        }
        // Clear badge when app comes to foreground
        PushNotificationService.clearBadge().catch((error) => {
          logger.error('Failed to clear badge on app foreground', error);
        });
      } else if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App has gone to the background
        logger.log('App went to background');
        // Don't disconnect immediately, let SignalR handle reconnection
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isAuthenticated, user?.token, loading, tokenValidating]);

  // Set up periodic connection stats updates
  useEffect(() => {
    const updateStats = () => {
      const stats = WebSocketNotificationService.getConnectionStats();
      dispatch({ type: 'SET_CONNECTION_STATS', payload: stats });
    };

    connectionCheckIntervalRef.current = setInterval(updateStats, 5000);
    updateStats(); // Initial update

    return () => {
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
      }
    };
  }, []);

  const connectToSignalR = async () => {
    try {
      if (!user?.token) {
        logger.log('No token available for SignalR connection');
        return;
      }

      // Additional token validation before connecting
      if (tokenValidating) {
        logger.log('Token is currently being validated, skipping SignalR connection');
        return;
      }

      logger.log('Connecting to SignalR');
      
      // Validate token before attempting connection
      const isTokenValid = await authService.testTokenValidity();
      if (!isTokenValid) {
        logger.warn('Token validation failed before SignalR connection, skipping connection');
        return;
      }
      
      // Connect to WebSocket (auto-subscribes to user notifications and joins organisation)
      await WebSocketNotificationService.connect(user.token);

      // Set up notification handler
      if (notificationHandlerRef.current) {
        notificationHandlerRef.current(); // Cleanup previous handler
      }
      
      const cleanup = WebSocketNotificationService.onNotification((notificationMessage) => {
        // Transform NotificationMessage to Notification format
        const notification: Notification = {
          id: notificationMessage.notificationId,
          type: notificationMessage.type as 'audit_assigned' | 'audit_completed' | 'audit_reviewed' | 'system_alert',
          title: notificationMessage.title,
          message: notificationMessage.message,
          timestamp: notificationMessage.timestamp,
          isRead: notificationMessage.isRead || false,
          userId: notificationMessage.userId || user?.userId || '',
          deliveryAcknowledged: false
        };
        dispatch({ type: 'ADD_NOTIFICATION', payload: notification });

        // Show push notification with badge
        showPushNotification(notificationMessage);
      });
      
      notificationHandlerRef.current = cleanup;

      // Set up unread count handler
      if (unreadCountHandlerRef.current) {
        unreadCountHandlerRef.current(); // Cleanup previous handler
      }
      
      const unreadCountCleanup = WebSocketNotificationService.onUnreadCountUpdate((count: number) => {
        dispatch({ type: 'SET_UNREAD_COUNT', payload: count });
        // Update badge count to match unread count
        PushNotificationService.updateBadgeCount(count).catch((error) => {
          logger.error('Failed to update badge count', error);
        });
      });
      
      unreadCountHandlerRef.current = unreadCountCleanup;

      // Set up delivery acknowledgment handler
      if (deliveryAcknowledgmentHandlerRef.current) {
        deliveryAcknowledgmentHandlerRef.current(); // Cleanup previous handler
      }
      
      const deliveryAcknowledgmentCleanup = WebSocketNotificationService.onDeliveryAcknowledged((acknowledgment: DeliveryAcknowledgment) => {
        dispatch({ type: 'DELIVERY_ACKNOWLEDGED', payload: acknowledgment });
        logger.log('Delivery acknowledgment received', acknowledgment);
      });
      
      deliveryAcknowledgmentHandlerRef.current = deliveryAcknowledgmentCleanup;

      dispatch({ type: 'SET_CONNECTED', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      logger.log('SignalR connection established successfully');

    } catch (error) {
      logger.error('Failed to connect to SignalR', error);
      dispatch({ type: 'SET_CONNECTED', payload: false });
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Connection failed' });
    }
  };

  const showPushNotification = async (notificationMessage: any) => {
    try {
      // Determine priority based on notification type
      let priority: 'default' | 'normal' | 'high' = 'default';
      if (notificationMessage.priority === 'urgent') {
        priority = 'high';
      } else if (notificationMessage.priority === 'high') {
        priority = 'high';
      }

      await PushNotificationService.showNotification({
        notificationId: notificationMessage.notificationId,
        type: notificationMessage.type,
        title: notificationMessage.title,
        message: notificationMessage.message,
        data: {
          userId: notificationMessage.userId,
          organisationId: notificationMessage.organisationId,
          timestamp: notificationMessage.timestamp,
        },
        priority,
      });

      logger.log('Push notification shown for new notification', {
        notificationId: notificationMessage.notificationId,
        title: notificationMessage.title,
      });
    } catch (error) {
      logger.error('Failed to show push notification', error);
    }
  };

  const disconnectFromSignalR = () => {
    try {
      WebSocketNotificationService.disconnect();
      if (notificationHandlerRef.current) {
        notificationHandlerRef.current();
        notificationHandlerRef.current = null;
      }
      if (unreadCountHandlerRef.current) {
        unreadCountHandlerRef.current();
        unreadCountHandlerRef.current = null;
      }
      if (deliveryAcknowledgmentHandlerRef.current) {
        deliveryAcknowledgmentHandlerRef.current();
        deliveryAcknowledgmentHandlerRef.current = null;
      }
      dispatch({ type: 'SET_CONNECTED', payload: false });
      logger.log('Disconnected from WebSocket');
    } catch (error) {
      logger.error('Error disconnecting from WebSocket', error);
    }
  };

  const reconnect = async (): Promise<void> => {
    try {
      logger.log('Manual reconnection requested');
      await disconnectFromSignalR();
      await connectToSignalR();
    } catch (error) {
      logger.error('Manual reconnection failed', error);
      throw error;
    }
  };

  const markAsRead = async (id: string) => {
    try {
      // Update local state immediately
      dispatch({ type: 'MARK_AS_READ', payload: id });
      
      // Send message to server via WebSocket
      await WebSocketNotificationService.markNotificationAsRead(id);
      
    } catch (error) {
      logger.error('Failed to mark notification as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      dispatch({ type: 'MARK_ALL_AS_READ' });

      // Clear badge when all notifications are marked as read
      await PushNotificationService.clearBadge();
      
      // Send message to server via WebSocket
      await WebSocketNotificationService.markAllNotificationsAsRead();
      
    } catch (error) {
      logger.error('Failed to mark all notifications as read', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      dispatch({ type: 'DELETE_NOTIFICATION', payload: id });
      
      // Note: There's no WebSocket method for deleting notifications in the protocol
      // This would typically be done via REST API
      // await notificationService.deleteNotification(id);
      
    } catch (error) {
      logger.error('Failed to delete notification', error);
    }
  };

  const refreshNotifications = () => {
    // TODO: Fetch notifications from server
    logger.log('Refresh notifications requested');
  };

  const getConnectionStats = () => {
    return WebSocketNotificationService.getConnectionStats();
  };

  const recalculateUnreadCount = () => {
    dispatch({ type: 'RECALCULATE_UNREAD_COUNT' });
  };

  const acknowledgeDelivery = async (notificationId: string) => {
    try {
      await WebSocketNotificationService.acknowledgeDelivery(notificationId);
      logger.log('Delivery acknowledgment sent for notification', { notificationId });
    } catch (error) {
      logger.error('Failed to acknowledge delivery', error);
    }
  };

  const value: NotificationContextType = {
    state,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    reconnect,
    getConnectionStats,
    recalculateUnreadCount,
    acknowledgeDelivery,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Hook to use notifications
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}; 