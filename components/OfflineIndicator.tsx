import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { offlineService } from '../services/OfflineService';
import { SyncStatus } from '../services/StorageService';

interface OfflineIndicatorProps {
  onSyncPress?: () => void;
  showDetails?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  onSyncPress,
  showDetails = false,
}) => {
  const insets = useSafeAreaInsets();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncTime: 0,
    isOnline: false,
    pendingRequests: 0,
    syncInProgress: false,
  });
  const [isVisible, setIsVisible] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(showDetails);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = offlineService.addSyncListener((status) => {
      setSyncStatus(status);
      
      // Show indicator if offline or has pending requests
      const shouldShow = !status.isOnline || status.pendingRequests > 0;
      setIsVisible(shouldShow);
      
      // Animate in/out
      Animated.timing(fadeAnim, {
        toValue: shouldShow ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });

    // Get initial status
    const getInitialStatus = async () => {
      const status = await offlineService.getSyncStatus();
      setSyncStatus(status);
      setIsVisible(!status.isOnline || status.pendingRequests > 0);
    };
    
    getInitialStatus();

    return unsubscribe;
  }, [fadeAnim]);

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

  const handleSyncPress = async () => {
    if (onSyncPress) {
      onSyncPress();
    } else {
      // Default sync behavior
      if (syncStatus.isOnline && syncStatus.pendingRequests > 0) {
        await offlineService.performManualSync();
      }
    }
  };

  const getStatusColor = (): string => {
    if (syncStatus.syncInProgress) return '#FFA500'; // Orange for syncing
    if (!syncStatus.isOnline) return '#FF4444'; // Red for offline
    if (syncStatus.pendingRequests > 0) return '#FF8800'; // Orange for pending
    return '#44FF44'; // Green for online
  };

  const getStatusText = (): string => {
    if (syncStatus.syncInProgress) return 'Syncing...';
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.pendingRequests > 0) return `${syncStatus.pendingRequests} pending`;
    return 'Online';
  };

  const getStatusIcon = (): React.ReactNode => {
    if (syncStatus.syncInProgress) {
      return <ActivityIndicator size="small" color="#FFFFFF" />;
    }
    return (
      <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
    );
  };

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 10,
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.statusContainer}>
          {getStatusIcon()}
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>

        {showFullDetails && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailText}>
              Last sync: {formatLastSyncTime(syncStatus.lastSyncTime)}
            </Text>
            {syncStatus.pendingRequests > 0 && (
              <Text style={styles.detailText}>
                {syncStatus.pendingRequests} operation(s) pending
              </Text>
            )}
          </View>
        )}

        {syncStatus.isOnline && syncStatus.pendingRequests > 0 && !syncStatus.syncInProgress && (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSyncPress}
            activeOpacity={0.7}
          >
            <Text style={styles.syncButtonText}>Sync Now</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setShowFullDetails(!showFullDetails)}
          activeOpacity={0.7}
        >
          <Text style={styles.toggleButtonText}>
            {showFullDetails ? '−' : '+'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 16,
  },
  detailText: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
  },
  syncButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  toggleButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  toggleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OfflineIndicator; 