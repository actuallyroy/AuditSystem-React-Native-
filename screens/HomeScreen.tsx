import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AuditListScreen from './AuditListScreen';
import InProgressScreen from './InProgressScreen';
import SubmittedScreen from './SubmittedScreen';
import SettingsScreen from './SettingsScreen';

const Tab = createBottomTabNavigator();

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fa" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Audits') {
              iconName = focused ? 'clipboard' : 'clipboard-outline';
            } else if (route.name === 'In Progress') {
              iconName = focused ? 'time' : 'time-outline';
            } else if (route.name === 'Submitted') {
              iconName = focused ? 'cloud-upload' : 'cloud-upload-outline';
            } else if (route.name === 'Settings') {
              iconName = focused ? 'settings' : 'settings-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#0066CC',
          tabBarInactiveTintColor: '#6c757d',
          headerShown: false,
        })}
      >
        <Tab.Screen name="Audits" component={AuditListScreen} />
        <Tab.Screen name="In Progress" component={InProgressScreen} />
        <Tab.Screen name="Submitted" component={SubmittedScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
});