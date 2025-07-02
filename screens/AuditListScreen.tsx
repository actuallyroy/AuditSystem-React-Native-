import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Mock data for audits
const mockAudits = [
  {
    id: '1',
    storeName: 'SuperMart Downtown',
    address: '123 Main St, Downtown',
    dueDate: '2025-06-30',
    priority: 'High',
    status: 'Assigned',
  },
  {
    id: '2',
    storeName: 'QuickShop Express',
    address: '456 Oak Ave, Westside',
    dueDate: '2025-07-02',
    priority: 'Medium',
    status: 'Assigned',
  },
  {
    id: '3',
    storeName: 'Value Grocery',
    address: '789 Pine Rd, Eastside',
    dueDate: '2025-07-05',
    priority: 'Low',
    status: 'In Progress',
  },
  {
    id: '4',
    storeName: 'Metro Superstore',
    address: '101 Elm Blvd, Northside',
    dueDate: '2025-06-28',
    priority: 'High',
    status: 'Assigned',
  },
  {
    id: '5',
    storeName: 'Fresh Market',
    address: '202 Cedar Ln, Southside',
    dueDate: '2025-07-10',
    priority: 'Medium',
    status: 'In Progress',
  },
];

export default function AuditListScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Filter audits based on search query and filters
  const filteredAudits = mockAudits.filter(audit => {
    const matchesSearch = audit.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         audit.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || audit.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || audit.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const renderAuditItem = ({ item }) => {
    // Calculate days remaining
    const today = new Date();
    const dueDate = new Date(item.dueDate);
    const daysRemaining = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    // Determine status color
    const statusColor = item.status === 'Assigned' ? '#0066CC' : '#ffc107';
    
    // Determine priority color
    let priorityColor;
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
        onPress={() => navigation.navigate('AuditDetail', { auditId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.storeName}>{item.storeName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        
        <View style={styles.addressContainer}>
          <Ionicons name="location-outline" size={16} color="#6c757d" />
          <Text style={styles.addressText}>{item.address}</Text>
        </View>
        
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
          onPress={() => navigation.navigate('AuditExecution', { auditId: item.id })}
        >
          <Text style={styles.startButtonText}>Start Audit</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Audits</Text>
        <TouchableOpacity style={styles.syncButton}>
          <Ionicons name="sync-outline" size={24} color="#0066CC" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#6c757d" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search stores..."
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
            title="Assigned" 
            isActive={statusFilter === 'Assigned'} 
            onPress={() => setStatusFilter('Assigned')} 
          />
          <FilterButton 
            title="In Progress" 
            isActive={statusFilter === 'In Progress'} 
            onPress={() => setStatusFilter('In Progress')} 
          />
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
        </ScrollView>
      </View>
      
      <FlatList
        data={filteredAudits}
        renderItem={renderAuditItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
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
    marginBottom: 12,
  },
  addressText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 4,
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