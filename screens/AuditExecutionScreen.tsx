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
  Alert,
  Modal,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { 
  authService, 
  Assignment, 
  TemplateDetails, 
  TemplateQuestion, 
  AuditResponse,
  CreateAuditRequest 
} from '../services/AuthService';
import { 
  auditService, 
  AuditResponseDto, 
  CreateAuditDto, 
  AuditProgressData 
} from '../services/AuditService';

interface QuestionWithAnswer extends TemplateQuestion {
  answer: any;
  notes: string;
  photos: string[];
  sectionTitle: string;
  sectionIndex: number;
}

interface RouteParams {
  auditId?: string;
  assignmentId?: string;
  sectionId?: string;
}

export default function AuditExecutionScreen() {
  console.log("Rendering!!!")
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { auditId, assignmentId, sectionId } = (route.params as RouteParams) || {};
  
  // State management
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [template, setTemplate] = useState<TemplateDetails | null>(null);
  const [audit, setAudit] = useState<AuditResponseDto | null>(null);
  const [questions, setQuestions] = useState<QuestionWithAnswer[]>([]);
  const [currentSection, setCurrentSection] = useState<string>('all');
  const [sections, setSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSectionList, setShowSectionList] = useState(false);
  
  // Date/Time picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [tempDate, setTempDate] = useState(new Date());
  
  // Dropdown states
  const [openDropdowns, setOpenDropdowns] = useState<{ [key: string]: boolean }>({});
  
  // Auto-save timer
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Load assignment and template data when parameters change
  useEffect(() => {
    // Clear all state when auditId or assignmentId changes
    setAssignment(null);
    setTemplate(null);
    setAudit(null);
    setQuestions([]);
    setSections([]);
    setCurrentSection('all');
    setLoading(true);
    
    loadAuditData();
  }, [auditId, assignmentId]);

  // Auto-load data when screen comes into focus (for when returning from other screens)
  useFocusEffect(
    React.useCallback(() => {
      // Only reload if we have data and the screen is already loaded
      if (assignment || audit) {
        loadAuditData();
      }
    }, [])
  );
  
  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);
  
  const loadAuditData = async () => {
    try {
      setLoading(true);
      console.log('Loading audit data for auditId:', auditId, 'assignmentId:', assignmentId);
      
      let auditData: AuditResponseDto | null = null;
      let assignmentData: Assignment | null = null;
      let templateData: TemplateDetails | null = null;

      if (auditId) {
        // Load by auditId (preferred)
        console.log('Loading audit by auditId:', auditId);
        try {
          auditData = await auditService.getAuditById(auditId);
          console.log('Loaded audit data:', auditData.auditId, 'assignmentId:', auditData.assignmentId);
          setAudit(auditData);
          
          // Verify we got the correct audit
          if (auditData.auditId !== auditId) {
            throw new Error(`Loaded wrong audit. Expected: ${auditId}, Got: ${auditData.auditId}`);
          }
        } catch (error) {
          console.error('Failed to load audit by ID:', error);
          // If loading by auditId fails, try to create a new audit if we have assignmentId
          if (assignmentId) {
            console.log('Attempting to create new audit for assignment:', assignmentId);
            // Continue with assignment-based creation below
          } else {
            throw error; // Re-throw if we don't have assignmentId to fall back to
          }
        }
        
        if (auditData && auditData.assignmentId) {
          assignmentData = await authService.getAssignmentDetails(auditData.assignmentId);
          setAssignment(assignmentData);
          templateData = await authService.getTemplateDetails(assignmentData.templateId);
          setTemplate(templateData);
        } else if (assignmentId) {
          assignmentData = await authService.getAssignmentDetails(assignmentId);
          setAssignment(assignmentData);
          templateData = await authService.getTemplateDetails(assignmentData.templateId);
          setTemplate(templateData);
        }
      } else if (assignmentId) {
        // Load assignment details
        assignmentData = await authService.getAssignmentDetails(assignmentId);
        setAssignment(assignmentData);
        console.log("Assignment Data: ", assignmentData);
        
        // Load template with questions
        templateData = await authService.getTemplateDetails(assignmentData.templateId);
        setTemplate(templateData);
        
        // If we don't have auditData yet (from failed auditId load), create a new audit
        if (!auditData) {
          // Try to find existing audit for this assignment first
          try {
            if (!user?.userId) {
              throw new Error('User not authenticated');
            }
            const existingAudit = await auditService.findExistingAuditForAssignment(
              assignmentData.templateId, 
              user.userId,
              assignmentId
            );
            if (existingAudit) {
              console.log('Found existing audit for assignment:', existingAudit.auditId);
              auditData = await auditService.getAuditById(existingAudit.auditId);
              console.log('Loaded existing audit:', auditData.auditId);
            } else {
              // Create new audit
              console.log('Creating new audit for assignment:', assignmentId);
              const createAuditData: CreateAuditDto = {
                templateId: assignmentData.templateId,
                assignmentId: assignmentId,
                storeInfo: assignmentData.storeInfo ? JSON.parse(assignmentData.storeInfo) : null,
                location: null
              };
              console.log('Create audit data:', createAuditData);
              auditData = await auditService.createAudit(createAuditData);
              console.log('Created new audit:', auditData.auditId, 'Assignment ID in response:', auditData.assignmentId);
            }
          } catch (error) {
            // Create new audit as fallback
            const createAuditData: CreateAuditDto = {
              templateId: assignmentData.templateId,
              assignmentId: assignmentId,
              storeInfo: assignmentData.storeInfo ? JSON.parse(assignmentData.storeInfo) : null,
              location: null
            };
            auditData = await auditService.createAudit(createAuditData);
          }
          setAudit(auditData);
        }
      } else if (assignmentId) {
        // Load assignment details
        assignmentData = await authService.getAssignmentDetails(assignmentId);
        setAssignment(assignmentData);
        // Load template with questions
        templateData = await authService.getTemplateDetails(assignmentData.templateId);
        setTemplate(templateData);
        // Try to find existing audit for this assignment first
        try {
          if (!user?.userId) {
            throw new Error('User not authenticated');
          }
          const existingAudit = await auditService.findExistingAuditForAssignment(
            assignmentData.templateId, 
            user.userId,
            assignmentId
          );
          if (existingAudit) {
            console.log('Found existing audit for assignment:', existingAudit.auditId);
            auditData = await auditService.getAuditById(existingAudit.auditId);
            console.log('Loaded existing audit:', auditData.auditId);
          } else {
            // Create new audit
            console.log('Creating new audit for assignment:', assignmentId);
            const createAuditData: CreateAuditDto = {
              templateId: assignmentData.templateId,
              assignmentId: assignmentId,
              storeInfo: assignmentData.storeInfo ? JSON.parse(assignmentData.storeInfo) : null,
              location: null
            };
            console.log('Create audit data:', createAuditData);
            auditData = await auditService.createAudit(createAuditData);
            console.log('Created new audit:', auditData.auditId, 'Assignment ID in response:', auditData.assignmentId);
          }
        } catch (error) {
          // Create new audit as fallback
          const createAuditData: CreateAuditDto = {
            templateId: assignmentData.templateId,
            assignmentId: assignmentId,
            storeInfo: assignmentData.storeInfo ? JSON.parse(assignmentData.storeInfo) : null,
            location: null
          };
          auditData = await auditService.createAudit(createAuditData);
        }
        setAudit(auditData);
        
        // Final verification - ensure we have the correct audit data
        if (auditData) {
          console.log('Final audit verification - auditId:', auditData.auditId, 'assignmentId:', auditData.assignmentId);
          if (auditId && auditData.auditId !== auditId) {
            throw new Error(`Final verification failed. Expected auditId: ${auditId}, Got: ${auditData.auditId}`);
          }
          if (assignmentId && auditData.assignmentId !== assignmentId) {
            console.warn(`Assignment ID mismatch. Expected: ${assignmentId}, Got: ${auditData.assignmentId}`);
          }
        }
      } else {
        Alert.alert('Error', 'No assignment or audit ID provided');
        navigation.goBack();
        return;
      }

      // Flatten questions from all sections and initialize with answer fields
      const allQuestions: QuestionWithAnswer[] = [];
      
      if (!templateData) {
        throw new Error('Template data not found');
      }
      
      templateData.questions.sections.forEach((section, sectionIndex) => {
        section.questions.forEach((question) => {
          allQuestions.push({
            ...question,
            answer: getInitialAnswer(question.type),
            notes: '',
            photos: [],
            sectionTitle: section.title,
            sectionIndex: sectionIndex
          });
        });
      });

      // Load existing progress if available
      if (!auditData) {
        throw new Error('No audit data available');
      }
      
      console.log('Loading progress for audit:', auditData.auditId);
      console.log('Server responses:', auditData.responses);
      
      let hasServerResponses = false;
      if (auditData.responses && Object.keys(auditData.responses).length > 0) {
        const existingResponses = auditData.responses;
        allQuestions.forEach(question => {
          if (existingResponses[question.id]) {
            const response = existingResponses[question.id];
            question.answer = response.answer || getInitialAnswer(question.type);
            question.notes = response.notes || '';
            question.photos = response.photos || [];
          }
        });
        hasServerResponses = true;
        console.log('Loaded responses from server');
      }
      
      // If no server responses, try to load from local storage
      if (!hasServerResponses) {
        console.log('No server responses, trying local storage...');
        const localProgress = await auditService.getAuditProgress(auditData.auditId);
        console.log('Local progress data:', localProgress);
        
        if (localProgress && localProgress.responses && Object.keys(localProgress.responses).length > 0) {
          allQuestions.forEach(question => {
            if (localProgress.responses[question.id]) {
              const response = localProgress.responses[question.id];
              question.answer = response.answer || getInitialAnswer(question.type);
              question.notes = response.notes || '';
              question.photos = response.photos || [];
            }
          });
          console.log('Loaded responses from local storage');
        } else {
          console.log('No local progress data found');
        }
      }

      setQuestions(allQuestions);

      // Extract section titles for navigation
      const sectionTitles = ['All', ...templateData.questions.sections.map(s => s.title)];
      setSections(sectionTitles);
      setCurrentSection(sectionId || (sectionTitles.length > 1 ? sectionTitles[1] : 'All'));

      // Update assignment status to "in_progress" if it's still "pending"
      if (assignmentData && assignmentData.status === 'pending' && assignmentId) {
        await authService.updateAssignmentStatus(assignmentId, 'in_progress');
      }

    } catch (error) {
      console.error('Failed to load audit data:', error);
      Alert.alert('Error', 'Failed to load audit data. Please try again.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const getInitialAnswer = (type: string): any => {
    switch (type) {
      case 'checkbox':
      case 'multiple_choice':
        return [];
      case 'text':
      case 'textarea':
      case 'number':
      case 'numeric':
      case 'phone':
      case 'email':
        return '';
      case 'dropdown':
      case 'radio':
      case 'single_choice':
      case 'rating':
        return null;
      case 'date':
      case 'time':
      case 'date_time':
        return null;
      case 'image':
      case 'file_upload':
        return [];
      case 'location':
      case 'gps':
        return null;
      case 'barcode':
        return '';
      case 'signature':
        return null;
      default:
        return null;
    }
  };
  
  const handleSaveProgress = async () => {
    debugger
    setSaving(true);
    
    try {
      if (!audit) {
        Alert.alert('Error', 'No audit found to save progress');
        return;
      }

      // Prepare audit responses
      const responses: { [key: string]: any } = {};
      questions.forEach(q => {
        if (q.answer !== null && q.answer !== '' && (!Array.isArray(q.answer) || q.answer.length > 0)) {
          responses[q.id] = {
            answer: q.answer,
            notes: q.notes || undefined,
            photos: q.photos.length > 0 ? q.photos : undefined
          };
        }
      });

      const progressData: AuditProgressData = {
        auditId: audit.auditId,
        responses,
        storeInfo: assignment?.storeInfo ? JSON.parse(assignment.storeInfo) : null,
        location: null, // Will be updated when location is captured
        media: null // Will be updated when media is captured
      };

      const result = await auditService.saveAuditProgress(audit.auditId, progressData, false);
      
      // The notification service will handle user feedback automatically
      // No need to show additional alerts as notifications will be sent
      
    } catch (error) {
      console.error('Failed to save progress:', error);
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  const handleChangeSection = (newSection: string) => {
    if (saving) return;
    
    // Check if there are unsaved changes
    const hasUnsavedChanges = questions.some(q => 
      q.answer !== null && q.answer !== '' && q.answer.length !== 0
    );
    
    if (hasUnsavedChanges) {
      // Automatically save progress when moving between sections
      handleSaveProgress().then(() => {
        setCurrentSection(newSection);
        setShowSectionList(false);
      }).catch((error) => {
        console.error('Failed to save progress when changing sections:', error);
        // Still change section even if save fails
        setCurrentSection(newSection);
        setShowSectionList(false);
      });
    } else {
      setCurrentSection(newSection);
      setShowSectionList(false);
    }
  };
  
  const handleAnswerChange = (questionId: string, value: any) => {
    setQuestions(prevQuestions => 
      prevQuestions.map(q => 
        q.id === questionId ? { ...q, answer: value } : q
      )
    );
    
    // Auto-save after 2 seconds of inactivity
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    const timer = setTimeout(() => {
      if (audit) {
        // Only auto-save if there are actual changes
        const hasChanges = questions.some(q => 
          q.answer !== null && q.answer !== '' && q.answer.length !== 0
        );
        
        if (hasChanges) {
          handleSaveProgress().catch(error => {
            console.error('Auto-save failed:', error);
          });
        }
      }
    }, 2000);
    
    setAutoSaveTimer(timer);
  };
  
  const handleNotesChange = (questionId: string, value: string) => {
    setQuestions(prevQuestions => 
      prevQuestions.map(q => 
        q.id === questionId ? { ...q, notes: value } : q
      )
    );
  };
  
  const handleAddPhoto = (questionId: string) => {
    // In a real app, this would open the camera
    const newPhotoUrl = `https://api.dicebear.com/7.x/shapes/svg?seed=${Math.random()}`;
    
    setQuestions(prevQuestions => 
      prevQuestions.map(q => 
        q.id === questionId 
          ? { ...q, photos: [...q.photos, newPhotoUrl] } 
          : q
      )
    );
    
    Alert.alert('Success', 'Photo added (demo)');
  };
  
  const handleRemovePhoto = (questionId: string, photoIndex: number) => {
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

  const handleImagePicker = async (questionId: string) => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photo library');
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const currentImages = questions.find(q => q.id === questionId)?.answer || [];
      handleAnswerChange(questionId, [...currentImages, result.assets[0].uri]);
    }
  };

  const handleCameraCapture = async (questionId: string) => {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your camera');
      return;
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const currentImages = questions.find(q => q.id === questionId)?.answer || [];
      handleAnswerChange(questionId, [...currentImages, result.assets[0].uri]);
    }
  };

  const handleLocationPicker = async (questionId: string) => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your location');
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Get address from coordinates
      const address = await Location.reverseGeocodeAsync({ latitude, longitude });
      const addressString = address[0] 
        ? `${address[0].name || ''} ${address[0].street || ''}, ${address[0].city || ''}, ${address[0].region || ''}`.trim()
        : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

      const locationData = {
        latitude,
        longitude,
        address: addressString
      };

      handleAnswerChange(questionId, locationData);
    } catch (error) {
      Alert.alert('Error', 'Failed to get location. Please try again.');
    }
  };

  const handleDateConfirm = (selectedDate: Date) => {
    setShowDatePicker(false);
    if (activeQuestionId) {
      const dateString = selectedDate.toISOString().split('T')[0];
      handleAnswerChange(activeQuestionId, dateString);
    }
    setActiveQuestionId(null);
  };

  const handleTimeConfirm = (selectedTime: Date) => {
    setShowTimePicker(false);
    if (activeQuestionId) {
      const timeString = selectedTime.toTimeString().split(' ')[0].substring(0, 5);
      handleAnswerChange(activeQuestionId, timeString);
    }
    setActiveQuestionId(null);
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
    setActiveQuestionId(null);
  };

  const handleTimeCancel = () => {
    setShowTimePicker(false);
    setActiveQuestionId(null);
  };

  const toggleDropdown = (questionId: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };
  
  const handleCompleteSection = async () => {
    debugger;
    const sectionQuestions = getCurrentSectionQuestions();
    
    // Type-aware validation for required questions
    const isQuestionAnswered = (q: QuestionWithAnswer) => {
      switch (q.type.toLowerCase()) {
        case 'singlechoice':
        case 'dropdown':
        case 'radio':
          return q.answer !== null && q.answer !== '';
        case 'multiplechoice':
        case 'checkbox':
          return Array.isArray(q.answer) && q.answer.length > 0;
        case 'text':
        case 'textarea':
        case 'number':
        case 'numeric':
        case 'phone':
        case 'email':
          return typeof q.answer === 'string' && q.answer.trim() !== '';
        case 'fileupload':
        case 'image':
          return Array.isArray(q.answer) && q.answer.length > 0;
        case 'date':
        case 'time':
        case 'date_time':
          return q.answer !== null && q.answer !== '';
        case 'location':
        case 'gps':
          return q.answer !== null;
        case 'barcode':
          return typeof q.answer === 'string' && q.answer.trim() !== '';
        case 'signature':
          return q.answer !== null;
        default:
          return !!q.answer;
      }
    };

    // Check for required questions
    const unansweredRequired = sectionQuestions.filter(q => q.required && !isQuestionAnswered(q));
    
    if (unansweredRequired.length > 0) {
      Alert.alert(
        "Incomplete Section",
        `Please answer all required questions (${unansweredRequired.length} remaining)`,
        [{ text: "OK" }]
      );
      return;
    }
    
    // Check if this is the last section and all questions in the audit are completed
    const currentSectionIndex = sections.indexOf(currentSection);
    const isLastSection = currentSectionIndex === sections.length - 1;
    
    if (isLastSection) {
      // Check if all questions in the entire audit are completed
      const allAuditQuestionsAnswered = questions.every(q => 
        !q.required || (q.answer !== null && q.answer !== '' && (!Array.isArray(q.answer) || q.answer.length > 0))
      );

      if (allAuditQuestionsAnswered) {
        // All questions complete - save as completed audit
        setSaving(true);
        try {
          if (!audit) {
            Alert.alert('Error', 'No audit found to save progress');
            return;
          }

          // Prepare audit responses
          const responses: { [key: string]: any } = {};
          questions.forEach(q => {
            if (q.answer !== null && q.answer !== '' && (!Array.isArray(q.answer) || q.answer.length > 0)) {
              responses[q.id] = {
                answer: q.answer,
                notes: q.notes || undefined,
                photos: q.photos.length > 0 ? q.photos : undefined
              };
            }
          });

          const progressData: AuditProgressData = {
            auditId: audit.auditId,
            responses,
            storeInfo: assignment?.storeInfo ? JSON.parse(assignment.storeInfo) : null,
            location: null,
            media: null,
            completed: true // Mark as completed
          };

          const result = await auditService.saveAuditProgress(audit.auditId, progressData, true);
          
          // Update assignment status to "fulfilled" when audit is completed
          if (assignment?.assignmentId) {
            try {
              await authService.updateAssignmentStatus(assignment.assignmentId, 'fulfilled');
              console.log('Assignment status updated to fulfilled for assignment:', assignment.assignmentId);
            } catch (error) {
              console.error('Failed to update assignment status:', error);
              // Don't block the completion flow if status update fails
            }
          }
          
          // The notification service will handle user feedback automatically
          // Navigate back after a short delay to allow notification to be processed
          setTimeout(() => {
            navigation.goBack();
          }, 1000);
        } catch (error) {
          console.error('Failed to complete audit:', error);
          Alert.alert('Error', 'Failed to complete audit. Please try again.');
        } finally {
          setSaving(false);
        }
      } else {
        // Last section but not all questions answered - save progress and go back
        await handleSaveProgress();
        navigation.goBack();
      }
    } else {
      // Not the last section - save progress and move to next section
      await handleSaveProgress();
      
      const nextSection = sections[currentSectionIndex + 1];
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
            onPress: () => setCurrentSection(nextSection)
          }
        ]
      );
    }
  };

  const getCurrentSectionQuestions = (): QuestionWithAnswer[] => {
    if (currentSection === 'All') {
      return questions;
    }
    return questions.filter(q => q.sectionTitle === currentSection);
  };

  const getAnsweredCount = (sectionQuestions: QuestionWithAnswer[]): number => {
    return sectionQuestions.filter(q => 
      q.answer !== null && q.answer !== '' && (!Array.isArray(q.answer) || q.answer.length > 0)
    ).length;
  };
  
  const renderQuestion = (question: QuestionWithAnswer, index: number) => {
    return (
      <View key={question.id} style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <Text style={styles.questionNumber}>Q{index + 1}</Text>
          <Text style={styles.questionText}>
            {question.text}
            {question.required && <Text style={styles.requiredIndicator}> *</Text>}
          </Text>
        </View>
        
        {/* Different input types based on question type */}
        <View style={styles.answerContainer}>
          {/* Text Input */}
          {question.type === 'text' && (
            <TextInput
              style={styles.singleLineInput}
              placeholder="Enter your answer"
              value={question.answer}
              onChangeText={(text) => handleAnswerChange(question.id, text)}
            />
          )}
          
          {/* Textarea Input */}
          {question.type === 'textarea' && (
            <TextInput
              style={[styles.textInput, { minHeight: 120 }]}
              placeholder="Enter your detailed answer"
              value={question.answer}
              onChangeText={(text) => handleAnswerChange(question.id, text)}
              multiline
              numberOfLines={5}
            />
          )}
          
          {/* Number Input */}
          {(question.type === 'number' || question.type === 'numeric') && (
            <TextInput
              style={styles.numberInput}
              placeholder="Enter a number"
              value={question.answer?.toString() || ''}
              onChangeText={(text) => handleAnswerChange(question.id, text)}
              keyboardType="numeric"
            />
          )}
          
          {/* Phone Input */}
          {question.type === 'phone' && (
            <TextInput
              style={styles.textInput}
              placeholder="Enter phone number"
              value={question.answer}
              onChangeText={(text) => handleAnswerChange(question.id, text)}
              keyboardType="phone-pad"
            />
          )}
          
          {/* Email Input */}
          {question.type === 'email' && (
            <TextInput
              style={styles.textInput}
              placeholder="Enter email address"
              value={question.answer}
              onChangeText={(text) => handleAnswerChange(question.id, text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}
          
          {/* Dropdown */}
          {question.type === 'dropdown' && question.options && (
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdownHeader}
                onPress={() => toggleDropdown(question.id)}
              >
                <Text style={styles.dropdownHeaderText}>
                  {question.answer || 'Select an option'}
                </Text>
                <Ionicons 
                  name={openDropdowns[question.id] ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#6c757d" 
                />
              </TouchableOpacity>
              {openDropdowns[question.id] && (
                <View style={styles.dropdownOptions}>
                  {question.options.map((option, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.dropdownOption,
                        question.answer === option && styles.selectedDropdownOption
                      ]}
                      onPress={() => {
                        handleAnswerChange(question.id, option);
                        toggleDropdown(question.id);
                      }}
                    >
                      <Text style={[
                        styles.dropdownOptionText,
                        question.answer === option && styles.selectedDropdownOptionText
                      ]}>
                        {option}
                      </Text>
                      {question.answer === option && (
                        <Ionicons name="checkmark" size={20} color="#0066CC" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
          
          {/* Radio Buttons (Single Choice) */}
          {(question.type === 'radio' || question.type === 'single_choice') && question.options && (
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
          
          {/* Checkboxes (Multiple Choice) */}
          {(question.type === 'checkbox' || question.type === 'multiple_choice') && question.options && (
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
                        ? currentAnswers.filter((a: string) => a !== option)
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
          
          {/* Rating Scale */}
          {question.type === 'rating' && (
            <View style={styles.ratingContainer}>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <TouchableOpacity 
                    key={rating}
                    style={styles.starButton}
                    onPress={() => handleAnswerChange(question.id, rating)}
                  >
                    <Ionicons
                      name={rating <= (question.answer || 0) ? "star" : "star-outline"}
                      size={32}
                      color={rating <= (question.answer || 0) ? "#FFD700" : "#e9ecef"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingText}>
                {question.answer ? `${question.answer} out of 5 stars` : 'Tap to rate'}
              </Text>
            </View>
          )}
          
          {/* Date Input */}
          {(question.type === 'date' || question.type === 'date_time') && (
            <TouchableOpacity 
              style={styles.dateTimeButton}
              onPress={() => {
                setActiveQuestionId(question.id);
                setTempDate(question.answer ? new Date(question.answer) : new Date());
                setShowDatePicker(true);
              }}
            >
              <Ionicons name="calendar-outline" size={20} color="#0066CC" />
              <Text style={styles.dateTimeText}>
                {question.answer || 'Select Date'}
              </Text>
            </TouchableOpacity>
          )}
          
          {/* Time Input */}
          {question.type === 'time' && (
            <TouchableOpacity 
              style={styles.dateTimeButton}
              onPress={() => {
                setActiveQuestionId(question.id);
                const timeValue = question.answer ? new Date(`1970-01-01T${question.answer}:00`) : new Date();
                setTempDate(timeValue);
                setShowTimePicker(true);
              }}
            >
              <Ionicons name="time-outline" size={20} color="#0066CC" />
              <Text style={styles.dateTimeText}>
                {question.answer || 'Select Time'}
              </Text>
            </TouchableOpacity>
          )}
          
          {/* Image Upload */}
          {(question.type === 'image' || question.type === 'file_upload') && (
            <View style={styles.imageContainer}>
              <View style={styles.imageUploadButtons}>
                <TouchableOpacity 
                  style={styles.imageUploadButton}
                  onPress={() => handleCameraCapture(question.id)}
                >
                  <Ionicons name="camera-outline" size={24} color="#0066CC" />
                  <Text style={styles.imageUploadText}>Camera</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.imageUploadButton}
                  onPress={() => handleImagePicker(question.id)}
                >
                  <Ionicons name="image-outline" size={24} color="#0066CC" />
                  <Text style={styles.imageUploadText}>Gallery</Text>
                </TouchableOpacity>
              </View>
              
              {question.answer && question.answer.length > 0 && (
                <ScrollView horizontal style={styles.imageList}>
                  {question.answer.map((image: string, imgIndex: number) => (
                    <View key={imgIndex} style={styles.imageItem}>
                      <Image source={{ uri: image }} style={styles.imagePreview} />
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={() => {
                          const updatedImages = question.answer.filter((_: any, index: number) => index !== imgIndex);
                          handleAnswerChange(question.id, updatedImages);
                        }}
                      >
                        <Ionicons name="close-circle" size={20} color="#dc3545" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
          
          {/* Location Input */}
          {(question.type === 'location' || question.type === 'gps') && (
            <TouchableOpacity 
              style={styles.locationButton}
              onPress={() => handleLocationPicker(question.id)}
            >
              <Ionicons name="location-outline" size={20} color="#0066CC" />
              <Text style={styles.locationText}>
                {question.answer ? 
                  `${question.answer.address || 'Location Selected'}` : 
                  'Select Location'
                }
              </Text>
            </TouchableOpacity>
          )}
          
          {/* Barcode Scanner */}
          {question.type === 'barcode' && (
            <View style={styles.barcodeContainer}>
              <TouchableOpacity 
                style={styles.barcodeButton}
                onPress={() => {
                  // In a real app, this would open the barcode scanner
                  Alert.alert('Barcode Scanner', 'Barcode scanner functionality would be implemented here');
                }}
              >
                <Ionicons name="scan-outline" size={24} color="#0066CC" />
                <Text style={styles.barcodeText}>Scan Barcode</Text>
              </TouchableOpacity>
              {question.answer && (
                <View style={styles.barcodeResult}>
                  <Text style={styles.barcodeResultText}>Scanned: {question.answer}</Text>
                  <TouchableOpacity 
                    style={styles.clearButton}
                    onPress={() => handleAnswerChange(question.id, '')}
                  >
                    <Ionicons name="close-circle" size={20} color="#dc3545" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          
          {/* Signature Input */}
          {question.type === 'signature' && (
            <View style={styles.signatureContainer}>
              <TouchableOpacity 
                style={styles.signatureButton}
                onPress={() => {
                  // In a real app, this would open the signature pad
                  Alert.alert('Signature Pad', 'Signature pad functionality would be implemented here');
                }}
              >
                <Ionicons name="create-outline" size={24} color="#0066CC" />
                <Text style={styles.signatureText}>
                  {question.answer ? 'Signature Captured' : 'Add Signature'}
                </Text>
              </TouchableOpacity>
              {question.answer && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => handleAnswerChange(question.id, null)}
                >
                  <Ionicons name="close-circle" size={20} color="#dc3545" />
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const currentSectionQuestions = getCurrentSectionQuestions();
  const answeredCount = getAnsweredCount(currentSectionQuestions);
  
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
            {currentSection}
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
            {sections.map((section) => (
              <TouchableOpacity
                key={section}
                style={[
                  styles.sectionListItem,
                  currentSection === section && styles.activeSectionItem
                ]}
                onPress={() => handleChangeSection(section)}
              >
                <Text style={[
                  styles.sectionListItemText,
                  currentSection === section && styles.activeSectionItemText
                ]}>
                  {section}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading audit questions...</Text>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Assignment info */}
            <View style={styles.sectionInfoCard}>
              <Text style={styles.sectionTitle}>
                {assignment?.template.name || 'Audit Template'}
              </Text>
              <Text style={styles.sectionDescription}>
                {template?.description || 'Complete the audit questions below'}
              </Text>
              <View style={styles.sectionProgress}>
                <Text style={styles.progressText}>
                  {answeredCount} of {currentSectionQuestions.length} questions answered
                </Text>
                <View style={styles.progressBarBackground}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${(answeredCount / Math.max(currentSectionQuestions.length, 1)) * 100}%` 
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>
            
            {/* Questions */}
            {currentSectionQuestions.map((question, index) => renderQuestion(question, index))}
            
            {/* Complete section button */}
            <TouchableOpacity 
              style={styles.completeSectionButton}
              onPress={handleCompleteSection}
            >
              <Text style={styles.completeSectionButtonText}>
                {currentSection === 'All' || sections.length <= 2 ? 'Complete Audit' : 'Complete Section'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {saving ? 'Saving...' : 'Progress auto-saves every 2 seconds'}
              </Text>
            </View>
          </ScrollView>
        </>
      )}
      
      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={handleDateCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModalContent}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity 
                  style={styles.calendarNavButton}
                  onPress={() => {
                    const newDate = new Date(tempDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setTempDate(newDate);
                  }}
                >
                  <Text style={styles.calendarNavText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.calendarHeaderText}>
                  {tempDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity 
                  style={styles.calendarNavButton}
                  onPress={() => {
                    const newDate = new Date(tempDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setTempDate(newDate);
                  }}
                >
                  <Text style={styles.calendarNavText}>›</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.calendarWeekHeader}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <Text key={day} style={styles.calendarWeekDay}>{day}</Text>
                ))}
              </View>
              
              <View style={styles.calendarDays}>
                {(() => {
                  const days = [];
                  const firstDay = new Date(tempDate.getFullYear(), tempDate.getMonth(), 1);
                  const lastDay = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0);
                  const startDate = new Date(firstDay);
                  startDate.setDate(startDate.getDate() - firstDay.getDay());
                  
                  for (let i = 0; i < 42; i++) {
                    const date = new Date(startDate);
                    date.setDate(startDate.getDate() + i);
                    const isCurrentMonth = date.getMonth() === tempDate.getMonth();
                    const isSelected = date.toDateString() === tempDate.toDateString();
                    const isToday = date.toDateString() === new Date().toDateString();
                    
                    days.push(
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.calendarDay,
                          !isCurrentMonth && styles.calendarDayInactive,
                          isSelected && styles.calendarDaySelected,
                          isToday && !isSelected && styles.calendarDayToday
                        ]}
                        onPress={() => setTempDate(new Date(date))}
                      >
                        <Text style={[
                          styles.calendarDayText,
                          !isCurrentMonth && styles.calendarDayTextInactive,
                          isSelected && styles.calendarDayTextSelected,
                          isToday && !isSelected && styles.calendarDayTextToday
                        ]}>
                          {date.getDate()}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                  return days;
                })()}
              </View>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={handleDateCancel}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={() => handleDateConfirm(tempDate)}>
                <Text style={[styles.modalButtonText, styles.confirmButtonText]}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={handleTimeCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerModalContent}>
            <Text style={styles.modalTitle}>Select Time</Text>
            <View style={styles.timePickerContainer}>
              <Text style={styles.timeDisplayText}>
                {tempDate.toTimeString().split(' ')[0].substring(0, 5)}
              </Text>
              <View style={styles.timeControls}>
                <View style={styles.timeSection}>
                  <Text style={styles.timeLabel}>Hour</Text>
                  <View style={styles.timeButtonRow}>
                    <TouchableOpacity 
                      style={styles.timeButton}
                      onPress={() => {
                        const newDate = new Date(tempDate);
                        newDate.setHours((newDate.getHours() + 1) % 24);
                        setTempDate(newDate);
                      }}
                    >
                      <Text style={styles.timeButtonText}>+</Text>
                    </TouchableOpacity>
                    <Text style={styles.timeValue}>{tempDate.getHours().toString().padStart(2, '0')}</Text>
                    <TouchableOpacity 
                      style={styles.timeButton}
                      onPress={() => {
                        const newDate = new Date(tempDate);
                        newDate.setHours(newDate.getHours() === 0 ? 23 : newDate.getHours() - 1);
                        setTempDate(newDate);
                      }}
                    >
                      <Text style={styles.timeButtonText}>-</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.timeSection}>
                  <Text style={styles.timeLabel}>Minute</Text>
                  <View style={styles.timeButtonRow}>
                    <TouchableOpacity 
                      style={styles.timeButton}
                      onPress={() => {
                        const newDate = new Date(tempDate);
                        newDate.setMinutes((newDate.getMinutes() + 5) % 60);
                        setTempDate(newDate);
                      }}
                    >
                      <Text style={styles.timeButtonText}>+</Text>
                    </TouchableOpacity>
                    <Text style={styles.timeValue}>{tempDate.getMinutes().toString().padStart(2, '0')}</Text>
                    <TouchableOpacity 
                      style={styles.timeButton}
                      onPress={() => {
                        const newDate = new Date(tempDate);
                        newDate.setMinutes(newDate.getMinutes() < 5 ? 55 : newDate.getMinutes() - 5);
                        setTempDate(newDate);
                      }}
                    >
                      <Text style={styles.timeButtonText}>-</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={handleTimeCancel}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={() => handleTimeConfirm(tempDate)}>
                <Text style={[styles.modalButtonText, styles.confirmButtonText]}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  singleLineInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#212529',
    height: 48,
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
  dropdownContainer: {
    marginVertical: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  dropdownHeaderText: {
    fontSize: 16,
    color: '#212529',
  },
  dropdownOptions: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: 'white',
    maxHeight: 200,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  selectedDropdownOption: {
    backgroundColor: '#e6f2ff',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#212529',
  },
  selectedDropdownOptionText: {
    fontWeight: '500',
    color: '#0066CC',
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
  ratingContainer: {
    marginVertical: 8,
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  starButton: {
    paddingHorizontal: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
  },
  dateTimeText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#212529',
  },
  imageContainer: {
    marginBottom: 16,
  },
  imageUploadButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  imageUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    flex: 0.48,
    justifyContent: 'center',
  },
  imageUploadText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#0066CC',
  },
  imageList: {
    flexDirection: 'row',
  },
  imageItem: {
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#212529',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  datePickerModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  timePickerModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#212529',
    width: '100%',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#ced4da',
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#212529',
  },
  confirmButtonText: {
    color: 'white',
  },
  timePickerContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 16,
  },
  timeDisplayText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 20,
    fontFamily: 'monospace',
  },
  timeControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  timeSection: {
    alignItems: 'center',
  },
  timeButtonRow: {
    alignItems: 'center',
  },
  timeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  timeButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  timeValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212529',
    marginVertical: 12,
    minWidth: 40,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
    marginBottom: 8,
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  calendarNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarNavText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0066CC',
  },
  calendarHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  calendarWeekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  calendarWeekDay: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6c757d',
    textAlign: 'center',
    width: 40,
  },
  calendarDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  calendarDayInactive: {
    opacity: 0.3,
  },
  calendarDaySelected: {
    backgroundColor: '#0066CC',
    borderRadius: 20,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: '#0066CC',
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 16,
    color: '#212529',
  },
  calendarDayTextInactive: {
    color: '#6c757d',
  },
  calendarDayTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  calendarDayTextToday: {
    color: '#0066CC',
    fontWeight: '600',
  },
  barcodeContainer: {
    marginVertical: 8,
  },
  barcodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  barcodeText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '500',
  },
  barcodeResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#e6f2ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0066CC',
  },
  barcodeResultText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  clearButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#dc3545',
  },
  signatureContainer: {
    marginVertical: 8,
  },
  signatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  signatureText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '500',
  },
});