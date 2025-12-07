import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';

// Servicio de autenticación
import { authService } from '@/services/authService';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Colores dinámicos simples para input
  const inputBorderColor = colorScheme === 'dark' ? '#444' : '#ccc';
  const inputTextColor = colorScheme === 'dark' ? '#fff' : '#000';

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor ingresa usuario y contraseña');
      return;
    }

    setIsLoading(true);

    try {
      await authService.login({ username, password });
      // Si el login es exitoso, vamos a las pestañas principales
      router.replace('/(tabs)'); 
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al iniciar sesión';
      Alert.alert('Falló el ingreso', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>Whisper</ThemedText>
        <ThemedText style={styles.subtitle}>Ingresa para continuar</ThemedText>

        <View style={styles.form}>
          <ThemedText type="defaultSemiBold">Usuario</ThemedText>
          <TextInput
            style={[styles.input, { borderColor: inputBorderColor, color: inputTextColor }]}
            placeholder="Tu usuario"
            placeholderTextColor="#888"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <ThemedText type="defaultSemiBold">Contraseña</ThemedText>
          <TextInput
            style={[styles.input, { borderColor: inputBorderColor, color: inputTextColor }]}
            placeholder="********"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Entrar</ThemedText>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <ThemedText>¿No tienes cuenta? </ThemedText>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <ThemedText type="link">Regístrate</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  content: { padding: 24, gap: 16 },
  title: { textAlign: 'center', fontSize: 32 },
  subtitle: { textAlign: 'center', marginBottom: 20, opacity: 0.7 },
  form: { gap: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 }
});