import { NativeModules, Platform } from 'react-native';
import { debugLogger } from '../utils/DebugLogger';

const logger = debugLogger;

const { BadgeModule } = NativeModules;

export interface BadgeServiceInterface {
  updateBadge(count: number): Promise<boolean>;
  clearBadge(): Promise<boolean>;
  isBadgeSupported(): Promise<boolean>;
}

class BadgeService implements BadgeServiceInterface {
  private isSupported: boolean | null = null;

  constructor() {
    logger.log('Badge service initialized');
  }

  async updateBadge(count: number): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        logger.log('Badge update skipped - not Android platform');
        return false;
      }

      if (!BadgeModule) {
        logger.warn('BadgeModule not available');
        return false;
      }

      const isSupported = await this.isBadgeSupported();
      if (!isSupported) {
        logger.warn('Badge not supported on this device');
        return false;
      }

      const result = await BadgeModule.updateBadge(count);
      logger.log('Badge updated successfully', { count, result });
      return result;
    } catch (error) {
      logger.error('Failed to update badge', error);
      return false;
    }
  }

  async clearBadge(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        logger.log('Badge clear skipped - not Android platform');
        return false;
      }

      if (!BadgeModule) {
        logger.warn('BadgeModule not available');
        return false;
      }

      const result = await BadgeModule.clearBadge();
      logger.log('Badge cleared successfully', { result });
      return result;
    } catch (error) {
      logger.error('Failed to clear badge', error);
      return false;
    }
  }

  async isBadgeSupported(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        return false;
      }

      if (!BadgeModule) {
        return false;
      }

      if (this.isSupported !== null) {
        return this.isSupported;
      }

      const supported = await BadgeModule.isBadgeSupported();
      this.isSupported = supported;
      logger.log('Badge support check result', { isSupported: supported });
      return supported;
    } catch (error) {
      logger.error('Failed to check badge support', error);
      this.isSupported = false;
      return false;
    }
  }

  // Reset the cached support status (useful for testing)
  resetSupportCache(): void {
    this.isSupported = null;
  }
}

export default new BadgeService(); 