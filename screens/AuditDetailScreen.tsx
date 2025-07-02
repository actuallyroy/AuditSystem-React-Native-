import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Mock audit data
const mockAuditDetails = {
  '1': {
    id: '1',
    storeName: 'SuperMart Downtown',
    address: '123 Main St, Downtown',
    dueDate: '2025-06-30',
    priority: 'High',
    status: 'Assigned',
    storeManager: 'Sarah Johnson',
    contactNumber: '+1 (555) 123-4567',
    lastAudit: '2025-03-15',
    lastScore: 88,
    sections: [
      {
        id: 's1',
        title: 'Store Exterior',
        description: 'Assess the exterior appearance and signage',
        questionCount: 8,
        completed: false
      },
      {
        id: 's2',
        title: 'Entrance & Lobby',
        description: 'Check entrance cleanliness and customer welcome area',
        questionCount: 6,
        completed: false
      },
      {
        id: 's3',
        title: 'Product Placement',
        description: 'Verify product placement according to planogram',
        questionCount: 15,
        completed: false
      },
      {
        id: 's4',
        title: 'Pricing & Promotions',
        description: 'Check price tags and promotional materials',
        questionCount: 10,
        completed: false
      },
      {
        id: 's5',
        title: 'Staff & Service',
        description: 'Evaluate staff appearance and customer service',
        questionCount: 7,
        completed: false
      }
    ]
  },
  '2': {
    id: '2',
    storeName: 'QuickShop Express',
    address: '456 Oak Ave, Westside',
    dueDate: '2025-07-02',
    priority: 'Medium',
    status: 'Assigned',
    storeManager: 'Michael Chen',
    contactNumber: '+1 (555) 987-6543',
    lastAudit: '2025-04-02',
    lastScore: 92,
    sections: [
      {
        id: 's1',
        title: 'Store Exterior',
        description: 'Assess the exterior appearance and signage',
        questionCount: 8,
        completed: false
      },
      {
        id: 's2',
        title: 'Entrance & Lobby',
        description: 'Check entrance cleanliness and customer welcome area',
        questionCount: 6,
        completed: false
      },
      {
        id: 's3',
        title: 'Product Placement',
        description: 'Verify product placement according to planogram',
        questionCount: 15,
        completed: false
      },
      {
        id: 's4',
        title: 'Pricing & Promotions',
        description: 'Check price tags and promotional materials',
        questionCount: 10,
        completed: false
      }
    ]
  },
  // Add more audit details as needed
};

export default function AuditDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { auditId, readOnly = false } = route.params || {};
  
  const auditDetails = mockAuditDetails[auditId] || {};
  const [expandedSection, setExpandedSection] = useState(null);
  
  // Calculate days remaining
  const today = new Date();
  const dueDate = new Date(auditDetails.dueDate);
  const daysRemaining = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  
  // Determine priority color
  let priorityColor;
  switch(auditDetails.priority) {
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

  const toggleSection = (sectionId) => {
    if (expandedSection === sectionId) {
      setExpandedSection(null);
    } else {
      setExpandedSection(sectionId);
    }
  };

  const handleStartAudit = () => {
    navigation.navigate('AuditExecution', { auditId });
  };

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
        {!readOnly && (
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-vertical" size={24} color="#0066CC" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Store Info Card */}
        <View style={styles.storeCard}>
          <Text style={styles.storeName}>{auditDetails.storeName}</Text>
          
          <View style={styles.addressContainer}>
            <Ionicons name="location-outline" size={16} color="#6c757d" />
            <Text style={styles.addressText}>{auditDetails.address}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Due Date</Text>
              <View style={styles.infoValueContainer}>
                <Ionicons name="calendar-outline" size={14} color="#6c757d" />
                <Text style={[
                  styles.infoValue, 
                  daysRemaining <= 2 ? styles.urgentText : null
                ]}>
                  {daysRemaining > 0 
                    ? `In ${daysRemaining} days` 
                    : daysRemaining === 0 
                      ? 'Today' 
                      : `Overdue by ${Math.abs(daysRemaining)} days`}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Priority</Text>
              <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
                <Text style={styles.priorityText}>{auditDetails.priority}</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Contact Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Information</Text>
          
          <View style={styles.contactItem}>
            <Ionicons name="person-outline" size={20} color="#0066CC" />
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Store Manager</Text>
              <Text style={styles.contactValue}>{auditDetails.storeManager}</Text>
            </View>
          </View>
          
          <View style={styles.contactItem}>
            <Ionicons name="call-outline" size={20} color="#0066CC" />
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Contact Number</Text>
              <Text style={styles.contactValue}>{auditDetails.contactNumber}</Text>
            </View>
          </View>
        </View>
        
        {/* Previous Audit Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Previous Audit</Text>
          
          <View style={styles.previousAuditInfo}>
            <View style={styles.previousAuditItem}>
              <Text style={styles.previousAuditLabel}>Date</Text>
              <Text style={styles.previousAuditValue}>{auditDetails.lastAudit}</Text>
            </View>
            
            <View style={styles.previousAuditItem}>
              <Text style={styles.previousAuditLabel}>Score</Text>
              <View style={styles.scoreContainer}>
                <Text style={[
                  styles.scoreText, 
                  { color: auditDetails.lastScore >= 90 ? '#28a745' : auditDetails.lastScore >= 70 ? '#ffc107' : '#dc3545' }
                ]}>
                  {auditDetails.lastScore}%
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Sections List */}
        <View style={styles.sectionsCard}>
          <Text style={styles.cardTitle}>Audit Sections</Text>
          
          {auditDetails.sections && auditDetails.sections.map((section) => (
            <View key={section.id} style={styles.sectionItem}>
              <TouchableOpacity 
                style={styles.sectionHeader}
                onPress={() => toggleSection(section.id)}
              >
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.questionCount}>{section.questionCount} questions</Text>
                </View>
                
                <Ionicons 
                  name={expandedSection === section.id ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#6c757d" 
                />
              </TouchableOpacity>
              
              {expandedSection === section.id && (
                <View style={styles.sectionDetails}>
                  <Text style={styles.sectionDescription}>{section.description}</Text>
                  
                  {!readOnly && (
                    <TouchableOpacity 
                      style={styles.startSectionButton}
                      onPress={() => navigation.navigate('AuditExecution', { auditId, sectionId: section.id })}
                    >
                      <Text style={styles.startSectionButtonText}>Start Section</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
        
        {/* Map Preview */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Location</Text>
          
          <View style={styles.mapContainer}>
            <Image
              source={{ uri: 'https://api.a0.dev/assets/image?text=Store%20Location%20Map&aspect=16:9' }}
              style={styles.mapImage}
              resizeMode="cover"
            />
            <View style={styles.mapOverlay}>
              <TouchableOpacity style={styles.mapButton}>
                <Ionicons name="navigate" size={20} color="white" />
                <Text style={styles.mapButtonText}>Navigate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Action Button */}
        {!readOnly && (
          <TouchableOpacity 
            style={styles.startButton}
            onPress={handleStartAudit}
          >
            <Text style={styles.startButtonText}>Start Audit</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Last updated: Today, 9:30 AM</Text>
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
  moreButton: {
    padding: 4,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    marginBottom: 16,
  },
  addressText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
    marginLeft: 4,
  },
  urgentText: {
    color: '#dc3545',
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  card: {
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactInfo: {
    marginLeft: 12,
  },
  contactLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
  },
  previousAuditInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previousAuditItem: {
    flex: 1,
  },
  previousAuditLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  previousAuditValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
  },
  scoreContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionsCard: {
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
  sectionItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
  },
  questionCount: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  sectionDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 12,
  },
  startSectionButton: {
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  startSectionButtonText: {
    color: '#212529',
    fontWeight: '500',
    fontSize: 14,
  },
  mapContainer: {
    position: 'relative',
    height: 180,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066CC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mapButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 4,
  },
  startButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  startButtonText: {
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
});