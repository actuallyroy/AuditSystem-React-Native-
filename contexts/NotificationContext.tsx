import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import SignalRService, { SignalRConnection } from '../services/SignalRService';
import { useAuth } from './AuthContext';
import { debugLogger } from '../utils/DebugLogger';
import { getSignalRConfig } from '../config/signalR';

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
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

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
  error: null
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
          unreadCount: state.unreadCount + (action.payload.isRead ? 0 : 1),
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
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  refreshNotifications: () => void;
  reconnect: () => Promise<void>;
  getConnectionStats: () => any;
}

// Create context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Provider component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const { user, isAuthenticated } = useAuth();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const connectionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationHandlerRef = useRef<(() => void) | null>(null);

  // Handle authentication changes
  useEffect(() => {
    if (isAuthenticated && user?.token) {
      connectToSignalR();
    } else {
      disconnectFromSignalR();
    }

    return () => {
      disconnectFromSignalR();
    };
  }, [isAuthenticated, user?.token]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        logger.log('App came to foreground, checking SignalR connection');
        if (isAuthenticated && user?.token) {
          connectToSignalR();
        }
      } else if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App has gone to the background
        logger.log('App went to background');
        // Don't disconnect immediately, let SignalR handle reconnection
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isAuthenticated, user?.token]);

  // Set up periodic connection stats updates
  useEffect(() => {
    const updateStats = () => {
      const stats = SignalRService.getConnectionStats();
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

      logger.log('Connecting to SignalR');
      
      // Connect to SignalR
      await SignalRService.connect(user.token);
      
      // Subscribe to user notifications
      if (user.userId) {
        await SignalRService.subscribeToUser(user.userId);
      }
      
      // Join organisation group if available
      if (user.organisationId) {
        await SignalRService.joinOrganisation(user.organisationId);
      }

      // Set up notification handler
      if (notificationHandlerRef.current) {
        notificationHandlerRef.current(); // Cleanup previous handler
      }
      
      const cleanup = SignalRService.onNotification((notification) => {
        dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
      });
      
      notificationHandlerRef.current = cleanup;

      dispatch({ type: 'SET_CONNECTED', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      logger.log('SignalR connection established successfully');

    } catch (error) {
      logger.error('Failed to connect to SignalR', error);
      dispatch({ type: 'SET_CONNECTED', payload: false });
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Connection failed' });
    }
  };

  const disconnectFromSignalR = () => {
    try {
      SignalRService.disconnect();
      if (notificationHandlerRef.current) {
        notificationHandlerRef.current();
        notificationHandlerRef.current = null;
      }
      dispatch({ type: 'SET_CONNECTED', payload: false });
      logger.log('Disconnected from SignalR');
    } catch (error) {
      logger.error('Error disconnecting from SignalR', error);
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
      
      // TODO: Call API to mark as read on server
      // await notificationService.markAsRead(id);
      
    } catch (error) {
      logger.error('Failed to mark notification as read', error);
    }
  };

  const markAllAsRead = () => {
    try {
      dispatch({ type: 'MARK_ALL_AS_READ' });
      
      // TODO: Call API to mark all as read on server
      // await notificationService.markAllAsRead();
      
    } catch (error) {
      logger.error('Failed to mark all notifications as read', error);
    }
  };

  const deleteNotification = (id: string) => {
    try {
      dispatch({ type: 'DELETE_NOTIFICATION', payload: id });
      
      // TODO: Call API to delete notification on server
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
    return SignalRService.getConnectionStats();
  };

  const value: NotificationContextType = {
    state,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    reconnect,
    getConnectionStats,
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