import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { authService } from '@/services/authService';

export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  
  // --- CONFIGURACIÓN DE COLORES NATIVOS ---
  const isIOS = Platform.OS === 'ios';
  const isDark = colorScheme === 'dark';
  
  const iosBlue = isDark ? '#0A84FF' : '#007AFF';
  const primaryColor = isIOS ? iosBlue : '#0a7ea4';
  const screenBackgroundColor = (isIOS && isDark) ? '#000000' : undefined;

  // Estilos de Input Modernos
  const inputBgColor = isDark ? '#1c1c1e' : '#f2f2f7';
  const placeholderColor = '#8e8e93';
  const textColor = isDark ? '#fff' : '#000';
  // ----------------------------------------

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

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

  // Selector de Imagen
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permiso requerido', 'Necesitamos acceso a la galería para tu foto.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleRegister = async () => {
    if (!username || !email || !password) {
      showAlert('Campos incompletos', 'Por favor llena los campos obligatorios (*)');
      return;
    }

    setLoading(true);
    try {
      await authService.register({
        username,
        email,
        password,
        displayName: displayName || undefined,
        profilePicture: image || undefined,
        role: ['user']
      });

      showAlert('¡Bienvenido!', 'Tu cuenta ha sido creada exitosamente.', 'Iniciar Sesión', () => router.back());
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Hubo un error al registrarse';
      showAlert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, screenBackgroundColor && { backgroundColor: screenBackgroundColor }]}>
      {/* HEADER NATIVO CONFIGURADO */}
      <Stack.Screen 
        options={{
          title: '',
          headerStyle: { backgroundColor: screenBackgroundColor },
          headerShadowVisible: false,
          headerTintColor: primaryColor,
          headerBackTitle: 'Login',
        }} 
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={{ marginBottom: 30 }}>
            <ThemedText type="title" style={{ fontSize: 32 }}>Crear Cuenta</ThemedText>
            <ThemedText style={{ opacity: 0.6, marginTop: 5 }}>Únete a Whisper hoy</ThemedText>
          </View>

          {/* SECCIÓN AVATAR */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage} style={[styles.avatarContainer, { backgroundColor: primaryColor }]}>
              {image ? (
                <Image source={{ uri: image }} style={styles.avatarImage} />
              ) : (
                Platform.OS === 'ios' 
                  ? <Ionicons name="camera" size={40} color="#fff" />
                  : <MaterialCommunityIcons name="camera" size={40} color="#fff" />
              )}
              
              {/* Badge de + */}
              <View style={[styles.addIconBadge, { borderColor: isDark ? '#000' : '#fff' }]}>
                {Platform.OS === 'ios' 
                  ? <Ionicons name="add" size={16} color="#fff" />
                  : <MaterialCommunityIcons name="plus" size={16} color="#fff" />}
              </View>
            </TouchableOpacity>
            <ThemedText style={{fontSize: 14, color: primaryColor, marginTop: 12, fontWeight: '600'}}>
              {image ? 'Cambiar foto' : 'Subir foto de perfil'}
            </ThemedText>
          </View>

          {/* FORMULARIO */}
          <View style={styles.form}>
            
            {/* NOMBRE (OPCIONAL) */}
            <View style={[styles.inputContainer, { backgroundColor: inputBgColor }]}>
              {Platform.OS === 'ios' 
                ? <Ionicons name="text" size={20} color={placeholderColor} style={{ marginRight: 10 }} />
                : <MaterialCommunityIcons name="format-letter-case" size={20} color={placeholderColor} style={{ marginRight: 10 }} />}
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Nombre completo (Opcional)"
                placeholderTextColor={placeholderColor}
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>

            {/* USUARIO */}
            <View style={[styles.inputContainer, { backgroundColor: inputBgColor }]}>
              {Platform.OS === 'ios' 
                ? <Ionicons name="person" size={20} color={placeholderColor} style={{ marginRight: 10 }} />
                : <MaterialCommunityIcons name="account" size={20} color={placeholderColor} style={{ marginRight: 10 }} />}
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Nombre de usuario *"
                placeholderTextColor={placeholderColor}
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />
            </View>

            {/* EMAIL */}
            <View style={[styles.inputContainer, { backgroundColor: inputBgColor }]}>
              {Platform.OS === 'ios' 
                ? <Ionicons name="mail" size={20} color={placeholderColor} style={{ marginRight: 10 }} />
                : <MaterialCommunityIcons name="email" size={20} color={placeholderColor} style={{ marginRight: 10 }} />}
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Correo electrónico *"
                placeholderTextColor={placeholderColor}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* PASSWORD */}
            <View style={[styles.inputContainer, { backgroundColor: inputBgColor }]}>
              {Platform.OS === 'ios' 
                ? <Ionicons name="lock-closed" size={20} color={placeholderColor} style={{ marginRight: 10 }} />
                : <MaterialCommunityIcons name="lock" size={20} color={placeholderColor} style={{ marginRight: 10 }} />}
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Contraseña *"
                placeholderTextColor={placeholderColor}
                secureTextEntry={!isPasswordVisible}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                {Platform.OS === 'ios' 
                  ? <Ionicons 
                      name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
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

            {/* BOTÓN REGISTRAR */}
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: primaryColor }]} 
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>Registrarse</ThemedText>
              )}
            </TouchableOpacity>

          </View>

          {/* FOOTER - VOLVER A LOGIN */}
          <View style={styles.footer}>
            <ThemedText style={{ opacity: 0.7 }}>¿Ya tienes cuenta?</ThemedText>
            <TouchableOpacity onPress={() => router.back()}>
              <ThemedText type="defaultSemiBold" style={{ color: primaryColor }}>Inicia sesión</ThemedText>
            </TouchableOpacity>
          </View>

        </ScrollView>
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
  scrollContent: { padding: 30, paddingBottom: 50, marginTop: Platform.OS === 'ios' ? 50 : 25 },
  
  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  avatarContainer: { 
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5
  },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  addIconBadge: {
    position: 'absolute', right: 0, bottom: 0,
    backgroundColor: '#333', width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3
  },

  // Form
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
    alignItems: 'center', justifyContent: 'center', marginTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5
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