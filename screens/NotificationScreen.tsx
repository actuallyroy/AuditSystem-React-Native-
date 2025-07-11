import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotifications } from '../contexts/NotificationContext';
import { useDevMode } from '../contexts/DevModeContext';
import { debugLogger } from '../utils/DebugLogger';

interface NotificationScreenProps {
  navigation: any;
}

const NotificationScreen: React.FC<NotificationScreenProps> = ({ navigation }) => {
  const { state, markAsRead, markAllAsRead, deleteNotification, loadNotificationsFromStorage } = useNotifications();
  const { notifications, unreadCount, connectionStats, isConnected, deliveryAcknowledgedCount } = state;
  const { isDevModeEnabled } = useDevMode();
  const [refreshing, setRefreshing] = useState(false);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = () => {
    Alert.alert(
      'Mark All as Read',
      'Are you sure you want to mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark All Read', onPress: async () => {
          try {
            await markAllAsRead();
          } catch (error) {
            console.error('Failed to mark all as read:', error);
          }
        }},
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => {
          // Clear all notifications by deleting them one by one
          notifications.forEach(notification => {
            deleteNotification(notification.id);
          });
        }},
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadNotificationsFromStorage();
      debugLogger.log('[NotificationScreen] Refresh completed');
    } catch (error) {
      debugLogger.error('[NotificationScreen] Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
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
        return '#666666';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'assignment':
      case 'audit_assigned':
        return '📋';
      case 'audit_completed':
        return '✅';
      case 'audit_approved':
        return '👍';
      case 'audit_rejected':
        return '❌';
      case 'system':
      case 'system_alert':
        return '🔔';
      case 'test':
        return '🧪';
      default:
        return '📢';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        return `${hours}h ago`;
      } else {
        const days = Math.floor(diffInMinutes / 1440);
        return `${days}d ago`;
      }
    } catch (error) {
      return 'Unknown time';
    }
  };

  const renderNotification = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.isRead && styles.unreadNotification,
      ]}
      onPress={() => handleMarkAsRead(item.id)}
    >
      <View style={styles.notificationHeader}>
        <Text style={styles.typeIcon}>{getTypeIcon(item.type)}</Text>
        <View style={styles.notificationInfo}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationTime}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
        <View
          style={[
            styles.priorityIndicator,
            { backgroundColor: getPriorityColor(item.priority || 'medium') },
          ]}
        />
      </View>
      <Text style={styles.notificationMessage}>{item.message}</Text>
      
      {/* Delivery acknowledgment status */}
      <View style={styles.deliveryStatusContainer}>
        {item.deliveryAcknowledged ? (
          <View style={styles.deliveryAcknowledged}>
            <Text style={styles.deliveryStatusText}>✓ Delivered</Text>
            {item.acknowledgedAt && (
              <Text style={styles.acknowledgmentTime}>
                {formatTimestamp(item.acknowledgedAt)}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.deliveryPending}>
            <Text style={styles.deliveryStatusText}>⏳ Pending delivery</Text>
          </View>
        )}
      </View>
      
      {item.data && Object.keys(item.data).length > 0 && (
        <View style={styles.metadataContainer}>
          <Text style={styles.metadataTitle}>Additional Info:</Text>
          {Object.entries(item.data).map(([key, value]) => (
            <Text key={key} style={styles.metadataItem}>
              {key}: {String(value)}
            </Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>🔔</Text>
      <Text style={styles.emptyStateTitle}>No Notifications</Text>
      <Text style={styles.emptyStateMessage}>
        You'll see notifications here when you receive them.
      </Text>
      {isDevModeEnabled && (
        <View style={styles.connectionStatus}>
          <Text style={styles.connectionStatusText}>
            WebSocket Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </Text>
          <Text style={styles.connectionId}>
            Uptime: {Math.floor(connectionStats.uptime / 1000)}s | Reconnects: {connectionStats.reconnectAttempts}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Mark All Read</Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.statusBar}>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount} unread</Text>
          </View>
        )}
        {deliveryAcknowledgedCount > 0 && (
          <View style={styles.deliveryBadge}>
            <Text style={styles.deliveryBadgeText}>{deliveryAcknowledgedCount} delivered</Text>
          </View>
        )}
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        style={styles.notificationList}
        contentContainerStyle={
          notifications.length === 0 ? styles.emptyListContainer : undefined
        }
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0066CC',
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  deliveryBadge: {
    backgroundColor: '#00CC00',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deliveryBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationList: {
    flex: 1,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationItem: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e1e5e9',
  },
  unreadNotification: {
    borderLeftColor: '#0066CC',
    backgroundColor: '#f8f9ff',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666666',
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  metadataContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  metadataTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
  },
  metadataItem: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  deliveryStatusContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  deliveryAcknowledged: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryPending: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  acknowledgmentTime: {
    fontSize: 11,
    color: '#666666',
  },
  connectionStatus: {
    alignItems: 'center',
  },
  connectionStatusText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  connectionId: {
    fontSize: 12,
    color: '#999999',
  },
});

export default NotificationScreen; 