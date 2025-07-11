import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = 'https://test.scorptech.co/api/v1';

export default function ApiTestScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [testResult, setTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const testApiCall = async () => {
    setIsLoading(true);
    setTestResult('Testing API call...\n');
    
    try {
      // Log the request details
      const requestBody = JSON.stringify({ username, password });
      const requestUrl = `${API_BASE_URL}/Auth/login`;
      
      setTestResult(prev => prev + `URL: ${requestUrl}\n`);
      setTestResult(prev => prev + `Request Body: ${requestBody}\n`);
      setTestResult(prev => prev + `Making request...\n`);

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

      setTestResult(prev => prev + `Response Status: ${response.status}\n`);
      setTestResult(prev => prev + `Response OK: ${response.ok}\n`);
      
      // Get response headers
      const headers = Object.fromEntries(response.headers.entries());
      setTestResult(prev => prev + `Response Headers: ${JSON.stringify(headers, null, 2)}\n`);

      // Get response text first
      const responseText = await response.text();
      setTestResult(prev => prev + `Raw Response Text: "${responseText}"\n`);
      setTestResult(prev => prev + `Response Text Length: ${responseText.length}\n`);

      if (responseText.length === 0) {
        setTestResult(prev => prev + '❌ ERROR: Empty response from server\n');
        Alert.alert('Empty Response', 'The server returned an empty response. This is the cause of the JSON parse error.');
        return;
      }

      // Try to parse JSON
      try {
        const data = JSON.parse(responseText);
        setTestResult(prev => prev + `✅ JSON Parse Success:\n${JSON.stringify(data, null, 2)}\n`);
      } catch (parseError) {
        setTestResult(prev => prev + `❌ JSON Parse Error: ${parseError.message}\n`);
        setTestResult(prev => prev + `This confirms the JSON parsing issue!\n`);
        Alert.alert(
          'JSON Parse Error Confirmed',
          `The server is not returning valid JSON.\n\nResponse: "${responseText}"\n\nError: ${parseError.message}`
        );
      }

    } catch (networkError) {
      setTestResult(prev => prev + `❌ Network Error: ${networkError.message}\n`);
      Alert.alert('Network Error', networkError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    setTestResult('Testing basic connection...\n');
    
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      setTestResult(prev => prev + `Health Check Status: ${response.status}\n`);
      const text = await response.text();
      setTestResult(prev => prev + `Health Check Response: "${text}"\n`);
    } catch (error) {
      setTestResult(prev => prev + `❌ Connection Error: ${error.message}\n`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0066CC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>API Test</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Login API</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={testApiCall}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Testing...' : 'Test Login API'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, isLoading && styles.buttonDisabled]}
            onPress={testConnection}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              {isLoading ? 'Testing...' : 'Test Connection'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          <ScrollView style={styles.resultContainer}>
            <Text style={styles.resultText}>{testResult || 'No tests run yet'}</Text>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Information</Text>
          <Text style={styles.infoText}>Base URL: {API_BASE_URL}</Text>
          <Text style={styles.infoText}>Login Endpoint: /Auth/login</Text>
          <Text style={styles.infoText}>Method: POST</Text>
          <Text style={styles.infoText}>Content-Type: application/json</Text>
        </View>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  button: {
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#0066CC',
  },
  buttonDisabled: {
    backgroundColor: '#a0a0a0',
    borderColor: '#a0a0a0',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#0066CC',
  },
  resultContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333333',
  },
  infoText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
}); 