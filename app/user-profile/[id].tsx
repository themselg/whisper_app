import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  View,
  useColorScheme
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UserProfile, userService } from '@/services/userService';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  
  // --- CONFIGURACIÓN DE COLORES NATIVOS ---
  const isIOS = Platform.OS === 'ios';
  const isDark = colorScheme === 'dark';
  
  const iosBlue = isDark ? '#0A84FF' : '#007AFF';
  const primaryColor = isIOS ? iosBlue : '#0a7ea4';
  const backArrowColor = isDark ? '#fff' : '#000';
  const screenBackgroundColor = (isIOS && isDark) ? '#000000' : undefined;
  const headerBg = isDark ? (isIOS ? '#000000' : '#101010') : '#fff';
  // ----------------------------------------

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      userService.getUserById(id).then(u => {
        setUser(u);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) {
    return (
      <ThemedView style={[
        styles.container, 
        { justifyContent: 'center', alignItems: 'center' },
        screenBackgroundColor && { backgroundColor: screenBackgroundColor }
      ]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </ThemedView>
    );
  }

  if (!user) {
    return (
      <ThemedView style={[styles.container, screenBackgroundColor && { backgroundColor: screenBackgroundColor }]}>
        <Stack.Screen options={{ title: '', headerTintColor: backArrowColor }} />
        <ThemedText style={{ textAlign: 'center', marginTop: 100 }}>
          Usuario no encontrado.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, screenBackgroundColor && { backgroundColor: screenBackgroundColor }]}>
      
      {/* CONFIGURACIÓN DEL HEADER "INVISIBLE" */}
      <Stack.Screen 
        options={{ 
          headerTitle: '', 
          headerTransparent: true,
          headerShadowVisible: false,
          headerBackButtonDisplayMode : 'minimal'
        }} 
      />

      {/* HEADER VISUAL (Avatar y Nombres) */}
      <View style={styles.header}>
        {/* Avatar con fondo de color primario dinámico */}
        <View style={[styles.avatarContainer, { backgroundColor: primaryColor }]}>
          {user.profilePicture ? (
            <Image source={{ uri: user.profilePicture }} style={styles.avatarImage} />
          ) : (
            Platform.OS === 'ios' 
              ? <Ionicons name="person" size={60} color="#fff" />
              : <MaterialCommunityIcons name="account" size={76} color="#fff" />
          )}
        </View>
        
        <ThemedText type="title" style={styles.username}>
          {user.displayName || user.username}
        </ThemedText>
        <ThemedText style={styles.email}>@{user.username}</ThemedText>
      </View>

      {/* SECCIÓN DE INFORMACIÓN */}
      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Información Pública</ThemedText>

        {/* Fila: Correo */}
        <View style={styles.infoRow}>
          {Platform.OS === 'ios' 
                        ? <Ionicons name="mail" size={24} color="#888" />
                        : <MaterialCommunityIcons name="email" size={24} color="#888" />}
          <View style={styles.infoText}>
            <ThemedText type="defaultSemiBold">Correo</ThemedText>
            <ThemedText>{user.email}</ThemedText>
          </View>
        </View>

        {/* Fila: ID */}
        <View style={styles.infoRow}>
          {Platform.OS === 'ios' 
                        ? <Ionicons name="finger-print" size={24} color="#888" />
                        : <MaterialCommunityIcons name="fingerprint" size={24} color="#888" />}
          <View style={styles.infoText}>
            <ThemedText type="defaultSemiBold">ID de Usuario</ThemedText>
            <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>{user.id}</ThemedText>
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingHorizontal: 28,
    paddingTop: 100
  },
  
  header: { alignItems: 'center', marginBottom: 30 },
  
  avatarContainer: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 15,
    overflow: 'hidden'
  },
  
  avatarImage: {
    width: 100, height: 100, borderRadius: 50
  },

  username: { fontSize: 24, textAlign: 'center' },
  email: { opacity: 0.6, marginTop: 4 },
  
  section: { marginTop: 4, gap: 20 },
  sectionTitle: { marginBottom: 10 },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 8 },
  infoText: { gap: 2 },
});