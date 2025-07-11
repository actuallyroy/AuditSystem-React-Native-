import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface RouteParams {
  auditId?: string;
  assignmentId?: string;
}

export default function AuditDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { auditId, assignmentId } = (route.params as RouteParams) || {};
  const [loading, setLoading] = useState(true);

  // Auto-load data when screen comes into focus or when params change
  useFocusEffect(
    React.useCallback(() => {
      handleRedirect();
    }, [assignmentId, auditId])
  );

  const handleRedirect = async () => {
    try {
      setLoading(true);
      if (assignmentId != null) {
        // Redirect to AssignmentDetail screen
        (navigation as any).replace('AssignmentDetail', { assignmentId });
        return;
      } else if (auditId != null) {
        // Redirect to AuditDetails screen
        (navigation as any).replace('AuditDetails', { auditId });
        return;
      } else {
        Alert.alert('Error', 'No assignment or audit ID provided');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Failed to redirect:', error);
      Alert.alert('Error', 'Failed to load details. Please try again.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Redirecting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No details found.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
  },
});