import { authService } from '@/services/authService';
import { chatService } from '@/services/chatService';
import axios from 'axios';
import { router } from 'expo-router';

export const setupAxiosInterceptors = () => {
  axios.interceptors.response.use(
    (response) => {
      // Si una petición tiene éxito, asumimos que hay conexión.
      // Esto ayuda a quitar la pantalla de carga automáticamente si el internet vuelve.
      chatService.setConnectionStatus(true);
      return response;
    },
    async (error) => {
      // 1. Error de Red (Servidor inalcanzable)
      if (!error.response) {
        //console.log("[Axios] Network Error - Servidor inalcanzable");
        chatService.setConnectionStatus(false);
        return Promise.reject(error);
      }

      // 2. Errores de Servidor (500, 502, 503, 504)
      if (error.response.status >= 500) {
        //console.log("[Axios] Server Error", error.response.status);
        chatService.setConnectionStatus(false);
        return Promise.reject(error);
      }

      // 3. Error 401 (Token vencido) - Este NO debe mostrar la pantalla de "Sin Conexión"
      // Debe redirigir al login (lógica que ya tenías)
      if (error.response.status === 401) {
        console.error("[Axios] Sesión expirada (401).");
        await authService.logout();
        chatService.disconnect(); 
        
        if (router.canDismiss()) {
            router.dismissAll();
        }
        router.replace('/login');
      }

      return Promise.reject(error);
    }
  );
};