# Push Notifications and Badge Implementation

## Overview

This implementation provides comprehensive push notification support for Android with badge functionality on the home screen app icon. The system integrates with the existing WebSocket notification service to automatically show push notifications when new notifications are received.

## Features

### 🎯 **Push Notifications**
- **Automatic Display**: Push notifications are automatically shown when new notifications are received via WebSocket
- **Priority Support**: Different notification priorities (default, high, urgent) with appropriate styling
- **Sound & Vibration**: Customizable sound and vibration patterns based on priority
- **Foreground Handling**: Notifications are shown even when the app is in the foreground
- **Tap Handling**: Support for handling notification taps to navigate to specific screens

### 🏷️ **Badge Support**
- **Home Screen Badge**: Shows unread notification count on the app icon
- **Multi-Launcher Support**: Works with Samsung, Huawei, Xiaomi, Oppo, Vivo, Sony, HTC, LG, and other launchers
- **Automatic Updates**: Badge count automatically updates with unread notification count
- **Clear on Read**: Badge is cleared when all notifications are marked as read

## Architecture

### 1. **PushNotificationService** (`services/PushNotificationService.ts`)
Handles local push notifications using Expo Notifications.

**Key Methods:**
- `initialize()`: Request permissions and configure notification channels
- `showNotification()`: Display push notification with badge
- `updateBadgeCount()`: Update badge count on app icon
- `clearBadge()`: Clear badge from app icon

### 2. **BadgeService** (`services/BadgeService.ts`)
JavaScript interface for native Android badge functionality.

**Key Methods:**
- `updateBadge(count)`: Update badge count on home screen
- `clearBadge()`: Clear badge from home screen
- `isBadgeSupported()`: Check if device supports badges

### 3. **Native Android Components**

#### **BadgeModule** (`android/app/src/main/java/.../BadgeModule.kt`)
React Native bridge for badge functionality.

#### **BadgeUtils** (`android/app/src/main/java/.../BadgeUtils.kt`)
Native Android utility for badge updates across different launchers.

#### **NotificationReceiver** (`android/app/src/main/java/.../NotificationReceiver.kt`)
Broadcast receiver for handling notification events.

## Implementation Details

### 1. **Notification Channels**
Android-specific notification channels are created for different priority levels:

```typescript
// Default channel
await Notifications.setNotificationChannelAsync('default', {
  name: 'Default',
  importance: Notifications.AndroidImportance.HIGH,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#FF231F7C',
  sound: 'default',
  enableVibrate: true,
  showBadge: true,
});

// High priority channel
await Notifications.setNotificationChannelAsync('high-priority', {
  name: 'High Priority',
  importance: Notifications.AndroidImportance.HIGH,
  vibrationPattern: [0, 250, 250, 250, 250, 250],
  lightColor: '#FF4444',
  sound: 'default',
  enableVibrate: true,
  showBadge: true,
});

// Urgent channel
await Notifications.setNotificationChannelAsync('urgent', {
  name: 'Urgent',
  importance: Notifications.AndroidImportance.HIGH,
  vibrationPattern: [0, 500, 250, 500, 250, 500],
  lightColor: '#FF0000',
  sound: 'default',
  enableVibrate: true,
  showBadge: true,
});
```

### 2. **Badge Support Detection**
The system automatically detects and uses the appropriate badge method for the device:

```typescript
// Try ShortcutBadger first (works with most launchers)
if (ShortcutBadger.isBadgeCounterSupported(context)) {
  ShortcutBadger.applyCount(context, count);
  return;
}

// Fallback to manufacturer-specific methods
when {
  isSamsung() -> updateSamsungBadge(context, count)
  isHuawei() -> updateHuaweiBadge(context, count)
  isXiaomi() -> updateXiaomiBadge(context, count)
  // ... other manufacturers
}
```

### 3. **Integration with NotificationContext**
Push notifications are automatically triggered when new notifications are received:

```typescript
const cleanup = WebSocketNotificationService.onNotification((notificationMessage) => {
  // Transform and add notification to state
  const notification: Notification = { /* ... */ };
  dispatch({ type: 'ADD_NOTIFICATION', payload: notification });

  // Show push notification with badge
  showPushNotification(notificationMessage);
});
```

## Android Configuration

### 1. **Permissions** (`android/app/src/main/AndroidManifest.xml`)
Required permissions for notifications and badges:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
<uses-permission android:name="android.permission.WAKE_LOCK"/>
<uses-permission android:name="android.permission.VIBRATE"/>

<!-- Manufacturer-specific badge permissions -->
<uses-permission android:name="com.sec.android.provider.badge.permission.READ"/>
<uses-permission android:name="com.sec.android.provider.badge.permission.WRITE"/>
<uses-permission android:name="com.htc.launcher.permission.READ_SETTINGS"/>
<uses-permission android:name="com.htc.launcher.permission.UPDATE_SHORTCUT"/>
<uses-permission android:name="com.sonyericsson.home.permission.BROADCAST_BADGE"/>
<uses-permission android:name="com.sonymobile.home.permission.PROVIDER_INSERT_BADGE"/>
<uses-permission android:name="com.anddoes.launcher.permission.UPDATE_COUNT"/>
<uses-permission android:name="com.majeur.launcher.permission.UPDATE_BADGE"/>
<uses-permission android:name="com.huawei.android.launcher.permission.CHANGE_BADGE"/>
<uses-permission android:name="com.huawei.android.launcher.permission.READ_SETTINGS"/>
<uses-permission android:name="com.huawei.android.launcher.permission.WRITE_SETTINGS"/>
<uses-permission android:name="android.permission.READ_APP_BADGE"/>
<uses-permission android:name="com.oppo.launcher.permission.READ_SETTINGS"/>
<uses-permission android:name="com.oppo.launcher.permission.WRITE_SETTINGS"/>
<uses-permission android:name="me.everything.badger.permission.BADGE_COUNT_READ"/>
<uses-permission android:name="me.everything.badger.permission.BADGE_COUNT_WRITE"/>
```

### 2. **Dependencies** (`android/app/build.gradle`)
ShortcutBadger library for badge support:

```gradle
dependencies {
    // ShortcutBadger for notification badges
    implementation 'me.leolin:ShortcutBadger:1.1.22@aar'
}
```

### 3. **Broadcast Receiver**
Registered receiver for handling notification events:

```xml
<receiver android:name=".NotificationReceiver" android:exported="true">
  <intent-filter>
    <action android:name="android.intent.action.BOOT_COMPLETED"/>
    <action android:name="com.anonymous.snack4296b9d7581c4ad8b4d651da4fa902b4.NOTIFICATION_RECEIVED"/>
  </intent-filter>
</receiver>
```

## Usage

### 1. **Automatic Push Notifications**
Push notifications are automatically shown when new notifications are received via WebSocket. No additional code is required.

### 2. **Manual Push Notification**
```typescript
import PushNotificationService from '../services/PushNotificationService';

// Show a push notification
await PushNotificationService.showNotification({
  notificationId: 'unique-id',
  type: 'audit_assigned',
  title: 'New Audit Assigned',
  message: 'You have been assigned a new audit',
  priority: 'high',
  data: { auditId: '123' }
});
```

### 3. **Badge Management**
```typescript
import BadgeService from '../services/BadgeService';

// Update badge count
await BadgeService.updateBadge(5);

// Clear badge
await BadgeService.clearBadge();

// Check badge support
const isSupported = await BadgeService.isBadgeSupported();
```

## Notification Flow

### 1. **New Notification Received**
```
1. WebSocket receives notification → WebSocketNotificationService
2. Notification added to state → NotificationContext
3. Push notification shown → PushNotificationService
4. Badge count updated → BadgeService
5. Home screen badge updated → Native Android
```

### 2. **Notification Read**
```
1. User marks notification as read → NotificationContext
2. Unread count updated → NotificationContext
3. Badge count updated → BadgeService
4. Home screen badge updated → Native Android
```

### 3. **All Notifications Read**
```
1. User marks all as read → NotificationContext
2. Badge cleared → BadgeService
3. Home screen badge cleared → Native Android
```

## Priority Levels

### **Default Priority**
- Standard notification styling
- Normal vibration pattern
- Default sound

### **High Priority**
- Enhanced notification styling
- Longer vibration pattern
- High importance channel

### **Urgent Priority**
- Maximum notification styling
- Extended vibration pattern
- Urgent channel with red light

## Testing

### 1. **Push Notification Testing**
Use the Notification Test Screen to:
- Send test messages
- Verify push notifications appear
- Test different priority levels
- Check sound and vibration

### 2. **Badge Testing**
- Verify badge appears on home screen
- Test badge count updates
- Confirm badge clears when notifications are read
- Test on different Android devices/launchers

### 3. **Integration Testing**
- Test with WebSocket notifications
- Verify automatic push notification display
- Test badge synchronization with unread count

## Troubleshooting

### Common Issues

1. **Push Notifications Not Showing**
   - Check notification permissions
   - Verify notification channels are created
   - Ensure app is not in battery optimization

2. **Badge Not Appearing**
   - Check if device supports badges
   - Verify launcher-specific permissions
   - Test with ShortcutBadger support

3. **Badge Count Incorrect**
   - Verify unread count synchronization
   - Check badge update calls
   - Test manual badge updates

### Debug Information
- Enable debug logging for detailed notification tracking
- Check Android logcat for native badge errors
- Verify notification channel creation
- Monitor badge support detection

## Future Enhancements

### 1. **Advanced Badge Features**
- Custom badge colors
- Badge shapes and styles
- Animated badge updates

### 2. **Notification Actions**
- Quick reply functionality
- Action buttons in notifications
- Deep linking to specific screens

### 3. **Analytics Integration**
- Notification engagement tracking
- Badge interaction metrics
- Performance monitoring

### 4. **Cross-Platform Support**
- iOS badge implementation
- Web push notifications
- Desktop notification support 