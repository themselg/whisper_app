import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { LogBox, View } from 'react-native'; // Importamos View
import 'react-native-reanimated';

import { ConnectionOverlay } from '@/components/connection-overlay'; // <--- Importamos componente
import { setupAxiosInterceptors } from '@/config/axiosConfig';
import { authService } from '@/services/authService';
import { chatService } from '@/services/chatService';

// Ignorar warnings
LogBox.ignoreLogs(['expo-notifications:']);

setupAxiosInterceptors();
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const [loaded] = useFonts({});

  // ESTADO PARA LA CONEXIÓN
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      checkAuthAndConnect();
    }
  }, [loaded]);

  const checkAuthAndConnect = async () => {
    try {
      const token = await authService.getToken();
      if (token) {
        chatService.connect();
        authService.requestNotificationPermission();
      } else {
        router.replace('/login');
      }
    } catch (error) {
      router.replace('/login');
    }
  };

  useEffect(() => {
    const unsubscribe = chatService.subscribeToConnectionStatus((connected) => {
      setIsConnected(connected);
    });
    return () => unsubscribe();
  }, []);

  if (!loaded) return null;

  return (
    <View style={{ flex: 1 }}> 
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: true }} />
      </Stack>

      {!isConnected && <ConnectionOverlay />}
    </View>
  );
}