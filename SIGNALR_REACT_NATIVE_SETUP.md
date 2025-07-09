# SignalR WebSocket Setup for React Native

## Overview

This guide provides solutions for connecting your React Native app to the SignalR WebSocket hub in the Retail Execution Audit System. It addresses common issues like "handshake was cancelled" errors and provides both recommended and alternative approaches.

## Problem Description

When trying to connect to SignalR with raw WebSocket connections, you may encounter:
- "handshake was cancelled" errors
- URL resolution issues on Android
- Protocol negotiation failures

This happens because SignalR requires a specific handshake protocol that includes negotiation, connection establishment, and message formatting.

## Solution 1: Official SignalR Client (Recommended)

### Step 1: Install SignalR Client

In your React Native project directory:

```bash
npm install @microsoft/signalr
# or
yarn add @microsoft/signalr
```

### Step 2: Create SignalR Service

Create a file `services/signalRService.js`:

```javascript
import * as signalR from '@microsoft/signalr';

class SignalRService {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async connect(token) {
    try {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl('wss://test.scorptech.co/hubs/notifications', {
          accessTokenFactory: () => token,
          skipNegotiation: true,
          transport: signalR.HttpTransportType.WebSockets
        })
        .withAutomaticReconnect([0, 2000, 10000, 30000]) // Retry delays
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Set up event handlers
      this.setupEventHandlers();

      // Start connection
      await this.connection.start();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      console.log('SignalR Connected!');
      return true;
    } catch (error) {
      console.error('SignalR Connection Error:', error);
      this.isConnected = false;
      return false;
    }
  }

  setupEventHandlers() {
    // Handle notifications
    this.connection.on('ReceiveNotification', (notification) => {
      console.log('New notification received:', notification);
      // Emit event or call callback
      this.onNotificationReceived?.(notification);
    });

    // Handle unread count updates
    this.connection.on('UnreadCount', (count) => {
      console.log('Unread count updated:', count);
      this.onUnreadCountUpdated?.(count);
    });

    // Handle heartbeat
    this.connection.on('Heartbeat', (data) => {
      console.log('Heartbeat received:', data);
    });

    // Handle reconnection
    this.connection.onreconnecting((error) => {
      console.log('SignalR reconnecting...', error);
      this.isConnected = false;
    });

    this.connection.onreconnected((connectionId) => {
      console.log('SignalR reconnected:', connectionId);
      this.isConnected = true;
    });

    this.connection.onclose((error) => {
      console.log('SignalR connection closed:', error);
      this.isConnected = false;
    });
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.stop();
      this.isConnected = false;
    }
  }

  async subscribeToUser(userId) {
    if (this.isConnected) {
      await this.connection.invoke('SubscribeToUser', userId);
    }
  }

  async joinOrganisation(organisationId) {
    if (this.isConnected) {
      await this.connection.invoke('JoinOrganisation', organisationId);
    }
  }

  async sendTestMessage(message) {
    if (this.isConnected) {
      await this.connection.invoke('SendTestMessage', message);
    }
  }

  async markNotificationAsRead(notificationId) {
    if (this.isConnected) {
      await this.connection.invoke('MarkNotificationAsRead', notificationId);
    }
  }

  async markAllNotificationsAsRead() {
    if (this.isConnected) {
      await this.connection.invoke('MarkAllNotificationsAsRead');
    }
  }

  // Callbacks for external handling
  onNotificationReceived = null;
  onUnreadCountUpdated = null;
}

export default new SignalRService();
```

### Step 3: Create Notification Handler Component

Create a file `components/NotificationHandler.js`:

```javascript
import React, { useEffect, useRef } from 'react';
import signalRService from '../services/signalRService';

const NotificationHandler = ({ token, userId, organisationId }) => {
  const mounted = useRef(true);

  useEffect(() => {
    const setupSignalR = async () => {
      try {
        // Connect to SignalR
        const connected = await signalRService.connect(token);
        
        if (connected && mounted.current) {
          // Subscribe to user notifications
          await signalRService.subscribeToUser(userId);
          
          // Join organisation group
          if (organisationId) {
            await signalRService.joinOrganisation(organisationId);
          }

          // Set up callbacks
          signalRService.onNotificationReceived = (notification) => {
            // Show notification toast
            showNotificationToast(notification);
            
            // Update local state
            // updateNotifications(notification);
          };

          signalRService.onUnreadCountUpdated = (count) => {
            // Update badge count
            // updateBadgeCount(count);
          };
        }
      } catch (error) {
        console.error('Failed to setup SignalR:', error);
      }
    };

    if (token && userId) {
      setupSignalR();
    }

    return () => {
      mounted.current = false;
      signalRService.disconnect();
    };
  }, [token, userId, organisationId]);

  const showNotificationToast = (notification) => {
    // Implement your toast notification here
    console.log('Show notification:', notification.title);
  };

  return null; // This component doesn't render anything
};

export default NotificationHandler;
```

### Step 4: Use in Your App

```javascript
import React from 'react';
import NotificationHandler from './components/NotificationHandler';

const App = () => {
  const token = 'your-jwt-token';
  const userId = 'user-guid';
  const organisationId = 'organisation-guid';

  return (
    <div>
      {/* Your app content */}
      <NotificationHandler 
        token={token}
        userId={userId}
        organisationId={organisationId}
      />
    </div>
  );
};
```

## Solution 2: Raw WebSocket Implementation (Alternative)

If you prefer to use raw WebSocket connections, here's a corrected implementation:

```javascript
const connectToSignalR = (token) => {
  const baseUrl = 'wss://test.scorptech.co/hubs/notifications';
  const url = `${baseUrl}?access_token=${token}`;
  
  const ws = new WebSocket(url);
  
  ws.onopen = () => {
    console.log('WebSocket opened!');
    
    // Send SignalR handshake message
    const handshakeMessage = {
      protocol: "json",
      version: 1
    };
    
    ws.send(JSON.stringify(handshakeMessage));
    console.log('Sent handshake:', handshakeMessage);
  };
  
  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      console.log('Received:', data);
      
      // Handle different message types
      if (data.type === 1) {
        // Invocation message
        console.log('Invocation:', data.target, data.arguments);
      } else if (data.type === 6) {
        // Ping message
        console.log('Ping received');
      } else if (data.type === 7) {
        // Close message
        console.log('Close message received');
      }
    } catch (error) {
      console.log('Raw message:', e.data);
    }
  };
  
  ws.onerror = (e) => {
    console.error('WebSocket error:', e);
  };
  
  ws.onclose = (e) => {
    console.log(`WebSocket closed: code=${e.code}, reason=${e.reason}`);
  };
  
  return ws;
};
```

## Backend Configuration Updates

The backend has been updated with improved SignalR configuration:

### SignalR Configuration
```csharp
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
    options.HandshakeTimeout = TimeSpan.FromSeconds(15);
    options.KeepAliveInterval = TimeSpan.FromSeconds(10);
    options.MaximumReceiveMessageSize = 1024 * 1024; // 1MB
});
```

### CORS Configuration
```csharp
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(builder =>
    {
        builder.WithOrigins(
                "http://localhost:19006", 
                "http://localhost:3000", 
                "http://localhost:4200", 
                "http://localhost:8081",
                "https://test.scorptech.co"
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});
```

## Available SignalR Events

### Client Events (Listen for these)
- `ReceiveNotification`: New notification received
- `UnreadCount`: Unread notification count update
- `Heartbeat`: Connection heartbeat

### Server Methods (Call these)
- `SubscribeToUser(userId)`: Subscribe to user-specific notifications
- `JoinOrganisation(organisationId)`: Join organisation group
- `SendTestMessage(message)`: Send test message
- `MarkNotificationAsRead(notificationId)`: Mark notification as read
- `MarkAllNotificationsAsRead()`: Mark all notifications as read

## Testing the Connection

### 1. Rebuild and Restart Backend
```bash
# Stop containers
docker-compose down

# Rebuild and start
docker-compose up --build -d
```

### 2. Test with Python Script
Use the provided Python test suite:
```bash
cd python_tests
python notification_test_suite.py
```

### 3. Test in React Native
Add console logs to verify connection:
```javascript
// In your SignalR service
console.log('Connection state:', this.connection.state);
console.log('Is connected:', this.isConnected);
```

## Troubleshooting

### Common Issues

1. **"handshake was cancelled"**
   - Use the official SignalR client instead of raw WebSocket
   - Ensure `skipNegotiation: true` is set
   - Check that the token is valid

2. **URL resolution issues on Android**
   - Use `wss://` instead of `ws://` for secure connections
   - Ensure the domain is accessible from the device

3. **Connection timeouts**
   - Increase timeout values in the SignalR configuration
   - Check network connectivity

4. **CORS errors**
   - Ensure your domain is added to CORS allowed origins
   - Check that credentials are allowed

### Debug Steps

1. Enable detailed logging:
```javascript
.configureLogging(signalR.LogLevel.Debug)
```

2. Check connection state:
```javascript
console.log('Connection state:', connection.state);
```

3. Monitor network requests in browser dev tools or React Native debugger

## Notification Flow

1. **Connection**: App connects to SignalR hub
2. **Subscription**: App subscribes to user and organisation groups
3. **Real-time**: Backend sends notifications immediately via WebSocket
4. **Management**: App uses REST API for marking read, getting history, etc.

## Security Considerations

- JWT tokens are passed via query parameter for WebSocket connections
- Authentication is handled by the SignalR hub
- Users can only subscribe to their own notifications
- Organisation access is validated

## Performance Tips

- Use automatic reconnection for better user experience
- Implement exponential backoff for reconnection attempts
- Handle connection state changes gracefully
- Clean up connections when components unmount

## Example Usage in React Native

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import signalRService from './services/signalRService';

const NotificationScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Set up SignalR callbacks
    signalRService.onNotificationReceived = (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    signalRService.onUnreadCountUpdated = (count) => {
      setUnreadCount(count);
    };
  }, []);

  const markAsRead = async (notificationId) => {
    await signalRService.markNotificationAsRead(notificationId);
  };

  return (
    <View>
      <Text>Unread: {unreadCount}</Text>
      {notifications.map(notification => (
        <View key={notification.notificationId}>
          <Text>{notification.title}</Text>
          <Text>{notification.message}</Text>
          <Button 
            title="Mark Read" 
            onPress={() => markAsRead(notification.notificationId)} 
          />
        </View>
      ))}
    </View>
  );
};
```

This setup provides a robust, real-time notification system for your React Native app with proper error handling and reconnection logic. 