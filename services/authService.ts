import axios from 'axios';
import { API_URL } from '../config/api';
import { deleteItem, getItem, saveItem } from './storage';

// --- 1. Definición de Tipos (Interfaces espejo del Backend) ---

// Espejo de: io.themselg.whisper_api.payload.request.LoginRequest
export interface LoginRequest {
  username: string;
  password: string;
}

// Espejo de: io.themselg.whisper_api.payload.request.SignupRequest
export interface SignupRequest {
  username: string;
  email: string;
  password: string;
  role?: string[]; 
}

// Espejo de: io.themselg.whisper_api.payload.response.JwtResponse
export interface AuthResponse {
  token: string;
  type: string;
  id: string;
  username: string;
  email: string;
  roles: string[];
}

// Espejo de: io.themselg.whisper_api.payload.response.MessageResponse
export interface MessageResponse {
  message: string;
}

// --- 2. Implementación del Servicio ---

// Claves para guardar en el almacenamiento seguro del dispositivo
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
        // USA EL NUEVO HELPER AQUÍ:
        await saveItem(TOKEN_KEY, data.token);
        await saveItem(USER_ID_KEY, data.id);
        await saveItem(USERNAME_KEY, data.username);
        await saveItem(EMAIL_KEY, data.email);
      }

      return data;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  },

  register: async (userData: SignupRequest): Promise<MessageResponse> => {
    // ... (igual que antes) ...
    const response = await axios.post<MessageResponse>(`${API_URL}/api/auth/signup`, userData);
    return response.data;
  },

  logout: async (): Promise<void> => {
    // USA EL NUEVO HELPER AQUÍ:
    await deleteItem(TOKEN_KEY);
    await deleteItem(USER_ID_KEY);
    await deleteItem(USERNAME_KEY);
    await deleteItem(EMAIL_KEY);
  },

  getToken: async (): Promise<string | null> => {
    return await getItem(TOKEN_KEY);
  },
  
  getCurrentUserId: async (): Promise<string | null> => {
    return await getItem(USER_ID_KEY);
  },

  getUserEmail: async (): Promise<string | null> => {
    return await getItem(EMAIL_KEY);
  },

  getUserName: async (): Promise<string | null> => {
    return await getItem(USERNAME_KEY);
  }
};

