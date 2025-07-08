import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { backgroundSyncService } from '../services/BackgroundSyncService';
import { auditService } from '../services/AuditService';

export default function SettingsScreen() {
  const [syncOnCellular, setSyncOnCellular] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to logout? Any unsynced data will be lost.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Logout", 
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "This will clear all cached data. Your audits will not be affected. Continue?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Clear", 
          onPress: () => console.log("Clear cache pressed")
        }
      ]
    );
  };

  const handleCleanupInvalidData = async () => {
    try {
      const result = await auditService.cleanupInvalidAuditProgress();
      
      if (result.cleaned > 0) {
        Alert.alert(
          "Cleanup Complete", 
          `Cleaned up ${result.cleaned} invalid audit progress entries.`
        );
      } else {
        Alert.alert(
          "Cleanup Complete", 
          "No invalid audit progress data found."
        );
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      Alert.alert('Error', 'Failed to cleanup invalid data. Please try again.');
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const result = await backgroundSyncService.manualSync();
      
      if (result.success > 0 || result.completed > 0) {
        const message = result.completed > 0 
          ? `Successfully synced ${result.success} audits and submitted ${result.completed} completed audits`
          : `Successfully synced ${result.success} audits`;
        
        Alert.alert('Sync Complete', message);
      } else if (result.failed > 0) {
        Alert.alert('Sync Issues', `Failed to sync ${result.failed} audits. Please try again.`);
      } else {
        Alert.alert('Sync Complete', 'No pending audits to sync.');
      }
    } catch (error) {
      console.error('Manual sync error:', error);
      Alert.alert('Sync Error', 'Failed to sync audits. Please check your connection and try again.');
    } finally {
      setSyncing(false);
    }
  };

  const renderSettingItem = (
    icon: keyof typeof Ionicons.glyphMap, 
    title: string, 
    description: string, 
    value: boolean, 
    onValueChange: (value: boolean) => void
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingIconContainer}>
        <Ionicons name={icon} size={24} color="#0066CC" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#e9ecef", true: "#bfdeff" }}
        thumbColor={value ? "#0066CC" : "#f4f3f4"}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Profile Section */}
        <View style={styles.section}>
          <View style={styles.profileContainer}>
            <View style={styles.profileIcon}>
              <Text style={styles.profileInitials}>
                {user ? `${user.firstName[0]}${user.lastName[0]}` : 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user ? `${user.firstName} ${user.lastName}` : 'User'}
              </Text>
              <Text style={styles.profileRole}>
                {user ? user.role : 'Role'}
              </Text>
              <Text style={styles.profileEmail}>
                {user ? user.username : 'username'}
              </Text>
            </View>
          </View>
        </View>

        {/* Sync Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync Settings</Text>
          
          {renderSettingItem(
            "cellular-outline",
            "Sync on Cellular Data",
            "Allow syncing audits when on cellular network",
            syncOnCellular,
            setSyncOnCellular
          )}
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleManualSync}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#0066CC" />
            ) : (
              <Ionicons name="sync-outline" size={20} color="#0066CC" />
            )}
            <Text style={styles.actionButtonText}>
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.syncInfoContainer}>
            <Text style={styles.syncInfoText}>Last synced: Today, 2:30 PM</Text>
            <Text style={styles.syncInfoText}>3 items pending sync</Text>
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          {renderSettingItem(
            "save-outline",
            "Auto Save",
            "Automatically save audit progress",
            autoSaveEnabled,
            setAutoSaveEnabled
          )}
          
          {renderSettingItem(
            "notifications-outline",
            "Notifications",
            "Receive alerts about audits and updates",
            notificationsEnabled,
            setNotificationsEnabled
          )}
          
          {renderSettingItem(
            "moon-outline",
            "Dark Mode",
            "Use dark theme throughout the app",
            darkModeEnabled,
            setDarkModeEnabled
          )}
          
          {renderSettingItem(
            "finger-print-outline",
            "Biometric Login",
            "Use fingerprint or face recognition to login",
            biometricEnabled,
            setBiometricEnabled
          )}
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleClearCache}>
            <Ionicons name="trash-outline" size={20} color="#0066CC" />
            <Text style={styles.actionButtonText}>Clear Cache</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleCleanupInvalidData}>
            <Ionicons name="refresh-outline" size={20} color="#0066CC" />
            <Text style={styles.actionButtonText}>Cleanup Invalid Data</Text>
          </TouchableOpacity>
          
          <View style={styles.storageInfoContainer}>
            <Text style={styles.storageInfoText}>App Storage: 24.5 MB</Text>
            <Text style={styles.storageInfoText}>Cache: 8.2 MB</Text>
          </View>
        </View>

        {/* About & Help */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About & Help</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={24} color="#0066CC" />
            <Text style={styles.menuItemText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#6c757d" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="document-text-outline" size={24} color="#0066CC" />
            <Text style={styles.menuItemText}>Terms & Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color="#6c757d" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('Debug' as never)}
          >
            <Ionicons name="bug-outline" size={24} color="#0066CC" />
            <Text style={styles.menuItemText}>Debug Console</Text>
            <Ionicons name="chevron-forward" size={20} color="#6c757d" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('ApiTest' as never)}
          >
            <Ionicons name="flash-outline" size={24} color="#dc3545" />
            <Text style={styles.menuItemText}>API Test Tool</Text>
            <Ionicons name="chevron-forward" size={20} color="#6c757d" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="information-circle-outline" size={24} color="#0066CC" />
            <Text style={styles.menuItemText}>About</Text>
            <Ionicons name="chevron-forward" size={20} color="#6c757d" />
          </TouchableOpacity>
          
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>Version 1.0.0 (Build 2025062501)</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#dc3545" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 Retail Execution Audit System</Text>
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
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  profileInfo: {
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  profileRole: {
    fontSize: 14,
    color: '#0066CC',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6c757d',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  settingIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
  },
  settingDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  actionButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#0066CC',
  },
  syncInfoContainer: {
    marginTop: 12,
  },
  syncInfoText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  storageInfoContainer: {
    marginTop: 12,
  },
  storageInfoText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  menuItemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
  },
  versionContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: '#6c757d',
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#dc3545',
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