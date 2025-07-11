import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { networkService } from '../services/NetworkService';
import { debugLogger } from '../utils/DebugLogger';

interface NetworkInfo {
  isConnected: boolean;
  type: string;
  isInternetReachable: boolean;
  isWifi: boolean;
  isCellular: boolean;
  details?: any;
}

interface ConnectivityTest {
  name: string;
  host: string;
  port: number;
  result?: {
    success: boolean;
    error?: string;
    latency?: number;
  };
  testing: boolean;
}

const NetworkStatusScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [connectivityTests, setConnectivityTests] = useState<ConnectivityTest[]>([
    { name: 'API Server', host: 'test.scorptech.co', port: 443, testing: false },
    { name: 'WebSocket Server', host: 'test.scorptech.co', port: 443, testing: false },
    { name: 'Google DNS', host: '8.8.8.8', port: 53, testing: false },
    { name: 'Cloudflare DNS', host: '1.1.1.1', port: 53, testing: false },
  ]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNetworkInfo = async () => {
    try {
      setLoading(true);
      const info = await networkService.getNetworkInfo();
      setNetworkInfo(info);
      debugLogger.log('Network info loaded', info);
    } catch (error) {
      debugLogger.error('Error loading network info:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnectivity = async (test: ConnectivityTest) => {
    try {
      setConnectivityTests(prev => 
        prev.map(t => t.name === test.name ? { ...t, testing: true } : t)
      );

      const result = await networkService.testHostConnectivity(test.host, test.port);
      
      setConnectivityTests(prev => 
        prev.map(t => t.name === test.name ? { ...t, result, testing: false } : t)
      );

      debugLogger.log(`Connectivity test for ${test.name}:`, result);
    } catch (error) {
      debugLogger.error(`Error testing connectivity for ${test.name}:`, error);
      setConnectivityTests(prev => 
        prev.map(t => t.name === test.name ? { 
          ...t, 
          result: { success: false, error: 'Test failed' }, 
          testing: false 
        } : t)
      );
    }
  };

  const testAllConnectivity = async () => {
    for (const test of connectivityTests) {
      await testConnectivity(test);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const clearTestResults = () => {
    setConnectivityTests(prev => 
      prev.map(test => ({ ...test, result: undefined }))
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNetworkInfo();
    setRefreshing(false);
  };

  useEffect(() => {
    loadNetworkInfo();
  }, []);

  const getConnectionStatusIcon = (isConnected: boolean, isInternetReachable: boolean) => {
    if (!isConnected) return '🔴';
    if (!isInternetReachable) return '🟡';
    return '🟢';
  };

  const getConnectionStatusText = (isConnected: boolean, isInternetReachable: boolean) => {
    if (!isConnected) return 'No Connection';
    if (!isInternetReachable) return 'Connected (No Internet)';
    return 'Connected';
  };

  const renderNetworkInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Network Status</Text>
      
      {networkInfo && (
        <View style={styles.networkInfo}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status:</Text>
            <View style={styles.statusValue}>
              <Text style={styles.statusIcon}>
                {getConnectionStatusIcon(networkInfo.isConnected, networkInfo.isInternetReachable)}
              </Text>
              <Text style={styles.statusText}>
                {getConnectionStatusText(networkInfo.isConnected, networkInfo.isInternetReachable)}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type:</Text>
            <Text style={styles.infoValue}>{networkInfo.type}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>WiFi:</Text>
            <Text style={styles.infoValue}>{networkInfo.isWifi ? 'Yes' : 'No'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cellular:</Text>
            <Text style={styles.infoValue}>{networkInfo.isCellular ? 'Yes' : 'No'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Internet Reachable:</Text>
            <Text style={styles.infoValue}>{networkInfo.isInternetReachable ? 'Yes' : 'No'}</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderConnectivityTests = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Connectivity Tests</Text>
        <View style={styles.sectionActions}>
          <TouchableOpacity onPress={testAllConnectivity} style={styles.actionButton}>
            <Ionicons name="play" size={16} color="#0066CC" />
            <Text style={styles.actionButtonText}>Test All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearTestResults} style={styles.actionButton}>
            <Ionicons name="refresh" size={16} color="#666" />
            <Text style={styles.actionButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {connectivityTests.map((test, index) => (
        <View key={test.name} style={styles.testItem}>
          <View style={styles.testHeader}>
            <Text style={styles.testName}>{test.name}</Text>
            <Text style={styles.testHost}>{test.host}:{test.port}</Text>
          </View>

          <View style={styles.testContent}>
            {test.testing ? (
              <View style={styles.testingContainer}>
                <ActivityIndicator size="small" color="#0066CC" />
                <Text style={styles.testingText}>Testing...</Text>
              </View>
            ) : test.result ? (
              <View style={styles.testResult}>
                <Text style={[
                  styles.testResultText,
                  test.result.success ? styles.testSuccess : styles.testFailure
                ]}>
                  {test.result.success ? '✅ Success' : '❌ Failed'}
                </Text>
                {test.result.latency && (
                  <Text style={styles.testLatency}>{test.result.latency}ms</Text>
                )}
                {test.result.error && (
                  <Text style={styles.testError}>{test.result.error}</Text>
                )}
              </View>
            ) : (
              <Text style={styles.testPending}>Not tested</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.testButton}
            onPress={() => testConnectivity(test)}
            disabled={test.testing}
          >
            <Text style={styles.testButtonText}>
              {test.testing ? 'Testing...' : 'Test'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderNetworkTools = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Network Tools</Text>
      
      <TouchableOpacity style={styles.toolItem} onPress={loadNetworkInfo}>
        <Ionicons name="refresh-outline" size={24} color="#0066CC" />
        <Text style={styles.toolItemText}>Refresh Network Info</Text>
        <Ionicons name="chevron-forward" size={20} color="#6c757d" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.toolItem} 
        onPress={() => {
          Alert.alert(
            'Network Info',
            `Current Status: ${networkInfo ? getConnectionStatusText(networkInfo.isConnected, networkInfo.isInternetReachable) : 'Unknown'}\n\nType: ${networkInfo?.type || 'Unknown'}\nWiFi: ${networkInfo?.isWifi ? 'Yes' : 'No'}\nCellular: ${networkInfo?.isCellular ? 'Yes' : 'No'}\nInternet: ${networkInfo?.isInternetReachable ? 'Yes' : 'No'}`
          );
        }}
      >
        <Ionicons name="information-circle-outline" size={24} color="#0066CC" />
        <Text style={styles.toolItemText}>Show Detailed Info</Text>
        <Ionicons name="chevron-forward" size={20} color="#6c757d" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#0066CC" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Network Status</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading network information...</Text>
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
        <Text style={styles.headerTitle}>Network Status</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderNetworkInfo()}
        {renderConnectivityTests()}
        {renderNetworkTools()}
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
  sectionActions: {
    flexDirection: 'row',
    gap: 8,
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
  networkInfo: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
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
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
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
  testItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  testHeader: {
    marginBottom: 8,
  },
  testName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  testHost: {
    fontSize: 12,
    color: '#666666',
  },
  testContent: {
    marginBottom: 8,
  },
  testingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testingText: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 8,
  },
  testResult: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  testResultText: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 8,
  },
  testSuccess: {
    color: '#28a745',
  },
  testFailure: {
    color: '#dc3545',
  },
  testLatency: {
    fontSize: 12,
    color: '#666666',
    marginRight: 8,
  },
  testError: {
    fontSize: 12,
    color: '#dc3545',
    flex: 1,
  },
  testPending: {
    fontSize: 12,
    color: '#999999',
  },
  testButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0066CC',
    borderRadius: 4,
  },
  testButtonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toolItemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333333',
  },
});

export default NetworkStatusScreen; 