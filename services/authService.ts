import axios from 'axios';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Alert, Linking, Platform } from 'react-native';
import { API_URL } from '../config/api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
  role?: string[];
  displayName?: string;
  profilePicture?: string;
}

export interface AuthResponse {
  token: string;
  type: string;
  id: string;
  username: string;
  email: string;
  roles: string[];
}

export interface MessageResponse {
  message: string;
}


// Claves de almacenamiento
const TOKEN_KEY = 'user_token';
const USER_ID_KEY = 'user_id';
const USERNAME_KEY = 'username';
const EMAIL_KEY = 'user_email';

export const authService = {

  login: async (creds: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await axios.post<AuthResponse>(`${API_URL}/api/auth/signin`, creds);
      const data = response.data;

      if (data.token) {
        await SecureStore.setItemAsync(TOKEN_KEY, data.token);
        await SecureStore.setItemAsync(USER_ID_KEY, data.id);
        await SecureStore.setItemAsync(USERNAME_KEY, data.username);
        await SecureStore.setItemAsync(EMAIL_KEY, data.email);
      }

      return data;
    } catch (error) {
      //console.error('Error en login:', error);
      throw error;
    }
  },

  register: async (userData: SignupRequest): Promise<MessageResponse> => {
    const response = await axios.post<MessageResponse>(`${API_URL}/api/auth/signup`, userData);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_ID_KEY);
    await SecureStore.deleteItemAsync(USERNAME_KEY);
    await SecureStore.deleteItemAsync(EMAIL_KEY);
  },

  getToken: async (): Promise<string | null> => {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },
  
  getCurrentUserId: async (): Promise<string | null> => {
    return await SecureStore.getItemAsync(USER_ID_KEY);
  },

  getUserEmail: async (): Promise<string | null> => {
    return await SecureStore.getItemAsync(EMAIL_KEY);
  },

  getUsername: async (): Promise<string | null> => {
    return await SecureStore.getItemAsync(USERNAME_KEY);
  },

  requestNotificationPermission: async () => {
    if (Platform.OS === 'web') return;

    const currentUser = await authService.getUsername();
    if (!currentUser) return;
    
    try {
      // 1. Verificar estado actual
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      // 2. Si no está concedido, pedirlo explícitamente
      if (existingStatus !== 'granted') {
        //console.log("Pidiendo permiso de notificaciones...");
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }
      
      // 3. Si el usuario dijo que NO anteriormente, avisarle
      if (finalStatus !== 'granted') {
        //console.log("Permiso denegado en iOS");
        // Opcional: Mostrar alerta para ir a ajustes
        Alert.alert(
          "Permisos requeridos",
          "Para recibir notificaciones de mensajes, activa los permisos en Configuración.",
          [
            { text: "Cancelar", style: "cancel" },
            { text: "Ir a Configuración", onPress: () => Linking.openSettings() }
          ]
        ); 
        return;
      }

    } catch (error) {
      //console.log("Error pidiendo permisos:", error);
    }
  }
};