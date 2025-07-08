// Authentication service for handling API calls
import { debugLogger } from '../utils/DebugLogger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageService } from './StorageService';

const API_BASE_URL = 'http://192.168.1.4:8080/api/v1';

// Enable detailed logging for debugging
const DEBUG_MODE = true;
const LOG_REQUESTS = true;

// Token expiration callback - will be set by AuthContext
let tokenExpirationCallback: (() => void) | null = null;

export const setTokenExpirationCallback = (callback: () => void) => {
  tokenExpirationCallback = callback;
};

const debugLog = (message: string, data?: any) => {
  if (DEBUG_MODE) {
    debugLogger.log(`[AuthService] ${message}`, data);
  }
};

const debugError = (message: string, error?: any) => {
  if (DEBUG_MODE) {
    debugLogger.error(`[AuthService] ${message}`, error);
  }
};

// Types
export interface RegisterRequest {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  organisationId?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  token: string;
  role: string;
  organisationId?: string;
}

export interface UserDetails {
  userId: string;
  organisationId?: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  assignmentId: string;
  templateId: string;
  assignedToId: string;
  assignedById: string;
  organisationId: string;
  dueDate: string | null;
  priority: string | null;
  notes: string | null;
  status: string | null;
  storeInfo: string | null;
  createdAt: string;
  template: {
    templateId: string;
    name: string;
    category: string;
  };
  assignedTo: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignedBy: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface TemplateQuestion {
  id: string;
  text: string;
  type: 'text' | 'textarea' | 'dropdown' | 'radio' | 'checkbox' | 'rating' | 'number' | 'numeric' | 'single_choice' | 'multiple_choice' | 'date' | 'time' | 'date_time' | 'image' | 'file_upload' | 'location' | 'gps' | 'phone' | 'email' | 'barcode' | 'signature';
  required: boolean;
  conditionalLogic: any[];
  options?: string[];
  scale?: {
    min: number;
    max: number;
  };
}

export interface TemplateSection {
  title: string;
  description: string;
  questions: TemplateQuestion[];
}

export interface TemplateQuestions {
  sections: TemplateSection[];
}

export interface TemplateDetails {
  templateId: string;
  name: string;
  description: string;
  category: string;
  questions: TemplateQuestions;
  scoringRules: any;
  validFrom: string | null;
  validTo: string | null;
  createdById: string;
  isPublished: boolean;
  version: number;
  createdAt: string;
}

export interface AuditResponse {
  questionId: string;
  answer: any;
  notes?: string;
  photos?: string[];
}

export interface CreateAuditRequest {
  assignmentId: string;
  responses: AuditResponse[];
  storeInfo?: any;
  location?: any;
  media?: any;
  managerNotes?: string;
}

// API error response type
export interface ApiError {
  message: string;
}

class AuthService {
  /**
   * Convert UI status to API status
   */
  private convertStatusToApi(uiStatus: string): string {
    switch (uiStatus.toLowerCase()) {
      case 'assigned':
        return 'pending';
      case 'in progress':
        return 'pending';
      case 'completed':
        return 'fulfilled';
      case 'submitted':
        return 'fulfilled';
      default:
        return uiStatus.toLowerCase();
    }
  }

  /**
   * Convert API status to UI status
   */
  private convertStatusToUi(apiStatus: string): string {
    switch (apiStatus.toLowerCase()) {
      case 'pending':
        return 'Assigned';
      case 'fulfilled':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'expired':
        return 'Expired';
      default:
        return apiStatus;
    }
  }
  /**
   * Check if the error indicates token expiration
   */
  private isTokenExpired(response: Response, responseText: string): boolean {
    if (response.status === 401) {
      const authHeader = response.headers.get('www-authenticate');
      if (authHeader && authHeader.includes('invalid_token') && authHeader.includes('expired')) {
        return true;
      }
      // Also check response text for expiration messages
      if (responseText && responseText.toLowerCase().includes('expired')) {
        return true;
      }
    }
    return false;
  }

  /**
   * Handle token expiration by clearing auth data and triggering logout
   */
  private async handleTokenExpiration(): Promise<void> {
    debugLog('Token expired, clearing auth data and triggering logout');
    
    try {
      // Clear all authentication data
      await storageService.clearAuthData();
      
      // Trigger logout callback if available
      if (tokenExpirationCallback) {
        tokenExpirationCallback();
      }
    } catch (error) {
      debugError('Error handling token expiration:', error);
    }
  }

  /**
   * Enhanced helper method to handle response parsing with token expiration detection
   */
  private async handleResponse(response: Response, operation: string): Promise<any> {
    debugLog(`${operation} - Response status:`, response.status);
    debugLog(`${operation} - Response headers:`, Object.fromEntries(response.headers.entries()));

    // Get response text first to debug what we're actually receiving
    const responseText = await response.text();
    debugLog(`${operation} - Raw response text:`, responseText);

    if (!response.ok) {
      // Check for token expiration
      if (this.isTokenExpired(response, responseText)) {
        debugLog('Token expiration detected, handling logout');
        await this.handleTokenExpiration();
        throw new Error('Your session has expired. Please log in again.');
      }

      // If response is not ok, try to parse error message
      let errorMessage = `${operation} failed with status ${response.status}`;
      
      if (responseText) {
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          // If error response is not JSON, use the raw text
          errorMessage = responseText || errorMessage;
        }
      }
      
      debugError(`${operation} failed:`, { status: response.status, message: errorMessage });
      throw new Error(errorMessage);
    }

    // If response is ok but empty, return empty object
    if (!responseText) {
      debugLog(`${operation} - Empty response, returning empty object`);
      return {};
    }

    // Try to parse JSON
    try {
      const data = JSON.parse(responseText);
      debugLog(`${operation} - Parsed JSON successfully:`, data);
      return data;
    } catch (parseError) {
      debugError(`${operation} - JSON parse error:`, parseError);
      debugError(`${operation} - Response text that failed to parse:`, responseText);
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
      throw new Error(`Invalid JSON response from server: ${errorMessage}`);
    }
  }

  /**
   * Enhanced method to handle authenticated API calls with token expiration detection
   */
  private async makeAuthenticatedRequest(
    url: string, 
    options: RequestInit = {}, 
    operation: string
  ): Promise<Response> {
    const token = await storageService.getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    if (LOG_REQUESTS) {
      const tokenPreview = token.length > 20 ? 
        `${token.substring(0, 10)}...${token.substring(token.length - 10)}` : 
        token;
      debugLogger.log('API Request', `${options.method || 'GET'} ${url}`);
      debugLogger.log('Request Headers', `Authorization: Bearer ${tokenPreview}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (LOG_REQUESTS) {
      debugLogger.log('API Response Status', response.status.toString());
      debugLogger.log('Response Headers', Object.fromEntries(response.headers.entries()));
    }

    // Check for token expiration before processing the response
    if (response.status === 401) {
      const responseText = await response.text();
      if (this.isTokenExpired(response, responseText)) {
        debugLog('Token expiration detected in authenticated request');
        await this.handleTokenExpiration();
        throw new Error('Your session has expired. Please log in again.');
      }
      // If not expired, throw with the response text
      throw new Error(`Authentication failed: ${responseText}`);
    }

    return response;
  }

  /**
   * Register a new user
   */
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    debugLog('Starting registration request', userData);
    
    try {
      const response = await fetch(`${API_BASE_URL}/Auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      return await this.handleResponse(response, 'Registration');
    } catch (error) {
      debugError('Registration error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred during registration');
    }
  }

  /**
   * Login a user
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    debugLog('Starting login request', { username: credentials.username, password: '[HIDDEN]' });
    
    try {
      const response = await fetch(`${API_BASE_URL}/Auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      return await this.handleResponse(response, 'Login');
    } catch (error) {
      debugError('Login error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred during login');
    }
  }

  /**
   * Get current user details
   */
  async getUserDetails(userId: string, token: string): Promise<UserDetails> {
    debugLog('Starting get user details request', { userId });
    
    try {
      const response = await fetch(`${API_BASE_URL}/Users/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      return await this.handleResponse(response, 'Get User Details');
    } catch (error) {
      debugError('Get user details error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while fetching user details');
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, passwordData: ChangePasswordRequest, token: string): Promise<void> {
    debugLog('Starting change password request', { userId });
    
    try {
      const response = await fetch(`${API_BASE_URL}/Users/${userId}/change-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(passwordData),
      });

      await this.handleResponse(response, 'Change Password');
    } catch (error) {
      debugError('Change password error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while changing password');
    }
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    debugLog('Testing API connection to:', API_BASE_URL);
    
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      debugLog('Health check response status:', response.status);
      return response.ok;
    } catch (error) {
      debugError('Connection test failed:', error);
      return false;
    }
  }

  async getAssignmentsForUser(userId: string): Promise<Assignment[]> {
    try {
      const url = `${API_BASE_URL}/Assignments`;
      const response = await this.makeAuthenticatedRequest(url, { method: 'GET' }, 'Get Assignments');
      
      if (!response.ok) {
        const errorText = await response.text();
        // debugLogger.error('Get Assignments Error', `Status: ${response.status}, Body: ${errorText}`);
        
        // If 403, test token validity
        if (response.status === 403) {
          debugLogger.log('Testing Token Validity', 'Attempting to get user details...');
          try {
            const token = await storageService.getAuthToken();
            if (token) {
              await this.getUserDetails(userId, token);
              debugLogger.log('Token Test Result', 'Token is valid but no assignment access');
              throw new Error('You do not have permission to view assignments. Please contact your administrator.');
            }
          } catch (tokenError) {
            debugLogger.error('Token Test Failed', 'Token appears to be invalid');
            throw new Error('Authentication token is invalid or expired. Please log in again.');
          }
        }
        
        throw new Error(`Failed to fetch assignments: ${response.status}`);
      }

      const responseText = await response.text();
      if (LOG_REQUESTS) {
        debugLogger.log('API Response Body', responseText);
      }

      let allAssignments: Assignment[];
      try {
        allAssignments = JSON.parse(responseText);
      } catch (parseError) {
        debugLogger.error('JSON Parse Error', `Response: ${responseText}`);
        throw new Error('Invalid JSON response from server');
      }

      // Filter assignments for the current user and convert statuses
      const userAssignments = allAssignments
        .filter(assignment => assignment.assignedToId === userId)
        .map(assignment => ({
          ...assignment,
          status: this.convertStatusToUi(assignment.status || 'pending')
        }));

      // debugLogger.log('Assignments Retrieved', `Found ${userAssignments.length} assignments for user out of ${allAssignments.length} total`);
      return userAssignments;

    } catch (error) {
      // debugLogger.error('Get Assignments Error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Test if the current token is valid by trying to get user details
   */
  async testTokenValidity(): Promise<boolean> {
    try {
      const token = await storageService.getAuthToken();
      const userId = await storageService.getUserId();
      
      if (!token || !userId) {
        return false;
      }

      await this.getUserDetails(userId, token);
      return true;
    } catch (error) {
      debugLogger.error('Token validity test failed', error);
      return false;
    }
  }

  /**
   * Get assignment details by ID
   */
  async getAssignmentDetails(assignmentId: string): Promise<Assignment> {
    try {
      const url = `${API_BASE_URL}/Assignments/${assignmentId}`;
      const response = await this.makeAuthenticatedRequest(url, { method: 'GET' }, 'Get Assignment Details');
      
      const assignment: Assignment = await this.handleResponse(response, 'Get Assignment Details');
      
      // Convert API status to UI status
      const assignmentWithUiStatus = {
        ...assignment,
        status: this.convertStatusToUi(assignment.status || 'pending')
      };
      
      debugLogger.log('Assignment Details Retrieved', `Assignment: ${assignment.assignmentId}, Status: ${assignmentWithUiStatus.status}`);
      return assignmentWithUiStatus;

    } catch (error) {
      debugLogger.error('Get Assignment Details Error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Get template details with questions
   */
  async getTemplateDetails(templateId: string): Promise<TemplateDetails> {
    try {
      const url = `${API_BASE_URL}/Templates/${templateId}`;
      const response = await this.makeAuthenticatedRequest(url, { method: 'GET' }, 'Get Template Details');
      
      const templateData = await this.handleResponse(response, 'Get Template Details');
      
      // Parse questions if they're stored as JSON string
      let questions: TemplateQuestions = { sections: [] };
      if (templateData.questions) {
        try {
          questions = typeof templateData.questions === 'string' 
            ? JSON.parse(templateData.questions) 
            : templateData.questions;
        } catch (parseError) {
          debugLogger.error('Failed to parse template questions', parseError);
          questions = { sections: [] };
        }
      }

      const template: TemplateDetails = {
        ...templateData,
        questions
      };

      debugLogger.log('Template Details Retrieved', `Template: ${template.name}, Sections: ${questions.sections.length}`);
      return template;

    } catch (error) {
      debugLogger.error('Get Template Details Error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Create or update an audit
   */
  async saveAuditProgress(auditData: CreateAuditRequest): Promise<any> {
    try {
      const url = `${API_BASE_URL}/Audits`;
      
      if (LOG_REQUESTS) {
        debugLogger.log('Request Body', auditData);
      }

      const response = await this.makeAuthenticatedRequest(url, {
        method: 'POST',
        body: JSON.stringify(auditData),
      }, 'Save Audit Progress');

      const result = await this.handleResponse(response, 'Save Audit Progress');
      debugLogger.log('Audit Progress Saved', `Audit saved successfully`);
      return result;

    } catch (error) {
      debugLogger.error('Save Audit Progress Error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Update assignment status
   */
  async updateAssignmentStatus(assignmentId: string, status: string): Promise<void> {
    try {
      const url = `${API_BASE_URL}/Assignments/${assignmentId}/status`;
      
      // Convert UI status to API status
      const apiStatus = this.convertStatusToApi(status);
      
      const response = await this.makeAuthenticatedRequest(url, {
        method: 'PATCH',
        body: JSON.stringify({ status: apiStatus }),
      }, 'Update Assignment Status');

      await this.handleResponse(response, 'Update Assignment Status');
      debugLogger.log('Assignment Status Updated', `UI Status: ${status}, API Status: ${apiStatus}`);

    } catch (error) {
      debugLogger.error('Update Assignment Status Error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}

export const authService = new AuthService(); 