import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { storageService } from '../services/StorageService';
import { authService } from '../services/AuthService';
import { debugLogger } from '../utils/DebugLogger';

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
      
      if (result.details.userDetailsEndpoint) {
        log(`User details endpoint: ${result.details.userDetailsEndpoint.success ? 'SUCCESS' : 'FAILED'} (${result.details.userDetailsEndpoint.status})`);
        log(`User details response: ${result.details.userDetailsEndpoint.response}`);
      }
      
      if (result.details.healthEndpoint) {
        log(`Health endpoint: ${result.details.healthEndpoint.success ? 'SUCCESS' : 'FAILED'} (${result.details.healthEndpoint.status})`);
        log(`Health response: ${result.details.healthEndpoint.response}`);
      }
      
      if (result.details.errors.length > 0) {
        log('Errors:');
        result.details.errors.forEach(error => log(`  - ${error}`));
      }
      
      // Show alert with summary
      Alert.alert(
        'Token Validation Test',
        `Result: ${result.success ? 'SUCCESS' : 'FAILED'}\n\nNetwork: ${result.details.isOnline ? 'Online' : 'Offline'}\nToken: ${result.details.hasToken ? 'Present' : 'Missing'}\nUser ID: ${result.details.hasUserId ? 'Present' : 'Missing'}\n\nErrors: ${result.details.errors.length}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      log(`Token validation test error: ${error instanceof Error ? error.message : String(error)}`);
      Alert.alert('Error', `Token validation test failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsValidating(false);
    }
  };

  const showDebugLogs = () => {
    const logsString = debugLogger.getLogsAsString();
    Alert.alert(
      'Debug Logs',
      logsString || 'No logs available',
      [
        { text: 'Clear Logs', onPress: () => debugLogger.clearLogs() },
        { text: 'OK' }
      ]
    );
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