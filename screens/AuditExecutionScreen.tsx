import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Image,
  Switch,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

// Mock audit questions data
const mockAuditQuestions = {
  's1': [
    {
      id: 'q1',
      type: 'yesno',
      question: 'Is the store exterior clean and well-maintained?',
      required: true,
      answer: null,
      notes: '',
      photos: []
    },
    {
      id: 'q2',
      type: 'yesno',
      question: 'Are all exterior lights functioning properly?',
      required: true,
      answer: null,
      notes: '',
      photos: []
    },
    {
      id: 'q3',
      type: 'rating',
      question: 'Rate the visibility of store signage from the street (1-5)',
      required: true,
      answer: null,
      notes: '',
      photos: []
    },
    {
      id: 'q4',
      type: 'text',
      question: 'Note any damage to the building exterior',
      required: false,
      answer: '',
      notes: '',
      photos: []
    },
    {
      id: 'q5',
      type: 'multiple',
      question: 'Which promotional materials are visible from outside?',
      options: ['Sale banners', 'Product displays', 'Seasonal decorations', 'Digital screens', 'None'],
      required: true,
      answer: [],
      notes: '',
      photos: []
    }
  ],
  's2': [
    {
      id: 'q6',
      type: 'yesno',
      question: 'Is the entrance area clean and free of obstacles?',
      required: true,
      answer: null,
      notes: '',
      photos: []
    },
    {
      id: 'q7',
      type: 'yesno',
      question: 'Are shopping carts/baskets clean and organized?',
      required: true,
      answer: null,
      notes: '',
      photos: []
    },
    {
      id: 'q8',
      type: 'single',
      question: 'How would you rate the welcome experience?',
      options: ['Excellent', 'Good', 'Average', 'Poor', 'Very Poor'],
      required: true,
      answer: null,
      notes: '',
      photos: []
    }
  ],
  's3': [
    {
      id: 'q9',
      type: 'yesno',
      question: 'Are products arranged according to the planogram?',
      required: true,
      answer: null,
      notes: '',
      photos: []
    },
    {
      id: 'q10',
      type: 'yesno',
      question: 'Are all required SKUs present on shelves?',
      required: true,
      answer: null,
      notes: '',
      photos: []
    },
    {
      id: 'q11',
      type: 'number',
      question: 'How many empty shelf spaces were observed?',
      required: true,
      answer: '',
      notes: '',
      photos: []
    }
  ]
};

// Mock section data
const mockSections = {
  's1': {
    id: 's1',
    title: 'Store Exterior',
    description: 'Assess the exterior appearance and signage',
    questionCount: 5,
    completed: false
  },
  's2': {
    id: 's2',
    title: 'Entrance & Lobby',
    description: 'Check entrance cleanliness and customer welcome area',
    questionCount: 3,
    completed: false
  },
  's3': {
    id: 's3',
    title: 'Product Placement',
    description: 'Verify product placement according to planogram',
    questionCount: 3,
    completed: false
  }
};

export default function AuditExecutionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { auditId, sectionId = 's1' } = route.params || {};
  
  const [currentSectionId, setCurrentSectionId] = useState(sectionId);
  const [questions, setQuestions] = useState([]);
  const [currentSection, setCurrentSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSectionList, setShowSectionList] = useState(false);
  
  // Load questions for the current section
  useEffect(() => {
    setLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const sectionQuestions = mockAuditQuestions[currentSectionId] || [];
      setQuestions(sectionQuestions);
      setCurrentSection(mockSections[currentSectionId]);
      setLoading(false);
    }, 500);
  }, [currentSectionId]);
  
  const handleSaveProgress = () => {
    setSaving(true);
    
    // Simulate saving delay
    setTimeout(() => {
      setSaving(false);
      toast.success('Progress saved successfully');
    }, 1000);
  };
  
  const handleChangeSection = (newSectionId) => {
    if (saving) return;
    
    // Check if there are unsaved changes
    const hasUnsavedChanges = questions.some(q => 
      q.answer !== null && q.answer !== '' && q.answer.length !== 0
    );
    
    if (hasUnsavedChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Do you want to save before changing sections?",
        [
          {
            text: "Don't Save",
            onPress: () => {
              setCurrentSectionId(newSectionId);
              setShowSectionList(false);
            },
            style: "destructive"
          },
          {
            text: "Save",
            onPress: () => {
              handleSaveProgress();
              setCurrentSectionId(newSectionId);
              setShowSectionList(false);
            }
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ]
      );
    } else {
      setCurrentSectionId(newSectionId);
      setShowSectionList(false);
    }
  };
  
  const handleAnswerChange = (questionId, value) => {
    setQuestions(prevQuestions => 
      prevQuestions.map(q => 
        q.id === questionId ? { ...q, answer: value } : q
      )
    );
  };
  
  const handleNotesChange = (questionId, value) => {
    setQuestions(prevQuestions => 
      prevQuestions.map(q => 
        q.id === questionId ? { ...q, notes: value } : q
      )
    );
  };
  
  const handleAddPhoto = (questionId) => {
    // In a real app, this would open the camera
    const newPhotoUrl = `https://api.a0.dev/assets/image?text=Audit%20Photo&aspect=4:3&seed=${Math.random()}`;
    
    setQuestions(prevQuestions => 
      prevQuestions.map(q => 
        q.id === questionId 
          ? { ...q, photos: [...q.photos, newPhotoUrl] } 
          : q
      )
    );
    
    toast.success('Photo added');
  };
  
  const handleRemovePhoto = (questionId, photoIndex) => {
    setQuestions(prevQuestions => 
      prevQuestions.map(q => 
        q.id === questionId 
          ? { 
              ...q, 
              photos: q.photos.filter((_, index) => index !== photoIndex) 
            } 
          : q
      )
    );
  };
  
  const handleCompleteSection = () => {
    // Check for required questions
    const unansweredRequired = questions.filter(q => 
      q.required && (q.answer === null || q.answer === '' || (Array.isArray(q.answer) && q.answer.length === 0))
    );
    
    if (unansweredRequired.length > 0) {
      Alert.alert(
        "Incomplete Section",
        `Please answer all required questions (${unansweredRequired.length} remaining)`,
        [{ text: "OK" }]
      );
      return;
    }
    
    // Save progress
    handleSaveProgress();
    
    // Get next section or complete audit
    const sectionIds = Object.keys(mockSections);
    const currentIndex = sectionIds.indexOf(currentSectionId);
    
    if (currentIndex < sectionIds.length - 1) {
      // Move to next section
      const nextSectionId = sectionIds[currentIndex + 1];
      Alert.alert(
        "Section Complete",
        "Would you like to continue to the next section?",
        [
          {
            text: "Later",
            onPress: () => navigation.goBack(),
            style: "cancel"
          },
          {
            text: "Continue",
            onPress: () => setCurrentSectionId(nextSectionId)
          }
        ]
      );
    } else {
      // All sections complete
      Alert.alert(
        "Audit Complete",
        "All sections have been completed. Would you like to submit the audit now?",
        [
          {
            text: "Later",
            onPress: () => navigation.goBack(),
            style: "cancel"
          },
          {
            text: "Submit",
            onPress: () => navigation.navigate('AuditSubmit', { auditId })
          }
        ]
      );
    }
  };
  
  const renderQuestion = (question, index) => {
    return (
      <View key={question.id} style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <Text style={styles.questionNumber}>Q{index + 1}</Text>
          <Text style={styles.questionText}>
            {question.question}
            {question.required && <Text style={styles.requiredIndicator}> *</Text>}
          </Text>
        </View>
        
        {/* Different input types based on question type */}
        <View style={styles.answerContainer}>
          {question.type === 'yesno' && (
            <View style={styles.yesNoContainer}>
              <TouchableOpacity 
                style={[
                  styles.yesNoButton, 
                  question.answer === true && styles.selectedYes
                ]}
                onPress={() => handleAnswerChange(question.id, true)}
              >
                <Ionicons 
                  name={question.answer === true ? "checkmark-circle" : "checkmark-circle-outline"} 
                  size={24} 
                  color={question.answer === true ? "white" : "#28a745"} 
                />
                <Text style={[
                  styles.yesNoText, 
                  question.answer === true && styles.selectedButtonText
                ]}>
                  Yes
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.yesNoButton, 
                  question.answer === false && styles.selectedNo
                ]}
                onPress={() => handleAnswerChange(question.id, false)}
              >
                <Ionicons 
                  name={question.answer === false ? "close-circle" : "close-circle-outline"} 
                  size={24} 
                  color={question.answer === false ? "white" : "#dc3545"} 
                />
                <Text style={[
                  styles.yesNoText, 
                  question.answer === false && styles.selectedButtonText
                ]}>
                  No
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
          {question.type === 'text' && (
            <TextInput
              style={styles.textInput}
              placeholder="Enter your answer"
              value={question.answer}
              onChangeText={(text) => handleAnswerChange(question.id, text)}
              multiline
            />
          )}
          
          {question.type === 'number' && (
            <TextInput
              style={styles.numberInput}
              placeholder="Enter a number"
              value={question.answer.toString()}
              onChangeText={(text) => handleAnswerChange(question.id, text)}
              keyboardType="numeric"
            />
          )}
          
          {question.type === 'rating' && (
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingButton,
                    question.answer === rating && styles.selectedRating
                  ]}
                  onPress={() => handleAnswerChange(question.id, rating)}
                >
                  <Text style={[
                    styles.ratingText,
                    question.answer === rating && styles.selectedRatingText
                  ]}>
                    {rating}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {question.type === 'single' && question.options && (
            <View style={styles.optionsContainer}>
              {question.options.map((option, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.optionButton,
                    question.answer === option && styles.selectedOption
                  ]}
                  onPress={() => handleAnswerChange(question.id, option)}
                >
                  <Ionicons
                    name={question.answer === option ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={question.answer === option ? "#0066CC" : "#6c757d"}
                  />
                  <Text style={[
                    styles.optionText,
                    question.answer === option && styles.selectedOptionText
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {question.type === 'multiple' && question.options && (
            <View style={styles.optionsContainer}>
              {question.options.map((option, idx) => {
                const isSelected = question.answer && question.answer.includes(option);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.optionButton,
                      isSelected && styles.selectedOption
                    ]}
                    onPress={() => {
                      const currentAnswers = question.answer || [];
                      const newAnswers = isSelected
                        ? currentAnswers.filter(a => a !== option)
                        : [...currentAnswers, option];
                      handleAnswerChange(question.id, newAnswers);
                    }}
                  >
                    <Ionicons
                      name={isSelected ? "checkbox" : "square-outline"}
                      size={20}
                      color={isSelected ? "#0066CC" : "#6c757d"}
                    />
                    <Text style={[
                      styles.optionText,
                      isSelected && styles.selectedOptionText
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
        
        {/* Notes section */}
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add notes (optional)"
            value={question.notes}
            onChangeText={(text) => handleNotesChange(question.id, text)}
            multiline
          />
        </View>
        
        {/* Photos section */}
        <View style={styles.photosContainer}>
          <View style={styles.photosHeader}>
            <Text style={styles.photosLabel}>Photos:</Text>
            <TouchableOpacity 
              style={styles.addPhotoButton}
              onPress={() => handleAddPhoto(question.id)}
            >
              <Ionicons name="camera-outline" size={18} color="#0066CC" />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          </View>
          
          {question.photos.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.photosList}
            >
              {question.photos.map((photo, photoIndex) => (
                <View key={photoIndex} style={styles.photoItem}>
                  <Image
                    source={{ uri: photo }}
                    style={styles.photoImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity 
                    style={styles.removePhotoButton}
                    onPress={() => handleRemovePhoto(question.id, photoIndex)}
                  >
                    <Ionicons name="close-circle" size={24} color="#dc3545" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noPhotosText}>No photos added</Text>
          )}
        </View>
      </View>
    );
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
        
        <TouchableOpacity 
          style={styles.sectionButton}
          onPress={() => setShowSectionList(!showSectionList)}
        >
          <Text style={styles.sectionButtonText}>
            {currentSection ? currentSection.title : 'Select Section'}
          </Text>
          <Ionicons 
            name={showSectionList ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#0066CC" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSaveProgress}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#0066CC" />
          ) : (
            <Ionicons name="save-outline" size={24} color="#0066CC" />
          )}
        </TouchableOpacity>
      </View>
      
      {/* Section selector dropdown */}
      {showSectionList && (
        <View style={styles.sectionListContainer}>
          <ScrollView style={styles.sectionList}>
            {Object.values(mockSections).map((section) => (
              <TouchableOpacity
                key={section.id}
                style={[
                  styles.sectionListItem,
                  currentSectionId === section.id && styles.activeSectionItem
                ]}
                onPress={() => handleChangeSection(section.id)}
              >
                <Text style={[
                  styles.sectionListItemText,
                  currentSectionId === section.id && styles.activeSectionItemText
                ]}>
                  {section.title}
                </Text>
                {section.completed && (
                  <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading questions...</Text>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Section info */}
            <View style={styles.sectionInfoCard}>
              <Text style={styles.sectionTitle}>{currentSection?.title}</Text>
              <Text style={styles.sectionDescription}>{currentSection?.description}</Text>
              <View style={styles.sectionProgress}>
                <Text style={styles.progressText}>
                  {questions.filter(q => q.answer !== null && q.answer !== '' && (!Array.isArray(q.answer) || q.answer.length > 0)).length} of {questions.length} questions answered
                </Text>
                <View style={styles.progressBarBackground}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${(questions.filter(q => q.answer !== null && q.answer !== '' && (!Array.isArray(q.answer) || q.answer.length > 0)).length / questions.length) * 100}%` 
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>
            
            {/* Questions */}
            {questions.map((question, index) => renderQuestion(question, index))}
            
            {/* Complete section button */}
            <TouchableOpacity 
              style={styles.completeSectionButton}
              onPress={handleCompleteSection}
            >
              <Text style={styles.completeSectionButtonText}>Complete Section</Text>
            </TouchableOpacity>
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Auto-saved {saving ? 'saving...' : '2 minutes ago'}
              </Text>
            </View>
          </ScrollView>
          
          {/* Offline indicator */}
          <View style={styles.offlineIndicator}>
            <Ionicons name="cloud-offline-outline" size={16} color="white" />
            <Text style={styles.offlineText}>Working offline - Changes will sync when online</Text>
          </View>
        </>
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
    zIndex: 10,
  },
  backButton: {
    padding: 4,
  },
  sectionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  sectionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
    marginRight: 4,
  },
  saveButton: {
    padding: 4,
  },
  sectionListContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    maxHeight: 300,
    zIndex: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionList: {
    maxHeight: 300,
  },
  sectionListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  activeSectionItem: {
    backgroundColor: '#e6f2ff',
  },
  sectionListItemText: {
    fontSize: 16,
    color: '#212529',
  },
  activeSectionItemText: {
    fontWeight: '600',
    color: '#0066CC',
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
  scrollView: {
    flex: 1,
  },
  sectionInfoCard: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
  },
  sectionProgress: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#212529',
    marginBottom: 4,
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
  questionCard: {
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
  questionHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  questionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0066CC',
    color: 'white',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
    overflow: 'hidden',
    lineHeight: 32,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    color: '#212529',
    fontWeight: '500',
  },
  requiredIndicator: {
    color: '#dc3545',
  },
  answerContainer: {
    marginBottom: 16,
  },
  yesNoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  yesNoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    minWidth: 120,
  },
  selectedYes: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  selectedNo: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },
  yesNoText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
  },
  selectedButtonText: {
    color: 'white',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#212529',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  numberInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#212529',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  ratingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ced4da',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRating: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  selectedRatingText: {
    color: 'white',
  },
  optionsContainer: {
    marginVertical: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  selectedOption: {
    backgroundColor: '#e6f2ff',
  },
  optionText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#212529',
  },
  selectedOptionText: {
    fontWeight: '500',
    color: '#0066CC',
  },
  notesContainer: {
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#212529',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  photosContainer: {
    marginBottom: 8,
  },
  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  photosLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  addPhotoText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#0066CC',
  },
  photosList: {
    flexDirection: 'row',
  },
  photoItem: {
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
  },
  photoImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  noPhotosText: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
    marginVertical: 8,
  },
  completeSectionButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  completeSectionButtonText: {
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
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6c757d',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
  },
});