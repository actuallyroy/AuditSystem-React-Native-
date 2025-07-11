# Complete Developer Tools Documentation

## Overview

The Developer Mode now includes a comprehensive set of debugging and development tools that help developers monitor, test, and troubleshoot the application. All tools are only accessible when Developer Mode is enabled in Settings.

## Accessing Developer Tools

1. Go to **Settings** → **App Settings**
2. Toggle **Developer Mode** to ON
3. A new **Developer Tools** section will appear with all available tools

## Available Developer Tools

### 1. Debug Console 🔧
**Purpose**: View and manage debug logs, test various system functions

**Features**:
- View real-time debug logs
- Test token validation
- Test API connectivity
- Test WebSocket connectivity
- Clear logs
- Export logs

**Location**: Settings → Developer Tools → Debug Console

### 2. API Test Tool ⚡
**Purpose**: Test API endpoints and connectivity

**Features**:
- Test login API with custom credentials
- Test basic server connectivity
- View detailed request/response information
- JSON parsing validation
- Network error detection

**Location**: Settings → Developer Tools → API Test Tool

### 3. Local Storage Viewer 📁
**Purpose**: View and manage all data stored in AsyncStorage

**Features**:
- **Categorized View**: Data organized by type (Authentication, Offline Data, Cache, etc.)
- **Search Functionality**: Search through keys and values
- **Size Information**: Shows storage size for each item
- **Category Filtering**: Filter by data category
- **Data Management**: Clear individual categories or all data
- **Pull-to-Refresh**: Refresh storage data
- **Detailed View**: Expandable data values with formatting

**Categories**:
- **Authentication**: User tokens, auth data, user information
- **Offline Data**: Cached audits, pending requests, sync data
- **Cache**: Temporary cached data
- **Notifications**: Notification data and settings
- **Developer Settings**: Dev mode preferences
- **Audit Data**: Audit-related information
- **Other**: Miscellaneous stored data

**Location**: Settings → Developer Tools → Local Storage Viewer

### 4. Network Status 📶
**Purpose**: Monitor network connectivity and test connections

**Features**:
- **Real-time Network Status**: Current connection type and status
- **Connectivity Tests**: Test connections to various servers
- **Network Information**: WiFi/Cellular status, internet reachability
- **Test Results**: Success/failure status with latency information
- **Network Tools**: Refresh network info, detailed status view

**Connectivity Tests**:
- API Server (test.scorptech.co:443)
- WebSocket Server (test.scorptech.co:443)
- Google DNS (8.8.8.8:53)
- Cloudflare DNS (1.1.1.1:53)

**Location**: Settings → Developer Tools → Network Status

### 5. App State Monitor 📊
**Purpose**: Monitor application state and system information

**Features**:
- **System Status**: Real-time status of all system components
- **User Information**: Current user details and authentication status
- **System Information**: App version, build number, storage usage
- **Actions**: Test token validity, refresh system info, clear all data

**System Status Indicators**:
- 🟢 Active/Connected
- 🔴 Inactive/Disconnected
- 🟡 Loading/Validating
- ⚪ Idle/Ready

**Location**: Settings → Developer Tools → App State Monitor

## Visual Indicators

### Dev Mode Badge
When Developer Mode is enabled, a red "DEV MODE" badge appears in the top-right corner of the screen.

### WebSocket Status (Notification Screen)
When Developer Mode is enabled, the Notification screen shows:
- WebSocket connection status (🟢 Connected / 🔴 Disconnected)
- Connection uptime
- Reconnection attempts

## Usage Examples

### Debugging Authentication Issues
1. Open **App State Monitor**
2. Check authentication status
3. Use "Test Token Validity" action
4. View user information
5. Check **Local Storage Viewer** for auth data

### Troubleshooting Network Issues
1. Open **Network Status**
2. Check current network status
3. Run connectivity tests
4. View detailed network information
5. Test specific endpoints

### Investigating Storage Issues
1. Open **Local Storage Viewer**
2. Search for specific data
3. Check storage sizes
4. Clear problematic data
5. Monitor storage usage

### Testing API Endpoints
1. Open **API Test Tool**
2. Enter test credentials
3. Run API tests
4. View detailed responses
5. Check for JSON parsing issues

### Monitoring System Health
1. Open **App State Monitor**
2. Check all system status indicators
3. Review user information
4. Monitor notification connection
5. Check last sync time

## Data Management

### Clearing Data
- **Individual Categories**: Use the trash icon in Local Storage Viewer
- **All Data**: Use "Clear All Data" in App State Monitor
- **Logs**: Use "Clear Logs" in Debug Console

### Data Export
- Debug logs can be viewed and copied from Debug Console
- Storage data can be viewed in detail in Local Storage Viewer

## Security Considerations

### Production Safety
- All developer tools are only accessible when Developer Mode is enabled
- Developer Mode is OFF by default
- Tools are completely hidden from end users
- No sensitive data is exposed in production

### Data Privacy
- Local Storage Viewer shows actual stored data
- User information is displayed in App State Monitor
- Token information is masked in most displays
- Clear data functions require confirmation

## Best Practices

### For Development
1. Enable Developer Mode when debugging
2. Use Network Status to verify connectivity
3. Monitor App State for system health
4. Check Local Storage for data integrity
5. Use API Test Tool for endpoint validation

### For Testing
1. Test with Developer Mode enabled
2. Monitor all system indicators
3. Use connectivity tests for network validation
4. Check storage data for consistency
5. Verify authentication flow

### For Production
1. Ensure Developer Mode is disabled
2. Verify no debug information is visible
3. Test that tools are completely hidden
4. Confirm clean user experience

## Troubleshooting

### Common Issues

**Developer Tools Not Visible**
- Ensure Developer Mode is enabled in Settings
- Check that you're looking in the correct section
- Restart the app if needed

**Network Tests Failing**
- Check device internet connection
- Verify server endpoints are correct
- Test with different network types

**Storage Data Not Loading**
- Check AsyncStorage permissions
- Verify storage service is working
- Try refreshing the data

**Authentication Issues**
- Check token validity in App State Monitor
- Verify user data in Local Storage Viewer
- Test authentication flow

## Technical Details

### Storage Categories
The Local Storage Viewer automatically categorizes data based on key patterns:
- `auth_*`, `token`, `user` → Authentication
- `offline_*`, `sync_*` → Offline Data
- `cache_*` → Cache
- `notification_*` → Notifications
- `dev_mode_*` → Developer Settings
- `audit_*`, `assignment_*` → Audit Data
- Other keys → Other

### Network Testing
Connectivity tests use the NetworkService to:
- Test basic host connectivity
- Measure response latency
- Validate endpoint availability
- Check DNS resolution

### System Monitoring
App State Monitor tracks:
- App lifecycle state changes
- Authentication status
- Token validation state
- Loading states
- Developer mode status
- Notification connection status

## Future Enhancements

Potential additions to the developer tools:
- Performance monitoring
- Memory usage tracking
- Database inspection
- Push notification testing
- Offline mode simulation
- Error injection tools
- Performance profiling
- Network throttling simulation 