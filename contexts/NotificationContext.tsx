import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import WebSocketNotificationService, { WebSocketConnection, DeliveryAcknowledgment } from '../services/WebSocketNotificationService';
import PushNotificationService from '../services/PushNotificationService';
import { useAuth } from './AuthContext';
import { debugLogger } from '../utils/DebugLogger';
import { authService } from '../services/AuthService';
import { storageService } from '../services/StorageService';

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
  | { type: 'RECALCULATE_UNREAD_COUNT' }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'DELIVERY_ACKNOWLEDGED'; payload: DeliveryAcknowledgment }
  | { type: 'LOAD_NOTIFICATIONS_FROM_STORAGE'; payload: Notification[] };

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
        // Update existing notification
        const updatedNotifications = [...state.notifications];
        updatedNotifications[existingIndex] = action.payload;
        
        return {
          ...state,
          notifications: updatedNotifications,
          unreadCount: updatedNotifications.filter(n => !n.isRead).length,
          lastUpdate: new Date()
        };
      } else {
        // Add new notification
        const newNotifications = [action.payload, ...state.notifications];
        return {
          ...state,
          notifications: newNotifications,
          unreadCount: newNotifications.filter(n => !n.isRead).length,
          lastUpdate: new Date()
        };
      }

    case 'UPDATE_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
        unreadCount: action.payload.filter(n => !n.isRead).length,
        lastUpdate: new Date()
      };

    case 'MARK_AS_READ':
      const updatedNotifications = state.notifications.map(notification =>
        notification.id === action.payload
          ? { ...notification, isRead: true }
          : notification
      );
      return {
        ...state,
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter(n => !n.isRead).length
      };

    case 'MARK_ALL_AS_READ':
      const allReadNotifications = state.notifications.map(notification => ({
        ...notification,
        isRead: true
      }));
      return {
        ...state,
        notifications: allReadNotifications,
        unreadCount: 0
      };

    case 'DELETE_NOTIFICATION':
      const filteredNotifications = state.notifications.filter(n => n.id !== action.payload);
      return {
        ...state,
        notifications: filteredNotifications,
        unreadCount: filteredNotifications.filter(n => !n.isRead).length
      };

    case 'RECALCULATE_UNREAD_COUNT':
      return {
        ...state,
        unreadCount: state.notifications.filter(n => !n.isRead).length
      };

    case 'DELIVERY_ACKNOWLEDGED':
      const acknowledgedNotifications = state.notifications.map(notification =>
        notification.id === action.payload.notificationId
          ? { 
              ...notification, 
              deliveryAcknowledged: true,
              acknowledgedAt: action.payload.acknowledgedAt
            }
          : notification
      );
      return {
        ...state,
        notifications: acknowledgedNotifications,
        deliveryAcknowledgedCount: state.deliveryAcknowledgedCount + 1
      };

    case 'LOAD_NOTIFICATIONS_FROM_STORAGE':
      return {
        ...state,
        notifications: action.payload,
        unreadCount: action.payload.filter(n => !n.isRead).length,
        lastUpdate: new Date()
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
  loadNotificationsFromStorage: () => Promise<void>;
  saveNotificationsToStorage: () => Promise<void>;
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
  const deliveryAcknowledgmentHandlerRef = useRef<(() => void) | null>(null);
  const pushNotificationResponseListenerRef = useRef<(() => void) | null>(null);
  const pushNotificationReceivedListenerRef = useRef<(() => void) | null>(null);

  // Load notifications from storage on mount
  useEffect(() => {
    loadNotificationsFromStorage();
  }, []);

  // Save notifications to storage whenever they change
  useEffect(() => {
    if (state.notifications.length > 0 || state.lastUpdate) {
      saveNotificationsToStorage();
    }
  }, [state.notifications, state.lastUpdate]);

  const loadNotificationsFromStorage = async () => {
    try {
      const storedNotifications = await storageService.getData('OFFLINE_NOTIFICATIONS');
      if (storedNotifications && Array.isArray(storedNotifications)) {
        dispatch({ type: 'LOAD_NOTIFICATIONS_FROM_STORAGE', payload: storedNotifications });
        logger.log('Loaded notifications from storage:', storedNotifications.length);
      }
    } catch (error) {
      logger.error('Failed to load notifications from storage:', error);
    }
  };

  const saveNotificationsToStorage = async () => {
    try {
      await storageService.saveData('OFFLINE_NOTIFICATIONS', state.notifications);
      logger.log('Saved notifications to storage:', state.notifications.length);
    } catch (error) {
      logger.error('Failed to save notifications to storage:', error);
    }
  };

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
      logger.log('Successfully connected to SignalR');
      
    } catch (error) {
      logger.error('Failed to connect to SignalR:', error);
      dispatch({ type: 'SET_CONNECTED', payload: false });
      dispatch({ type: 'SET_ERROR', payload: 'Failed to connect to notification service' });
    }
  };

  const showPushNotification = async (notificationMessage: any) => {
    try {
      // Update badge count based on local unread count
      const currentState = state;
      const newUnreadCount = currentState.notifications.filter(n => !n.isRead).length;
      
      await PushNotificationService.showNotification({
        notificationId: notificationMessage.notificationId,
        type: notificationMessage.type,
        title: notificationMessage.title,
        message: notificationMessage.message,
        data: notificationMessage.data || {},
        priority: notificationMessage.priority || 'default'
      });
      
      logger.log('Push notification shown with badge count:', newUnreadCount);
    } catch (error) {
      logger.error('Failed to show push notification:', error);
    }
  };

  const disconnectFromSignalR = () => {
    try {
      if (notificationHandlerRef.current) {
        notificationHandlerRef.current();
        notificationHandlerRef.current = null;
      }
      
      if (deliveryAcknowledgmentHandlerRef.current) {
        deliveryAcknowledgmentHandlerRef.current();
        deliveryAcknowledgmentHandlerRef.current = null;
      }
      
      WebSocketNotificationService.disconnect();
      dispatch({ type: 'SET_CONNECTED', payload: false });
      logger.log('Disconnected from SignalR');
    } catch (error) {
      logger.error('Error disconnecting from SignalR:', error);
    }
  };

  const reconnect = async (): Promise<void> => {
    try {
      disconnectFromSignalR();
      await connectToSignalR();
    } catch (error) {
      logger.error('Failed to reconnect to SignalR:', error);
      throw error;
    }
  };

  const markAsRead = async (id: string) => {
    try {
      dispatch({ type: 'MARK_AS_READ', payload: id });
      
      // Update badge count
      const newUnreadCount = state.notifications.filter(n => !n.isRead && n.id !== id).length;
      await PushNotificationService.updateBadgeCount(newUnreadCount);
      
      logger.log('Marked notification as read:', id);
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      throw error;
    }
  };

  const markAllAsRead = async () => {
    try {
      dispatch({ type: 'MARK_ALL_AS_READ' });
      
      // Clear badge count
      await PushNotificationService.updateBadgeCount(0);
      
      logger.log('Marked all notifications as read');
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const notificationToDelete = state.notifications.find(n => n.id === id);
      dispatch({ type: 'DELETE_NOTIFICATION', payload: id });
      
      // Update badge count if the deleted notification was unread
      if (notificationToDelete && !notificationToDelete.isRead) {
        const newUnreadCount = state.notifications.filter(n => !n.isRead && n.id !== id).length;
        await PushNotificationService.updateBadgeCount(newUnreadCount);
      }
      
      logger.log('Deleted notification:', id);
    } catch (error) {
      logger.error('Failed to delete notification:', error);
      throw error;
    }
  };

  const refreshNotifications = () => {
    logger.log('Refresh notifications requested');
    // This could be used to manually refresh notifications from the server if needed
  };

  const getConnectionStats = () => {
    return state.connectionStats;
  };

  const recalculateUnreadCount = () => {
    dispatch({ type: 'RECALCULATE_UNREAD_COUNT' });
  };

  const acknowledgeDelivery = async (notificationId: string) => {
    try {
      await WebSocketNotificationService.acknowledgeDelivery(notificationId);
      logger.log('Delivery acknowledgment sent for notification:', notificationId);
    } catch (error) {
      logger.error('Failed to acknowledge delivery:', error);
      throw error;
    }
  };

  const contextValue: NotificationContextType = {
    state,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    reconnect,
    getConnectionStats,
    recalculateUnreadCount,
    acknowledgeDelivery,
    loadNotificationsFromStorage,
    saveNotificationsToStorage
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}; 