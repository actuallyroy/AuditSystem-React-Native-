import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useDevMode } from '../contexts/DevModeContext';
import { storageService } from '../services/StorageService';
import { debugLogger } from '../utils/DebugLogger';

interface SystemInfo {
  appState: AppStateStatus;
  isAuthenticated: boolean;
  tokenValidating: boolean;
  loading: boolean;
  devModeEnabled: boolean;
  notificationConnection: boolean;
  lastSyncTime: number;
  storageKeys: number;
  appVersion: string;
  buildNumber: string;
}

const AppStateMonitorScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, isAuthenticated, loading, tokenValidating } = useAuth();
  const { state: notificationState } = useNotifications();
  const { isDevModeEnabled } = useDevMode();
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  const loadSystemInfo = async () => {
    try {
      const allKeys = await storageService.getAllKeys();
      const lastSyncTime = await storageService.getLastSyncTime();
      
      const info: SystemInfo = {
        appState,
        isAuthenticated,
        tokenValidating,
        loading,
        devModeEnabled: isDevModeEnabled,
        notificationConnection: notificationState.isConnected,
        lastSyncTime,
        storageKeys: allKeys.length,
        appVersion: '1.0.0',
        buildNumber: '2025062501',
      };
      
      setSystemInfo(info);
      debugLogger.log('System info loaded', info);
    } catch (error) {
      debugLogger.error('Error loading system info:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSystemInfo();
    setRefreshing(false);
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will clear all stored data and log you out. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const allKeys = await storageService.getAllKeys();
              for (const key of allKeys) {
                await storageService.removeData(key);
              }
              Alert.alert('Success', 'All data cleared. Please restart the app.');
            } catch (error) {
              debugLogger.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const testTokenValidity = async () => {
    try {
      const { authService } = require('../services/AuthService');
      const result = await authService.testTokenValidity();
      Alert.alert(
        'Token Test Result',
        `Valid: ${result ? 'Yes' : 'No'}\n\nThis test validates the current authentication token.`
      );
    } catch (error) {
      Alert.alert('Token Test Error', `Failed to test token: ${error}`);
    }
  };

  const showUserDetails = () => {
    if (!user) {
      Alert.alert('No User', 'No user information available');
      return;
    }

    Alert.alert(
      'User Details',
      `ID: ${user.userId}\nName: ${user.firstName} ${user.lastName}\nUsername: ${user.username}\nRole: ${user.role}\nEmail: ${user.email || 'N/A'}\nOrganisation: ${user.organisationId || 'N/A'}`,
      [{ text: 'OK' }]
    );
  };

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    loadSystemInfo();

    return () => subscription?.remove();
  }, [isAuthenticated, loading, tokenValidating, isDevModeEnabled, notificationState.isConnected]);

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getStatusIcon = (status: boolean) => status ? '🟢' : '🔴';
  const getStatusText = (status: boolean) => status ? 'Active' : 'Inactive';

  const renderSystemStatus = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>System Status</Text>
      
      {systemInfo && (
        <View style={styles.statusGrid}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>App State</Text>
            <Text style={styles.statusValue}>{systemInfo.appState}</Text>
          </View>

          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Authentication</Text>
            <View style={styles.statusValue}>
              <Text style={styles.statusIcon}>{getStatusIcon(systemInfo.isAuthenticated)}</Text>
              <Text style={styles.statusText}>{getStatusText(systemInfo.isAuthenticated)}</Text>
            </View>
          </View>

          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Token Validating</Text>
            <View style={styles.statusValue}>
              <Text style={styles.statusIcon}>{systemInfo.tokenValidating ? '🟡' : '⚪'}</Text>
              <Text style={styles.statusText}>{systemInfo.tokenValidating ? 'Validating' : 'Idle'}</Text>
            </View>
          </View>

          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Loading</Text>
            <View style={styles.statusValue}>
              <Text style={styles.statusIcon}>{systemInfo.loading ? '🟡' : '⚪'}</Text>
              <Text style={styles.statusText}>{systemInfo.loading ? 'Loading' : 'Ready'}</Text>
            </View>
          </View>

          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Dev Mode</Text>
            <View style={styles.statusValue}>
              <Text style={styles.statusIcon}>{getStatusIcon(systemInfo.devModeEnabled)}</Text>
              <Text style={styles.statusText}>{getStatusText(systemInfo.devModeEnabled)}</Text>
            </View>
          </View>

          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Notifications</Text>
            <View style={styles.statusValue}>
              <Text style={styles.statusIcon}>{getStatusIcon(systemInfo.notificationConnection)}</Text>
              <Text style={styles.statusText}>{getStatusText(systemInfo.notificationConnection)}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderUserInfo = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>User Information</Text>
        <TouchableOpacity onPress={showUserDetails} style={styles.actionButton}>
          <Ionicons name="information-circle" size={16} color="#0066CC" />
          <Text style={styles.actionButtonText}>Details</Text>
        </TouchableOpacity>
      </View>
      
      {user ? (
        <View style={styles.userInfo}>
          <View style={styles.userRow}>
            <Text style={styles.userLabel}>Name:</Text>
            <Text style={styles.userValue}>{user.firstName} {user.lastName}</Text>
          </View>
          <View style={styles.userRow}>
            <Text style={styles.userLabel}>Username:</Text>
            <Text style={styles.userValue}>{user.username}</Text>
          </View>
          <View style={styles.userRow}>
            <Text style={styles.userLabel}>Role:</Text>
            <Text style={styles.userValue}>{user.role}</Text>
          </View>
          <View style={styles.userRow}>
            <Text style={styles.userLabel}>User ID:</Text>
            <Text style={styles.userValue}>{user.userId}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.noUserText}>No user information available</Text>
      )}
    </View>
  );

  const renderSystemInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>System Information</Text>
      
      {systemInfo && (
        <View style={styles.systemInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version:</Text>
            <Text style={styles.infoValue}>{systemInfo.appVersion}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Build Number:</Text>
            <Text style={styles.infoValue}>{systemInfo.buildNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Storage Keys:</Text>
            <Text style={styles.infoValue}>{systemInfo.storageKeys}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Sync:</Text>
            <Text style={styles.infoValue}>{formatTimestamp(systemInfo.lastSyncTime)}</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Actions</Text>
      
      <TouchableOpacity style={styles.actionItem} onPress={testTokenValidity}>
        <Ionicons name="shield-checkmark-outline" size={24} color="#0066CC" />
        <Text style={styles.actionItemText}>Test Token Validity</Text>
        <Ionicons name="chevron-forward" size={20} color="#6c757d" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem} onPress={onRefresh}>
        <Ionicons name="refresh-outline" size={24} color="#0066CC" />
        <Text style={styles.actionItemText}>Refresh System Info</Text>
        <Ionicons name="chevron-forward" size={20} color="#6c757d" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem} onPress={clearAllData}>
        <Ionicons name="trash-outline" size={24} color="#dc3545" />
        <Text style={[styles.actionItemText, styles.dangerText]}>Clear All Data</Text>
        <Ionicons name="chevron-forward" size={20} color="#6c757d" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0066CC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App State Monitor</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderSystemStatus()}
        {renderUserInfo()}
        {renderSystemInfo()}
        {renderActions()}
      </ScrollView>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f8f9fa',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#0066CC',
    marginLeft: 4,
  },
  statusGrid: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666666',
  },
  statusValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  userInfo: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userLabel: {
    fontSize: 14,
    color: '#666666',
  },
  userValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  noUserText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  systemInfo: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionItemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333333',
  },
  dangerText: {
    color: '#dc3545',
  },
});

export default AppStateMonitorScreen; 