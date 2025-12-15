import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { authService } from '@/services/authService';
import { userService } from '@/services/userService';

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();

  // --- CONFIGURACIÓN DE COLORES NATIVOS ---
  const isIOS = Platform.OS === 'ios';
  const isDark = colorScheme === 'dark';
  
  const iosBlue = isDark ? '#0A84FF' : '#007AFF';
  const primaryColor = isIOS ? iosBlue : '#0a7ea4';
  const screenBackgroundColor = (isIOS && isDark) ? '#000000' : undefined;
  // ----------------------------------------
  
  const [username, setUsername] = useState<string | null>('Cargando...');
  const [email, setEmail] = useState<string | null>('');

  const [userId, setUserId] = useState<string | null>(null);
  
  const [displayName, setDisplayName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Estados para Modales Android
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [logoutVisible, setLogoutVisible] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const id = await authService.getCurrentUserId();
    const uName = await authService.getUsername(); 
    const uEmail = await authService.getUserEmail();
    
    setUsername(uName);
    setEmail(uEmail);
    setUserId(id);

    if (id) {
      const userProfile = await userService.getUserById(id);
      if (userProfile) {
        if (userProfile.displayName) setDisplayName(userProfile.displayName);
        if (userProfile.profilePicture) setImage(userProfile.profilePicture);
      }
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'android') {
      setAlertTitle(title);
      setAlertMessage(message);
      setAlertVisible(true);
    } else {
      Alert.alert(title, message);
    }
  };

  // --- LÓGICA DE IMAGEN ---
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permiso denegado', 'Se necesita acceso a la galería para cambiar la foto.');
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
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setImage(base64Img);
      handleUploadImage(base64Img);
    }
  };

  const handleUploadImage = async (base64Img: string) => {
    setUploadingImage(true);
    try {
      await userService.updateProfile(displayName, base64Img);
    } catch (e) {
      showAlert("Error", "No se pudo subir la imagen.");
    } finally {
      setUploadingImage(false);
    }
  };
  // ------------------------

  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await userService.updateProfile(displayName, null);
      showAlert("Éxito", "Nombre actualizado.");
    } catch (e) {
      showAlert("Error", "No se pudo actualizar el nombre.");
    } finally {
      setSaving(false);
    }
  };

  const performLogout = async () => {
    await authService.logout();
    router.replace('/login');
  };

  const handleLogout = async () => {
    if (Platform.OS === 'android') {
      setLogoutVisible(true);
    } else {
      Alert.alert(
        "Cerrar Sesión",
        "¿Estás seguro que quieres salir?",
        [
          { text: "Cancelar", style: "cancel" },
          { 
            text: "Salir", 
            style: "destructive", 
            onPress: performLogout
          }
        ]
      );
    }
  };

  return (
    <ThemedView style={[styles.container, screenBackgroundColor && { backgroundColor: screenBackgroundColor }]}>
      
      {/* --- BOTÓN LOGOUT (SOLO IOS - ARRIBA DERECHA) --- */}
      {Platform.OS === 'ios' && (
        <TouchableOpacity style={styles.iosLogoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#ff4444" />
        </TouchableOpacity>
      )}
      {/* ----------------------------------------------- */}

      <View style={styles.header}>
        
        {/* AVATAR INTERACTIVO */}
        <TouchableOpacity 
          onPress={pickImage} 
          // Aplicamos color primario dinámico al fondo del avatar
          style={[styles.avatarContainer, { backgroundColor: primaryColor }]} 
          disabled={uploadingImage}
        >
          {uploadingImage ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : image ? (
            <Image source={{ uri: image }} style={styles.avatarImage} />
          ) : (
            Platform.OS === 'ios' 
              ? <Ionicons name="person" size={60} color="#fff" />
              : <MaterialCommunityIcons name="account" size={76} color="#fff" />
          )}
          
          {/* Badge de cámara con color dinámico */}
          <View style={[styles.editBadge, { backgroundColor: primaryColor }]}>
            {Platform.OS === 'ios' 
              ? <Ionicons name="camera" size={14} color="#fff" />
              : <MaterialCommunityIcons name="camera" size={14} color="#fff" />}
          </View>
        </TouchableOpacity>

        <ThemedText type="title" style={styles.username}>
          {displayName || username}
        </ThemedText>
        <ThemedText style={styles.email}>@{username}</ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Perfil</ThemedText>

        <View style={styles.infoRow}>
          {Platform.OS === 'ios' 
              ? <Ionicons name="person-circle-outline" size={24} color="#888" />
              : <MaterialCommunityIcons name="account-circle" size={24} color="#888" />}
          <View style={{flex: 1, gap: 5}}>
            <ThemedText type="defaultSemiBold">Nombre Mostrado</ThemedText>
            <View style={styles.inputContainer}>
                <TextInput 
                    style={[
                        styles.input, 
                        { color: isDark ? '#fff' : '#000' }
                    ]}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder={username || "Tu nombre para mostrar"}
                    placeholderTextColor="#888"
                />
                <TouchableOpacity 
                    // Botón Guardar con color dinámico
                    style={[styles.saveButtonSmall, { backgroundColor: primaryColor }]} 
                    onPress={handleSaveDisplayName}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        Platform.OS === 'ios' 
                          ? <Ionicons name="save" size={20} color="#fff" />
                          : <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>
          </View>
        </View>

        <ThemedText type="subtitle" style={[styles.sectionTitle, {marginTop: 10}]}>Cuenta</ThemedText>
        
        <View style={styles.infoRow}>
          {Platform.OS === 'ios' 
              ? <Ionicons name="mail" size={24} color="#888" />
              : <MaterialCommunityIcons name="email" size={24} color="#888" />}
          <View style={styles.infoText}>
            <ThemedText type="defaultSemiBold">Correo</ThemedText>
            <ThemedText>{email || 'No disponible'}</ThemedText>
          </View>
        </View>

        <View style={styles.infoRow}>
          {Platform.OS === 'ios' 
              ? <Ionicons name="finger-print" size={24} color="#888" />
              : <MaterialCommunityIcons name="fingerprint" size={24} color="#888" />}
          <View style={styles.infoText}>
            <ThemedText type="defaultSemiBold">ID de Usuario</ThemedText>
            <ThemedText style={{fontSize: 12, opacity: 0.6}}>{userId || 'Cargando... '}</ThemedText>
          </View>
        </View>
      </View>

      {/* FAB: Solo en Android */}
      {Platform.OS === 'android' && (
        <TouchableOpacity style={styles.fab} onPress={handleLogout} activeOpacity={0.8}>
          <MaterialCommunityIcons name="logout" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      {/* MODAL GENÉRICO ANDROID */}
      {Platform.OS === 'android' && (
        <Modal transparent visible={alertVisible} onRequestClose={() => setAlertVisible(false)} animationType="fade">
          <View style={styles.modalOverlay}>
            <ThemedView style={styles.modalView}>
              <ThemedText type="subtitle">{alertTitle}</ThemedText>
              <ThemedText style={styles.modalText}>{alertMessage}</ThemedText>
              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setAlertVisible(false)} style={[styles.modalButton, { backgroundColor: primaryColor }]}>
                  <ThemedText style={{ color: '#fff' }}>Aceptar</ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </View>
        </Modal>
      )}

      {/* MODAL LOGOUT ANDROID */}
      {Platform.OS === 'android' && (
        <Modal transparent visible={logoutVisible} onRequestClose={() => setLogoutVisible(false)} animationType="fade">
          <View style={styles.modalOverlay}>
            <ThemedView style={styles.modalView}>
              <ThemedText type="subtitle">Cerrar Sesión</ThemedText>
              <ThemedText style={styles.modalText}>¿Estás seguro que quieres salir?</ThemedText>
              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setLogoutVisible(false)} style={styles.modalButton}>
                  <ThemedText>Cancelar</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setLogoutVisible(false); performLogout(); }} style={[styles.modalButton, { backgroundColor: '#ff4444' }]}>
                  <ThemedText style={{ color: '#fff' }}>Salir</ThemedText>
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
  container: { flex: 1, padding: 28 },
    iosLogoutButton: {
    position: 'absolute',
    top: 70,
    right: 10,
    zIndex: 10,
    padding: 8,
  },

  header: { alignItems: 'center', marginVertical: 30 },
  
  avatarContainer: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 20, marginBottom: 15,
    position: 'relative',
    overflow: 'visible'
  },
  avatarImage: {
    width: 100, height: 100, borderRadius: 50
  },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff'
  },

  username: { fontSize: 24, textAlign: 'center' },
  email: { opacity: 0.6, marginTop: 4 },
  section: { marginTop: 4, gap: 15 },
  sectionTitle: { marginBottom: 5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 8 },
  infoText: { gap: 2 },
  
  inputContainer: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      gap: 10, 
      backgroundColor: 'rgba(150,150,150,0.1)', 
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5
  },
  input: {
      flex: 1,
      fontSize: 16,
      height: 40,
  },
  saveButtonSmall: {
      padding: 8,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center'
  },
  
  fab: { 
    position: 'absolute', right: 24, bottom: Platform.OS === 'ios' ? 96 : 24, 
    width: 56, height: 56, borderRadius: 16, 
    backgroundColor: '#ff4444', 
    justifyContent: 'center', alignItems: 'center', 
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, 
  },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { margin: 20, borderRadius: 20, padding: 25, alignItems: 'stretch', width: '85%', elevation: 5 },
  modalText: { marginBottom: 20, marginTop: 10, opacity: 0.8 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalButton: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
});