import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotifications } from '../contexts/NotificationContext';
import { debugLogger } from '../utils/DebugLogger';

interface NotificationScreenProps {
  navigation: any;
}

const NotificationScreen: React.FC<NotificationScreenProps> = ({ navigation }) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    connectionStats,
  } = useNotifications();

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId);
  };

  const handleMarkAllAsRead = () => {
    Alert.alert(
      'Mark All as Read',
      'Are you sure you want to mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark All Read', onPress: markAllAsRead },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: clearNotifications },
      ]
    );
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
        return '📋';
      case 'audit_completed':
        return '✅';
      case 'audit_approved':
        return '👍';
      case 'audit_rejected':
        return '❌';
      case 'system':
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
        !item.read && styles.unreadNotification,
      ]}
      onPress={() => handleMarkAsRead(item.notificationId)}
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
            { backgroundColor: getPriorityColor(item.priority) },
          ]}
        />
      </View>
      <Text style={styles.notificationMessage}>{item.message}</Text>
      {item.metadata && Object.keys(item.metadata).length > 0 && (
        <View style={styles.metadataContainer}>
          <Text style={styles.metadataTitle}>Additional Info:</Text>
          {Object.entries(item.metadata).map(([key, value]) => (
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
      <View style={styles.connectionStatus}>
        <Text style={styles.connectionStatusText}>
          SignalR Status: {connectionStats.isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </Text>
        {connectionStats.connectionId && (
          <Text style={styles.connectionId}>
            ID: {connectionStats.connectionId}
          </Text>
        )}
      </View>
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

      {unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>{unreadCount} unread</Text>
        </View>
      )}

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.notificationId}
        style={styles.notificationList}
        contentContainerStyle={
          notifications.length === 0 ? styles.emptyListContainer : undefined
        }
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              debugLogger.log('[NotificationScreen] Refresh requested');
            }}
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
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  unreadBadgeText: {
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