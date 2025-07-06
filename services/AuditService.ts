import { debugLogger } from '../utils/DebugLogger';
import { storageService } from './StorageService';

const API_BASE_URL = 'http://192.168.1.4:8080/api/v1';

// Enable detailed logging for debugging
const DEBUG_MODE = true;
const LOG_REQUESTS = true;

const debugLog = (message: string, data?: any) => {
  if (DEBUG_MODE) {
    debugLogger.log(`[AuditService] ${message}`, data);
  }
};

const debugError = (message: string, error?: any) => {
  if (DEBUG_MODE) {
    debugLogger.error(`[AuditService] ${message}`, error);
  }
};

// Audit types based on OpenAPI specification
export interface AuditSummaryDto {
  auditId: string;
  templateId: string;
  templateName: string;
  storeName?: string;
  address?: string;
  auditorId: string;
  auditorName: string;
  organisationId: string;
  organisationName: string;
  status: string;
  score: number;
  criticalIssues: number;
  isFlagged: boolean;
  createdAt: string;
  endTime: string;
  assignmentId?: string;
  rejectionReason?: string;
  notes?: string;
}

export interface AuditResponseDto {
  auditId: string;
  templateId: string;
  templateVersion: number;
  auditorId: string;
  organisationId: string;
  status: string | null;
  startTime: string | null;
  endTime: string | null;
  storeInfo: any | null;
  responses: any | null;
  media: any | null;
  location: any | null;
  score: number | null;
  criticalIssues: number;
  managerNotes: string | null;
  isFlagged: boolean;
  syncFlag: boolean;
  createdAt: string;
  templateName: string | null;
  auditorName: string | null;
  organisationName: string | null;
  assignmentId?: string;
}

export interface CreateAuditDto {
  templateId: string;
  assignmentId?: string | null;
  storeInfo?: any | null;
  location?: any | null;
}

export interface SubmitAuditDto {
  auditId: string;
  responses: any;
  media?: any | null;
  storeInfo?: any | null;
  location?: any | null;
}

export interface UpdateAuditStatusDto {
  status: string;
  managerNotes?: string | null;
  isFlagged?: boolean | null;
}

export interface AuditProgressData {
  auditId: string;
  responses: any;
  media?: any | null;
  storeInfo?: any | null;
  location?: any | null;
}

// Token expiration callback - will be set by AuthContext
let tokenExpirationCallback: (() => void) | null = null;

export const setTokenExpirationCallback = (callback: () => void) => {
  tokenExpirationCallback = callback;
};

class AuditService {
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
   * Handle API response with proper error handling
   */
  private async handleResponse(response: Response, operation: string): Promise<any> {
    const responseText = await response.text();
    
    if (LOG_REQUESTS) {
      debugLog(`API Response - ${operation}`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText
      });
    }

    if (response.ok) {
      try {
        return responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        debugError(`JSON parsing error in ${operation}:`, parseError);
        return responseText;
      }
    } else {
      // Check if token expired
      if (this.isTokenExpired(response, responseText)) {
        await this.handleTokenExpiration();
        throw new Error('Your session has expired. Please log in again.');
      }

      let errorMessage = `${operation} failed`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = responseText || errorMessage;
      }

      debugError(`API Error - ${operation}:`, {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });

      throw new Error(`${errorMessage} (Status: ${response.status})`);
    }
  }

  /**
   * Make authenticated request with proper error handling
   */
  private async makeAuthenticatedRequest(
    url: string, 
    options: RequestInit = {}, 
    operation: string
  ): Promise<Response> {
    const token = await storageService.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found. Please log in again.');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    if (LOG_REQUESTS) {
      debugLog(`API Request - ${operation}`, {
        url,
        method: options.method || 'GET',
        headers,
        body: options.body
      });
    }

    try {
      const response = await fetch(url, { ...options, headers });
      return response;
    } catch (error) {
      debugError(`Network error in ${operation}:`, error);
      throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all audits
   */
  async getAllAudits(): Promise<AuditSummaryDto[]> {
    try {
      const url = `${API_BASE_URL}/Audits`;
      const response = await this.makeAuthenticatedRequest(url, { method: 'GET' }, 'Get All Audits');
      
      const audits = await this.handleResponse(response, 'Get All Audits');
      debugLog('All Audits Retrieved', `Found ${audits.length} audits`);
      return audits;

    } catch (error) {
      debugError('Get All Audits Error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Get audits by auditor ID
   */
  async getAuditsByAuditor(auditorId: string): Promise<AuditSummaryDto[]> {
    try {
      const url = `${API_BASE_URL}/Audits/by-auditor/${auditorId}`;
      const response = await this.makeAuthenticatedRequest(url, { method: 'GET' }, 'Get Audits By Auditor');
      
      const audits = await this.handleResponse(response, 'Get Audits By Auditor');
      debugLog('Audits By Auditor Retrieved', `Found ${audits.length} audits for auditor ${auditorId}`);
      return audits;

    } catch (error) {
      debugError('Get Audits By Auditor Error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Get audits by organisation ID
   */
  async getAuditsByOrganisation(organisationId: string): Promise<AuditSummaryDto[]> {
    try {
      const url = `${API_BASE_URL}/Audits/by-organisation/${organisationId}`;
      const response = await this.makeAuthenticatedRequest(url, { method: 'GET' }, 'Get Audits By Organisation');
      
      const audits = await this.handleResponse(response, 'Get Audits By Organisation');
      debugLog('Audits By Organisation Retrieved', `Found ${audits.length} audits for organisation ${organisationId}`);
      return audits;

    } catch (error) {
      debugError('Get Audits By Organisation Error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Get audits by template ID
   */
  async getAuditsByTemplate(templateId: string): Promise<AuditSummaryDto[]> {
    try {
      const url = `${API_BASE_URL}/Audits/by-template/${templateId}`;
      const response = await this.makeAuthenticatedRequest(url, { method: 'GET' }, 'Get Audits By Template');
      
      const audits = await this.handleResponse(response, 'Get Audits By Template');
      debugLog('Audits By Template Retrieved', `Found ${audits.length} audits for template ${templateId}`);
      return audits;

    } catch (error) {
      debugError('Get Audits By Template Error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Find existing audit for assignment (not submitted/completed)
   */
  async findExistingAuditForAssignment(templateId: string, auditorId: string): Promise<AuditSummaryDto | null> {
    try {
      // Get all audits for the auditor
      const userAudits = await this.getAllAudits();
      
      // Find audit that matches the template and is not submitted/completed
      const existingAudit = userAudits.find(audit => 
        audit.templateId === templateId && 
        audit.status !== 'Submitted' && 
        audit.status !== 'Completed'
      );
      
      if (existingAudit) {
        debugLog('Found existing audit for assignment', `Audit ID: ${existingAudit.auditId}, Template: ${templateId}`);
      } else {
        debugLog('No existing audit found for assignment', `Template: ${templateId}`);
      }
      
      return existingAudit || null;

    } catch (error) {
      debugError('Find Existing Audit Error', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Get audit by ID
   */
  async getAuditById(auditId: string): Promise<AuditResponseDto> {
    try {
      const url = `${API_BASE_URL}/Audits/${auditId}`;
      const response = await this.makeAuthenticatedRequest(url, { method: 'GET' }, 'Get Audit By ID');
      
      const audit = await this.handleResponse(response, 'Get Audit By ID');
      debugLog('Audit Retrieved', `Audit ID: ${audit.auditId}, Status: ${audit.status}`);
      return audit;

    } catch (error) {
      debugError('Get Audit By ID Error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Create a new audit
   */
  async createAudit(auditData: CreateAuditDto): Promise<AuditResponseDto> {
    try {
      const url = `${API_BASE_URL}/Audits`;
      
      if (LOG_REQUESTS) {
        debugLog('Create Audit Request Body', auditData);
      }

      const response = await this.makeAuthenticatedRequest(url, {
        method: 'POST',
        body: JSON.stringify(auditData),
      }, 'Create Audit');

      const audit = await this.handleResponse(response, 'Create Audit');
      debugLog('Audit Created', `Audit ID: ${audit.auditId}, Template: ${audit.templateId}`);
      return audit;

    } catch (error) {
      debugError('Create Audit Error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Submit an audit
   */
  async submitAudit(auditId: string, submitData: SubmitAuditDto): Promise<AuditResponseDto> {
    try {
      const url = `${API_BASE_URL}/Audits/${auditId}/submit`;
      
      if (LOG_REQUESTS) {
        debugLog('Submit Audit Request Body', submitData);
      }

      const response = await this.makeAuthenticatedRequest(url, {
        method: 'PUT',
        body: JSON.stringify(submitData),
      }, 'Submit Audit');

      const audit = await this.handleResponse(response, 'Submit Audit');
      debugLog('Audit Submitted', `Audit ID: ${audit.auditId}, Status: ${audit.status}`);
      return audit;

    } catch (error) {
      debugError('Submit Audit Error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Update audit status
   */
  async updateAuditStatus(auditId: string, statusData: UpdateAuditStatusDto): Promise<AuditResponseDto> {
    try {
      const url = `${API_BASE_URL}/Audits/${auditId}/status`;
      
      if (LOG_REQUESTS) {
        debugLog('Update Audit Status Request Body', statusData);
      }

      const response = await this.makeAuthenticatedRequest(url, {
        method: 'PATCH',
        body: JSON.stringify(statusData),
      }, 'Update Audit Status');

      const audit = await this.handleResponse(response, 'Update Audit Status');
      debugLog('Audit Status Updated', `Audit ID: ${audit.auditId}, New Status: ${audit.status}`);
      return audit;

    } catch (error) {
      debugError('Update Audit Status Error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Flag or unflag an audit
   */
  async flagAudit(auditId: string, isFlagged: boolean): Promise<AuditResponseDto> {
    try {
      const url = `${API_BASE_URL}/Audits/${auditId}/flag`;
      
      if (LOG_REQUESTS) {
        debugLog('Flag Audit Request Body', { isFlagged });
      }

      const response = await this.makeAuthenticatedRequest(url, {
        method: 'PATCH',
        body: JSON.stringify(isFlagged),
      }, 'Flag Audit');

      const audit = await this.handleResponse(response, 'Flag Audit');
      debugLog('Audit Flag Updated', `Audit ID: ${audit.auditId}, Flagged: ${audit.isFlagged}`);
      return audit;

    } catch (error) {
      debugError('Flag Audit Error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Save audit progress (for local storage and sync)
   */
  async saveAuditProgress(auditId: string, progressData: AuditProgressData): Promise<void> {
    try {
      // Save to local storage for offline support
      const key = `audit_progress_${auditId}`;
      
      debugLog('Saving audit progress', {
        auditId,
        key,
        hasResponses: !!progressData.responses,
        responseCount: progressData.responses ? Object.keys(progressData.responses).length : 0,
        responseKeys: progressData.responses ? Object.keys(progressData.responses) : []
      });
      
      await storageService.saveData(key, progressData);
      
      debugLog('Audit Progress Saved Locally', `Audit ID: ${auditId}`);
      
      // Try to sync with server if online
      try {
        await this.syncAuditProgress(auditId, progressData);
      } catch (syncError) {
        debugError('Failed to sync audit progress to server', syncError);
        // Don't throw error here, just log it - offline mode
      }

    } catch (error) {
      debugError('Save Audit Progress Error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Get audit progress from local storage
   */
  async getAuditProgress(auditId: string): Promise<AuditProgressData | null> {
    try {
      const key = `audit_progress_${auditId}`;
      debugLog('Attempting to get audit progress', `Key: ${key}, Audit ID: ${auditId}`);
      
      const progressData = await storageService.getData(key);
      debugLog('Raw progress data from storage', progressData);
      
      if (progressData) {
        debugLog('Audit Progress Retrieved from Local Storage', `Audit ID: ${auditId}`);
        debugLog('Progress data structure', {
          hasResponses: !!progressData.responses,
          responseKeys: progressData.responses ? Object.keys(progressData.responses) : [],
          responseCount: progressData.responses ? Object.keys(progressData.responses).length : 0
        });
      } else {
        debugLog('No progress data found in storage', `Key: ${key}`);
      }
      
      return progressData;

    } catch (error) {
      debugError('Get Audit Progress Error', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Sync audit progress with server
   */
  private async syncAuditProgress(auditId: string, progressData: AuditProgressData): Promise<void> {
    try {
      const submitData: SubmitAuditDto = {
        auditId,
        responses: progressData.responses,
        media: progressData.media,
        storeInfo: progressData.storeInfo,
        location: progressData.location
      };

      await this.submitAudit(auditId, submitData);
      debugLog('Audit Progress Synced to Server', `Audit ID: ${auditId}`);

    } catch (error) {
      debugError('Sync Audit Progress Error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Clear audit progress from local storage
   */
  async clearAuditProgress(auditId: string): Promise<void> {
    try {
      const key = `audit_progress_${auditId}`;
      await storageService.removeData(key);
      
      debugLog('Audit Progress Cleared from Local Storage', `Audit ID: ${auditId}`);

    } catch (error) {
      debugError('Clear Audit Progress Error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Get all pending audits (that need to be synced)
   */
  async getPendingAudits(): Promise<string[]> {
    try {
      const allKeys = await storageService.getAllKeys();
      const auditKeys = allKeys.filter((key: string) => key.startsWith('audit_progress_'));
      const auditIds = auditKeys.map((key: string) => key.replace('audit_progress_', ''));
      
      debugLog('Pending Audits Found', `Count: ${auditIds.length}`);
      return auditIds;

    } catch (error) {
      debugError('Get Pending Audits Error', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  /**
   * Sync all pending audits with server
   */
  async syncAllPendingAudits(): Promise<{ success: number; failed: number }> {
    try {
      const pendingAuditIds = await this.getPendingAudits();
      let success = 0;
      let failed = 0;

      for (const auditId of pendingAuditIds) {
        try {
          const progressData = await this.getAuditProgress(auditId);
          if (progressData) {
            await this.syncAuditProgress(auditId, progressData);
            await this.clearAuditProgress(auditId);
            success++;
          }
        } catch (error) {
          debugError(`Failed to sync audit ${auditId}`, error);
          failed++;
        }
      }

      debugLog('Sync All Pending Audits Complete', `Success: ${success}, Failed: ${failed}`);
      return { success, failed };

    } catch (error) {
      debugError('Sync All Pending Audits Error', error instanceof Error ? error.message : 'Unknown error');
      return { success: 0, failed: 0 };
    }
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
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
}

export const auditService = new AuditService(); 