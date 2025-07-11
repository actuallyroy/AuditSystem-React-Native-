import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { authService, TemplateDetails } from '../services/AuthService';
import { auditService, AuditResponseDto } from '../services/AuditService';

interface RouteParams {
  auditId: string;
  readOnly?: boolean;
}

export default function AuditDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { auditId, readOnly = false } = (route.params as RouteParams) || {};
  
  const [audit, setAudit] = useState<AuditResponseDto | null>(null);
  const [template, setTemplate] = useState<TemplateDetails | null>(null);
  const [auditProgress, setAuditProgress] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Auto-load data when screen comes into focus or when params change
  useFocusEffect(
    React.useCallback(() => {
      loadAuditDetails();
    }, [auditId])
  );

  const loadAuditDetails = async () => {
    try {
      setLoading(true);
      if (!auditId) {
        Alert.alert('Error', 'No audit ID provided');
        navigation.goBack();
        return;
      }

      // Load audit details
      const auditData = await auditService.getAuditById(auditId);
      console.log('Audit data received:', JSON.stringify(auditData, null, 2));
      setAudit(auditData);
      
      // Also try to load audit progress data (for offline responses)
      try {
        const progressData = await auditService.getAuditProgress(auditId);
        console.log('Audit progress data:', JSON.stringify(progressData, null, 2));
        setAuditProgress(progressData);
      } catch (progressError) {
        console.log('No audit progress data found:', progressError);
      }
      
      // Fetch template for audit
      if (auditData.templateId) {
        const templateData = await authService.getTemplateDetails(auditData.templateId);
        setTemplate(templateData);
      }
    } catch (error) {
      console.error('Failed to load audit details:', error);
      Alert.alert('Error', 'Failed to load audit details. Please try again.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not available';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'submitted':
        return '#17a2b8';
      case 'approved':
        return '#28a745';
      case 'rejected':
        return '#dc3545';
      case 'pending_review':
        return '#ffc107';
      case 'in_progress':
        return '#0066CC';
      default:
        return '#6c757d';
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return '#6c757d';
    if (score >= 90) return '#28a745';
    if (score >= 70) return '#ffc107';
    return '#dc3545';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading audit details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!audit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Audit not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Build questionId to questionText map
  let questionMap: Record<string, string> = {};
  if (template && template.questions && template.questions.sections) {
    template.questions.sections.forEach((section: any) => {
      section.questions.forEach((q: any) => {
        questionMap[q.id] = q.text || q.label || q.title || q.id;
      });
    });
  }

  const storeInfo = audit.storeInfo || {};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#0066CC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Audit Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Store Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="storefront-outline" size={24} color="#0066CC" />
            <Text style={styles.cardTitle}>Store Information</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.storeName}>
              {storeInfo.name || storeInfo.storeName || 'Unknown Store'}
            </Text>
            {(storeInfo.address || storeInfo.storeAddress) && (
              <View style={styles.addressContainer}>
                <Ionicons name="location-outline" size={16} color="#6c757d" />
                <Text style={styles.addressText}>{storeInfo.address || storeInfo.storeAddress}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Audit Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle-outline" size={24} color="#0066CC" />
            <Text style={styles.cardTitle}>Audit Information</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(audit.status) }]}>
                <Text style={styles.statusText}>{audit.status || 'Unknown'}</Text>
              </View>
            </View>
            
            {audit.score !== null && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Score:</Text>
                <Text style={[styles.detailValue, { color: getScoreColor(audit.score) }]}>
                  {audit.score}%
                </Text>
              </View>
            )}
            
            {audit.criticalIssues > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Critical Issues:</Text>
                <Text style={[styles.detailValue, { color: '#dc3545' }]}>
                  {audit.criticalIssues}
                </Text>
              </View>
            )}
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Auditor:</Text>
              <Text style={styles.detailValue}>
                {audit.auditorName || 'Unknown'}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Start Time:</Text>
              <Text style={styles.detailValue}>{formatDate(audit.startTime)}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>End Time:</Text>
              <Text style={styles.detailValue}>{formatDate(audit.endTime)}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created:</Text>
              <Text style={styles.detailValue}>{formatDate(audit.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* Template Information */}
        {template && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="clipboard-outline" size={24} color="#0066CC" />
              <Text style={styles.cardTitle}>Template Information</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.templateName}>{template.name}</Text>
              <Text style={styles.templateCategory}>{template.category}</Text>
              {template.description && (
                <Text style={styles.templateDescription}>{template.description}</Text>
              )}
              <View style={styles.templateStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {template.questions.sections.reduce((total, section) => total + section.questions.length, 0)}
                  </Text>
                  <Text style={styles.statLabel}>Questions</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {template.questions.sections.reduce((total, section) => 
                      total + section.questions.filter(q => q.required).length, 0)}
                  </Text>
                  <Text style={styles.statLabel}>Required</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Audit Responses */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text-outline" size={24} color="#0066CC" />
            <Text style={styles.cardTitle}>
              Audit Responses
              {!audit.responses && auditProgress?.responses && (
                <Text style={styles.offlineIndicator}> (Offline)</Text>
              )}
            </Text>
          </View>
          <View style={styles.cardContent}>
            {(() => {
              // Use audit responses first, then fall back to progress data
              const responses = audit.responses || auditProgress?.responses;
              console.log('Audit responses:', audit.responses);
              console.log('Progress responses:', auditProgress?.responses);
              console.log('Final responses to display:', responses);
              console.log('Responses type:', typeof responses);
              console.log('Responses keys:', responses ? Object.keys(responses) : 'null');
              
              if (!responses) {
                return <Text style={styles.noResponsesText}>No responses found (responses is null/undefined).</Text>;
              }
              
              if (Object.keys(responses).length === 0) {
                return <Text style={styles.noResponsesText}>No responses found (responses object is empty).</Text>;
              }
              
              return Object.entries(responses).map(([questionId, response]: any) => {
                console.log(`Question ${questionId}:`, response);
                return (
                  <View key={questionId} style={styles.responseItem}>
                    <Text style={styles.questionText}>
                      {questionMap[questionId] || questionId}
                    </Text>
                    <View style={styles.answerContainer}>
                      <Text style={styles.answerLabel}>Answer:</Text>
                      <Text style={styles.answerText}>
                        {typeof response === 'string' 
                          ? response 
                          : typeof response === 'object' && response.answer !== undefined
                            ? (typeof response.answer === 'string' 
                                ? response.answer 
                                : Array.isArray(response.answer) 
                                  ? response.answer.join(', ')
                                  : JSON.stringify(response.answer))
                            : JSON.stringify(response)
                        }
                      </Text>
                    </View>
                    {response && typeof response === 'object' && response.notes && (
                      <View style={styles.notesContainer}>
                        <Text style={styles.notesLabel}>Notes:</Text>
                        <Text style={styles.notesText}>{response.notes}</Text>
                      </View>
                    )}
                  </View>
                );
              });
            })()}
          </View>
        </View>

        {/* Manager Notes */}
        {audit.managerNotes && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="chatbubble-outline" size={24} color="#0066CC" />
              <Text style={styles.cardTitle}>Manager Notes</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.managerNotesText}>{audit.managerNotes}</Text>
            </View>
          </View>
        )}

        {/* Location Information */}
        {audit.location && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="location-outline" size={24} color="#0066CC" />
              <Text style={styles.cardTitle}>Location</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.locationText}>
                {JSON.stringify(audit.location, null, 2)}
              </Text>
            </View>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginLeft: 8,
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  storeName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressText: {
    fontSize: 16,
    color: '#6c757d',
    marginLeft: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#6c757d',
    flex: 2,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  templateName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  templateCategory: {
    fontSize: 14,
    color: '#0066CC',
    marginBottom: 8,
  },
  templateDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
  },
  templateStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0066CC',
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  responseItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  answerContainer: {
    marginBottom: 8,
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
    marginBottom: 4,
  },
  answerText: {
    fontSize: 14,
    color: '#212529',
    lineHeight: 20,
  },
  notesContainer: {
    marginTop: 8,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#212529',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  noResponsesText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  managerNotesText: {
    fontSize: 14,
    color: '#212529',
    lineHeight: 20,
  },
  locationText: {
    fontSize: 12,
    color: '#6c757d',
    fontFamily: 'monospace',
  },
  offlineIndicator: {
    fontSize: 14,
    color: '#ffc107',
    fontStyle: 'italic',
  },
}); 