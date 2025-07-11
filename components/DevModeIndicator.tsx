import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useDevMode } from '../contexts/DevModeContext';

interface DevModeIndicatorProps {
  show?: boolean;
}

export const DevModeIndicator: React.FC<DevModeIndicatorProps> = ({ show = true }) => {
  const { isDevModeEnabled } = useDevMode();

  if (!show || !isDevModeEnabled) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>DEV MODE</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: '#dc3545',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1000,
  },
  text: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default DevModeIndicator; 