import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';


import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { authService } from '@/services/authService';

export default function ProfileScreen() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>('Cargando...');
  const [email, setEmail] = useState<string | null>('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const user = await authService.getUserName; 
    const uName = await authService.getUserName() || await authService.getCurrentUserId(); 
    const uEmail = await authService.getUserEmail();
    
    setUsername(uName);
    setEmail(uEmail);
  };

  const handleLogout = async () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro que quieres salir?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Salir", 
          style: "destructive", 
          onPress: async () => {
            await authService.logout();
            router.replace('/login');
          }
        }
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={60} color="#fff" />
        </View>
        <ThemedText type="title" style={styles.username}>{username}</ThemedText>
        <ThemedText style={styles.email}>{email}</ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Cuenta</ThemedText>
        
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={24} color="#888" />
          <View style={styles.infoText}>
            <ThemedText type="defaultSemiBold">Correo</ThemedText>
            <ThemedText>{email || 'No disponible'}</ThemedText>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="finger-print-outline" size={24} color="#888" />
          <View style={styles.infoText}>
            <ThemedText type="defaultSemiBold">ID de Usuario</ThemedText>
            <ThemedText style={{fontSize: 12}}>{username}</ThemedText>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#fff" />
        <ThemedText style={styles.logoutText}>Cerrar Sesión</ThemedText>
      </TouchableOpacity>
    </ThemedView>

    
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 28 },
  header: { alignItems: 'center', marginVertical: 30 },
  avatarContainer: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#0a7ea4', alignItems: 'center', justifyContent: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  username: { fontSize: 24 },
  email: { opacity: 0.6, marginTop: 4 },
  section: { marginTop: 4, gap: 20 },
  sectionTitle: { marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 8 },
  infoText: { gap: 2 },
  logoutButton: {
    marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ff4444', padding: 16, borderRadius: 12, gap: 10,
    marginBottom: 'auto'
  },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});