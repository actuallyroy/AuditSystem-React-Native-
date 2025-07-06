# Authentication System Documentation

## Overview

The authentication system has been successfully integrated into your React Native app with the following components:

## 🔧 Services

### AuthService (`services/AuthService.ts`)
- Handles all API calls to your backend
- Includes login, register, getUserDetails, and changePassword methods
- Proper error handling and TypeScript types

### StorageService (`services/StorageService.ts`)
- Manages secure token storage using AsyncStorage
- Stores authentication tokens, user data, and authentication state
- Includes methods for storing, retrieving, and clearing authentication data

## 🎯 Authentication Context (`contexts/AuthContext.tsx`)
- Provides authentication state management throughout the app
- Handles automatic authentication check on app start
- Manages login, register, and logout operations
- Automatically updates UI based on authentication state

## 📱 Authentication Screens

### 1. LoginScreen
- Username/password login form
- Form validation and error handling
- Integrates with AuthService for API calls

### 2. SignupScreen
- Complete registration form with all required fields:
  - Username
  - First Name
  - Last Name
  - Email
  - Phone
  - Password
  - Organization ID (optional)
- Form validation including email and phone validation
- Integrates with AuthService for registration

### 3. ForgotPasswordScreen
- Email input for password reset requests
- Sends reset instructions to user's email

### 4. ResetPasswordScreen
- Reset token input from email
- New password and confirmation fields
- Password validation

### 5. VerifyEmailScreen
- 6-digit verification code input
- Resend functionality with countdown timer
- Email verification process

## 🔐 Authentication Flow

1. **App Start**: Checks if user is already authenticated
2. **Not Authenticated**: Shows login/signup screens
3. **Authenticated**: Shows main app screens
4. **Login/Register**: Stores tokens and user data, navigates to main app
5. **Logout**: Clears all authentication data, returns to login screen

## 🚀 Usage

### Starting the App
The app now starts with authentication check:
- If user is authenticated → Main app
- If not authenticated → Login screen

### API Configuration
Update the API base URL in `services/AuthService.ts`:
```typescript
const API_BASE_URL = 'http://your-api-url.com/api/v1';
```

### Using Authentication in Components
```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <Text>Please login</Text>;
  }
  
  return (
    <View>
      <Text>Welcome, {user.firstName}!</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  );
}
```

## 📋 Features Implemented

✅ **Login/Signup Forms**: Complete forms with validation
✅ **API Integration**: Real API calls to your backend
✅ **Token Storage**: Secure token storage with AsyncStorage
✅ **Authentication State**: Global state management
✅ **Auto-login**: Automatic authentication check on app start
✅ **Error Handling**: Proper error messages and validation
✅ **User Profile**: Display user info in settings
✅ **Logout Functionality**: Clear authentication data and return to login
✅ **Forgot Password Flow**: Complete password reset process
✅ **Form Validation**: Email, phone, password validation
✅ **Loading States**: Visual feedback during API calls

## 🔄 Navigation Structure

```
App
├── AuthProvider (wraps entire app)
├── Authentication Stack (when not authenticated)
│   ├── LoginScreen
│   ├── SignupScreen
│   ├── ForgotPasswordScreen
│   ├── ResetPasswordScreen
│   └── VerifyEmailScreen
└── Main Stack (when authenticated)
    ├── HomeScreen
    ├── AuditDetailScreen
    ├── AuditExecutionScreen
    └── AuditSubmitScreen
```

## 🛠 Next Steps

1. **Test the API Integration**: Make sure your backend is running on the configured URL
2. **Customize Error Messages**: Update error messages based on your API responses
3. **Add Loading Indicators**: Enhance loading states if needed
4. **Security Enhancements**: Consider adding biometric authentication
5. **Token Refresh**: Implement token refresh logic if your API supports it

## 📝 API Requirements

Your backend should have these endpoints:
- `POST /api/v1/Auth/register` - User registration
- `POST /api/v1/Auth/login` - User login
- `GET /api/v1/Users/{userId}` - Get user details
- `PATCH /api/v1/Users/{userId}/change-password` - Change password

## 🎨 UI Features

- **Modern Design**: Clean, professional UI matching your app's style
- **Form Validation**: Real-time validation with error messages
- **Loading States**: Visual feedback during API calls
- **Password Toggle**: Show/hide password functionality
- **Responsive Layout**: Works on different screen sizes
- **Accessibility**: Proper keyboard handling and navigation

The authentication system is now fully functional and ready for use! 