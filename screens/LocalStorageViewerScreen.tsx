import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { storageService } from '../services/StorageService';
import { debugLogger } from '../utils/DebugLogger';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StorageItem {
  key: string;
  value: any;
  size: number;
  category: string;
}

interface StorageCategory {
  name: string;
  items: StorageItem[];
  totalSize: number;
}

const LocalStorageViewerScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [storageData, setStorageData] = useState<StorageCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadStorageData = async () => {
    try {
      setLoading(true);
      const allKeys = await storageService.getAllKeys();
      const categories: { [key: string]: StorageItem[] } = {};
      let totalSize = 0;

      for (const key of allKeys) {
        try {
          let valueRaw = await AsyncStorage.getItem(key);
          let value;
          try {
            if (
              valueRaw &&
              (
                valueRaw.trim().startsWith('{') ||
                valueRaw.trim().startsWith('[') ||
                valueRaw.trim() === 'true' ||
                valueRaw.trim() === 'false' ||
                valueRaw.trim() === 'null' ||
                (!isNaN(Number(valueRaw.trim())) && valueRaw.trim() !== '')
              )
            ) {
              value = JSON.parse(valueRaw);
            } else {
              value = valueRaw;
            }
          } catch (e) {
            value = valueRaw;
          }
          const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
          const size = new Blob([valueStr]).size;
          totalSize += size;

          const category = getCategoryForKey(key);
          if (!categories[category]) {
            categories[category] = [];
          }

          categories[category].push({
            key,
            value,
            size,
            category,
          });
        } catch (error) {
          debugLogger.error(`Error loading key ${key}:`, error);
        }
      }

      // Convert to array and sort by total size
      const categoryArray: StorageCategory[] = Object.entries(categories).map(([name, items]) => ({
        name,
        items: items.sort((a, b) => b.size - a.size),
        totalSize: items.reduce((sum, item) => sum + item.size, 0),
      })).sort((a, b) => b.totalSize - a.totalSize);

      setStorageData(categoryArray);
      debugLogger.log('Storage data loaded', { 
        totalKeys: allKeys.length, 
        totalSize: formatBytes(totalSize),
        categories: categoryArray.length 
      });
    } catch (error) {
      debugLogger.error('Error loading storage data:', error);
      Alert.alert('Error', 'Failed to load storage data');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryForKey = (key: string): string => {
    if (key.includes('auth') || key.includes('token') || key.includes('user')) {
      return 'Authentication';
    } else if (key.includes('offline') || key.includes('sync')) {
      return 'Offline Data';
    } else if (key.includes('cache')) {
      return 'Cache';
    } else if (key.includes('notification')) {
      return 'Notifications';
    } else if (key.includes('dev_mode')) {
      return 'Developer Settings';
    } else if (key.includes('audit') || key.includes('assignment')) {
      return 'Audit Data';
    } else {
      return 'Other';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') {
      return value.length > 100 ? value.substring(0, 100) + '...' : value;
    }
    if (typeof value === 'object') {
      const str = JSON.stringify(value, null, 2);
      return str.length > 200 ? str.substring(0, 200) + '...' : str;
    }
    return String(value);
  };

  const clearCategory = (categoryName: string) => {
    Alert.alert(
      'Clear Category',
      `Are you sure you want to clear all data in "${categoryName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const category = storageData.find(c => c.name === categoryName);
              if (!category) return;

              for (const item of category.items) {
                await storageService.removeData(item.key);
              }

              await loadStorageData();
              Alert.alert('Success', `Cleared ${category.items.length} items from ${categoryName}`);
            } catch (error) {
              debugLogger.error('Error clearing category:', error);
              Alert.alert('Error', 'Failed to clear category');
            }
          },
        },
      ]
    );
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear ALL stored data? This will log you out and reset the app. This action cannot be undone.',
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
              await loadStorageData();
              Alert.alert('Success', 'All data cleared successfully');
            } catch (error) {
              debugLogger.error('Error clearing all data:', error);
              Alert.alert('Error', 'Failed to clear all data');
            }
          },
        },
      ]
    );
  };

  const testAuthStorage = async () => {
    try {
      const result = await storageService.testAuthStorage();
      console.log('Auth Storage Test Result:', result);
      
      Alert.alert(
        'Auth Storage Test',
        `Success: ${result.success ? 'YES' : 'NO'}\n\n` +
        `Stored: ${result.stored ? `Token: ${result.stored.token.substring(0, 10)}..., UserId: ${result.stored.userId}` : 'N/A'}\n\n` +
        `Retrieved: ${result.retrieved ? `Token: ${result.retrieved.token ? 'EXISTS' : 'NULL'}, UserId: ${result.retrieved.userId ? 'EXISTS' : 'NULL'}` : 'N/A'}\n\n` +
        `${result.error ? `Error: ${result.error}` : 'No errors'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      debugLogger.error('Error testing auth storage:', error);
      Alert.alert('Error', 'Failed to test auth storage');
    }
  };

  const forceRestoreAuthData = async () => {
    try {
      await storageService.forceRestoreAuthData();
      await loadStorageData();
      Alert.alert('Success', 'Auth data force restored successfully');
    } catch (error) {
      debugLogger.error('Error force restoring auth data:', error);
      Alert.alert('Error', 'Failed to force restore auth data');
    }
  };

  const debugAuthStorage = async () => {
    try {
      const debugInfo = await storageService.debugAuthStorage();
      console.log('Auth Storage Debug Info:', debugInfo);
      
      Alert.alert(
        'Auth Storage Debug',
        `Auth Token: ${debugInfo.authToken ? 'EXISTS' : 'NULL'}\n` +
        `User ID: ${debugInfo.userId ? 'EXISTS' : 'NULL'}\n` +
        `User Data: ${debugInfo.userData ? 'EXISTS' : 'NULL'}\n` +
        `Is Authenticated: ${debugInfo.isAuthenticated}\n` +
        `Total Keys: ${debugInfo.allKeys.length}\n\n` +
        `User Data Token: ${debugInfo.userData?.token ? 'EXISTS' : 'NULL'}\n` +
        `User Data UserId: ${debugInfo.userData?.userId ? 'EXISTS' : 'NULL'}`,
        [
          { text: 'OK' },
          { 
            text: 'Sync Now', 
            onPress: async () => {
              await syncAuthData();
            }
          },
          {
            text: 'Force Restore',
            onPress: async () => {
              await forceRestoreAuthData();
            }
          }
        ]
      );
    } catch (error) {
      debugLogger.error('Error debugging auth storage:', error);
      Alert.alert('Error', 'Failed to debug auth storage');
    }
  };

  const syncAuthData = async () => {
    try {
      await storageService.syncAuthData();
      await loadStorageData();
      Alert.alert('Success', 'Auth data synchronized successfully');
    } catch (error) {
      debugLogger.error('Error syncing auth data:', error);
      Alert.alert('Error', 'Failed to sync auth data');
    }
  };

  const filteredData = storageData.filter(category => {
    if (selectedCategory && category.name !== selectedCategory) return false;
    if (!searchQuery) return true;
    
    return category.items.some(item => 
      item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(item.value).toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  useEffect(() => {
    loadStorageData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStorageData();
    setRefreshing(false);
  };

  const renderStorageItem = (item: StorageItem) => (
    <View key={item.key} style={styles.storageItem}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemKey}>{item.key}</Text>
        <Text style={styles.itemSize}>{formatBytes(item.size)}</Text>
      </View>
      <Text style={styles.itemValue}>{formatValue(item.value)}</Text>
    </View>
  );

  const renderCategory = (category: StorageCategory) => (
    <View key={category.name} style={styles.category}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{category.name}</Text>
          <Text style={styles.categoryStats}>
            {category.items.length} items • {formatBytes(category.totalSize)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => clearCategory(category.name)}
        >
          <Ionicons name="trash-outline" size={16} color="#dc3545" />
        </TouchableOpacity>
      </View>
      {category.items.map(renderStorageItem)}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#0066CC" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Local Storage</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading storage data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0066CC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Local Storage</Text>
        <TouchableOpacity onPress={debugAuthStorage} style={styles.debugButton}>
          <Ionicons name="bug" size={20} color="#ffc107" />
        </TouchableOpacity>
        <TouchableOpacity onPress={testAuthStorage} style={styles.testAuthButton}>
          <Ionicons name="flask" size={20} color="#4CAF50" />
        </TouchableOpacity>
        <TouchableOpacity onPress={forceRestoreAuthData} style={styles.forceRestoreButton}>
          <Ionicons name="refresh-circle" size={20} color="#17a2b8" />
        </TouchableOpacity>
        <TouchableOpacity onPress={syncAuthData} style={styles.syncButton}>
          <Ionicons name="refresh" size={20} color="#28a745" />
        </TouchableOpacity>
        <TouchableOpacity onPress={clearAllData} style={styles.clearAllButton}>
          <Ionicons name="trash" size={20} color="#dc3545" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search keys or values..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
          <Ionicons name="close-circle" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.categoryFilter}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, !selectedCategory && styles.filterChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.filterChipText, !selectedCategory && styles.filterChipTextActive]}>
              All ({storageData.length})
            </Text>
          </TouchableOpacity>
          {storageData.map(category => (
            <TouchableOpacity
              key={category.name}
              style={[styles.filterChip, selectedCategory === category.name && styles.filterChipActive]}
              onPress={() => setSelectedCategory(category.name)}
            >
              <Text style={[styles.filterChipText, selectedCategory === category.name && styles.filterChipTextActive]}>
                {category.name} ({category.items.length})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredData.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📦</Text>
            <Text style={styles.emptyStateTitle}>No Data Found</Text>
            <Text style={styles.emptyStateMessage}>
              {searchQuery ? 'No items match your search query.' : 'No data is currently stored.'}
            </Text>
          </View>
        ) : (
          filteredData.map(renderCategory)
        )}
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
  clearAllButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  clearSearchButton: {
    padding: 8,
    marginLeft: 8,
  },
  categoryFilter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#0066CC',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666666',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  category: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  categoryStats: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  clearButton: {
    padding: 8,
  },
  storageItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemKey: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  itemSize: {
    fontSize: 12,
    color: '#666666',
  },
  itemValue: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'monospace',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  syncButton: {
    padding: 8,
    marginLeft: 8,
  },
  debugButton: {
    padding: 8,
    marginLeft: 8,
  },
  forceRestoreButton: {
    padding: 8,
    marginLeft: 8,
  },
  testAuthButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default LocalStorageViewerScreen; 