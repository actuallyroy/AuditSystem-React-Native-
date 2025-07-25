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
import { authService, Assignment, TemplateDetails } from '../services/AuthService';
import { auditService } from '../services/AuditService';

interface RouteParams {
  assignmentId: string;
}

export default function AssignmentDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { assignmentId } = (route.params as RouteParams) || {};
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [template, setTemplate] = useState<TemplateDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Auto-load data when screen comes into focus or when params change
  useFocusEffect(
    React.useCallback(() => {
      loadAssignmentDetails();
    }, [assignmentId])
  );

  const loadAssignmentDetails = async () => {
    try {
      setLoading(true);
      if (!assignmentId) {
        Alert.alert('Error', 'No assignment ID provided');
        navigation.goBack();
        return;
      }

      // Load assignment details
      const assignmentData = await authService.getAssignmentDetails(assignmentId);
      setAssignment(assignmentData);
      
      // Load template details
      const templateData = await authService.getTemplateDetails(assignmentData.templateId);
      setTemplate(templateData);
    } catch (error) {
      console.error('Failed to load assignment details:', error);
      Alert.alert('Error', 'Failed to load assignment details. Please try again.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
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

  const getDaysRemaining = () => {
    if (!assignment?.dueDate) return null;
    
    const today = new Date();
    const dueDate = new Date(assignment.dueDate);
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    return daysRemaining;
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'High':
        return '#dc3545';
      case 'Medium':
        return '#ffc107';
      case 'Low':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'Assigned':
        return '#0066CC';
      case 'In Progress':
        return '#ffc107';
      case 'Completed':
        return '#28a745';
      case 'Submitted':
        return '#17a2b8';
      default:
        return '#6c757d';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading assignment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!assignment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Assignment not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const storeInfo = getStoreInfo();
  const daysRemaining = getDaysRemaining();
  const isFulfilled = assignment.status === 'fulfilled' || assignment.status === 'submitted';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#0066CC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assignment Details</Text>
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
              {storeInfo?.name || storeInfo?.storeName || 'Unknown Store'}
            </Text>
            {storeInfo?.address && (
              <View style={styles.addressContainer}>
                <Ionicons name="location-outline" size={16} color="#6c757d" />
                <Text style={styles.addressText}>{storeInfo.address}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Template Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="clipboard-outline" size={24} color="#0066CC" />
            <Text style={styles.cardTitle}>Audit Template</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.templateName}>{assignment?.template.name}</Text>
            <Text style={styles.templateCategory}>{assignment?.template.category}</Text>
            {template?.description && (
              <Text style={styles.templateDescription}>{template.description}</Text>
            )}
            <View style={styles.templateStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {template?.questions.sections.reduce((total, section) => total + section.questions.length, 0) || 0}
                </Text>
                <Text style={styles.statLabel}>Questions</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {template?.questions.sections.reduce((total, section) => 
                    total + section.questions.filter(q => q.required).length, 0) || 0}
                </Text>
                <Text style={styles.statLabel}>Required</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Assignment Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle-outline" size={24} color="#0066CC" />
            <Text style={styles.cardTitle}>Assignment Details</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(assignment?.status) }]}>
                <Text style={styles.statusText}>{assignment?.status || 'Unknown'}</Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Priority:</Text>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(assignment?.priority) }]}>
                <Text style={styles.priorityText}>{assignment?.priority || 'Medium'}</Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Due Date:</Text>
              <Text style={styles.detailValue}>{formatDate(assignment?.dueDate || null)}</Text>
            </View>
            
            {daysRemaining !== null && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Time Remaining:</Text>
                <Text style={[
                  styles.detailValue,
                  daysRemaining < 0 ? styles.overdue : daysRemaining <= 2 ? styles.urgent : null
                ]}>
                  {daysRemaining > 0 
                    ? `${daysRemaining} days remaining`
                    : daysRemaining === 0 
                      ? 'Due today'
                      : `Overdue by ${Math.abs(daysRemaining)} days`
                  }
                </Text>
              </View>
            )}
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Assigned By:</Text>
              <Text style={styles.detailValue}>
                {assignment?.assignedBy.firstName} {assignment?.assignedBy.lastName}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created:</Text>
              <Text style={styles.detailValue}>{formatDate(assignment?.createdAt || null)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {assignment?.notes && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text-outline" size={24} color="#0066CC" />
              <Text style={styles.cardTitle}>Notes</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.notesText}>{assignment.notes}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {/* Start Audit Button */}
          <TouchableOpacity 
            style={[
              styles.startAuditButton,
              isFulfilled && styles.disabledButton
            ]}
            onPress={() => {
              if (!isFulfilled && assignment.assignmentId) {
                (navigation as any).navigate('AuditExecution', { assignmentId: assignment.assignmentId });
              }
            }}
            disabled={isFulfilled}
          >
            <Ionicons 
              name={isFulfilled ? "checkmark-circle" : "play-circle"} 
              size={24} 
              color="white" 
            />
            <Text style={styles.startAuditButtonText}>
              {isFulfilled ? 'Audit Fulfilled' : 'Start Audit'}
            </Text>
          </TouchableOpacity>

          {/* View Audit Button - Show if audit exists */}
          {isFulfilled && (
            <TouchableOpacity 
              style={styles.viewAuditButton}
              onPress={async () => {
                try {
                  // Find the audit for this assignment
                  const audits = await auditService.getAllAudits();
                  const audit = audits.find(a => a.assignmentId === assignment.assignmentId);
                  if (audit) {
                    (navigation as any).navigate('AuditDetails', { auditId: audit.auditId });
                  } else {
                    Alert.alert('Error', 'No audit found for this assignment');
                  }
                } catch (error) {
                  Alert.alert('Error', 'Failed to find audit');
                }
              }}
            >
              <Ionicons name="eye-outline" size={24} color="#0066CC" />
              <Text style={styles.viewAuditButtonText}>View Audit</Text>
            </TouchableOpacity>
          )}
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
  overdue: {
    color: '#dc3545',
    fontWeight: '600',
  },
  urgent: {
    color: '#ffc107',
    fontWeight: '600',
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
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  notesText: {
    fontSize: 14,
    color: '#212529',
    lineHeight: 20,
  },
  actionButtonsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  startAuditButton: {
    backgroundColor: '#0066CC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  startAuditButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  viewAuditButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#0066CC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  viewAuditButtonText: {
    color: '#0066CC',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 