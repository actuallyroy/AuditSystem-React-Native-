# Android WebSocket Troubleshooting Guide

## Overview

This guide covers the configuration and troubleshooting of WebSocket connections in React Native Android apps, specifically for SignalR integration.

## Android Cleartext Traffic Configuration

### 1. AndroidManifest.xml Configuration

Your app already has the correct configuration:

```xml
<application 
  android:usesCleartextTraffic="true"
  android:networkSecurityConfig="@xml/network_security_config"
  ...>
```

### 2. Network Security Configuration

The `android/app/src/main/res/xml/network_security_config.xml` file is configured to allow cleartext traffic:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">192.168.1.4</domain>
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">test.scorptech.co</domain>
        <domain includeSubdomains="true">192.168.1.4</domain>
        <domain includeSubdomains="true">10.0.3.2</domain>
    </domain-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system"/>
            <certificates src="user"/>
        </trust-anchors>
    </base-config>
    <debug-overrides>
        <trust-anchors>
            <certificates src="system"/>
            <certificates src="user"/>
        </trust-anchors>
    </debug-overrides>
</network-security-config>
```

### 3. Required Permissions

The following permissions are configured in AndroidManifest.xml:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE"/>
```

## WebSocket Configuration

### SignalR Configuration

Your SignalR service is configured to use WebSocket transport:

```typescript
const WS_BASE_URL = 'ws://192.168.1.4:8080/hubs/notifications';

this.connection = new HubConnectionBuilder()
  .withUrl(config.url, {
    accessTokenFactory: () => token,
    transport: HttpTransportType.WebSockets,
    skipNegotiation: true
  })
  .configureLogging(LogLevel.Information)
  .withAutomaticReconnect([0, 2000, 10000, 30000])
  .build();
```

## Troubleshooting Steps

### 1. Test WebSocket Connectivity

Use the new "Test WebSocket Connectivity" button in the NotificationTestScreen to verify basic WebSocket connectivity.

### 2. Check Network Connectivity

Verify that your Android device can reach the backend:

```bash
# On your Android device, test HTTP connectivity
curl http://192.168.1.4:8080/api/v1/health

# Test WebSocket connectivity using a WebSocket client
```

### 3. Debug Logs

Enable detailed logging by checking the console output for:

- Connection attempts
- Error messages
- Network timeouts
- DNS resolution issues

### 4. Common Issues and Solutions

#### Issue: "Cannot resolve 'ws://192.168.1.4:8080/hubs/notifications'"

**Possible Causes:**
- Device not on the same network as the backend
- DNS resolution issues
- Firewall blocking the connection
- Backend not properly configured for WebSocket

**Solutions:**
1. Ensure device and backend are on the same network
2. Try using IP address directly instead of hostname
3. Check firewall settings
4. Verify backend WebSocket configuration

#### Issue: Connection timeout

**Possible Causes:**
- Network latency
- Backend overloaded
- Incorrect WebSocket endpoint

**Solutions:**
1. Increase connection timeout in SignalR configuration
2. Check backend performance
3. Verify WebSocket endpoint URL

#### Issue: SSL/TLS errors

**Possible Causes:**
- Backend using HTTPS/WSS but client using HTTP/WS
- Certificate issues
- Mixed content policy

**Solutions:**
1. Use WSS for HTTPS backends
2. Configure proper certificates
3. Update network security config for SSL domains

### 5. Android-Specific Considerations

#### Network Security Policy

Android 9+ (API 28+) has stricter network security policies. Your configuration addresses this by:

- Setting `android:usesCleartextTraffic="true"`
- Configuring network security config for specific domains
- Adding debug overrides for development

#### React Native Networking

React Native on Android uses the system's networking stack, which respects Android's network security policies. The configuration ensures:

- Cleartext traffic is allowed for development
- Specific domains are whitelisted
- Debug builds have additional permissions

### 6. Testing with Public WebSocket Servers

To isolate whether the issue is with your backend or React Native networking, test with public WebSocket echo servers:

```typescript
// Test with public WebSocket server
const testUrl = 'wss://echo.websocket.org';
```

### 7. Backend Verification

Ensure your .NET backend is properly configured for WebSocket:

1. **CORS Configuration**: Allow WebSocket connections
2. **SignalR Hub**: Properly configured with WebSocket transport
3. **Network Configuration**: Listening on correct interface and port
4. **Firewall**: Allow WebSocket traffic on port 8080

### 8. Development vs Production

For production, consider:

- Using WSS (secure WebSocket) instead of WS
- Proper SSL certificates
- Domain-based network security configuration
- Removing debug overrides

## Additional Resources

- [Android Network Security Config](https://developer.android.com/training/articles/security-config)
- [Android Cleartext Traffic Protection](https://android-developers.googleblog.com/2016/04/protecting-against-unintentional.html)
- [SignalR WebSocket Transport](https://docs.microsoft.com/en-us/aspnet/core/signalr/websockets)
- [React Native Networking](https://reactnative.dev/docs/network)

## Next Steps

1. Test WebSocket connectivity using the new test button
2. Check Android logs using `adb logcat`
3. Verify backend WebSocket configuration
4. Test with different network configurations
5. Consider using a tunnel service for external access 