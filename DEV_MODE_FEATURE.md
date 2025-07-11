# Developer Mode Feature

## Overview

The Developer Mode feature allows users to toggle debug functionality on and off. When enabled, it shows debug alerts and provides access to developer tools. When disabled, debug alerts are suppressed and developer tools are hidden.

## Features

### 1. Dev Mode Toggle
- **Location**: Settings Screen → App Settings → Developer Mode
- **Functionality**: Toggle switch to enable/disable developer mode
- **Persistence**: Setting is saved to AsyncStorage and persists across app restarts

### 2. Debug Alert Control
- **DebugLogger**: Only shows error alerts when dev mode is enabled
- **ApiTestScreen**: All debug alerts are suppressed when dev mode is disabled
- **DebugScreen**: All test result alerts are suppressed when dev mode is disabled

### 3. Developer Tools Section
- **Visibility**: Only appears in Settings when dev mode is enabled
- **Tools Available**:
  - Debug Console
  - API Test Tool

### 4. Visual Indicator
- **DevModeIndicator**: Shows a red "DEV MODE" badge when enabled
- **Location**: Top-right corner of the screen

## Implementation Details

### Context Provider
- **File**: `contexts/DevModeContext.tsx`
- **Purpose**: Manages dev mode state across the app
- **Features**:
  - State management with React Context
  - AsyncStorage persistence
  - Integration with DebugLogger

### DebugLogger Integration
- **File**: `utils/DebugLogger.ts`
- **Changes**:
  - Added `setDevModeEnabled()` method
  - Added `isDevModeActive()` method
  - Error alerts only show when dev mode is enabled

### Settings Screen Updates
- **File**: `screens/SettingsScreen.tsx`
- **Changes**:
  - Added Developer Mode toggle in App Settings
  - Created separate Developer Tools section
  - Developer Tools only visible when dev mode is enabled

### Screen Updates
- **ApiTestScreen**: All Alert.alert calls wrapped with dev mode check
- **DebugScreen**: All Alert.alert calls wrapped with dev mode check

## Usage

### For Developers
1. Go to Settings → App Settings
2. Toggle "Developer Mode" to ON
3. Developer Tools section will appear
4. Debug alerts will now show during testing
5. Red "DEV MODE" indicator will appear

### For End Users
1. Developer Mode is OFF by default
2. No debug alerts will interrupt normal usage
3. Developer tools are hidden
4. Clean, production-like experience

## Benefits

1. **Clean Production Experience**: No debug alerts for end users
2. **Developer-Friendly**: Easy access to debug tools when needed
3. **Flexible**: Can be toggled on/off without app restart
4. **Persistent**: Setting remembers user preference
5. **Visual Feedback**: Clear indication when dev mode is active

## Technical Notes

- Dev mode state is managed through React Context
- Setting is persisted in AsyncStorage with key `dev_mode_enabled`
- DebugLogger is automatically updated when dev mode changes
- All debug-related alerts are conditionally rendered
- Developer tools are conditionally rendered in Settings 