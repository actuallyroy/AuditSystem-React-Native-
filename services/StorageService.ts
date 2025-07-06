import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse, UserDetails } from './AuthService';

const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_ID: 'user_id',
  USER_DATA: 'user_data',
  IS_AUTHENTICATED: 'is_authenticated',
};

class StorageService {
  /**
   * Store authentication data after successful login
   */
  async storeAuthData(authResponse: AuthResponse): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.AUTH_TOKEN, authResponse.token],
        [STORAGE_KEYS.USER_ID, authResponse.userId],
        [STORAGE_KEYS.USER_DATA, JSON.stringify(authResponse)],
        [STORAGE_KEYS.IS_AUTHENTICATED, 'true'],
      ]);
    } catch (error) {
      console.error('Error storing auth data:', error);
      throw new Error('Failed to store authentication data');
    }
  }

  /**
   * Get stored authentication token
   */
  async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Get stored user ID
   */
  async getUserId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  }

  /**
   * Get stored user data
   */
  async getUserData(): Promise<AuthResponse | null> {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const isAuth = await AsyncStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED);
      const token = await this.getAuthToken();
      return isAuth === 'true' && token !== null;
    } catch (error) {
      console.error('Error checking authentication status:', error);
      return false;
    }
  }

  /**
   * Clear all authentication data (logout)
   */
  async clearAuthData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.IS_AUTHENTICATED,
      ]);
    } catch (error) {
      console.error('Error clearing auth data:', error);
      throw new Error('Failed to clear authentication data');
    }
  }

  /**
   * Update user data in storage
   */
  async updateUserData(userData: UserDetails | AuthResponse): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    } catch (error) {
      console.error('Error updating user data:', error);
      throw new Error('Failed to update user data');
    }
  }

  /**
   * Save generic data to storage
   */
  async saveData(key: string, data: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving data:', error);
      throw new Error('Failed to save data');
    }
  }

  /**
   * Get generic data from storage
   */
  async getData(key: string): Promise<any | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting data:', error);
      return null;
    }
  }

  /**
   * Remove data from storage
   */
  async removeData(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing data:', error);
      throw new Error('Failed to remove data');
    }
  }

  /**
   * Get all storage keys
   */
  async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return [...keys]; // Convert readonly array to mutable array
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  }
}

export const storageService = new StorageService(); 