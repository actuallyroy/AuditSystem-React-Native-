import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Mock data for in-progress audits
const inProgressAudits = [
  {
    id: '3',
    storeName: 'Value Grocery',
    address: '789 Pine Rd, Eastside',
    lastUpdated: '2025-06-25T14:30:00',
    completionPercentage: 45,
    sections: {
      total: 5,
      completed: 2
    }
  },
  {
    id: '5',
    storeName: 'Fresh Market',
    address: '202 Cedar Ln, Southside',
    lastUpdated: '2025-06-26T09:15:00',
    completionPercentage: 75,
    sections: {
      total: 4,
      completed: 3
    }
  },
  {
    id: '7',
    storeName: 'Corner Mart',
    address: '505 Maple Dr, Westside',
    lastUpdated: '2025-06-24T16:45:00',
    completionPercentage: 20,
    sections: {
      total: 5,
      completed: 1
    }
  }
];

export default function InProgressScreen() {
  const navigation = useNavigation();

  const formatLastUpdated = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
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

  const renderAuditItem = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.auditCard}
        onPress={() => navigation.navigate('AuditExecution', { auditId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.storeName}>{item.storeName}</Text>
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
            onPress={() => navigation.navigate('AuditExecution', { auditId: item.id })}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
          
          {item.completionPercentage === 100 && (
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={() => navigation.navigate('AuditSubmit', { auditId: item.id })}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>In Progress</Text>
        <TouchableOpacity style={styles.syncButton}>
          <Ionicons name="sync-outline" size={24} color="#0066CC" />
        </TouchableOpacity>
      </View>
      
      {inProgressAudits.length > 0 ? (
        <FlatList
          data={inProgressAudits}
          renderItem={renderAuditItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="clipboard-outline" size={64} color="#6c757d" />
          <Text style={styles.emptyText}>No audits in progress</Text>
          <Text style={styles.emptySubtext}>
            Start a new audit from the Audits tab
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
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    flex: 1,
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
});