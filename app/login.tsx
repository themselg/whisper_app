import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { authService } from '@/services/authService';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  
  // --- COLORES DINÁMICOS ---
  const isIOS = Platform.OS === 'ios';
  const isDark = colorScheme === 'dark';
  const iosBlue = isDark ? '#0A84FF' : '#007AFF';
  const primaryColor = isIOS ? iosBlue : '#0a7ea4';
  const screenBackgroundColor = (isIOS && isDark) ? '#000000' : undefined;
  
  // Fondo de inputs (Gris suave moderno)
  const inputBgColor = isDark ? '#1c1c1e' : '#f2f2f7';
  const placeholderColor = '#8e8e93';
  const textColor = isDark ? '#fff' : '#000';
  // -------------------------

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Estados para Modal Android
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalButtonText, setModalButtonText] = useState('Aceptar');
  const [modalAction, setModalAction] = useState<(() => void) | undefined>(undefined);

  const showAlert = (title: string, message: string, buttonText: string = 'Aceptar', onPress?: () => void) => {
    if (Platform.OS === 'android') {
      setModalTitle(title);
      setModalMessage(message);
      setModalButtonText(buttonText);
      setModalAction(() => onPress);
      setModalVisible(true);
    } else {
      Alert.alert(title, message, onPress ? [{ text: buttonText, onPress }] : undefined);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      showAlert('Campos incompletos', 'Por favor ingresa usuario y contraseña');
      return;
    }

    setIsLoading(true);

    try {
      await authService.login({ username, password });
      router.replace('/(tabs)'); 
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Verifica tus credenciales';
      showAlert('Error de acceso', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, screenBackgroundColor && { backgroundColor: screenBackgroundColor }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1, justifyContent: 'center' }}
      >
        <View style={styles.content}>
          
          {/* --- HEADER / LOGO --- */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: primaryColor }]}>
               <Ionicons name="chatbubbles" size={40} color="#fff" />
            </View>
            <ThemedText type="title" style={styles.title}>Whisper</ThemedText>
            <ThemedText style={styles.subtitle}>Bienvenido de nuevo</ThemedText>
          </View>

          {/* --- FORMULARIO --- */}
          <View style={styles.form}>
            
            {/* INPUT USUARIO */}
            <View style={[styles.inputContainer, { backgroundColor: inputBgColor }]}>
              {Platform.OS === 'ios' 
                              ? <Ionicons name="person" size={20} color={placeholderColor} style={{ marginRight: 10 }} />
                              : <MaterialCommunityIcons name="account" size={20} color={placeholderColor} style={{ marginRight: 10 }} />}
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Nombre de usuario"
                placeholderTextColor={placeholderColor}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* INPUT CONTRASEÑA */}
            <View style={[styles.inputContainer, { backgroundColor: inputBgColor }]}>
              {Platform.OS === 'ios' 
                              ? <Ionicons name="lock-closed" size={20} color={placeholderColor} style={{ marginRight: 10 }} />
                              : <MaterialCommunityIcons name="lock" size={20} color={placeholderColor} style={{ marginRight: 10 }} />}
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Contraseña"
                placeholderTextColor={placeholderColor}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!isPasswordVisible}
              />
              <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                              {Platform.OS === 'ios' 
                                ? <Ionicons 
                                    name={isPasswordVisible ? "eye-off" : "eye"} 
                                    size={22} 
                                    color={placeholderColor} 
                                  />
                                : <MaterialCommunityIcons 
                                    name={isPasswordVisible ? "eye-off" : "eye"} 
                                    size={22} 
                                    color={placeholderColor} 
                                  />}
                            </TouchableOpacity>
            </View>

            {/* BOTÓN LOGIN */}
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: primaryColor }]} 
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>Iniciar Sesión</ThemedText>
              )}
            </TouchableOpacity>

          </View>

          {/* --- FOOTER --- */}
          <View style={styles.footer}>
            <ThemedText style={{ opacity: 0.7 }}>¿No tienes cuenta?</ThemedText>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <ThemedText type="defaultSemiBold" style={{ color: primaryColor }}>Regístrate aquí</ThemedText>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>

      {/* MODAL ANDROID */}
      {Platform.OS === 'android' && (
        <Modal transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)} animationType="fade">
          <View style={styles.modalOverlay}>
            <ThemedView style={styles.modalView}>
              <ThemedText type="subtitle">{modalTitle}</ThemedText>
              <ThemedText style={styles.modalText}>{modalMessage}</ThemedText>
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  onPress={() => { setModalVisible(false); if (modalAction) modalAction(); }} 
                  style={[styles.modalButton, { backgroundColor: primaryColor }]}
                >
                  <ThemedText style={{ color: '#fff' }}>{modalButtonText}</ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </View>
        </Modal>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 30 },
  
  header: { alignItems: 'center', marginBottom: 40 },
  logoContainer: {
    width: 80, height: 80, borderRadius: 24, // Squircle moderno
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5
  },
  title: { fontSize: 32, fontWeight: 'bold' },
  subtitle: { marginTop: 8, opacity: 0.6, fontSize: 16 },

  form: { gap: 16 },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56, 
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },

  button: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 2
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  footer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 40, 
    gap: 6 
  },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { margin: 20, borderRadius: 20, padding: 25, alignItems: 'stretch', width: '85%', elevation: 5 },
  modalText: { marginBottom: 20, marginTop: 10, opacity: 0.8 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalButton: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
});