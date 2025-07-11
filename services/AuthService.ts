// Authentication service for handling API calls
import { debugLogger } from '../utils/DebugLogger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageService } from './StorageService';
import { networkService } from './NetworkService';
import { offlineService } from './OfflineService';

const API_BASE_URL = 'https://test.scorptech.co/api/v1';

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
   * Check if device is online
   */
  private async isOnline(): Promise<boolean> {
    return await networkService.checkConnectivity();
  }

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
    debugger
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
      const url = `${API_BASE_URL}/Users/${userId}`;
      const response = await this.makeAuthenticatedRequest(url, { method: 'GET' }, 'Get User Details');
      
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
      const url = `${API_BASE_URL}/Users/${userId}/change-password`;
      const response = await this.makeAuthenticatedRequest(url, {
        method: 'PATCH',
        body: JSON.stringify(passwordData),
      }, 'Change Password');

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
    
    // Check if we're online first
    const isOnline = await this.isOnline();
    if (!isOnline) {
      debugLog('Device is offline, cannot test connection');
      return false;
    }
    
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

  /**
   * Test API connectivity with detailed diagnostics
   */
  async testApiConnectivity(): Promise<{
    success: boolean;
    details: {
      networkCheck: boolean;
      healthEndpoint: { status: number; response: string; success: boolean } | undefined;
      authEndpoint: { status: number; response: string; success: boolean } | undefined;
      validateTokenEndpoint: { status: number; response: string; success: boolean } | undefined;
      errors: string[];
    };
  }> {
    const result: {
      success: boolean;
      details: {
        networkCheck: boolean;
        healthEndpoint: { status: number; response: string; success: boolean } | undefined;
        authEndpoint: { status: number; response: string; success: boolean } | undefined;
        validateTokenEndpoint: { status: number; response: string; success: boolean } | undefined;
        errors: string[];
      };
    } = {
      success: false,
      details: {
        networkCheck: false,
        healthEndpoint: undefined,
        authEndpoint: undefined,
        validateTokenEndpoint: undefined,
        errors: []
      }
    };

    try {
      debugLog('Starting API connectivity test');
      
      // Check network connectivity
      const isOnline = await this.isOnline();
      result.details.networkCheck = isOnline;
      debugLog('Network connectivity check:', { isOnline });
      
      if (!isOnline) {
        result.details.errors.push('No network connectivity');
        return result;
      }

      // Test health endpoint
      try {
        debugLog('Testing health endpoint');
        const healthResponse = await fetch(`${API_BASE_URL}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        });

        const healthText = await healthResponse.text();
        result.details.healthEndpoint = {
          status: healthResponse.status,
          response: healthText,
          success: healthResponse.ok
        };
        
        debugLog('Health endpoint test result:', result.details.healthEndpoint);
      } catch (healthError) {
        debugError('Health endpoint test failed:', healthError);
        result.details.errors.push(`Health endpoint error: ${healthError instanceof Error ? healthError.message : String(healthError)}`);
      }

      // Test auth endpoint (without credentials)
      try {
        debugLog('Testing auth endpoint');
        const authResponse = await fetch(`${API_BASE_URL}/Auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: 'test', password: 'test' }),
          signal: AbortSignal.timeout(5000),
        });

        const authText = await authResponse.text();
        result.details.authEndpoint = {
          status: authResponse.status,
          response: authText,
          success: authResponse.status === 400 || authResponse.status === 401 // Expected for invalid credentials
        };
        
        debugLog('Auth endpoint test result:', result.details.authEndpoint);
      } catch (authError) {
        debugError('Auth endpoint test failed:', authError);
        result.details.errors.push(`Auth endpoint error: ${authError instanceof Error ? authError.message : String(authError)}`);
      }

      // Test validate-token endpoint (without token)
      try {
        debugLog('Testing validate-token endpoint');
        const validateTokenResponse = await fetch(`${API_BASE_URL}/Auth/validate-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: 'invalid-token' }),
          signal: AbortSignal.timeout(5000),
        });

        const validateTokenText = await validateTokenResponse.text();
        result.details.validateTokenEndpoint = {
          status: validateTokenResponse.status,
          response: validateTokenText,
          success: validateTokenResponse.status === 400 || validateTokenResponse.status === 401 // Expected for invalid token
        };
        
        debugLog('Validate token endpoint test result:', result.details.validateTokenEndpoint);
      } catch (validateTokenError) {
        debugError('Validate token endpoint test failed:', validateTokenError);
        result.details.errors.push(`Validate token endpoint error: ${validateTokenError instanceof Error ? validateTokenError.message : String(validateTokenError)}`);
      }

      // Determine overall success
      result.success = result.details.networkCheck && 
                      (result.details.healthEndpoint?.success ?? false) && 
                      (result.details.authEndpoint?.success ?? false) &&
                      (result.details.validateTokenEndpoint?.success ?? false);

      debugLog('API connectivity test completed:', result);
      return result;
    } catch (error) {
      debugError('API connectivity test failed:', error);
      result.details.errors.push(`General error: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }

  async getAssignmentsForUser(userId: string): Promise<Assignment[]> {
    try {
      const isOnline = await this.isOnline();
      
      if (isOnline) {
        // Try to get from server
        try {
          const url = `${API_BASE_URL}/Assignments`;
          const response = await this.makeAuthenticatedRequest(url, { method: 'GET' }, 'Get Assignments');
          
          if (!response.ok) {
            const errorText = await response.text();
            
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

          // Cache assignments for offline use
          await storageService.storeCache('CACHE_ASSIGNMENTS', userAssignments, 30 * 60 * 1000); // 30 minutes
          await storageService.storeOfflineAssignments(userAssignments);

          debugLogger.log('Assignments Retrieved from Server', `Found ${userAssignments.length} assignments for user`);
          return userAssignments;
        } catch (serverError) {
          debugLogger.error('Server request failed, falling back to offline data', serverError);
          // Fall through to offline data
        }
      }

      // Get from offline storage
      const offlineAssignments = await storageService.getOfflineAssignments();
      const cachedAssignments = await storageService.getCache('CACHE_ASSIGNMENTS');
      
      const assignments = offlineAssignments.length > 0 ? offlineAssignments : (cachedAssignments || []);
      
      debugLogger.log('Assignments Retrieved from Offline Storage', `Found ${assignments.length} assignments`);
      return assignments;
    } catch (error) {
      debugLogger.error('Get Assignments Error', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  /**
   * Comprehensive token validation test for debugging
   */
  async debugTokenValidation(): Promise<{
    success: boolean;
    details: {
      hasToken: boolean;
      hasUserId: boolean;
      isOnline: boolean;
      tokenLength?: number;
      userId?: string;
      validateTokenEndpoint: { status: number; response: string; success: boolean } | undefined;
      errors: string[];
    };
  }> {
    const result: {
      success: boolean;
      details: {
        hasToken: boolean;
        hasUserId: boolean;
        isOnline: boolean;
        tokenLength?: number;
        userId?: string;
        validateTokenEndpoint: { status: number; response: string; success: boolean } | undefined;
        errors: string[];
      };
    } = {
      success: false,
      details: {
        hasToken: false,
        hasUserId: false,
        isOnline: false,
        tokenLength: 0,
        userId: '',
        validateTokenEndpoint: undefined,
        errors: []
      }
    };

    try {
      debugLog('Starting comprehensive token validation debug test');
      
      // Check network connectivity
      const isOnline = await this.isOnline();
      result.details.isOnline = isOnline;
      debugLog('Network connectivity:', { isOnline });
      
      if (!isOnline) {
        result.details.errors.push('No network connectivity');
        return result;
      }
      
      // Check token and userId
      const token = await storageService.getAuthToken();
      const userId = await storageService.getUserId();
      
      result.details.hasToken = !!token;
      result.details.hasUserId = !!userId;
      result.details.tokenLength = token?.length || 0;
      result.details.userId = userId || '';
      
      debugLog('Token and userId check:', { hasToken: !!token, hasUserId: !!userId, tokenLength: token?.length });
      
      if (!token || !userId) {
        result.details.errors.push('Missing token or userId');
        return result;
      }

      // Test validate-token endpoint
      try {
        debugLog('Testing validate-token endpoint');
        const url = `${API_BASE_URL}/Auth/validate-token`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ token }),
        });

        const responseText = await response.text();
        const validateTokenSuccess = response.ok;
        
        result.details.validateTokenEndpoint = {
          status: response.status,
          response: responseText,
          success: validateTokenSuccess
        };
        
        debugLog('Validate token endpoint result:', { status: response.status, success: validateTokenSuccess });
        
        if (validateTokenSuccess) {
          result.success = true;
          return result;
        } else {
          result.details.errors.push(`Validate token endpoint failed: ${response.status} - ${responseText}`);
        }
      } catch (validateTokenError) {
        debugError('Validate token endpoint error:', validateTokenError);
        result.details.errors.push(`Validate token endpoint error: ${validateTokenError instanceof Error ? validateTokenError.message : String(validateTokenError)}`);
      }

      debugLog('Token validation debug test completed:', result);
      return result;
    } catch (error) {
      debugError('Token validation debug test failed:', error);
      result.details.errors.push(`General error: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }
  }

  /**
   * Test if the current token is valid by making a simple authenticated request
   */
  async testTokenValidity(): Promise<boolean> {
    try {
      debugLog('Starting token validation test');
      
      // First check if we're online
      const isOnline = await this.isOnline();
      debugLog('Network connectivity check:', { isOnline });
      
      if (!isOnline) {
        debugLog('No network connectivity, skipping token validation');
        return false;
      }
      
      const token = await storageService.getAuthToken();
      const userId = await storageService.getUserId();
      
      debugLog('Token validation - Token exists:', { hasToken: !!token, hasUserId: !!userId });
      
      if (!token || !userId) {
        debugLog('No token or userId found for validation');
        return false;
      }

      debugLog('Testing token validity for user:', userId);
      debugLog('Token preview:', token.length > 20 ? `${token.substring(0, 10)}...${token.substring(token.length - 10)}` : token);
      
      // Add retry logic for token validation
      const maxRetries = 3;
      let lastError: any = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          debugLog(`Token validation attempt ${attempt}/${maxRetries}`);
          
          // Use the dedicated validate-token endpoint
          const url = `${API_BASE_URL}/Auth/validate-token`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ token }),
          });

          debugLog('Validate token endpoint response status:', response.status);

          if (response.ok) {
            const responseText = await response.text();
            debugLog('Token validation successful via validate-token endpoint');
            debugLog('Validation response:', responseText);
            return true;
          } else {
            const responseText = await response.text();
            debugLog('Validate token endpoint failed:', { status: response.status, response: responseText });
            
            // Check if it's a token expiration error
            if (this.isTokenExpired(response, responseText)) {
              debugLog('Token is expired');
              await this.handleTokenExpiration();
              return false;
            }
            
            lastError = new Error(`Validate token endpoint failed: ${response.status} - ${responseText}`);
          }
        } catch (validationError) {
          debugError(`Validate token endpoint error (attempt ${attempt}):`, validationError);
          lastError = validationError;
          
          // If it's a timeout or network error, retry
          if (validationError instanceof Error && 
              (validationError.name === 'AbortError' || validationError.message.includes('timeout'))) {
            if (attempt < maxRetries) {
              debugLog(`Network timeout, retrying in ${attempt * 1000}ms...`);
              await new Promise(resolve => setTimeout(resolve, attempt * 1000));
              continue;
            }
          }
          
          // For other errors, don't retry
          break;
        }
      }

      debugLog('All token validation attempts failed');
      debugError('Token validation failed details:', {
        tokenLength: token.length,
        tokenPreview: token.length > 20 ? `${token.substring(0, 10)}...${token.substring(token.length - 10)}` : token,
        userId: userId,
        lastError: lastError instanceof Error ? lastError.message : String(lastError)
      });
      return false;
    } catch (error) {
      debugError('Token validity test failed:', error);
      debugError('Token validation error details:', {
        errorType: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * Test token validation with a specific token (for debugging)
   */
  async testSpecificToken(token: string): Promise<{
    success: boolean;
    details: {
      status: number;
      response: string;
      error?: string;
    };
  }> {
    try {
      debugLog('Testing specific token validation');
      
      // Check if we're online first
      const isOnline = await this.isOnline();
      if (!isOnline) {
        debugLog('Device is offline, cannot test specific token');
        return {
          success: false,
          details: {
            status: 0,
            response: '',
            error: 'Device is offline'
          }
        };
      }
      
      const url = `${API_BASE_URL}/Auth/validate-token`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ token }),
        signal: AbortSignal.timeout(10000),
      });

      const responseText = await response.text();
      
      debugLog('Specific token validation result:', {
        status: response.status,
        success: response.ok,
        response: responseText
      });

      return {
        success: response.ok,
        details: {
          status: response.status,
          response: responseText
        }
      };
    } catch (error) {
      debugError('Specific token validation error:', error);
      return {
        success: false,
        details: {
          status: 0,
          response: '',
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Get assignment details by ID (with offline support)
   */
  async getAssignmentDetails(assignmentId: string): Promise<Assignment> {
    try {
      const isOnline = await this.isOnline();
      
      if (isOnline) {
        // Try to get from server
        try {
          const url = `${API_BASE_URL}/Assignments/${assignmentId}`;
          const response = await this.makeAuthenticatedRequest(url, { method: 'GET' }, 'Get Assignment Details');
          
          const assignment: Assignment = await this.handleResponse(response, 'Get Assignment Details');
          
          // Convert API status to UI status
          const assignmentWithUiStatus = {
            ...assignment,
            status: this.convertStatusToUi(assignment.status || 'pending')
          };
          
          // Cache assignment for offline use
          const assignments = await storageService.getOfflineAssignments();
          const existingIndex = assignments.findIndex(a => a.assignmentId === assignmentId);
          
          if (existingIndex >= 0) {
            assignments[existingIndex] = assignmentWithUiStatus;
          } else {
            assignments.push(assignmentWithUiStatus);
          }
          
          await storageService.storeOfflineAssignments(assignments);
          await storageService.storeCache(`CACHE_ASSIGNMENT_${assignmentId}`, assignmentWithUiStatus, 30 * 60 * 1000); // 30 minutes
          
          debugLogger.log('Assignment Details Retrieved from Server', `Assignment: ${assignment.assignmentId}, Status: ${assignmentWithUiStatus.status}`);
          return assignmentWithUiStatus;
        } catch (serverError) {
          debugLogger.error('Server request failed, falling back to offline data', serverError);
          // Fall through to offline data
        }
      }

      // Get from offline storage
      const offlineAssignments = await storageService.getOfflineAssignments();
      const cachedAssignment = await storageService.getCache(`CACHE_ASSIGNMENT_${assignmentId}`);
      
      const assignment = offlineAssignments.find(a => a.assignmentId === assignmentId) || cachedAssignment;
      
      if (assignment) {
        debugLogger.log('Assignment Details Retrieved from Offline Storage', `Assignment: ${assignment.assignmentId}, Status: ${assignment.status}`);
        return assignment;
      }

      // If not found in offline storage, throw error
      throw new Error(`Assignment ${assignmentId} not found in offline storage`);

    } catch (error) {
      debugLogger.error('Get Assignment Details Error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Get template details with questions (with offline support)
   */
  async getTemplateDetails(templateId: string): Promise<TemplateDetails> {
    try {
      const isOnline = await this.isOnline();
      
      if (isOnline) {
        // Try to get from server
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

          // Cache template for offline use
          const templates = await storageService.getOfflineTemplates();
          const existingIndex = templates.findIndex(t => t.templateId === templateId);
          
          if (existingIndex >= 0) {
            templates[existingIndex] = template;
          } else {
            templates.push(template);
          }
          
          await storageService.storeOfflineTemplates(templates);
          await storageService.storeCache(`CACHE_TEMPLATE_${templateId}`, template, 60 * 60 * 1000); // 1 hour

          debugLogger.log('Template Details Retrieved from Server', `Template: ${template.name}, Sections: ${questions.sections.length}`);
          return template;
        } catch (serverError) {
          debugLogger.error('Server request failed, falling back to offline data', serverError);
          // Fall through to offline data
        }
      }

      // Get from offline storage
      const offlineTemplates = await storageService.getOfflineTemplates();
      const template = offlineTemplates.find(t => t.templateId === templateId);
      
      if (template) {
        debugLogger.log('Template Details Retrieved from Offline Storage', `Template: ${template.name}, Sections: ${template.questions?.sections?.length || 0}`);
        return template;
      }

      // Try cache
      const cachedTemplate = await storageService.getCache(`CACHE_TEMPLATE_${templateId}`);
      if (cachedTemplate) {
        debugLogger.log('Template Details Retrieved from Cache', `Template: ${cachedTemplate.name}, Sections: ${cachedTemplate.questions?.sections?.length || 0}`);
        return cachedTemplate;
      }

      throw new Error(`Template ${templateId} not found in offline storage`);
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
   * Update assignment status (with offline support)
   */
  async updateAssignmentStatus(assignmentId: string, status: string): Promise<void> {
    try {
      const isOnline = await this.isOnline();
      
      if (isOnline) {
        // Try to update on server
        try {
          const url = `${API_BASE_URL}/Assignments/${assignmentId}/status`;
          
          // Convert UI status to API status
          const apiStatus = this.convertStatusToApi(status);
          
          const response = await this.makeAuthenticatedRequest(url, {
            method: 'PATCH',
            body: JSON.stringify({ status: apiStatus }),
          }, 'Update Assignment Status');

          await this.handleResponse(response, 'Update Assignment Status');
          debugLogger.log('Assignment Status Updated on Server', `UI Status: ${status}, API Status: ${apiStatus}`);
          
          // Update local cache
          const assignments = await storageService.getOfflineAssignments();
          const assignmentIndex = assignments.findIndex(a => a.assignmentId === assignmentId);
          
          if (assignmentIndex >= 0) {
            assignments[assignmentIndex] = {
              ...assignments[assignmentIndex],
              status: status
            };
            await storageService.storeOfflineAssignments(assignments);
          }
          
          return;
        } catch (serverError) {
          debugLogger.error('Server update failed, updating offline', serverError);
          // Fall through to offline update
        }
      }

      // Update offline assignment status
      const assignments = await storageService.getOfflineAssignments();
      const assignmentIndex = assignments.findIndex(a => a.assignmentId === assignmentId);
      
      if (assignmentIndex >= 0) {
        assignments[assignmentIndex] = {
          ...assignments[assignmentIndex],
          status: status
        };
        await storageService.storeOfflineAssignments(assignments);
        
        // Add to offline queue for later sync
        const { offlineService } = require('./OfflineService');
        await offlineService.addToQueue({
          type: 'UPDATE',
          endpoint: `/Assignments/${assignmentId}/status`,
          method: 'PATCH',
          data: { status: this.convertStatusToApi(status) },
          maxRetries: 3,
          priority: 'MEDIUM',
        });
        
        debugLogger.log('Assignment Status Updated Offline', `Assignment: ${assignmentId}, Status: ${status}`);
      } else {
        debugLogger.warn('Assignment not found in offline storage for status update', { assignmentId, status });
      }

    } catch (error) {
      debugLogger.error('Update Assignment Status Error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}

export const authService = new AuthService(); 