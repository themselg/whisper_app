import { Client, IMessage } from '@stomp/stompjs';
import { WS_URL } from '../config/api';
import { authService } from './authService';

// --- 1. Definición de Tipos (Espejo de tus Modelos Java) ---

// Espejo de: io.themselg.whisper_api.models.ChatMessage.MessageType
export enum MessageType {
  CHAT = 'CHAT',
  JOIN = 'JOIN',
  LEAVE = 'LEAVE'
}

// Espejo de: io.themselg.whisper_api.models.ChatMessage
export interface ChatMessage {
  type: MessageType;
  content: string;
  senderId: string;
  recipientId: string;
}

// --- 2. Implementación del Servicio WebSocket ---

class ChatService {
  private client: Client | null = null;
  private onMessageCallback: (msg: ChatMessage) => void = () => {};

  /**
   * Conecta al WebSocket usando STOMP.
   * Endpoint Backend: /ws
   */
  async connect(onMessageReceived: (msg: ChatMessage) => void) {
    this.onMessageCallback = onMessageReceived;
    
    // Obtenemos el token JWT para autenticar la conexión
    const token = await authService.getToken(); 
    const userId = await authService.getCurrentUserId();

    if (!token || !userId) {
      console.error("No se puede conectar al chat sin token o userId");
      return;
    }

    this.client = new Client({
      brokerURL: WS_URL,
      connectHeaders: {
        Authorization: `Bearer ${token}`, 
      },
      debug: (str) => {
        // console.log('STOMP Debug:', str);
      },
      // React Native requiere esto para manejar frames binarios correctamente
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      
      onConnect: () => {
        console.log('🔗 Conectado al WebSocket exitosamente');
        this.subscribeToPrivateMessages();
      },
      
      onStompError: (frame) => {
        console.error('❌ Error en Broker STOMP: ' + frame.headers['message']);
        console.error('Detalles: ' + frame.body);
      },

      onWebSocketClose: () => {
        console.log('🔌 Conexión WebSocket cerrada');
      }
    });

    this.client.activate();
  }

  /**
   * Se suscribe a la cola privada del usuario.
   * Spring traduce 'convertAndSendToUser' a '/user/queue/messages' para el cliente.
   *
   */
  private subscribeToPrivateMessages() {
    if (!this.client || !this.client.connected) return;

    this.client.subscribe('/user/queue/messages', (message: IMessage) => {
      if (message.body) {
        const parsedMessage: ChatMessage = JSON.parse(message.body);
        this.onMessageCallback(parsedMessage);
      }
    });
  }

  /**
   * Envía un mensaje al servidor.
   * Destination: /app/chat.sendMessage (Prefijo /app + Mapping en Controller)
   *
   */
  async sendMessage(content: string, recipientId: string) {
    if (!this.client || !this.client.connected) {
      console.warn("⚠️ Intento de enviar mensaje sin conexión");
      return;
    }

    const senderId = await authService.getCurrentUserId();

    if (!senderId) {
      console.error("No se encontró ID del remitente");
      return;
    }

    const chatMessage: ChatMessage = {
      senderId: senderId,
      recipientId: recipientId,
      content: content,
      type: MessageType.CHAT
    };

    this.client.publish({
      destination: '/app/chat.sendMessage',
      body: JSON.stringify(chatMessage),
    });
  }

  async disconnect() {
    if (this.client) {
      await this.client.deactivate();
      this.client = null;
      console.log('Desconectado del chat');
    }
  }
}

export const chatService = new ChatService();