import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { offlineService } from '../services/OfflineService';
import { SyncStatus } from '../services/StorageService';

interface OfflineIndicatorProps {}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = () => {
  const insets = useSafeAreaInsets();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncTime: 0,
    isOnline: false,
    pendingRequests: 0,
    syncInProgress: false,
  });
  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = offlineService.addSyncListener((status) => {
      setSyncStatus(status);
      // Show indicator if offline or has pending requests
      const shouldShow = !status.isOnline || status.pendingRequests > 0 || status.syncInProgress;
      setIsVisible(shouldShow);
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
      setIsVisible(!status.isOnline || status.pendingRequests > 0 || status.syncInProgress);
    };
    getInitialStatus();
    return unsubscribe;
  }, [fadeAnim]);

  let message = '';
  const pending = syncStatus.pendingRequests;
  if (!syncStatus.isOnline) {
    if (pending > 0) {
      message = `Working offline – ${pending} change${pending > 1 ? 's' : ''} will sync when online`;
    } else {
      message = 'Working offline – Changes will sync when online';
    }
  } else if (syncStatus.syncInProgress || pending > 0) {
    if (pending > 0) {
      message = `Syncing ${pending} change${pending > 1 ? 's' : ''}...`;
    } else {
      message = 'Syncing changes...';
    }
  }

  if (!isVisible || !message) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom + 50, // keep your custom offset
          opacity: fadeAnim,
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.bar}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 1000,
    // No background here, only on the bar
  },
  bar: {
    backgroundColor: 'rgba(44, 62, 80, 0.95)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    margin: 8,
    minWidth: 220,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  text: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
});

export default OfflineIndicator; 