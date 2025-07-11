import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { storageService } from '../services/StorageService';
import { authService } from '../services/AuthService';
import { debugLogger } from '../utils/DebugLogger';
import { useDevMode } from '../contexts/DevModeContext';

const BASE_WS_URL = 'wss://test.scorptech.co/hubs/notifications';
const ECHO_URL = 'wss://echo.websocket.events';

const maskToken = (token: string | null) => {
  if (!token) return 'No token';
  if (token.length < 16) return token;
  return token.substring(0, 8) + '...' + token.substring(token.length - 8);
};

const DebugScreen: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [useEcho, setUseEcho] = useState(false);
  const [useAuth, setUseAuth] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const { isDevModeEnabled } = useDevMode();

  const log = (msg: string) => {
    setLogs((prev) => [...prev, `${new Date().toISOString()} | ${msg}`]);
    console.log(msg);
  };

  // Fetch token on mount and when toggling auth
  useEffect(() => {
    if (useAuth && !useEcho) {
      storageService.getAuthToken().then(setToken);
    } else {
      setToken(null);
    }
  }, [useAuth, useEcho]);

  const testTokenValidation = async () => {
    try {
      setIsValidating(true);
      log('Starting token validation test...');
      
      const result = await authService.debugTokenValidation();
      
      log(`Token validation result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      log(`Network connectivity: ${result.details.isOnline}`);
      log(`Has token: ${result.details.hasToken}`);
      log(`Has userId: ${result.details.hasUserId}`);
      log(`Token length: ${result.details.tokenLength}`);
      log(`UserId: ${result.details.userId}`);
      
      if (result.details.validateTokenEndpoint) {
        log(`Validate token endpoint: ${result.details.validateTokenEndpoint.success ? 'SUCCESS' : 'FAILED'} (${result.details.validateTokenEndpoint.status})`);
        log(`Validate token response: ${result.details.validateTokenEndpoint.response}`);
      }
      
      if (result.details.errors.length > 0) {
        log('Errors:');
        result.details.errors.forEach(error => log(`  - ${error}`));
      }
      
      // Show alert with summary only if dev mode is enabled
      if (isDevModeEnabled) {
        Alert.alert(
          'Token Validation Test',
          `Result: ${result.success ? 'SUCCESS' : 'FAILED'}\n\nNetwork: ${result.details.isOnline ? 'Online' : 'Offline'}\nToken: ${result.details.hasToken ? 'Present' : 'Missing'}\nUser ID: ${result.details.hasUserId ? 'Present' : 'Missing'}\nValidate Token: ${result.details.validateTokenEndpoint?.success ? 'OK' : 'FAILED'}\n\nErrors: ${result.details.errors.length}`,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      log(`Token validation test error: ${error instanceof Error ? error.message : String(error)}`);
      if (isDevModeEnabled) {
        Alert.alert('Error', `Token validation test failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const testApiConnectivity = async () => {
    try {
      setIsValidating(true);
      log('Starting API connectivity test...');
      
      const result = await authService.testApiConnectivity();
      
      log(`API connectivity result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      log(`Network check: ${result.details.networkCheck}`);
      
      if (result.details.healthEndpoint) {
        log(`Health endpoint: ${result.details.healthEndpoint.success ? 'SUCCESS' : 'FAILED'} (${result.details.healthEndpoint.status})`);
        log(`Health response: ${result.details.healthEndpoint.response}`);
      }
      
      if (result.details.authEndpoint) {
        log(`Auth endpoint: ${result.details.authEndpoint.success ? 'SUCCESS' : 'FAILED'} (${result.details.authEndpoint.status})`);
        log(`Auth response: ${result.details.authEndpoint.response}`);
      }
      
      if (result.details.validateTokenEndpoint) {
        log(`Validate token endpoint: ${result.details.validateTokenEndpoint.success ? 'SUCCESS' : 'FAILED'} (${result.details.validateTokenEndpoint.status})`);
        log(`Validate token response: ${result.details.validateTokenEndpoint.response}`);
      }
      
      if (result.details.errors.length > 0) {
        log('Errors:');
        result.details.errors.forEach(error => log(`  - ${error}`));
      }
      
      // Show alert with summary only if dev mode is enabled
      if (isDevModeEnabled) {
        Alert.alert(
          'API Connectivity Test',
          `Result: ${result.success ? 'SUCCESS' : 'FAILED'}\n\nNetwork: ${result.details.networkCheck ? 'Online' : 'Offline'}\nHealth: ${result.details.healthEndpoint?.success ? 'OK' : 'FAILED'}\nAuth: ${result.details.authEndpoint?.success ? 'OK' : 'FAILED'}\nValidate Token: ${result.details.validateTokenEndpoint?.success ? 'OK' : 'FAILED'}\n\nErrors: ${result.details.errors.length}`,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      log(`API connectivity test error: ${error instanceof Error ? error.message : String(error)}`);
      if (isDevModeEnabled) {
        Alert.alert('Error', `API connectivity test failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const testSpecificToken = async () => {
    try {
      setIsValidating(true);
      log('Testing specific token validation...');
      
      // The token from the curl command
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIyYzhlZjE0Yi04MDM4LTQ4NDEtOGE0MS0xMzEyMzZjNTUwODIiLCJ1bmlxdWVfbmFtZSI6ImpvaG5kb2UiLCJnaXZlbl9uYW1lIjoiSm9obiIsImZhbWlseV9uYW1lIjoiRG9lIiwicm9sZSI6ImF1ZGl0b3IiLCJlbWFpbCI6ImpvaG5kb2VAZXhhbXBsZS5jb20iLCJvcmdhbmlzYXRpb25faWQiOiI4NWU3NDMzNi04M2MwLTQ3MWEtYWM5ZC1lOWQwOWQ3MjU2ZTQiLCJuYmYiOjE3NTIxNzE4NTMsImV4cCI6MTc1MjIwMDY1MywiaWF0IjoxNzUyMTcxODUzLCJpc3MiOiJBdWRpdFN5c3RlbSIsImF1ZCI6IkF1ZGl0U3lzdGVtQ2xpZW50cyJ9.WUYieTNo4WvWqGMlXuZ7MYJWhegqb6aZLwOl-p210oc';
      
      const result = await authService.testSpecificToken(testToken);
      
      log(`Specific token validation result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      log(`Status: ${result.details.status}`);
      log(`Response: ${result.details.response}`);
      
      if (result.details.error) {
        log(`Error: ${result.details.error}`);
      }
      
      // Show alert with summary only if dev mode is enabled
      if (isDevModeEnabled) {
        Alert.alert(
          'Specific Token Test',
          `Result: ${result.success ? 'SUCCESS' : 'FAILED'}\n\nStatus: ${result.details.status}\nResponse: ${result.details.response.substring(0, 100)}${result.details.response.length > 100 ? '...' : ''}`,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      log(`Specific token test error: ${error instanceof Error ? error.message : String(error)}`);
      if (isDevModeEnabled) {
        Alert.alert('Error', `Specific token test failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const showDebugLogs = () => {
    const logsString = debugLogger.getLogsAsString();
    if (isDevModeEnabled) {
      Alert.alert(
        'Debug Logs',
        logsString || 'No logs available',
        [
          { text: 'Clear Logs', onPress: () => debugLogger.clearLogs() },
          { text: 'OK' }
        ]
      );
    }
  };

  useEffect(() => {
    setLogs([]);
    let url = useEcho ? ECHO_URL : BASE_WS_URL;
    if (useAuth && !useEcho && token) {
      url = `${BASE_WS_URL}?access_token=${token}`;
    }
    log(`Connecting to: ${url}`);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      log('WebSocket opened!');
      if (useEcho) {
        ws.send('Hello from React Native!');
        log('Sent: Hello from React Native!');
      } else {
        ws.send('{"protocol":"json","version":1}');
        log('Sent: {"protocol":"json","version":1}');
      }
    };
    ws.onmessage = (e) => {
      log(`Message: ${e.data}`);
    };
    ws.onerror = (e) => {
      log(`Error: ${JSON.stringify(e)}`);
    };
    ws.onclose = (e) => {
      log(`Closed: code=${e.code}, reason=${e.reason}`);
    };
    return () => {
      ws.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useEcho, useAuth, token]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Minimal WebSocket Debug</Text>
      <View style={styles.buttonRow}>
        <Button
          title={useEcho ? 'Switch to test.scorptech.co' : 'Switch to Echo Server'}
          onPress={() => setUseEcho((prev) => !prev)}
        />
        {!useEcho && (
          <TouchableOpacity
            style={[styles.authButton, useAuth ? styles.authOn : styles.authOff]}
            onPress={() => setUseAuth((prev) => !prev)}
          >
            <Text style={styles.authButtonText}>{useAuth ? 'Auth: ON' : 'Auth: OFF'}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.buttonRow}>
        <Button
          title={isValidating ? 'Validating...' : 'Test Token Validation'}
          onPress={testTokenValidation}
          disabled={isValidating}
        />
        <TouchableOpacity style={styles.debugButton} onPress={showDebugLogs}>
          <Text style={styles.debugButtonText}>Debug Logs</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonRow}>
        <Button
          title={isValidating ? 'Testing...' : 'Test API Connectivity'}
          onPress={testApiConnectivity}
          disabled={isValidating}
        />
      </View>
      <View style={styles.buttonRow}>
        <Button
          title={isValidating ? 'Testing...' : 'Test Specific Token'}
          onPress={testSpecificToken}
          disabled={isValidating}
        />
      </View>
      {!useEcho && useAuth && (
        <Text style={styles.tokenText}>Token: {maskToken(token)}</Text>
      )}
      <Text style={styles.url}>Current URL: {useEcho ? ECHO_URL : (useAuth && token ? `${BASE_WS_URL}?access_token=...` : BASE_WS_URL)}</Text>
      <ScrollView style={styles.logBox}>
        {logs.map((l, i) => (
          <Text key={i} style={styles.logText}>{l}</Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  url: { fontSize: 12, marginBottom: 8, color: '#333' },
  logBox: { flex: 1, backgroundColor: '#eee', padding: 8, borderRadius: 8 },
  logText: { fontSize: 12, color: '#222', marginBottom: 2 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  authButton: { marginLeft: 12, padding: 8, borderRadius: 6 },
  authOn: { backgroundColor: '#4CAF50' },
  authOff: { backgroundColor: '#F44336' },
  authButtonText: { color: '#fff', fontWeight: 'bold' },
  debugButton: { marginLeft: 12, padding: 8, borderRadius: 6, backgroundColor: '#2196F3' },
  debugButtonText: { color: '#fff', fontWeight: 'bold' },
  tokenText: { fontSize: 10, color: '#888', marginBottom: 4 },
});

export default DebugScreen; 