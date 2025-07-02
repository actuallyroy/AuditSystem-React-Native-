import 'react-native-reanimated';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context"
import { Toaster } from 'sonner-native';
import HomeScreen from "./screens/HomeScreen"
import AuditDetailScreen from "./screens/AuditDetailScreen";
import AuditExecutionScreen from "./screens/AuditExecutionScreen";
import AuditSubmitScreen from "./screens/AuditSubmitScreen";

const Stack = createNativeStackNavigator();

function RootStack(): JSX.Element {
  return (
    <Stack.Navigator screenOptions={{
      headerShown: false
    }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="AuditDetail" component={AuditDetailScreen} />
      <Stack.Screen name="AuditExecution" component={AuditExecutionScreen} />
      <Stack.Screen name="AuditSubmit" component={AuditSubmitScreen} />
    </Stack.Navigator>
  );
}

export default function App(): JSX.Element {
  return (
    <SafeAreaProvider style={styles.container}>
      <Toaster />
      <NavigationContainer>
        <RootStack />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    userSelect: "none"
  }
});