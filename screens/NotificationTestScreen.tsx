import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotifications } from '../contexts/NotificationContext';
import WebSocketNotificationService from '../services/WebSocketNotificationService';
import { debugLogger } from '../utils/DebugLogger';

const NotificationTestScreen: React.FC = () => {
  const { state, acknowledgeDelivery } = useNotifications();
  const { notifications, unreadCount, isConnected, deliveryAcknowledgedCount } = state;
  const [testMessage, setTestMessage] = useState('');
  const [selectedNotificationId, setSelectedNotificationId] = useState('');

  const handleSendTestMessage = async () => {
    if (!testMessage.trim()) {
      Alert.alert('Error', 'Please enter a test message');
      return;
    }

    try {
      await WebSocketNotificationService.sendTestMessage(testMessage);
      setTestMessage('');
      Alert.alert('Success', 'Test message sent successfully');
    } catch (error) {
      Alert.alert('Error', `Failed to send test message: ${error}`);
    }
  };

  const handleManualAcknowledge = async () => {
    if (!selectedNotificationId) {
      Alert.alert('Error', 'Please select a notification to acknowledge');
      return;
    }

    try {
      await acknowledgeDelivery(selectedNotificationId);
      Alert.alert('Success', 'Delivery acknowledgment sent successfully');
    } catch (error) {
      Alert.alert('Error', `Failed to acknowledge delivery: ${error}`);
    }
  };

  const handleTestConnectivity = async () => {
    try {
      const result = await WebSocketNotificationService.testWebSocketConnectivity();
      if (result.success) {
        Alert.alert('Success', 'WebSocket connectivity test passed');
      } else {
        Alert.alert('Error', `Connectivity test failed: ${result.error}`);
      }
    } catch (error) {
      Alert.alert('Error', `Connectivity test failed: ${error}`);
    }
  };

  const getConnectionStats = () => {
    return WebSocketNotificationService.getConnectionStats();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Notification Test Screen</Text>

        {/* Connection Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>WebSocket:</Text>
            <Text style={[styles.statusValue, { color: isConnected ? '#00CC00' : '#FF4444' }]}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Unread Count:</Text>
            <Text style={styles.statusValue}>{unreadCount}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Delivered Count:</Text>
            <Text style={styles.statusValue}>{deliveryAcknowledgedCount}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Total Notifications:</Text>
            <Text style={styles.statusValue}>{notifications.length}</Text>
          </View>
        </View>

        {/* Connection Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Statistics</Text>
          {Object.entries(getConnectionStats()).map(([key, value]) => (
            <View key={key} style={styles.statusRow}>
              <Text style={styles.statusLabel}>{key}:</Text>
              <Text style={styles.statusValue}>
                {value instanceof Date ? value.toLocaleTimeString() : String(value)}
              </Text>
            </View>
          ))}
        </View>

        {/* Test Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Actions</Text>
          
          <TouchableOpacity style={styles.button} onPress={handleTestConnectivity}>
            <Text style={styles.buttonText}>Test Connectivity</Text>
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter test message"
              value={testMessage}
              onChangeText={setTestMessage}
              multiline
            />
            <TouchableOpacity style={styles.button} onPress={handleSendTestMessage}>
              <Text style={styles.buttonText}>Send Test Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Manual Delivery Acknowledgment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manual Delivery Acknowledgment</Text>
          
          <Text style={styles.subtitle}>Select a notification to acknowledge:</Text>
          <ScrollView style={styles.notificationSelector} horizontal>
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationOption,
                  selectedNotificationId === notification.id && styles.selectedNotification,
                  notification.deliveryAcknowledged && styles.acknowledgedNotification
                ]}
                onPress={() => setSelectedNotificationId(notification.id)}
              >
                <Text style={styles.notificationOptionText} numberOfLines={1}>
                  {notification.title}
                </Text>
                <Text style={styles.notificationOptionStatus}>
                  {notification.deliveryAcknowledged ? '✓' : '⏳'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedNotificationId && (
            <TouchableOpacity style={styles.button} onPress={handleManualAcknowledge}>
              <Text style={styles.buttonText}>Acknowledge Delivery</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recent Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Notifications</Text>
          {notifications.slice(0, 5).map((notification) => (
            <View key={notification.id} style={styles.notificationItem}>
              <Text style={styles.notificationTitle}>{notification.title}</Text>
              <Text style={styles.notificationMessage}>{notification.message}</Text>
              <View style={styles.notificationMeta}>
                <Text style={styles.notificationTime}>
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </Text>
                <Text style={[
                  styles.deliveryStatus,
                  { color: notification.deliveryAcknowledged ? '#00CC00' : '#FF8800' }
                ]}>
                  {notification.deliveryAcknowledged ? '✓ Delivered' : '⏳ Pending'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#ffffff',
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
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  button: {
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginVertical: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputContainer: {
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    fontSize: 14,
    backgroundColor: '#ffffff',
    minHeight: 60,
  },
  notificationSelector: {
    marginBottom: 12,
  },
  notificationOption: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 6,
    padding: 8,
    marginRight: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  selectedNotification: {
    borderColor: '#0066CC',
    backgroundColor: '#e6f3ff',
  },
  acknowledgedNotification: {
    borderColor: '#00CC00',
    backgroundColor: '#f0fff0',
  },
  notificationOptionText: {
    fontSize: 12,
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  notificationOptionStatus: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  notificationItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  notificationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 11,
    color: '#999999',
  },
  deliveryStatus: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default NotificationTestScreen; 