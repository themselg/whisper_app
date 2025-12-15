import { ThemedText } from '@/components/themed-text';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Dimensions, Modal, Platform, StyleSheet, useColorScheme, View } from 'react-native';

const { height, width } = Dimensions.get('window');

export const ConnectionOverlay = () => {
  const colorScheme = useColorScheme();
  const isIOS = Platform.OS === 'ios';
  const isDark = colorScheme === 'dark';
  
  const iosBlue = isDark ? '#0A84FF' : '#007AFF';
  const primaryColor = isIOS ? iosBlue : '#0a7ea4';
  const screenBackgroundColor = (isIOS && isDark) ? '#1C1C1E' : (isDark ? '#1c1c1e' : '#ffffff');
  const reconnectingBg = isDark ? '#2c2c2e' : '#f0f0f0';

  return (
    <Modal transparent animationType="fade" visible={true} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[
          styles.card, 
          { 
            backgroundColor: screenBackgroundColor,
            borderWidth: isDark ? 1 : 0,
            borderColor: isDark && isIOS ? 'rgba(255, 255, 255, 0.08)' : 'transparent'
          }
        ]}>
          {isIOS 
            ? <Ionicons name="cloud-offline" size={60} color="#ff4444" />
            : <MaterialCommunityIcons name="cloud-off" size={60} color="#ff4444" />}
          <ThemedText type="subtitle" style={styles.title}>Sin Conexión</ThemedText>
          <ThemedText style={styles.text}>
            Se ha perdido la conexión con el servidor.
          </ThemedText>
          
          <View style={[styles.reconnecting, { backgroundColor: reconnectingBg }]}>
            <ActivityIndicator size="small" color={primaryColor} />
            <ThemedText style={[styles.subtext, { color: primaryColor }]}>Reconectando...</ThemedText>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 9999, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '80%',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    marginTop: 16,
    marginBottom: 8,
  },
  text: {
    textAlign: 'center',
    marginBottom: 20,
  },
  reconnecting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20
  },
  subtext: {
    fontSize: 12,
    fontWeight: 'bold'
  }
});