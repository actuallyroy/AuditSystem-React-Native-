import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { debugLogger } from '../utils/DebugLogger';
import BadgeService from './BadgeService';

const logger = debugLogger;

export interface PushNotificationData {
  notificationId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  priority?: 'default' | 'normal' | 'high' | 'urgent';
}

class PushNotificationService {
  private isInitialized = false;
  private badgeCount = 0;

  constructor() {
    logger.log('Push notification service initialized');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.log('Push notification service already initialized');
      return;
    }

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        logger.warn('Push notification permissions not granted');
        return;
      }

      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Configure Android-specific settings
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });

        // Create priority-specific channels
        await Notifications.setNotificationChannelAsync('high-priority', {
          name: 'High Priority',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250, 250, 250],
          lightColor: '#FF4444',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });

        await Notifications.setNotificationChannelAsync('urgent', {
          name: 'Urgent',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500, 250, 500, 250, 500],
          lightColor: '#FF0000',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
      }

      this.isInitialized = true;
      logger.log('Push notification service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize push notification service', error);
      throw error;
    }
  }

  async showNotification(notificationData: PushNotificationData): Promise<string> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Increment badge count
      this.badgeCount++;
      await this.updateBadgeCount(this.badgeCount);

      // Determine channel based on priority
      let channelId = 'default';
      if (notificationData.priority === 'high') {
        channelId = 'high-priority';
      } else if (notificationData.priority === 'urgent') {
        channelId = 'urgent';
      }

      // Create notification content
      const notificationContent: Notifications.NotificationContentInput = {
        title: notificationData.title,
        body: notificationData.message,
        data: {
          notificationId: notificationData.notificationId,
          type: notificationData.type,
          ...notificationData.data,
        },
        sound: 'default',
        badge: this.badgeCount,
        priority: notificationData.priority === 'urgent' ? 'high' : 'default',
      };

      // Add Android-specific options
      if (Platform.OS === 'android') {
        (notificationContent as any).android = {
          channelId,
          priority: notificationData.priority === 'urgent' ? 'high' : 'default',
          sound: 'default',
          vibrate: [0, 250, 250, 250],
          color: this.getPriorityColor(notificationData.priority),
          icon: 'ic_launcher',
          largeIcon: 'ic_launcher',
          showTimestamp: true,
          autoCancel: true,
          ongoing: false,
        };
      }

      // Schedule the notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Show immediately
      });

      logger.log('Push notification scheduled', { 
        notificationId, 
        title: notificationData.title,
        badgeCount: this.badgeCount 
      });

      return notificationId;
    } catch (error) {
      logger.error('Failed to show push notification', error);
      throw error;
    }
  }

  async updateBadgeCount(count: number): Promise<void> {
    try {
      this.badgeCount = Math.max(0, count);
      
      if (Platform.OS === 'android') {
        // Use BadgeService for Android badge updates
        await BadgeService.updateBadge(this.badgeCount);
      } else {
        // iOS handles badge count automatically
        await Notifications.setBadgeCountAsync(this.badgeCount);
      }

      logger.log('Badge count updated', { count: this.badgeCount });
    } catch (error) {
      logger.error('Failed to update badge count', error);
    }
  }

  async clearBadge(): Promise<void> {
    try {
      this.badgeCount = 0;
      
      if (Platform.OS === 'android') {
        await BadgeService.clearBadge();
      } else {
        await Notifications.setBadgeCountAsync(0);
      }
      
      logger.log('Badge cleared');
    } catch (error) {
      logger.error('Failed to clear badge', error);
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      logger.log('Notification cancelled', { notificationId });
    } catch (error) {
      logger.error('Failed to cancel notification', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await this.clearBadge();
      logger.log('All notifications cancelled');
    } catch (error) {
      logger.error('Failed to cancel all notifications', error);
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      const count = await Notifications.getBadgeCountAsync();
      this.badgeCount = count;
      return count;
    } catch (error) {
      logger.error('Failed to get badge count', error);
      return this.badgeCount;
    }
  }

  private getPriorityColor(priority?: string): string {
    switch (priority) {
      case 'urgent':
        return '#FF4444';
      case 'high':
        return '#FF8800';
      case 'medium':
        return '#FFCC00';
      case 'low':
        return '#00CC00';
      default:
        return '#0066CC';
    }
  }

  // Get notification icon based on type
  private getNotificationIcon(type: string): string {
    switch (type) {
      case 'audit_assigned':
        return '📋';
      case 'audit_completed':
        return '✅';
      case 'audit_reviewed':
        return '👁️';
      case 'system_alert':
        return '🔔';
      default:
        return '📢';
    }
  }

  // Handle notification response (when user taps notification)
  async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    try {
      const { notificationId, type } = response.notification.request.content.data;
      logger.log('Notification tapped', { notificationId, type });
      
      // Here you can handle navigation or other actions based on notification type
      // For example, navigate to specific screens based on notification type
      
    } catch (error) {
      logger.error('Failed to handle notification response', error);
    }
  }

  // Set up notification response listener
  setupNotificationResponseListener(): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    return () => {
      subscription.remove();
    };
  }

  // Set up notification received listener (for foreground notifications)
  setupNotificationReceivedListener(): () => void {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      logger.log('Notification received in foreground', notification);
    });

    return () => {
      subscription.remove();
    };
  }
}

export default new PushNotificationService(); 