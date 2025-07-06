import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { debugLogger } from '../utils/DebugLogger';
import { authService } from '../services/AuthService';

export default function DebugScreen({ navigation }: any) {
  const [logs, setLogs] = useState(debugLogger.getLogs());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(debugLogger.getLogs());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setLogs(debugLogger.getLogs());
    setRefreshing(false);
  };

  const clearLogs = () => {
    debugLogger.clearLogs();
    setLogs([]);
  };

  const shareLogs = async () => {
    try {
      const logsString = debugLogger.getLogsAsString();
      await Share.share({
        message: logsString || 'No logs available',
        title: 'Debug Logs',
      });
    } catch (error) {
      console.error('Error sharing logs:', error);
    }
  };

  const testConnection = async () => {
    debugLogger.log('Testing API connection...');
    try {
      const isConnected = await authService.testConnection();
      debugLogger.log('Connection test result:', { isConnected });
    } catch (error) {
      debugLogger.error('Connection test failed:', error);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return '#dc3545';
      case 'warn':
        return '#ffc107';
      case 'info':
        return '#17a2b8';
      default:
        return '#333333';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0066CC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Debug Console</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={shareLogs} style={styles.headerButton}>
            <Ionicons name="share-outline" size={20} color="#0066CC" />
          </TouchableOpacity>
          <TouchableOpacity onPress={clearLogs} style={styles.headerButton}>
            <Ionicons name="trash-outline" size={20} color="#dc3545" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.testButton} onPress={testConnection}>
          <Ionicons name="wifi-outline" size={16} color="#fff" />
          <Text style={styles.testButtonText}>Test API Connection</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>Total Logs: {logs.length}</Text>
        <Text style={styles.statsText}>
          Errors: {logs.filter(log => log.level === 'error').length}
        </Text>
      </View>

      <ScrollView
        style={styles.logsContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {logs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#6c757d" />
            <Text style={styles.emptyStateText}>No logs available</Text>
            <Text style={styles.emptyStateSubtext}>
              Perform some actions to see debug information here
            </Text>
          </View>
        ) : (
          logs.map((log, index) => (
            <View key={index} style={styles.logEntry}>
              <View style={styles.logHeader}>
                <Text style={[styles.logLevel, { color: getLevelColor(log.level) }]}>
                  {log.level.toUpperCase()}
                </Text>
                <Text style={styles.logTimestamp}>{formatTimestamp(log.timestamp)}</Text>
              </View>
              <Text style={styles.logMessage}>{log.message}</Text>
              {log.data && (
                <View style={styles.logDataContainer}>
                  <Text style={styles.logDataLabel}>Data:</Text>
                  <Text style={styles.logData}>{JSON.stringify(log.data, null, 2)}</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  actionButtons: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066CC',
    padding: 12,
    borderRadius: 8,
  },
  testButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsText: {
    fontSize: 14,
    color: '#6c757d',
  },
  logsContainer: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  logEntry: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0066CC',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logLevel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  logTimestamp: {
    fontSize: 12,
    color: '#6c757d',
  },
  logMessage: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
  },
  logDataContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    padding: 8,
  },
  logDataLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 4,
  },
  logData: {
    fontSize: 12,
    color: '#333333',
    fontFamily: 'monospace',
  },
}); 