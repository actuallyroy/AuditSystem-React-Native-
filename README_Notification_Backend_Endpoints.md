# Notification Integration: Backend API Endpoints

**REST API Base URL:** `http://192.168.1.4:8080/api/v1`
**WebSocket (SignalR) URL:** `ws://192.168.1.4:8080/hubs/notifications`

_Use these URLs for local or development setup._

This document outlines the required backend endpoints for integrating notifications with the mobile app. These endpoints should support both real-time (SignalR/WebSocket) and RESTful notification features.

## 1. Send Notification to a User

- **Method:** POST
- **Path:** `/api/notifications/send`
- **Description:** Send a notification to a specific user (or group).
- **Request Body:**
  ```json
  {
    "userId": "string",           // Target user ID
    "title": "string",           // Notification title
    "message": "string",         // Notification message
    "type": "string",            // e.g., "system", "assignment", etc.
    "data": { ... },               // (Optional) Additional payload
    "priority": "string"         // (Optional) e.g., "high", "low"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "notificationId": "string"
  }
  ```

---

## 2. Fetch Notifications for a User

- **Method:** GET
- **Path:** `/api/notifications/user/{userId}`
- **Description:** Retrieve all notifications for a user, ordered by most recent.
- **Query Params:**
  - `unreadOnly` (optional, boolean): If true, only return unread notifications.
- **Response:**
  ```json
  [
    {
      "id": "string",
      "userId": "string",
      "title": "string",
      "message": "string",
      "type": "string",
      "data": { ... },
      "timestamp": "ISO8601 string",
      "isRead": true,
      "priority": "string"
    }
  ]
  ```

---

## 3. Mark a Notification as Read

- **Method:** POST
- **Path:** `/api/notifications/{notificationId}/read`
- **Description:** Mark a specific notification as read.
- **Request Body:**
  ```json
  {
    "userId": "string"
  }
  ```
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

## 4. Mark All Notifications as Read

- **Method:** POST
- **Path:** `/api/notifications/user/{userId}/read-all`
- **Description:** Mark all notifications for a user as read.
- **Response:**
  ```json
  {
    "success": true,
    "updatedCount": 5
  }
  ```

---

## 5. Real-Time Notification Delivery (SignalR/WebSocket)

- **Hub/Endpoint:** `/hubs/notifications`
- **Description:**
  - The backend should broadcast new notifications to connected clients in real-time using SignalR (or WebSocket).
  - Clients subscribe to their user ID or group.
- **Payload Example:**
  ```json
  {
    "id": "string",
    "userId": "string",
    "title": "string",
    "message": "string",
    "type": "string",
    "data": { ... },
    "timestamp": "ISO8601 string",
    "isRead": false,
    "priority": "string"
  }
  ```

---

## 6. (Optional) Delete a Notification

- **Method:** DELETE
- **Path:** `/api/notifications/{notificationId}`
- **Description:** Delete a specific notification for a user.
- **Response:**
  ```json
  {
    "success": true
  }
  ```

---

## General Notes
- All endpoints should require authentication (e.g., JWT Bearer token).
- Timestamps should be in ISO8601 format (UTC).
- Consider supporting pagination for the fetch endpoint if notification volume is high.
- The notification object structure should be consistent across REST and real-time payloads. 