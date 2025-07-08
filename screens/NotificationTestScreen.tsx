import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { debugLogger } from '../utils/DebugLogger';
import SignalRService from '../services/SignalRService';

const logger = debugLogger;

export const NotificationTestScreen: React.FC = () => {
  const { state, markAsRead, markAllAsRead, reconnect, getConnectionStats } = useNotifications();
  const { user } = useAuth();
  const [customMessage, setCustomMessage] = useState('');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionStats, setConnectionStats] = useState<any>(null);
  const [isTestingConnectivity, setIsTestingConnectivity] = useState(false);
  const [connectivityTestResult, setConnectivityTestResult] = useState<any>(null);

  // Update connection stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionStats(getConnectionStats());
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [getConnectionStats]);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await reconnect();
      Alert.alert('Success', 'Reconnection attempt completed');
    } catch (error) {
      Alert.alert('Error', 'Reconnection failed');
      logger.error('Reconnection failed', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleTestConnectivity = async () => {
    setIsTestingConnectivity(true);
    try {
      const result = await SignalRService.testWebSocketConnectivity();
      setConnectivityTestResult(result);
      
      if (result.success) {
        Alert.alert('Success', 'WebSocket connectivity test passed!');
      } else {
        Alert.alert('Error', `WebSocket connectivity test failed: ${result.error}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Connectivity test failed');
      logger.error('Connectivity test failed', error);
    } finally {
      setIsTestingConnectivity(false);
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId);
    Alert.alert('Success', 'Notification marked as read');
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    Alert.alert('Success', 'All notifications marked as read');
  };

  const formatUptime = (uptime: number) => {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatLastHeartbeat = (lastHeartbeat: Date | null) => {
    if (!lastHeartbeat) return 'Never';
    const now = new Date();
    const diff = now.getTime() - lastHeartbeat.getTime();
    const seconds = Math.floor(diff / 1000);
    return `${seconds}s ago`;
  };

  const getConnectionStatusColor = () => {
    if (state.isConnected) return '#4CAF50';
    if (state.error) return '#F44336';
    return '#FF9800';
  };

  const getConnectionStatusText = () => {
    if (state.isConnected) return 'Connected';
    if (state.error) return 'Error';
    return 'Disconnected';
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>SignalR Notification Test</Text>

      {/* Connection Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connection Status</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, { backgroundColor: getConnectionStatusColor() }]} />
          <Text style={styles.statusText}>{getConnectionStatusText()}</Text>
        </View>
        
        {state.error && (
          <Text style={styles.errorText}>Error: {state.error}</Text>
        )}

        {state.isConnected && connectionStats && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Connection Statistics:</Text>
            <Text style={styles.statsText}>Uptime: {formatUptime(connectionStats.uptime)}</Text>
            <Text style={styles.statsText}>Reconnect Attempts: {connectionStats.reconnectAttempts}</Text>
            <Text style={styles.statsText}>Last Heartbeat: {formatLastHeartbeat(connectionStats.lastHeartbeat)}</Text>
            <Text style={styles.statsText}>Pending Messages: {connectionStats.pendingMessages}</Text>
          </View>
        )}
      </View>

      {/* Connection Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connection Controls</Text>
        <TouchableOpacity
          style={[styles.button, styles.reconnectButton]}
          onPress={handleReconnect}
          disabled={isReconnecting}
        >
          {isReconnecting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Reconnect</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={handleTestConnectivity}
          disabled={isTestingConnectivity}
        >
          {isTestingConnectivity ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Test WebSocket Connectivity</Text>
          )}
        </TouchableOpacity>

        {connectivityTestResult && (
          <View style={styles.testResultContainer}>
            <Text style={styles.testResultTitle}>Connectivity Test Result:</Text>
            <Text style={[
              styles.testResultText,
              { color: connectivityTestResult.success ? '#4CAF50' : '#F44336' }
            ]}>
              {connectivityTestResult.success ? 'PASSED' : 'FAILED'}
            </Text>
            {connectivityTestResult.error && (
              <Text style={styles.testResultError}>Error: {connectivityTestResult.error}</Text>
            )}
            {connectivityTestResult.details && (
              <Text style={styles.testResultDetails}>
                Details: {JSON.stringify(connectivityTestResult.details, null, 2)}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* User Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Information</Text>
        <Text style={styles.infoText}>User ID: {user?.userId || 'Not available'}</Text>
        <Text style={styles.infoText}>Username: {user?.username || 'Not available'}</Text>
        <Text style={styles.infoText}>Authenticated: {user ? 'Yes' : 'No'}</Text>
      </View>

      {/* Notification Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Controls</Text>
        <TouchableOpacity
          style={[styles.button, styles.markAllButton]}
          onPress={handleMarkAllAsRead}
        >
          <Text style={styles.buttonText}>Mark All as Read</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Notifications ({state.notifications.length})
        </Text>
        <Text style={styles.infoText}>Unread: {state.unreadCount}</Text>
        
        {state.notifications.length === 0 ? (
          <Text style={styles.emptyText}>No notifications received</Text>
        ) : (
          state.notifications.map((notification, index) => (
            <View key={notification.id} style={styles.notificationItem}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationType}>{notification.type}</Text>
              </View>
              <Text style={styles.notificationMessage}>{notification.message}</Text>
              <View style={styles.notificationFooter}>
                <Text style={styles.notificationTime}>
                  {new Date(notification.timestamp).toLocaleString()}
                </Text>
                <View style={styles.notificationActions}>
                  {!notification.isRead && (
                    <TouchableOpacity
                      style={styles.markReadButton}
                      onPress={() => handleMarkAsRead(notification.id)}
                    >
                      <Text style={styles.markReadButtonText}>Mark Read</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={[
                    styles.readStatus,
                    { color: notification.isRead ? '#4CAF50' : '#FF9800' }
                  ]}>
                    {notification.isRead ? 'Read' : 'Unread'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Last Update */}
      {state.lastUpdate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last Update</Text>
          <Text style={styles.infoText}>
            {state.lastUpdate.toLocaleString()}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    marginTop: 8,
  },
  statsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  button: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  reconnectButton: {
    backgroundColor: '#2196F3',
  },
  testButton: {
    backgroundColor: '#9C27B0',
  },
  markAllButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  notificationItem: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  notificationType: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markReadButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  markReadButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  readStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  testResultContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  testResultTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  testResultText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  testResultError: {
    fontSize: 14,
    color: '#F44336',
    marginBottom: 8,
  },
  testResultDetails: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
}); 