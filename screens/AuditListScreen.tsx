import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { authService, Assignment } from '../services/AuthService';
import { auditService, AuditSummaryDto } from '../services/AuditService';

// Define navigation types
type RootStackParamList = {
  AuditDetail: { auditId: string };
  AuditExecution: { auditId: string };
};

interface AssignmentItem {
  id: string;
  storeName: string;
  address: string;
  dueDate: string;
  priority: string;
  status: string;
  assignmentId: string;
  templateName: string;
  templateCategory: string;
  notes?: string;
}

interface FilterButtonProps {
  title: string;
  isActive: boolean;
  onPress: () => void;
}

interface RenderItemProps {
  item: AssignmentItem;
}

export default function AuditListScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [audits, setAudits] = useState<AuditSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [dueFilter, setDueFilter] = useState('All');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (!user?.userId) {
        Alert.alert('Error', 'User not found. Please log in again.');
        return;
      }

      // console.log('Loading assignments for user:', user.userId);
      console.log('User details:', { 
        username: user.username, 
        role: user.role, 
        firstName: user.firstName 
      });

      const [fetchedAssignments, fetchedAudits] = await Promise.all([
        authService.getAssignmentsForUser(user.userId),
        auditService.getAllAudits()
      ]);
      setAssignments(fetchedAssignments);
      setAudits(fetchedAudits);
      // console.log('Successfully loaded assignments:', fetchedAssignments.length);
      // console.log('Assignment statuses:', fetchedAssignments.map(a => ({ id: a.assignmentId, status: a.status })));
      console.log('Loaded audits:', fetchedAudits.length);

      
    } catch (error) {
      console.error('Failed to load assignments:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('403')) {
          Alert.alert(
            'Access Denied', 
            'You do not have permission to view assignments. Please check with your administrator or try logging in again.',
            [
              { text: 'OK', style: 'default' },
              { 
                text: 'Debug Info', 
                onPress: () => {
                  console.log('Current user:', user);
                  Alert.alert('Debug Info', `User ID: ${user?.userId}\nRole: ${user?.role}\nUsername: ${user?.username}`);
                }
              }
            ]
          );
        } else if (error.message.includes('session has expired')) {
          // Token expiration is now handled automatically by AuthService
          Alert.alert(
            'Session Expired', 
            'Your session has expired. You will be redirected to the login screen.',
            [
              { text: 'OK', style: 'default' }
            ]
          );
        } else {
          Alert.alert('Error', `Failed to load assignments: ${error.message}`);
        }
      } else {
        Alert.alert('Error', 'An unknown error occurred while loading assignments.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  // Convert Assignment to AssignmentItem for UI compatibility
  const convertAssignmentToItem = (assignment: Assignment): AssignmentItem => {
    // Parse store info if it exists
    let storeName = 'Unknown Store';
    let address = 'Address not available';
    
    if (assignment.storeInfo) {
      try {
        const storeData = JSON.parse(assignment.storeInfo);
        storeName = storeData.name || storeData.storeName || 'Unknown Store';
        address = storeData.address || 'Address not available';
      } catch {
        // If parsing fails, use storeInfo as store name
        storeName = assignment.storeInfo;
      }
    }

    // Find in-progress audit for this assignment
    const inProgressAudit = audits.find(
      audit =>
        audit.assignmentId === assignment.assignmentId &&
        audit.status !== 'Submitted' &&
        audit.status !== 'Completed'
    );

    return {
      id: assignment.assignmentId,
      assignmentId: assignment.assignmentId,
      storeName,
      address,
      dueDate: assignment.dueDate || new Date().toISOString(),
      priority: assignment.priority || 'Medium',
      status: inProgressAudit ? 'In Progress' : (assignment.status || 'pending'),
      templateName: assignment.template.name || 'Unknown Template',
      templateCategory: assignment.template.category || 'General',
      notes: assignment.notes || undefined,
    };
  };

  // Removed repetitive assignment logging

  // Filter items based on search query and filters
  const filteredAssignments = assignments
    .filter(assignment => assignment.status !== 'Completed')
    .map(convertAssignmentToItem)
    .filter(item => {
      const matchesSearch = item.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.templateName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = priorityFilter === 'All' || item.priority === priorityFilter;
      // Due date filtering
      const today = new Date();
      const dueDate = new Date(item.dueDate);
      const timeDiff = dueDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      let matchesDue = true;
      switch (dueFilter) {
        case 'Overdue':
          matchesDue = daysRemaining < 0;
          break;
        case 'Due Today':
          matchesDue = daysRemaining === 0;
          break;
        case 'Due This Week':
          matchesDue = daysRemaining >= 0 && daysRemaining <= 7;
          break;
        case 'Due Next Week':
          matchesDue = daysRemaining > 7 && daysRemaining <= 14;
          break;
        default:
          matchesDue = true;
      }
      return matchesSearch && matchesPriority && matchesDue;
    });

  const renderAuditItem = ({ item }: RenderItemProps) => {
    
    // Calculate days remaining
    const today = new Date();
    const dueDate = new Date(item.dueDate);
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    // Determine status color
    const statusColor = '#0066CC';
    
    // Determine priority color
    let priorityColor: string;
    switch(item.priority) {
      case 'High':
        priorityColor = '#dc3545';
        break;
      case 'Medium':
        priorityColor = '#ffc107';
        break;
      case 'Low':
        priorityColor = '#28a745';
        break;
      default:
        priorityColor = '#6c757d';
    }

    return (
      <TouchableOpacity 
        style={styles.auditCard}
        onPress={() => (navigation as any).navigate('AuditDetail', { 
          auditId: item.id,
          assignmentId: item.assignmentId
        })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.storeNameContainer}>
            <Text style={styles.storeName}>{item.storeName}</Text>
            <Text style={styles.templateName}>{item.templateName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        
        <View style={styles.addressContainer}>
          <Ionicons name="location-outline" size={16} color="#6c757d" />
          <Text style={styles.addressText}>{item.address}</Text>
        </View>
        
        {item.notes && (
          <View style={styles.notesContainer}>
            <Ionicons name="document-text-outline" size={16} color="#6c757d" />
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
        
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="calendar-outline" size={16} color="#6c757d" />
            <Text style={styles.footerText}>
              {daysRemaining > 0 
                ? `Due in ${daysRemaining} days` 
                : daysRemaining === 0 
                  ? 'Due today' 
                  : `Overdue by ${Math.abs(daysRemaining)} days`}
            </Text>
          </View>
          
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
            <Text style={styles.priorityText}>{item.priority}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.startButton}
          onPress={() => {
            (navigation as any).navigate('AuditExecution', { assignmentId: item.assignmentId });
          }}
        >
          <Text style={styles.startButtonText}>
            Start Audit
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading assignments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Assignments</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.notificationButton} 
            onPress={() => navigation.navigate('Notifications' as never)}
          >
            <Ionicons name="notifications-outline" size={24} color="#0066CC" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.syncButton} onPress={handleRefresh}>
            <Ionicons name="sync-outline" size={24} color="#0066CC" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#6c757d" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search stores or templates..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterButton 
            title="All Priority" 
            isActive={priorityFilter === 'All'} 
            onPress={() => setPriorityFilter('All')} 
          />
          <FilterButton 
            title="High" 
            isActive={priorityFilter === 'High'} 
            onPress={() => setPriorityFilter('High')} 
          />
          <FilterButton 
            title="Medium" 
            isActive={priorityFilter === 'Medium'} 
            onPress={() => setPriorityFilter('Medium')} 
          />
          <FilterButton 
            title="Low" 
            isActive={priorityFilter === 'Low'} 
            onPress={() => setPriorityFilter('Low')} 
          />
          <FilterButton 
            title="All Due" 
            isActive={dueFilter === 'All'} 
            onPress={() => setDueFilter('All')} 
          />
          <FilterButton 
            title="Overdue" 
            isActive={dueFilter === 'Overdue'} 
            onPress={() => setDueFilter('Overdue')} 
          />
          <FilterButton 
            title="Due Today" 
            isActive={dueFilter === 'Due Today'} 
            onPress={() => setDueFilter('Due Today')} 
          />
          <FilterButton 
            title="Due This Week" 
            isActive={dueFilter === 'Due This Week'} 
            onPress={() => setDueFilter('Due This Week')} 
          />
          <FilterButton 
            title="Due Next Week" 
            isActive={dueFilter === 'Due Next Week'} 
            onPress={() => setDueFilter('Due Next Week')} 
          />
        </ScrollView>
      </View>
      
      {filteredAssignments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="clipboard-outline" size={48} color="#6c757d" />
          <Text style={styles.emptyTitle}>No assignments found</Text>
          <Text style={styles.emptyText}>
            {assignments.length === 0 
              ? 'You have no assignments yet.' 
              : 'No assignments match your current filters.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredAssignments}
          renderItem={renderAuditItem}
          keyExtractor={(item: AssignmentItem) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </View>
  );
}

// Filter button component
const FilterButton: React.FC<FilterButtonProps> = ({ title, isActive, onPress }) => (
  <TouchableOpacity 
    style={[styles.filterButton, isActive && styles.activeFilterButton]} 
    onPress={onPress}
  >
    <Text style={[styles.filterButtonText, isActive && styles.activeFilterButtonText]}>
      {title}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
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
    marginBottom: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  syncButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#212529',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  activeFilterButton: {
    backgroundColor: '#0066CC',
  },
  filterButtonText: {
    color: '#6c757d',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: 'white',
  },
  listContainer: {
    paddingBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  storeNameContainer: {
    flex: 1,
    marginRight: 8,
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  templateName: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
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
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 4,
    flex: 1,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 4,
    flex: 1,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 4,
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
  startButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});