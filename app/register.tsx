import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';

import { authService } from '@/services/authService';

export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Colores dinámicos
  const inputBorderColor = colorScheme === 'dark' ? '#444' : '#ccc';
  const inputTextColor = colorScheme === 'dark' ? '#fff' : '#000';

  const handleRegister = async () => {
    // 1. Validaciones del lado del cliente (Espejo de SignupRequest.java)
    if (username.length < 3 || username.length > 20) {
      Alert.alert('Error', 'El usuario debe tener entre 3 y 20 caracteres.');
      return;
    }
    if (!email.includes('@') || email.length > 50) {
      Alert.alert('Error', 'Ingresa un correo electrónico válido (máx 50 caracteres).');
      return;
    }
    if (password.length < 6 || password.length > 40) {
      Alert.alert('Error', 'La contraseña debe tener entre 6 y 40 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      // 2. Llamada al servicio
      await authService.register({
        username,
        email,
        password,
        role: ['user'] 
      });

      // 3. Éxito
      Alert.alert(
        '¡Registro Exitoso!',
        'Tu cuenta ha sido creada. Por favor inicia sesión.',
        [
          { text: 'Ir al Login', onPress: () => router.back() } // router.back() regresa al Login en el stack
        ]
      );
      
    } catch (error: any) {
      const msg = error.response?.data?.message || 'No se pudo crear la cuenta. Intenta con otro usuario/email.';
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>Crear Cuenta</ThemedText>
          <ThemedText style={styles.subtitle}>Únete a Whisper App</ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <ThemedText type="defaultSemiBold">Usuario</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: inputBorderColor, color: inputTextColor }]}
              placeholder="Ej. CoolUser99"
              placeholderTextColor="#888"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <ThemedText style={styles.hint}>Mínimo 3 caracteres</ThemedText>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="defaultSemiBold">Email</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: inputBorderColor, color: inputTextColor }]}
              placeholder="correo@ejemplo.com"
              placeholderTextColor="#888"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="defaultSemiBold">Contraseña</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: inputBorderColor, color: inputTextColor }]}
              placeholder="********"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <ThemedText style={styles.hint}>Mínimo 6 caracteres</ThemedText>
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Registrarse</ThemedText>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <ThemedText>¿Ya tienes cuenta? </ThemedText>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText type="link">Inicia sesión</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    padding: 24 
  },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 32, marginBottom: 8 },
  subtitle: { opacity: 0.7 },
  form: { gap: 20 },
  inputGroup: { gap: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  hint: { fontSize: 12, opacity: 0.5, marginLeft: 4 },
  button: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: 40 
  }
});