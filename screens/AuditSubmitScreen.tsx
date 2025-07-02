import React, { useState } from 'react';
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
import { toast } from 'sonner-native';

// Mock audit data
const mockAuditSummary = {
  '1': {
    id: '1',
    storeName: 'SuperMart Downtown',
    address: '123 Main St, Downtown',
    completedDate: new Date().toISOString(),
    sections: [
      {
        id: 's1',
        title: 'Store Exterior',
        questionCount: 8,
        answeredCount: 8,
        score: 85
      },
      {
        id: 's2',
        title: 'Entrance & Lobby',
        questionCount: 6,
        answeredCount: 6,
        score: 92
      },
      {
        id: 's3',
        title: 'Product Placement',
        questionCount: 15,
        answeredCount: 15,
        score: 78
      },
      {
        id: 's4',
        title: 'Pricing & Promotions',
        questionCount: 10,
        answeredCount: 10,
        score: 90
      },
      {
        id: 's5',
        title: 'Staff & Service',
        questionCount: 7,
        answeredCount: 7,
        score: 88
      }
    ],
    overallScore: 86,
    photoCount: 12,
    issuesCount: 3
  }
};

export default function AuditSubmitScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { auditId } = route.params || {};
  
  const auditSummary = mockAuditSummary[auditId] || {};
  const [comments, setComments] = useState('');
  const [signature, setSignature] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const handleAddSignature = () => {
    // In a real app, this would open a signature pad
    setSignature(`https://api.a0.dev/assets/image?text=Store%20Manager%20Signature&aspect=3:1&seed=${Math.random()}`);
    toast.success('Signature captured');
  };
  
  const handleClearSignature = () => {
    setSignature(null);
  };
  
  const handleSubmit = () => {
    if (!signature) {
      Alert.alert(
        "Missing Signature",
        "Please add a store manager signature before submitting",
        [{ text: "OK" }]
      );
      return;
    }
    
    setShowConfirmation(true);
  };
  
  const handleConfirmSubmit = () => {
    setSubmitting(true);
    
    // Simulate submission delay
    setTimeout(() => {
      setSubmitting(false);
      toast.success('Audit submitted successfully');
      navigation.navigate('Submitted');
    }, 2000);
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Calculate section with lowest score
  const lowestScoreSection = auditSummary.sections ? 
    [...auditSummary.sections].sort((a, b) => a.score - b.score)[0] : null;
  
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
          <Text style={styles.storeName}>{auditSummary.storeName}</Text>
          
          <View style={styles.addressContainer}>
            <Ionicons name="location-outline" size={16} color="#6c757d" />
            <Text style={styles.addressText}>{auditSummary.address}</Text>
          </View>
          
          <View style={styles.completedDateContainer}>
            <Ionicons name="calendar-outline" size={16} color="#6c757d" />
            <Text style={styles.completedDateText}>
              Completed: {formatDate(auditSummary.completedDate)}
            </Text>
          </View>
        </View>
        
        {/* Overall Score */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreCardTitle}>Overall Score</Text>
          
          <View style={styles.overallScoreContainer}>
            <View style={[
              styles.scoreCircle, 
              { 
                borderColor: auditSummary.overallScore >= 90 
                  ? '#28a745' 
                  : auditSummary.overallScore >= 70 
                    ? '#ffc107' 
                    : '#dc3545' 
              }
            ]}>
              <Text style={[
                styles.overallScoreText,
                { 
                  color: auditSummary.overallScore >= 90 
                    ? '#28a745' 
                    : auditSummary.overallScore >= 70 
                      ? '#ffc107' 
                      : '#dc3545' 
                }
              ]}>
                {auditSummary.overallScore}%
              </Text>
            </View>
            
            <View style={styles.scoreStatsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="document-text-outline" size={20} color="#0066CC" />
                <Text style={styles.statText}>
                  {auditSummary.sections?.reduce((total, section) => total + section.questionCount, 0)} Questions
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="image-outline" size={20} color="#0066CC" />
                <Text style={styles.statText}>
                  {auditSummary.photoCount} Photos
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="alert-circle-outline" size={20} color="#0066CC" />
                <Text style={styles.statText}>
                  {auditSummary.issuesCount} Issues
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Section Scores */}
        <View style={styles.sectionsCard}>
          <Text style={styles.sectionsCardTitle}>Section Scores</Text>
          
          {auditSummary.sections?.map((section) => (
            <View key={section.id} style={styles.sectionScoreItem}>
              <View style={styles.sectionScoreHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={[
                  styles.sectionScoreBadge,
                  { 
                    backgroundColor: section.score >= 90 
                      ? '#28a745' 
                      : section.score >= 70 
                        ? '#ffc107' 
                        : '#dc3545' 
                  }
                ]}>
                  <Text style={styles.sectionScoreText}>{section.score}%</Text>
                </View>
              </View>
              
              <View style={styles.sectionProgressContainer}>
                <View style={styles.progressBarBackground}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${section.score}%`,
                        backgroundColor: section.score >= 90 
                          ? '#28a745' 
                          : section.score >= 70 
                            ? '#ffc107' 
                            : '#dc3545'
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.questionCountText}>
                  {section.answeredCount}/{section.questionCount} questions
                </Text>
              </View>
            </View>
          ))}
        </View>
        
        {/* Areas for Improvement */}
        {lowestScoreSection && (
          <View style={styles.improvementCard}>
            <Text style={styles.improvementCardTitle}>Areas for Improvement</Text>
            
            <View style={styles.improvementItem}>
              <Ionicons name="alert-circle" size={24} color="#dc3545" />
              <View style={styles.improvementContent}>
                <Text style={styles.improvementTitle}>
                  {lowestScoreSection.title} ({lowestScoreSection.score}%)
                </Text>
                <Text style={styles.improvementText}>
                  This section has the lowest score and needs attention.
                </Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Comments */}
        <View style={styles.commentsCard}>
          <Text style={styles.commentsCardTitle}>Additional Comments</Text>
          
          <TextInput
            style={styles.commentsInput}
            placeholder="Add any additional comments or observations..."
            value={comments}
            onChangeText={setComments}
            multiline
            textAlignVertical="top"
          />
        </View>
        
        {/* Signature */}
        <View style={styles.signatureCard}>
          <Text style={styles.signatureCardTitle}>
            Store Manager Signature
            <Text style={styles.requiredIndicator}> *</Text>
          </Text>
          
          {signature ? (
            <View style={styles.signatureContainer}>
              <Image
                source={{ uri: signature }}
                style={styles.signatureImage}
                resizeMode="contain"
              />
              <TouchableOpacity 
                style={styles.clearSignatureButton}
                onPress={handleClearSignature}
              >
                <Text style={styles.clearSignatureText}>Clear</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.addSignatureButton}
              onPress={handleAddSignature}
            >
              <Ionicons name="create-outline" size={24} color="#0066CC" />
              <Text style={styles.addSignatureText}>Tap to add signature</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Submit Button */}
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>Submit Audit</Text>
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
                    color: auditSummary.overallScore >= 90 
                      ? '#28a745' 
                      : auditSummary.overallScore >= 70 
                        ? '#ffc107' 
                        : '#dc3545' 
                  }
                ]}>
                  {auditSummary.overallScore}%
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
                onPress={handleConfirmSubmit}
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
  scoreCard: {
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
  scoreCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  overallScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  overallScoreText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scoreStatsContainer: {
    flex: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statText: {
    fontSize: 14,
    color: '#212529',
    marginLeft: 8,
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
  sectionsCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  sectionScoreItem: {
    marginBottom: 16,
  },
  sectionScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
  },
  sectionScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  sectionScoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  sectionProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  questionCountText: {
    fontSize: 12,
    color: '#6c757d',
    width: 80,
    textAlign: 'right',
  },
  improvementCard: {
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
  improvementCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  improvementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  improvementContent: {
    flex: 1,
    marginLeft: 12,
  },
  improvementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  improvementText: {
    fontSize: 14,
    color: '#6c757d',
  },
  commentsCard: {
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
  commentsCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  commentsInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#212529',
    minHeight: 100,
  },
  signatureCard: {
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
  signatureCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  requiredIndicator: {
    color: '#dc3545',
  },
  signatureContainer: {
    position: 'relative',
  },
  signatureImage: {
    width: '100%',
    height: 100,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ced4da',
  },
  clearSignatureButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  clearSignatureText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  addSignatureButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 16,
    borderStyle: 'dashed',
  },
  addSignatureText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#0066CC',
  },
  submitButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
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