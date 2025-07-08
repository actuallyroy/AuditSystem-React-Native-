import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { auditService, AuditSummaryDto } from '../services/AuditService';

interface SubmittedItem {
  id: string;
  storeName: string;
  address: string;
  submittedDate: string;
  status: string;
  score: number | string;
  templateName: string;
  rejectionReason?: string;
}

interface FilterButtonProps {
  title: string;
  isActive: boolean;
  onPress: () => void;
}

export default function SubmittedScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [submittedItems, setSubmittedItems] = useState<SubmittedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    loadSubmittedData();
  }, []);

  const loadSubmittedData = async () => {
    try {
      if (!user?.userId) {
        Alert.alert('Error', 'User not found. Please log in again.');
        return;
      }

      setLoading(true);
      
      // Load all audits and filter for submitted ones
      const allAudits = await auditService.getAllAudits();
      
      // Debug: Log all audit statuses to see what we're getting
      console.log('All audits:', allAudits.map(a => ({ id: a.auditId, status: a.status, templateName: a.templateName })));
      
      // Filter for submitted audits - only show actually submitted audits
      const submittedAudits = allAudits.filter(audit => {
        // Log each audit status for debugging
        console.log(`Audit ${audit.auditId}: status = "${audit.status}"`);
        
        // Check for various possible submitted statuses (exclude synced/draft)
        return (audit.status === 'Submitted' || 
               audit.status === 'Approved' || 
               audit.status === 'Rejected' ||
               audit.status === 'submitted' ||
               audit.status === 'approved' ||
               audit.status === 'rejected' ||
               audit.status === 'COMPLETED' ||
               audit.status === 'completed');
      });
      
      console.log('Filtered submitted audits:', submittedAudits.length);
      console.log('Submitted audit statuses:', submittedAudits.map(a => a.status));

      // If no submitted audits found, show all audits for debugging
      const auditsToProcess = submittedAudits.length > 0 ? submittedAudits : allAudits;
      console.log('Processing audits:', auditsToProcess.length);

      // Convert to SubmittedItem format
      const submittedData: SubmittedItem[] = auditsToProcess.map(audit => {
        // Use storeName and address from API, fallback if missing
        const templateName = audit.templateName && audit.templateName.trim() !== '' ? audit.templateName : 'No Template Name';
        const storeName = audit.storeName && audit.storeName.trim() !== '' ? audit.storeName : 'No Store Info';
        const address = audit.address && audit.address.trim() !== '' ? audit.address : 'No Address';

        // Determine status for display
        let displayStatus = audit.status || 'Unknown';
        if (audit.status && audit.status.toLowerCase() === 'submitted') {
          displayStatus = 'Pending';
        } else if (audit.status && audit.status.toLowerCase() === 'approved') {
          displayStatus = 'Approved';
        } else if (audit.status && audit.status.toLowerCase() === 'rejected') {
          displayStatus = 'Rejected';
        } else if (audit.status && audit.status.toLowerCase() === 'completed') {
          displayStatus = 'Completed';
        }

        // Score: show N/A if 0 or missing
        let score: number | string = (audit.score === null || audit.score === undefined) ? 'N/A' : audit.score;
        if (score === 0) {
          score = 'N/A';
        }

        return {
          id: audit.auditId,
          storeName,
          address,
          submittedDate: audit.endTime || audit.createdAt,
          status: displayStatus,
          score,
          templateName,
          rejectionReason: displayStatus === 'Rejected' ? 'Audit did not meet requirements' : undefined
        };
      });

      setSubmittedItems(submittedData);
      
    } catch (error) {
      console.error('Failed to load submitted data:', error);
      Alert.alert('Error', 'Failed to load submitted audits. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSubmittedData();
  };

  // Filter audits based on search query and filters
  const filteredAudits = submittedItems.filter(audit => {
    const matchesSearch = audit.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         audit.address.toLowerCase().includes(searchQuery.toLowerCase());
    // Status filter: handle 'Pending' for both 'Submitted' and 'submitted'
    const matchesStatus = statusFilter === 'All' || audit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatSubmittedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderAuditItem = ({ item }: { item: SubmittedItem }) => {
    // Determine status color
    let statusColor: string;
    let statusIcon: string;
    
    switch(item.status) {
      case 'Approved':
        statusColor = '#28a745';
        statusIcon = 'checkmark-circle';
        break;
      case 'Pending':
        statusColor = '#ffc107';
        statusIcon = 'time';
        break;
      case 'Rejected':
        statusColor = '#dc3545';
        statusIcon = 'close-circle';
        break;
      case 'Completed':
        statusColor = '#17a2b8';
        statusIcon = 'checkmark-done-circle';
        break;
      default:
        statusColor = '#6c757d';
        statusIcon = 'help-circle';
    }

    // Determine score color
    let scoreColor: string;
    if (typeof item.score === 'number' && item.score >= 90) {
      scoreColor = '#28a745';
    } else if (typeof item.score === 'number' && item.score >= 70) {
      scoreColor = '#ffc107';
    } else if (typeof item.score === 'number') {
      scoreColor = '#dc3545';
    } else {
      scoreColor = '#6c757d';
    }

    return (
      <TouchableOpacity 
        style={styles.auditCard}
        onPress={() => (navigation as any).navigate('AuditDetail', { 
          auditId: item.id, 
          readOnly: true 
        })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.storeInfo}>
            <Text style={styles.storeName}>{item.storeName}</Text>
            <Text style={styles.templateName}>{item.templateName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Ionicons name={statusIcon as any} size={12} color="white" style={styles.statusIcon} />
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        
        <View style={styles.addressContainer}>
          <Ionicons name="location-outline" size={16} color="#6c757d" />
          <Text style={styles.addressText}>{item.address}</Text>
        </View>
        
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={16} color="#6c757d" />
            <Text style={styles.infoText}>
              Submitted: {formatSubmittedDate(item.submittedDate)}
            </Text>
          </View>
          
          <View style={styles.scoreContainer}>
            <Text style={[styles.scoreText, { color: scoreColor }]}> 
              {item.score}
              {typeof item.score === 'string' ? '' : '%'}
            </Text>
          </View>
        </View>
        
        {item.status === 'Rejected' && item.rejectionReason && (
          <View style={styles.rejectionContainer}>
            <Text style={styles.rejectionLabel}>Reason:</Text>
            <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.viewButton}
          onPress={() => (navigation as any).navigate('AuditDetail', { 
            auditId: item.id, 
            readOnly: true 
          })}
        >
          <Text style={styles.viewButtonText}>View Details</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading submitted audits...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Submitted</Text>
        <TouchableOpacity style={styles.syncButton} onPress={handleRefresh}>
          <Ionicons name="sync-outline" size={24} color="#0066CC" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#6c757d" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search submissions..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterButton 
            title="All Status" 
            isActive={statusFilter === 'All'} 
            onPress={() => setStatusFilter('All')} 
          />
          <FilterButton 
            title="Approved" 
            isActive={statusFilter === 'Approved'} 
            onPress={() => setStatusFilter('Approved')} 
          />
          <FilterButton 
            title="Pending" 
            isActive={statusFilter === 'Pending'} 
            onPress={() => setStatusFilter('Pending')} 
          />
          <FilterButton 
            title="Rejected" 
            isActive={statusFilter === 'Rejected'} 
            onPress={() => setStatusFilter('Rejected')} 
          />
          <FilterButton 
            title="Completed" 
            isActive={statusFilter === 'Completed'} 
            onPress={() => setStatusFilter('Completed')} 
          />
        </ScrollView>
      </View>
      
      {filteredAudits.length > 0 ? (
        <FlatList
          data={filteredAudits}
          renderItem={renderAuditItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-upload-outline" size={64} color="#6c757d" />
          <Text style={styles.emptyText}>No submitted audits found</Text>
          <Text style={styles.emptySubtext}>
            Complete and submit an audit to see it here
          </Text>
        </View>
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
    flexDirection: 'column',
    alignItems: 'flex-start',
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 4,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 4,
  },
  scoreContainer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  rejectionContainer: {
    backgroundColor: '#f8d7da',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  rejectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#721c24',
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 14,
    color: '#721c24',
  },
  viewButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewButtonText: {
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
  syncButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
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