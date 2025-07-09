import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { storageService } from '../services/StorageService';

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
        ws.send('{"protocol":"json","version":1}');
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
  tokenText: { fontSize: 10, color: '#888', marginBottom: 4 },
});

export default DebugScreen; 