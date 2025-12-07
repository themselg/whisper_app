import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Guarda un valor de forma segura en móviles o en localStorage en web.
 */
export const saveItem = async (key: string, value: string) => {
  try {
    if (Platform.OS === 'web') {
      // En web usamos localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } else {
      // En móvil usamos SecureStore
      await SecureStore.setItemAsync(key, value);
    }
  } catch (error) {
    console.error('Error guardando dato:', error);
    throw error;
  }
};

/**
 * Obtiene un valor guardado.
 */
export const getItem = async (key: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
      return null;
    } else {
      return await SecureStore.getItemAsync(key);
    }
  } catch (error) {
    console.error('Error obteniendo dato:', error);
    return null;
  }
};

/**
 * Elimina un valor guardado (Cerrar sesión).
 */
export const deleteItem = async (key: string) => {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (error) {
    console.error('Error eliminando dato:', error);
  }
};