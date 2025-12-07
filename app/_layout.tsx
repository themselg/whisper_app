import { Stack } from 'expo-router';
import 'react-native-reanimated';

import { authService } from '@/services/authService';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';


// Polyfills para STOMP en React Native
import { TextDecoder, TextEncoder } from 'text-encoding';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Evita que el splash screen se oculte antes de tiempo si estás cargando fuentes
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({}); // No fonts to load
  
  const router = useRouter();
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      checkAuth();
    }
  }, [loaded]);

  // --- LÓGICA DE PROTECCIÓN ---
  const checkAuth = async () => {
    try {
      const token = await authService.getToken();
      // Si NO hay token, mandamos al Login
      if (!token) {
        router.replace('/login');
      } 
      // Si HAY token, dejamos que fluya (por defecto irá a /(tabs))
    } catch (error) {
      console.log("Error verificando auth", error);
      router.replace('/login');
    }
  };

  if (!loaded) {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* Agregamos login y register al Stack para que existan como rutas navegables */}
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Crear Cuenta' }} />
    </Stack>
  );
}
