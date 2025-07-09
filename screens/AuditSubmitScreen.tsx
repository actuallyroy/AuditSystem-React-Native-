import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { 
  authService, 
  Assignment, 
  TemplateDetails, 
  CreateAuditRequest,
  AuditResponse 
} from '../services/AuthService';
import { 
  auditService, 
  AuditResponseDto, 
  SubmitAuditDto 
} from '../services/AuditService';
import { toast } from 'sonner-native';

interface RouteParams {
  assignmentId?: string;
  auditId?: string;
}

export default function AuditSubmitScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { assignmentId, auditId } = (route.params as RouteParams) || {};
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [template, setTemplate] = useState<TemplateDetails | null>(null);
  const [audit, setAudit] = useState<AuditResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [managerNotes, setManagerNotes] = useState('');
  const [responses, setResponses] = useState<AuditResponse[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  useEffect(() => {
    loadAuditData();
  }, [assignmentId || auditId]);

  const loadAuditData = async () => {
    try {
      setLoading(true);
      
      if (!assignmentId && !auditId) {
        Alert.alert('Error', 'No assignment or audit ID provided');
        navigation.goBack();
        return;
      }

      let assignmentData: Assignment;
      let auditData: AuditResponseDto | null = null;

      if (assignmentId) {
        // Load assignment details
        assignmentData = await authService.getAssignmentDetails(assignmentId);
        setAssignment(assignmentData);
      }

      if (auditId) {
        // Load audit details
        auditData = await auditService.getAuditById(auditId);
        
        // Filter out audits with "in_progress" status
        if (auditData.status === 'in_progress') {
          Alert.alert('Error', 'Cannot submit audit with "in_progress" status');
          navigation.goBack();
          return;
        }
        
        setAudit(auditData);
        
        // Note: We need the assignmentId to be passed separately since it's not in AuditResponseDto
        if (!assignmentId) {
          Alert.alert('Error', 'Assignment ID is required when loading audit');
          navigation.goBack();
          return;
        }
      }

      // Load template details
      const templateId = auditData?.templateId || assignmentData!.templateId;
      const templateData = await authService.getTemplateDetails(templateId);
      setTemplate(templateData);

      // Load existing audit responses if available
      if (auditData && auditData.responses) {
        // Convert audit responses to the format expected by the UI
        const auditResponses: AuditResponse[] = [];
        Object.keys(auditData.responses).forEach(questionId => {
          const response = auditData.responses[questionId];
          auditResponses.push({
            questionId,
            answer: response.answer,
            notes: response.notes,
            photos: response.photos || []
          });
        });
        setResponses(auditResponses);
      }
      
    } catch (error) {
      console.error('Failed to load audit data:', error);
      Alert.alert('Error', 'Failed to load audit data. Please try again.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!assignment || !audit) {
      Alert.alert('Error', 'Assignment or audit data not loaded');
      return;
    }

    Alert.alert(
      'Submit Audit',
      'Are you sure you want to submit this audit? You will not be able to make changes after submission.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Submit', 
          onPress: async () => {
            setSubmitting(true);
            try {
              // Prepare responses in the format expected by the API
              const formattedResponses: { [key: string]: any } = {};
              responses.forEach(response => {
                formattedResponses[response.questionId] = {
                  answer: response.answer,
                  notes: response.notes,
                  photos: response.photos || []
                };
              });

              // Create audit submission data
              const submitData: SubmitAuditDto = {
                auditId: audit.auditId,
                responses: formattedResponses,
                storeInfo: assignment.storeInfo ? JSON.parse(assignment.storeInfo) : null,
                location: null, // Can be added if location is captured
                media: null // Can be added if additional media is captured
              };

              // Submit audit
              await auditService.submitAudit(audit.auditId, submitData, true);
              
              // Update assignment status to fulfilled
              await authService.updateAssignmentStatus(assignment.assignmentId, 'fulfilled');

              // Clear any local progress data
              await auditService.clearAuditProgress(audit.auditId);

              Alert.alert(
                'Success',
                'Audit submitted successfully!',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Navigate back to audit list
                      (navigation as any).navigate('Home');
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Failed to submit audit:', error);
              Alert.alert('Error', 'Failed to submit audit. Please try again.');
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const getStoreInfo = () => {
    if (!assignment?.storeInfo) return null;
    
    try {
      return JSON.parse(assignment.storeInfo);
    } catch {
      return { name: assignment.storeInfo };
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No due date';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const calculateCompletionPercentage = () => {
    if (!template?.questions.sections.length) return 0;
    
    // Get all questions from all sections
    const allQuestions = template.questions.sections.reduce((acc, section) => 
      acc.concat(section.questions), [] as any[]
    );
    
    const requiredQuestions = allQuestions.filter(q => q.required);
    const answeredRequired = responses.filter(r => 
      requiredQuestions.some(q => q.id === r.questionId)
    );
    
    return requiredQuestions.length > 0 ? Math.round((answeredRequired.length / requiredQuestions.length) * 100) : 100;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading audit data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const storeInfo = getStoreInfo();
  const completionPercentage = calculateCompletionPercentage();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#0066CC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Audit</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Store Info */}
        <View style={styles.storeCard}>
          <Text style={styles.storeName}>{storeInfo?.name || storeInfo?.storeName || 'Unknown Store'}</Text>
          
          <View style={styles.addressContainer}>
            <Ionicons name="location-outline" size={16} color="#6c757d" />
            <Text style={styles.addressText}>{storeInfo?.address || 'Unknown Address'}</Text>
          </View>
          
          <View style={styles.completedDateContainer}>
            <Ionicons name="calendar-outline" size={16} color="#6c757d" />
            <Text style={styles.completedDateText}>
              Due Date: {formatDate(assignment?.dueDate)}
            </Text>
          </View>
        </View>
        
        {/* Completion Status */}
        <View style={styles.completionCard}>
          <Text style={styles.completionCardTitle}>Completion Status</Text>
          
          <View style={styles.completionContainer}>
            <View style={styles.progressContainer}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressLabel}>Required Questions</Text>
                <Text style={styles.progressValue}>
                  {responses.length} of {
                    template?.questions.sections.reduce((acc, section) => 
                      acc + section.questions.filter(q => q.required).length, 0
                    ) || 0
                  } completed
                </Text>
              </View>
              <View style={styles.progressBarBackground}>
                <View 
                  style={[
                    styles.progressBarFill,
                    { width: `${completionPercentage}%` }
                  ]}
                />
              </View>
              <Text style={styles.progressPercentage}>{completionPercentage}%</Text>
            </View>
            
            {completionPercentage < 100 && (
              <View style={styles.warningContainer}>
                <Ionicons name="warning-outline" size={20} color="#ffc107" />
                <Text style={styles.warningText}>
                  Some required questions are not answered. Please complete all required questions before submitting.
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Additional Notes */}
        <View style={styles.notesCard}>
          <Text style={styles.notesCardTitle}>Additional Notes</Text>
          
          <TextInput
            style={styles.notesInput}
            placeholder="Add any additional notes or observations..."
            value={managerNotes}
            onChangeText={setManagerNotes}
            multiline
            numberOfLines={4}
          />
        </View>
        
        {/* Response Summary */}
        <View style={styles.responseCard}>
          <Text style={styles.responseCardTitle}>Response Summary</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{responses.length}</Text>
              <Text style={styles.statLabel}>Answered</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {responses.filter(r => r.photos && r.photos.length > 0).length}
              </Text>
              <Text style={styles.statLabel}>With Photos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {responses.filter(r => r.notes && r.notes.length > 0).length}
              </Text>
              <Text style={styles.statLabel}>With Notes</Text>
            </View>
          </View>
        </View>
        
        {/* Submit Button */}
        <TouchableOpacity 
          style={[
            styles.submitButton,
            (completionPercentage < 100 || submitting) && styles.disabledButton
          ]}
          onPress={handleSubmit}
          disabled={completionPercentage < 100 || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Audit</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            All required fields must be completed before submission
          </Text>
        </View>
      </ScrollView>
      
      {/* Confirmation Modal */}
      {showConfirmation && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Submission</Text>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalText}>
                Are you sure you want to submit this audit? Once submitted, it cannot be edited.
              </Text>
              
              <View style={styles.modalScoreContainer}>
                <Text style={styles.modalScoreLabel}>Overall Score:</Text>
                <Text style={[
                  styles.modalScoreValue,
                  { 
                    color: completionPercentage >= 90 
                      ? '#28a745' 
                      : completionPercentage >= 70 
                        ? '#ffc107' 
                        : '#dc3545' 
                  }
                ]}>
                  {completionPercentage}%
                </Text>
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowConfirmation(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalConfirmButton}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  storeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  storeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 4,
  },
  completedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedDateText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 4,
  },
  completionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  completionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  completionContainer: {
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
  },
  progressValue: {
    fontSize: 14,
    color: '#6c757d',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0066CC',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
    textAlign: 'center',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 8,
    flex: 1,
  },
  notesCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  notesCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#212529',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  responseCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  responseCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  statsContainer: {
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
  submitButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#6c757d',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '80%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  modalBody: {
    padding: 16,
  },
  modalText: {
    fontSize: 14,
    color: '#212529',
    marginBottom: 16,
  },
  modalScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalScoreLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginRight: 8,
  },
  modalScoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  modalConfirmButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#0066CC',
    borderBottomRightRadius: 12,
  },
  modalConfirmButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
});