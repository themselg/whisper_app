import axios from 'axios';
import { API_URL } from '../config/api';
import { authService } from './authService';

export interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  profilePicture?: string;
  email: string;
}

export const userService = {
  // Obtener perfil de OTRO usuario
  getUserById: async (id: string) => {
    const token = await authService.getToken();
    if (!token) return null;
    try {
      const res = await axios.get<UserProfile>(`${API_URL}/api/users/id/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    } catch (e) {
      //console.error("Error obteniendo usuario", e);
      return null;
    }
  },

  // Actualizar MI perfil
  updateProfile: async (displayName: string, base64Image?: string | null) => {
    const token = await authService.getToken();
    if (!token) return;
    try {
      await axios.put(`${API_URL}/api/users/profile`, 
        { displayName, profilePicture: base64Image }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (e) {
      //console.error("Error actualizando perfil", e);
      throw e;
    }
  }
};