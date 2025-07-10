# Delivery Acknowledgment Protocol Documentation

## Overview

The Delivery Acknowledgment Protocol ensures reliable notification delivery by providing confirmation that notifications have been successfully received by the client. This protocol implements the SignalR message protocol over native WebSocket connections with automatic and manual acknowledgment capabilities.

## Protocol Implementation

### 1. WebSocket Service (`WebSocketNotificationService.ts`)

#### Key Features:
- **Automatic Acknowledgment**: Notifications are automatically acknowledged upon receipt
- **Manual Acknowledgment**: Support for manual acknowledgment of specific notifications
- **Delivery Confirmation**: Handles server confirmations of delivery acknowledgments
- **Error Handling**: Comprehensive error handling for acknowledgment failures

#### Methods:

##### `acknowledgeDelivery(notificationId: string): Promise<void>`
Sends a delivery acknowledgment to the server for a specific notification.

```typescript
// Example usage
await WebSocketNotificationService.acknowledgeDelivery("notification-guid");
```

##### `onDeliveryAcknowledged(handler: (acknowledgment: DeliveryAcknowledgment) => void): () => void`
Registers a handler for delivery acknowledgment confirmations from the server.

```typescript
const cleanup = WebSocketNotificationService.onDeliveryAcknowledged((acknowledgment) => {
  console.log('Delivery confirmed:', acknowledgment);
});
```

#### Message Format:
```json
{
  "type": 1,
  "target": "AcknowledgeDelivery",
  "arguments": ["notification-guid"]
}
```

### 2. Notification Context (`NotificationContext.tsx`)

#### State Management:
- **Delivery Status Tracking**: Tracks `deliveryAcknowledged` and `acknowledgedAt` for each notification
- **Delivery Counter**: Maintains `deliveryAcknowledgedCount` for UI display
- **Automatic Integration**: Automatically handles delivery acknowledgments from the WebSocket service

#### New State Properties:
```typescript
interface Notification {
  // ... existing properties
  deliveryAcknowledged?: boolean;
  acknowledgedAt?: string;
}

interface NotificationState {
  // ... existing properties
  deliveryAcknowledgedCount: number;
}
```

#### Actions:
- **`DELIVERY_ACKNOWLEDGED`**: Updates notification delivery status when acknowledgment is confirmed

#### Methods:
- **`acknowledgeDelivery(notificationId: string): Promise<void>`**: Manually acknowledge delivery

### 3. UI Components

#### Notification Screen (`NotificationScreen.tsx`)
- **Delivery Status Display**: Shows delivery status for each notification
- **Delivery Counter**: Displays total acknowledged deliveries in header
- **Visual Indicators**: Different styling for acknowledged vs pending notifications

#### Notification Test Screen (`NotificationTestScreen.tsx`)
- **Manual Acknowledgment Testing**: Allows manual acknowledgment of specific notifications
- **Delivery Status Overview**: Shows delivery statistics and connection status
- **Test Message Sending**: Send test messages to trigger notifications

## Protocol Flow

### 1. Automatic Acknowledgment Flow
```
1. Server sends notification → WebSocket
2. Client receives notification → WebSocketNotificationService
3. Automatic acknowledgment sent → Server
4. Server confirms acknowledgment → Client
5. UI updated with delivery status
```

### 2. Manual Acknowledgment Flow
```
1. User selects notification → UI
2. Manual acknowledgment sent → Server
3. Server confirms acknowledgment → Client
4. UI updated with delivery status
```

### 3. Error Handling Flow
```
1. Acknowledgment fails → Error logged
2. Connection retry → Automatic reconnection
3. Pending acknowledgments → Retry on reconnection
```

## Message Protocol

### Client-to-Server Messages

#### Acknowledge Delivery
```json
{
  "type": 1,
  "target": "AcknowledgeDelivery",
  "arguments": ["notification-guid"]
}
```

### Server-to-Client Messages

#### Delivery Acknowledgment Confirmation
```json
{
  "type": 1,
  "target": "DeliveryAcknowledged",
  "arguments": [{
    "notificationId": "notification-guid",
    "acknowledgedAt": "2024-01-01T00:00:00Z"
  }]
}
```

## Implementation Details

### 1. Automatic Acknowledgment
When a notification is received, the WebSocket service automatically sends an acknowledgment:

```typescript
case 'ReceiveNotification':
  // Automatically acknowledge delivery for new notifications
  this.acknowledgeDelivery(args[0].notificationId).catch((error) => {
    logger.error('Failed to automatically acknowledge delivery', error);
  });
```

### 2. Delivery Status Tracking
The notification context tracks delivery status for each notification:

```typescript
case 'DELIVERY_ACKNOWLEDGED':
  return {
    ...state,
    notifications: state.notifications.map(notification =>
      notification.id === action.payload.notificationId
        ? { 
            ...notification, 
            deliveryAcknowledged: true,
            acknowledgedAt: action.payload.acknowledgedAt
          }
        : notification
    ),
    deliveryAcknowledgedCount: state.deliveryAcknowledgedCount + 1
  };
```

### 3. UI Integration
The notification screen displays delivery status:

```typescript
{/* Delivery acknowledgment status */}
<View style={styles.deliveryStatusContainer}>
  {item.deliveryAcknowledged ? (
    <View style={styles.deliveryAcknowledged}>
      <Text style={styles.deliveryStatusText}>✓ Delivered</Text>
      {item.acknowledgedAt && (
        <Text style={styles.acknowledgmentTime}>
          {formatTimestamp(item.acknowledgedAt)}
        </Text>
      )}
    </View>
  ) : (
    <View style={styles.deliveryPending}>
      <Text style={styles.deliveryStatusText}>⏳ Pending delivery</Text>
    </View>
  )}
</View>
```

## Benefits

### 1. Reliability
- **Guaranteed Delivery**: Server knows when notifications are received
- **Retry Logic**: Failed acknowledgments can be retried
- **Connection Recovery**: Acknowledgments resume after reconnection

### 2. User Experience
- **Delivery Confirmation**: Users see when notifications are delivered
- **Status Transparency**: Clear indication of delivery status
- **Manual Control**: Users can manually acknowledge if needed

### 3. Monitoring
- **Delivery Metrics**: Track delivery success rates
- **Performance Monitoring**: Monitor acknowledgment response times
- **Error Tracking**: Identify and resolve delivery issues

## Testing

### 1. Manual Testing
Use the Notification Test Screen to:
- Send test messages
- Manually acknowledge deliveries
- Monitor delivery status
- Test connectivity

### 2. Automated Testing
The protocol supports automated testing through:
- WebSocket connectivity tests
- Message sending tests
- Acknowledgment verification
- Error scenario testing

## Troubleshooting

### Common Issues

1. **Acknowledgment Not Sent**
   - Check WebSocket connection status
   - Verify notification ID format
   - Check server logs for errors

2. **Acknowledgment Not Confirmed**
   - Verify server is processing acknowledgments
   - Check network connectivity
   - Review server-side acknowledgment logic

3. **UI Not Updated**
   - Verify context handlers are registered
   - Check reducer logic for delivery acknowledgments
   - Ensure UI components are re-rendering

### Debug Information
- Enable debug logging for detailed acknowledgment tracking
- Monitor WebSocket message flow
- Check delivery acknowledgment counters in UI

## Future Enhancements

### 1. Batch Acknowledgments
- Acknowledge multiple notifications in a single message
- Reduce network overhead for high-volume scenarios

### 2. Acknowledgment Timeouts
- Implement timeout for unacknowledged notifications
- Automatic retry with exponential backoff

### 3. Delivery Guarantees
- Implement at-least-once delivery semantics
- Handle duplicate acknowledgments gracefully

### 4. Analytics Integration
- Track delivery success rates
- Monitor acknowledgment response times
- Generate delivery performance reports 