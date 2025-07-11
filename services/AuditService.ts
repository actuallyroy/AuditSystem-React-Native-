import { debugLogger } from '../utils/DebugLogger';
import { storageService } from './StorageService';
import { networkService } from './NetworkService';
import { backgroundSyncService } from './BackgroundSyncService';
import { offlineService } from './OfflineService';


const API_BASE_URL = 'https://test.scorptech.co/api/v1';

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
  completed?: boolean;
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
   * Get all audits (with offline support)
   */
  async getAllAudits(): Promise<AuditSummaryDto[]> {
    try {
      // Check if online
      const isOnline = await this.isOnline();
      
      if (isOnline) {
        // Try to get from server
        try {
          const url = `${API_BASE_URL}/Audits`;
          const response = await this.makeAuthenticatedRequest(url, { method: 'GET' }, 'Get All Audits');
          
          const audits = await this.handleResponse(response, 'Get All Audits');
          
          // Cache the response for offline use
          await storageService.storeCache('CACHE_AUDITS', audits, 30 * 60 * 1000); // 30 minutes
          await storageService.storeOfflineAudits(audits);

          debugLog('All Audits Retrieved from Server', `Found ${audits.length} audits`);
          return audits;
        } catch (serverError) {
          debugError('Server request failed, falling back to offline data', serverError);
          // Fall through to offline data
        }
      }

      // Get from offline storage
      const offlineAudits = await storageService.getOfflineAudits();
      const cachedAudits = await storageService.getCache('CACHE_AUDITS');
      
      const audits = offlineAudits.length > 0 ? offlineAudits : (cachedAudits || []);
      
      debugLog('Audits Retrieved from Offline Storage', `Found ${audits.length} audits`);
      return audits;
    } catch (error) {
      debugError('Get All Audits Error', error instanceof Error ? error.message : 'Unknown error');
      return [];
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
  async findExistingAuditForAssignment(templateId: string, auditorId: string, assignmentId: string): Promise<AuditSummaryDto | null> {
    try {
      // Get all audits for the auditor
      const userAudits = await this.getAllAudits();
      
      // Find audit that matches the template, assignment, and is in progress (synced or draft)
      const existingAudit = userAudits.find(audit => 
        audit.templateId === templateId && 
        audit.assignmentId === assignmentId &&
        (audit.status === 'synced' || 
         audit.status === 'in_progress' ||
         (audit.status !== 'submitted' && audit.status !== 'approved' && audit.status !== 'rejected' && audit.status !== 'pending_review'))
      );
      
      if (existingAudit) {
        debugLog('Found existing audit for assignment', `Audit ID: ${existingAudit.auditId}, Template: ${templateId}, Assignment: ${assignmentId}, Status: ${existingAudit.status}`);
      } else {
        debugLog('No existing audit found for assignment', `Template: ${templateId}, Assignment: ${assignmentId}`);
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
      debugLog('Attempting to get audit by ID', { auditId });
      const url = `${API_BASE_URL}/Audits/${auditId}`;
      debugLog('Get Audit URL', { url });
      
      const response = await this.makeAuthenticatedRequest(url, { method: 'GET' }, 'Get Audit By ID');
      
      const audit = await this.handleResponse(response, 'Get Audit By ID');
      debugLog('Audit Retrieved Successfully', { 
        auditId: audit.auditId, 
        status: audit.status,
        assignmentId: audit.assignmentId,
        templateId: audit.templateId
      });
      return audit;

    } catch (error) {
      debugError('Get Audit By ID Error', { 
        auditId, 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Create a new audit (with offline support)
   */
  async createAudit(auditData: CreateAuditDto): Promise<AuditResponseDto> {
    try {
      const isOnline = await this.isOnline();
      
      if (isOnline) {
        // Try to create on server
        try {
          const url = `${API_BASE_URL}/Audits`;

          const requestBody = {
            templateId: auditData.templateId,
            assignmentId: auditData.assignmentId,
            storeInfo: auditData.storeInfo || {},
            location: auditData.location || {},
            responses: {},
            media: {},
            status: "in_progress",
            score: 0,
            criticalIssues: 0,
          };

          if (LOG_REQUESTS) {
            debugLog('Create Audit Request Body', requestBody);
          }

          const response = await this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: JSON.stringify(requestBody),
          }, 'Create Audit');

          const audit = await this.handleResponse(response, 'Create Audit');
          debugLog('Audit Created on Server', audit);

          return audit;
        } catch (serverError) {
          debugError('Server creation failed, creating offline', serverError);
          // Fall through to offline creation
        }
      }

      // Create offline audit
      const offlineAuditId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const offlineAudit: AuditResponseDto = {
        auditId: offlineAuditId,
        templateId: auditData.templateId,
        templateVersion: 1,
        auditorId: await storageService.getUserId() || '',
        organisationId: '',
        status: 'in_progress',
        startTime: new Date().toISOString(),
        endTime: null,
        storeInfo: auditData.storeInfo || null,
        responses: null,
        media: null,
        location: auditData.location || null,
        score: null,
        criticalIssues: 0,
        managerNotes: null,
        isFlagged: false,
        syncFlag: false,
        createdAt: new Date().toISOString(),
        templateName: null,
        auditorName: null,
        organisationName: null,
        assignmentId: auditData.assignmentId || undefined,
      };

      // Store offline audit
      const offlineAudits = await storageService.getOfflineAudits();
      offlineAudits.push(offlineAudit);
      await storageService.storeOfflineAudits(offlineAudits);

      // Add to offline queue for later sync
      await offlineService.addToQueue({
        type: 'CREATE',
        endpoint: '/Audits',
        method: 'POST',
        data: {
          templateId: auditData.templateId,
          assignmentId: auditData.assignmentId,
          storeInfo: auditData.storeInfo || {},
          location: auditData.location || {},
          responses: {},
          media: {},
          status: "in_progress",
          score: 0,
          criticalIssues: 0,
        },
        maxRetries: 3,
        priority: 'HIGH',
      });

      debugLog('Audit Created Offline', offlineAudit);
      return offlineAudit;
    } catch (error) {
      debugError('Create Audit Error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Submit an audit (with offline support)
   */
  async submitAudit(auditId: string, submitData: SubmitAuditDto, isCompleted: boolean = true): Promise<AuditResponseDto> {
    try {
      const isOnline = await this.isOnline();
      
      if (isOnline) {
        // Try to submit on server
        try {
          // First, verify the audit exists by trying to get it
          try {
            await this.getAuditById(auditId);
            debugLog(`Audit ${auditId} exists, proceeding with submission`);
          } catch (error) {
            debugError(`Audit ${auditId} does not exist or cannot be accessed`, error);
            throw new Error(`Audit ${auditId} not found`);
          }

          const url = `${API_BASE_URL}/Audits/${auditId}/submit`;
          
          if (LOG_REQUESTS) {
            debugLog('Submit Audit Request Body', submitData);
          }

          const response = await this.makeAuthenticatedRequest(url, {
            method: 'PUT',
            body: JSON.stringify(submitData),
          }, 'Submit Audit');

          const audit = await this.handleResponse(response, 'Submit Audit');
          debugLog('Audit Submitted on Server', `Audit ID: ${audit.auditId}, Status: ${audit.status}`);
          return audit;
        } catch (serverError) {
          debugError('Server submission failed, submitting offline', serverError);
          // Fall through to offline submission
        }
      }

      // Submit offline audit
      const offlineAudits = await storageService.getOfflineAudits();
      const auditIndex = offlineAudits.findIndex(audit => audit.auditId === auditId);
      
      if (auditIndex === -1) {
        throw new Error(`Audit ${auditId} not found in offline storage`);
      }

      // Update offline audit - only set status to "Submitted" if audit is actually completed
      const updatedAudit = {
        ...offlineAudits[auditIndex],
        status: isCompleted ? 'submitted' : offlineAudits[auditIndex].status, // Only change status if completed
        endTime: isCompleted ? new Date().toISOString() : offlineAudits[auditIndex].endTime, // Only set endTime if completed
        responses: submitData.responses,
        media: submitData.media,
        storeInfo: submitData.storeInfo,
        location: submitData.location,
      };

      offlineAudits[auditIndex] = updatedAudit;
      await storageService.storeOfflineAudits(offlineAudits);

      // Add to offline queue for later sync
      await offlineService.addToQueue({
        type: 'SUBMIT',
        endpoint: `/Audits/${auditId}/submit`,
        method: 'PUT',
        data: submitData,
        maxRetries: 5,
        priority: 'HIGH',
      });

      debugLog('Audit Submitted Offline', `Audit ID: ${auditId}, Status: ${updatedAudit.status}, Completed: ${isCompleted}`);
      return updatedAudit;
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
   * Update audit progress (responses, store info, location, etc.)
   * This method updates the audit with current progress without marking it as completed
   */
  async updateAuditProgress(auditId: string, progressData: AuditProgressData): Promise<AuditResponseDto> {
    try {
      const url = `${API_BASE_URL}/Audits/${auditId}`;
      const submitData = {
        responses: progressData.responses,
        media: progressData.media,
        storeInfo: progressData.storeInfo,
        location: progressData.location,
        criticalIssues: 0, // or calculate if needed
        status: "in_progress"
      };

      if (LOG_REQUESTS) {
        debugLog('Update Audit Progress Request Body', submitData);
      }

      const response = await this.makeAuthenticatedRequest(url, {
        method: 'PUT',
        body: JSON.stringify(submitData),
      }, 'Update Audit Progress');

      const audit = await this.handleResponse(response, 'Update Audit Progress');
      debugLog('Audit Progress Updated', `Audit ID: ${audit.auditId}, Response Count: ${Object.keys(progressData.responses || {}).length}`);
      return audit;

    } catch (error) {
      debugError('Update Audit Progress Error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Check if device is connected to internet
   */
  private async isOnline(): Promise<boolean> {
    return await networkService.checkConnectivity();
  }

  /**
   * Save audit progress (for local storage and sync)
   */
  async saveAuditProgress(auditId: string, progressData: AuditProgressData, isCompleted: boolean = false): Promise<{ saved: boolean; synced: boolean }> {
    try {
      // Save to local storage for offline support
      const key = `audit_progress_${auditId}`;
      
      debugLog('Saving audit progress', {
        auditId,
        key,
        hasResponses: !!progressData.responses,
        responseCount: progressData.responses ? Object.keys(progressData.responses).length : 0,
        responseKeys: progressData.responses ? Object.keys(progressData.responses) : [],
        isCompleted
      });
      
      await storageService.saveData(key, progressData);
      
      debugLog('Audit Progress Saved Locally', `Audit ID: ${auditId}`);
      
      // Check if online and try to sync
      const isOnline = await this.isOnline();
      let synced = false;
      
      if (isOnline) {
        try {
          if (isCompleted) {
            // Submit the audit if completed
            await this.submitAudit(auditId, {
              auditId,
              responses: progressData.responses,
              media: progressData.media,
              storeInfo: progressData.storeInfo,
              location: progressData.location
            }, true); // Pass isCompleted = true for actual submission
            debugLog('Audit Submitted to Server', `Audit ID: ${auditId}`);
            
            // Audit completed successfully
          } else {
            // Update progress for ongoing audit
            await this.updateAuditProgress(auditId, progressData);
            debugLog('Audit Progress Updated on Server', `Audit ID: ${auditId}`);
            
            // Progress saved successfully
          }
          synced = true;
        } catch (syncError) {
          debugError('Failed to sync audit to server', syncError);
          // Add to background sync queue for retry
          await backgroundSyncService.addSyncTask({
            type: isCompleted ? 'audit_complete' : 'audit_progress',
            auditId,
            data: isCompleted ? {
              auditId,
              responses: progressData.responses,
              media: progressData.media,
              storeInfo: progressData.storeInfo,
              location: progressData.location
            } : progressData,
            maxRetries: 3
          });
          
          // Audit saved offline
        }
      } else if (!isOnline) {
        debugLog('Device offline, audit saved locally only', `Audit ID: ${auditId}`);
        
        // Add to background sync queue
        await backgroundSyncService.addSyncTask({
          type: isCompleted ? 'audit_complete' : 'audit_progress',
          auditId,
          data: isCompleted ? {
            auditId,
            responses: progressData.responses,
            media: progressData.media,
            storeInfo: progressData.storeInfo,
            location: progressData.location
          } : progressData,
          maxRetries: 3
        });
        
        // Audit saved offline
      } else {
        debugLog('Audit not completed, skipping sync to avoid permission issues', `Audit ID: ${auditId}`);
        
        // Progress saved locally
      }

      return { saved: true, synced };

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
   * Sync audit progress with server (without submitting)
   * Since the backend doesn't support progress syncing, we'll use a different approach:
   * 1. Save progress locally
   * 2. Only sync when audit is completed
   * 3. Use the submit endpoint which is available for auditors
   */
  private async syncAuditProgress(auditId: string, progressData: AuditProgressData): Promise<void> {
    try {
      // Since the backend doesn't support progress syncing for auditors,
      // we'll save the progress locally and only sync when the audit is completed
      debugLog(`Progress sync not supported by backend for auditors`);
      debugLog(`Progress saved locally for audit ${auditId}`);
      debugLog(`Progress will be synced when audit is submitted`);
      
      // TODO: When backend supports progress syncing for auditors, implement here
      // For now, we rely on local storage and final submission
      
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
      
      debugLog('Pending Audits Found', `Count: ${auditIds.length}, IDs: ${auditIds.join(', ')}`);
      return auditIds;

    } catch (error) {
      debugError('Get Pending Audits Error', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  /**
   * Clean up invalid audit progress data
   */
  async cleanupInvalidAuditProgress(): Promise<{ cleaned: number; total: number }> {
    try {
      const pendingAuditIds = await this.getPendingAudits();
      let cleaned = 0;
      let total = pendingAuditIds.length;

      debugLog('Starting cleanup of invalid audit progress', `Total: ${total}`);

      for (const auditId of pendingAuditIds) {
        try {
          // Try to get the audit to verify it exists
          await this.getAuditById(auditId);
          debugLog(`Audit ${auditId} is valid, keeping progress data`);
        } catch (error) {
          // Audit doesn't exist, remove the progress data
          debugLog(`Audit ${auditId} is invalid, removing progress data`);
          await this.clearAuditProgress(auditId);
          cleaned++;
        }
      }

      debugLog('Cleanup complete', `Cleaned: ${cleaned}, Total: ${total}`);
      return { cleaned, total };

    } catch (error) {
      debugError('Cleanup Invalid Audit Progress Error', error instanceof Error ? error.message : 'Unknown error');
      return { cleaned: 0, total: 0 };
    }
  }

  /**
   * Sync all pending audits with server
   */
  async syncAllPendingAudits(): Promise<{ success: number; failed: number; completed: number }> {
    try {
      const pendingAuditIds = await this.getPendingAudits();
      let success = 0;
      let failed = 0;
      let completed = 0;

      debugLog('Starting sync of pending audits', `Count: ${pendingAuditIds.length}, IDs: ${pendingAuditIds.join(', ')}`);

      for (const auditId of pendingAuditIds) {
        try {
          debugLog(`Processing audit ${auditId}`);
          const progressData = await this.getAuditProgress(auditId);
          
          if (progressData) {
            // Check if this is a completed audit (has a completed flag)
            const isCompleted = progressData.completed || false;
            
            debugLog(`Audit ${auditId} - Completed: ${isCompleted}, Response count: ${Object.keys(progressData.responses || {}).length}`);
            
            if (isCompleted) {
              // Submit the completed audit
              debugLog(`Submitting completed audit ${auditId}`);
              await this.submitAudit(auditId, {
                auditId,
                responses: progressData.responses,
                media: progressData.media,
                storeInfo: progressData.storeInfo,
                location: progressData.location
              }, true);
              completed++;
              debugLog(`Successfully submitted audit ${auditId}`);
            } else {
              // Skip progress syncing to avoid permission issues
              debugLog(`Skipping progress sync for audit ${auditId} to avoid permission issues`);
              success++;
              debugLog(`Skipped progress sync for audit ${auditId}`);
            }
            
            await this.clearAuditProgress(auditId);
            debugLog(`Cleared local progress for audit ${auditId}`);
          } else {
            debugError(`No progress data found for audit ${auditId}`);
            failed++;
          }
        } catch (error) {
          debugError(`Failed to sync audit ${auditId}`, error);
          failed++;
        }
      }

      debugLog('Sync All Pending Audits Complete', `Success: ${success}, Failed: ${failed}, Completed: ${completed}`);
      return { success, failed, completed };

    } catch (error) {
      debugError('Sync All Pending Audits Error', error instanceof Error ? error.message : 'Unknown error');
      return { success: 0, failed: 0, completed: 0 };
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

// Set up the task processor for background sync to avoid require cycle
backgroundSyncService.setTaskProcessor(async (task) => {
  try {
    debugLog('Processing sync task', { taskId: task.id, type: task.type });

    switch (task.type) {
      case 'audit_progress':
        // Update audit progress
        await auditService.updateAuditProgress(task.auditId, task.data);
        break;
        
      case 'audit_complete':
        // Submit completed audit
        await auditService.submitAudit(task.auditId, task.data, true);
        break;
        
      default:
        throw new Error(`Unknown sync task type: ${task.type}`);
    }

    debugLog('Sync task completed successfully', { taskId: task.id });
    return { success: true };
  } catch (error) {
    debugError(`Sync task failed: ${task.id}`, error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}); 