import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Mock data for submitted audits
const submittedAudits = [
  {
    id: '101',
    storeName: 'SuperMart Downtown',
    address: '123 Main St, Downtown',
    submittedDate: '2025-06-20T10:15:00',
    status: 'Approved',
    score: 92,
  },
  {
    id: '102',
    storeName: 'QuickShop Express',
    address: '456 Oak Ave, Westside',
    submittedDate: '2025-06-22T14:30:00',
    status: 'Pending',
    score: 85,
  },
  {
    id: '103',
    storeName: 'Value Grocery',
    address: '789 Pine Rd, Eastside',
    submittedDate: '2025-06-15T09:45:00',
    status: 'Rejected',
    score: 65,
    rejectionReason: 'Incomplete product placement section'
  },
  {
    id: '104',
    storeName: 'Metro Superstore',
    address: '101 Elm Blvd, Northside',
    submittedDate: '2025-06-18T16:20:00',
    status: 'Approved',
    score: 88,
  },
];

export default function SubmittedScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Filter audits based on search query and filters
  const filteredAudits = submittedAudits.filter(audit => {
    const matchesSearch = audit.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         audit.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || audit.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatSubmittedDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderAuditItem = ({ item }) => {
    // Determine status color
    let statusColor;
    let statusIcon;
    
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
      default:
        statusColor = '#6c757d';
        statusIcon = 'help-circle';
    }

    // Determine score color
    let scoreColor;
    if (item.score >= 90) {
      scoreColor = '#28a745';
    } else if (item.score >= 70) {
      scoreColor = '#ffc107';
    } else {
      scoreColor = '#dc3545';
    }

    return (
      <TouchableOpacity 
        style={styles.auditCard}
        onPress={() => navigation.navigate('AuditDetail', { auditId: item.id, readOnly: true })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.storeName}>{item.storeName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Ionicons name={statusIcon} size={12} color="white" style={styles.statusIcon} />
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
              {item.score}%
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
          onPress={() => navigation.navigate('AuditDetail', { auditId: item.id, readOnly: true })}
        >
          <Text style={styles.viewButtonText}>View Details</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Submitted</Text>
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
        </ScrollView>
      </View>
      
      {filteredAudits.length > 0 ? (
        <FlatList
          data={filteredAudits}
          renderItem={renderAuditItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
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
const FilterButton = ({ title, isActive, onPress }) => (
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
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    flex: 1,
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
});