import 'react-native-reanimated';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context"
import { Toaster } from 'sonner-native';
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import HomeScreen from "./screens/HomeScreen"
import AuditDetailScreen from "./screens/AuditDetailScreen";
import AuditExecutionScreen from "./screens/AuditExecutionScreen";
import AuditSubmitScreen from "./screens/AuditSubmitScreen";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import ResetPasswordScreen from "./screens/ResetPasswordScreen";
import VerifyEmailScreen from "./screens/VerifyEmailScreen";
import DebugScreen from "./screens/DebugScreen";
import ApiTestScreen from "./screens/ApiTestScreen";

const Stack = createNativeStackNavigator();

function AuthStack(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{
      headerShown: false
    }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
    </Stack.Navigator>
  );
}

function MainStack(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{
      headerShown: false
    }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="AuditDetail" component={AuditDetailScreen} />
      <Stack.Screen name="AuditExecution" component={AuditExecutionScreen} />
      <Stack.Screen name="AuditSubmit" component={AuditSubmitScreen} />
      <Stack.Screen name="Debug" component={DebugScreen} />
      <Stack.Screen name="ApiTest" component={ApiTestScreen} />
    </Stack.Navigator>
  );
}

function RootNavigator(): JSX.Element {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return isAuthenticated ? <MainStack /> : <AuthStack />;
}

export default function App(): JSX.Element {
  return (
    <SafeAreaProvider style={styles.container}>
      <AuthProvider>
        <Toaster />
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    userSelect: "none"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  }
});