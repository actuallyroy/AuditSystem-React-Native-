import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { authService, Assignment } from '../services/AuthService';
import { auditService, AuditSummaryDto, AuditResponseDto } from '../services/AuditService';

interface InProgressItem {
  id: string;
  assignmentId: string;
  storeName: string;
  address: string;
  lastUpdated: string;
  completionPercentage: number;
  sections: {
    total: number;
    completed: number;
  };
  templateName: string;
  dueDate: string;
}

export default function InProgressScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [inProgressItems, setInProgressItems] = useState<InProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-load data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadInProgressData();
    }, [])
  );

  const loadInProgressData = async () => {
    try {
      if (!user?.userId) {
        Alert.alert('Error', 'User not found. Please log in again.');
        return;
      }

      setLoading(true);
      
      // Load assignments and audits
      const [assignments, audits] = await Promise.all([
        authService.getAssignmentsForUser(user.userId),
        auditService.getAllAudits()
      ]);

      // For each assignment, find a linked audit (in progress - synced, draft, or in progress)
      const auditFetches = assignments.map(async assignment => {
        const summary = audits.find(audit => 
          audit.assignmentId === assignment.assignmentId &&
                  (audit.status === 'synced' ||
         audit.status === 'in_progress' ||
         (audit.status !== 'submitted' && audit.status !== 'approved' && audit.status !== 'rejected' && audit.status !== 'pending_review'))
        );
        if (!summary) return null;
        // Fetch full audit details
        const fullAudit = await auditService.getAuditById(summary.auditId);
        if (fullAudit.responses && Object.keys(fullAudit.responses).length > 0) {
          return { assignment, audit: fullAudit };
        }
        return null;
      });
      const assignmentAuditPairs = (await Promise.all(auditFetches)).filter(Boolean);

      // Convert to InProgressItem format
      const inProgressData: InProgressItem[] = assignmentAuditPairs.map(pair => {
        const { assignment, audit } = pair as { assignment: Assignment; audit: AuditResponseDto };
        // Parse store info
        let storeName = 'Unknown Store';
        let address = 'Address not available';
        if (assignment.storeInfo) {
          try {
            const storeData = JSON.parse(assignment.storeInfo);
            storeName = storeData.name || storeData.storeName || 'Unknown Store';
            address = storeData.address || 'Address not available';
          } catch {
            storeName = assignment.storeInfo;
          }
        }
        // Calculate completion percentage (optional: can be improved)
        let completionPercentage = 0;
        let completedSections = 0;
        let totalSections = 5; // Default section count
        // You can improve this by using audit.responses and template info
        if (audit) {
          completionPercentage = 50; // Placeholder
          completedSections = 2; // Placeholder
        }
        return {
          id: audit.auditId || assignment.assignmentId,
          assignmentId: assignment.assignmentId,
          storeName,
          address,
          lastUpdated: audit.createdAt || assignment.createdAt,
          completionPercentage,
          sections: {
            total: totalSections,
            completed: completedSections
          },
          templateName: assignment.template.name || 'Unknown Template',
          dueDate: assignment.dueDate || new Date().toISOString()
        };
      });

      setInProgressItems(inProgressData);
      
    } catch (error) {
      console.error('Failed to load in-progress data:', error);
      Alert.alert('Error', 'Failed to load in-progress audits. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInProgressData();
  };

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHrs < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHrs < 24) {
      return `${diffHrs} hour${diffHrs !== 1 ? 's' : ''} ago`;
    } else {
      const diffDays = Math.floor(diffHrs / 24);
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
  };

  const renderAuditItem = ({ item }: { item: InProgressItem }) => {
    return (
      <TouchableOpacity 
        style={styles.auditCard}
        onPress={() => (navigation as any).navigate('AuditExecution', { 
          assignmentId: item.assignmentId,
          auditId: item.id 
        })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.storeInfo}>
            <Text style={styles.storeName}>{item.storeName}</Text>
            <Text style={styles.templateName}>{item.templateName}</Text>
          </View>
          <View style={styles.lastUpdatedContainer}>
            <Ionicons name="time-outline" size={14} color="#6c757d" />
            <Text style={styles.lastUpdatedText}>
              {formatLastUpdated(item.lastUpdated)}
            </Text>
          </View>
        </View>
        
        <View style={styles.addressContainer}>
          <Ionicons name="location-outline" size={16} color="#6c757d" />
          <Text style={styles.addressText}>{item.address}</Text>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              {item.sections.completed}/{item.sections.total} Sections
            </Text>
            <Text style={styles.progressPercentage}>
              {item.completionPercentage}%
            </Text>
          </View>
          
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${item.completionPercentage}%` }
              ]} 
            />
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.continueButton}
            onPress={() => (navigation as any).navigate('AuditExecution', { 
              assignmentId: item.assignmentId,
              auditId: item.id 
            })}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
          
          {item.completionPercentage === 100 && (
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={() => (navigation as any).navigate('AuditSubmit', { 
                assignmentId: item.assignmentId,
                auditId: item.id 
              })}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading in-progress audits...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>In Progress</Text>
        <TouchableOpacity style={styles.syncButton} onPress={handleRefresh}>
          <Ionicons name="sync-outline" size={24} color="#0066CC" />
        </TouchableOpacity>
      </View>
      
      {inProgressItems.length > 0 ? (
        <FlatList
          data={inProgressItems}
          renderItem={renderAuditItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="clipboard-outline" size={64} color="#6c757d" />
          <Text style={styles.emptyText}>No audits in progress</Text>
          <Text style={styles.emptySubtext}>
            Start a new audit from the Assignments tab
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  syncButton: {
    padding: 8,
  },
  listContainer: {
    paddingBottom: 16,
  },
  auditCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  storeInfo: {
    flex: 1,
    marginRight: 8,
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    flex: 1,
  },
  templateName: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  lastUpdatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastUpdatedText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  addressText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 4,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#212529',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066CC',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0066CC',
    borderRadius: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  continueButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginTop: 16,
  },
});