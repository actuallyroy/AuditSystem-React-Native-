import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOffline } from '../contexts/OfflineContext';
import { offlineService } from '../services/OfflineService';

const OfflineSettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { isOnline, pendingRequests, syncInProgress, lastSyncTime, performSync, getStorageInfo, clearOfflineData } = useOffline();
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      const info = await getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error('Failed to load storage info:', error);
    }
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline. Please check your internet connection.');
      return;
    }

    setLoading(true);
    try {
      await performSync();
      await loadStorageInfo();
      Alert.alert('Success', 'Sync completed successfully!');
    } catch (error) {
      Alert.alert('Error', 'Sync failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearOfflineData = () => {
    Alert.alert(
      'Clear Offline Data',
      'This will remove all cached data and pending operations. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await clearOfflineData();
              await loadStorageInfo();
              Alert.alert('Success', 'Offline data cleared successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear offline data.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatLastSyncTime = (timestamp: number): string => {
    if (timestamp === 0) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Offline Settings</Text>

        {/* Connection Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#44FF44' : '#FF4444' }]} />
            <Text style={styles.statusText}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        {/* Sync Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync Status</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Sync:</Text>
            <Text style={styles.infoValue}>{formatLastSyncTime(lastSyncTime)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pending Requests:</Text>
            <Text style={styles.infoValue}>{pendingRequests}</Text>
          </View>
          {syncInProgress && (
            <View style={styles.syncInProgress}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.syncInProgressText}>Syncing...</Text>
            </View>
          )}
        </View>

        {/* Storage Information */}
        {storageInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Storage Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Keys:</Text>
              <Text style={styles.infoValue}>{storageInfo.totalKeys}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Offline Data:</Text>
              <Text style={styles.infoValue}>{storageInfo.offlineDataSize} items</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cache:</Text>
              <Text style={styles.infoValue}>{storageInfo.cacheSize} items</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pending Queue:</Text>
              <Text style={styles.infoValue}>{storageInfo.queueSize} operations</Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, (!isOnline || syncInProgress || loading) && styles.disabledButton]}
            onPress={handleManualSync}
            disabled={!isOnline || syncInProgress || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Sync Now</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, loading && styles.disabledButton]}
            onPress={loadStorageInfo}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Refresh Storage Info</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton, loading && styles.disabledButton]}
            onPress={handleClearOfflineData}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Clear Offline Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  syncInProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  syncInProgressText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#6C757D',
  },
  dangerButton: {
    backgroundColor: '#DC3545',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OfflineSettingsScreen; 