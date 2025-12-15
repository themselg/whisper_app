import axios from 'axios';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import EventSource from "react-native-sse";
import { API_URL } from '../config/api';
import { authService } from './authService';

// --- INTERFACES DE DATOS ---

export interface ChatMessage {
  id?: string;
  content: string;
  senderId: string;
  recipientId: string;
  timestamp?: string;
  isRead?: boolean;
  type?: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';

  replyToId?: string;
  replyToName?: string;
  replyToText?: string;
  replyToType?: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';
}

export interface Conversation {
  contactId: string;
  username: string;
  email: string;
  lastMessage: string;
  timestamp: string;
  lastSenderId: string;
  unreadCount: number;
  displayName?: string;
  profilePicture?: string;
  lastMessageType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'; 
}

export interface UserSearchResult {
  id: string;
  username: string;
  email: string;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// --- TIPOS DE CALLBACKS (OBSERVADOR) ---
type MessageCallback = (senderId: string) => void;
type TypingCallback = (senderId: string, isTyping: boolean) => void;
type ReadReceiptCallback = (readerId: string) => void;
type UnreadCountCallback = (count: number) => void;
type ConnectionCallback = (isConnected: boolean) => void;
type UserStatusCallback = (onlineUserIds: Set<string>) => void;

class ChatService {
  private eventSource: EventSource<string> | null = null;
  
  // Listas de Suscriptores
  private messageListeners: MessageCallback[] = [];
  private typingListeners: TypingCallback[] = [];
  private readListeners: ReadReceiptCallback[] = [];
  private unreadCountListeners: UnreadCountCallback[] = [];
  private activeChatId: string | null = null;
  private currentUser: string | null = null;
  private connectionListeners: ConnectionCallback[] = [];

  private isConnected: boolean = true;
  private reconnectTimeout: any = null;
  private onlineUsers: Set<string> = new Set();
  private statusListeners: UserStatusCallback[] = [];
  

  // ==========================================
  //  MÉTODOS HTTP (REST)
  // ==========================================

  // 1. Enviar Mensaje
  async sendMessage(
      content: string, 
      recipientId: string, 
      type: string = 'TEXT', 
      replyTo?: { id: string, name: string, text: string, type: string } // <--- Nuevo argumento
  ) {
     const token = await authService.getToken();
     
     // Construimos el payload
     const payload: any = { content, recipientId, type };
     
     // Si hay respuesta, agregamos los campos
     if (replyTo) {
         payload.replyToId = replyTo.id;
         payload.replyToName = replyTo.name;
         payload.replyToText = replyTo.text;
         payload.replyToType = replyTo.type;
     }

     const res = await axios.post(`${API_URL}/api/chat/send`, 
        payload,
        { headers: { Authorization: `Bearer ${token}` }}
     );
    return res.data;
  }

  async uploadFile(uri: string, type: string): Promise<string | null> {
    const token = await authService.getToken();
    if (!token) return null;

    let finalUri = uri;
    if (Platform.OS === 'android' && !finalUri.startsWith('file://')) {
        finalUri = `file://${finalUri}`;
    }

    let filename = finalUri.split('/').pop();
    const extension = type.split('/')[1] || 'jpg';
    if (filename && !filename.includes('.')) {
        filename = `${filename}.${extension}`;
    }

    const formData = new FormData();
    formData.append('file', {
      uri: finalUri,
      name: filename,
      type: type || 'image/jpeg',
    } as any);

    try {
      //console.log(`📤 [Fetch] Subiendo a: ${API_URL}/api/files/upload`);

      const response = await fetch(`${API_URL}/api/files/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const json = await response.json();

      if (!response.ok) {
        //console.error("❌ Error Servidor:", response.status, json);
        return null;
      }

      //console.log("✅ Subida exitosa:", json.url);
      return json.url;

    } catch (e: any) {
      //console.error("❌ Error de Red (Fetch):", e.message);
      return null;
    }
  }
  
  // 2. Obtener Historial
  async getMessages(contactId: string) {
    const token = await authService.getToken();
    if (!token) return [];
    try {
      const res = await axios.get<ChatMessage[]>(`${API_URL}/api/chat/history/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    } catch (e) { return []; }
  }

  // 3. Obtener Lista de Conversaciones (Inbox)
  async getConversations() {
    const token = await authService.getToken();
    if (!token) return [];
    try {
      const res = await axios.get<Conversation[]>(`${API_URL}/api/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    } catch (e) { 
      //console.error("Error cargando conversaciones", e);
      return []; 
    }
  }

  // 4. Buscar Usuario por Username
  async findUserByUsername(username: string): Promise<UserSearchResult | null> {
    const token = await authService.getToken();
    if (!token) return null;
    try {
      const res = await axios.get<UserSearchResult>(`${API_URL}/api/users/search/${username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    } catch (e) {
      return null;
    }
  }

  // 5. Enviar Señal "Escribiendo..."
  async sendTypingSignal(recipientId: string, isTyping: boolean) {
    const token = await authService.getToken();
    if (!token) return;

    axios.post(`${API_URL}/api/chat/typing`, 
      { recipientId, typing: isTyping }, 
      { headers: { Authorization: `Bearer ${token}` }}
    ).catch(e => console.log("Error typing signal", e.message));
  }

  // 6. Marcar mensajes como Leídos
  async markAsRead(contactId: string) {
    const token = await authService.getToken();
    if (!token) return;

    axios.post(`${API_URL}/api/chat/read/${contactId}`, 
      {}, 
      { headers: { Authorization: `Bearer ${token}` }}
    ).catch(e => console.log("Error marking read", e.message));
  }

  notifyUnreadCount(count: number) {
    this.unreadCountListeners.forEach(cb => cb(count));
  }

  setActiveChat(chatId: string | null) {
    this.activeChatId = chatId;
  }

  public setConnectionStatus(isConnected: boolean) {
    if (this.isConnected === isConnected) return;

    this.notifyConnectionStatus(isConnected);

    if (!isConnected) {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        if (!this.reconnectTimeout) {
            this.reconnectTimeout = setTimeout(() => {
                //console.log("Axios reportó error. Reintentando conexión...");
                this.connect();
            }, 3000);
        }
    }
  }

  // ==========================================
  //  GESTIÓN DE SUSCRIPTORES
  // ==========================================

  subscribeToMessages(callback: MessageCallback) {
    this.messageListeners.push(callback);
    return () => { this.messageListeners = this.messageListeners.filter(cb => cb !== callback); };
  }

  subscribeToTyping(callback: TypingCallback) {
    this.typingListeners.push(callback);
    return () => { this.typingListeners = this.typingListeners.filter(cb => cb !== callback); };
  }

  subscribeToReadReceipts(callback: ReadReceiptCallback) {
    this.readListeners.push(callback);
    return () => { this.readListeners = this.readListeners.filter(cb => cb !== callback); };
  }

  subscribeToUnreadCount(callback: UnreadCountCallback) {
    this.unreadCountListeners.push(callback);
    return () => {
      this.unreadCountListeners = this.unreadCountListeners.filter(cb => cb !== callback);
    };
  }

  subscribeToConnectionStatus(cb: ConnectionCallback) {
    this.connectionListeners.push(cb);
    cb(this.isConnected);
    return () => { this.connectionListeners = this.connectionListeners.filter(c => c !== cb); };
  }

  private notifyConnectionStatus(status: boolean) {
    if (this.isConnected !== status) {
        this.isConnected = status;
        //console.log(status ? "Conexión Restaurada" : "Conexión Perdida");
        this.connectionListeners.forEach(cb => cb(status));
    }
  }

  // subscribeToUserStatus(cb: UserStatusCallback) {
  //   this.statusListeners.push(cb);
  //   cb(new Set(this.onlineUsers));
  //   return () => { this.statusListeners = this.statusListeners.filter(c => c !== cb); };
  // }

  // isUserOnline(userId: string): boolean {
  //   return this.onlineUsers.has(userId);
  // }

  // ==========================================
  //  CONEXIÓN SSE (PERSISTENTE)
  // ==========================================
  
  async connect() {
    if (this.eventSource && (this.eventSource as any).readyState === 1) {
        return;
    }

    const token = await authService.getToken();
    this.currentUser = await authService.getUsername();

    //console.log( `[${this.currentUser}] Iniciando conexión Global...`);
    authService.requestNotificationPermission();

    this.eventSource = new EventSource<string>(`${API_URL}/api/stream/subscribe?token=${token}`, {
      headers: { Authorization: `Bearer ${token}` },
      pollingInterval: 0, 
    });

    // 1. EVENTO: Lista Inicial
    // this.eventSource.addEventListener("ONLINE_LIST", (event: any) => {
    //     try {
    //         const ids = JSON.parse(event.data);
    //         this.onlineUsers = new Set(ids);
    //         this.notifyStatusListeners();
    //     } catch (e) { console.error(e); }
    // });

    // 2. EVENTO: Cambio de Estado
    // this.eventSource.addEventListener("USER_STATUS", (event: any) => {
    //     try {
    //         const { userId, isOnline } = JSON.parse(event.data);
    //         if (isOnline) {
    //             this.onlineUsers.add(userId);
    //         } else {
    //             this.onlineUsers.delete(userId);
    //         }
    //         this.notifyStatusListeners();
    //     } catch (e) { console.error(e); }
    // });

    // --- EVENTO: NUEVO MENSAJE ---
    this.eventSource.addEventListener("NEW_MESSAGE", (event: any) => {
        try {
            // Estructura esperada: { senderId: "...", username: "...", content: "...", type: "IMAGE" }
            const payload = JSON.parse(event.data); 
            
            const senderId = payload.senderId;
            const username = payload.username;
            const content = payload.content;
            // CAMBIO 2: Capturamos el tipo si viene en el evento (default TEXT)
            const type = payload.type || 'TEXT'; 

            if (senderId) {
                //console.log(`[SSE] Mensaje (${type}) de: ${username}`);
                
                this.messageListeners.forEach(cb => cb(senderId));

                if (this.activeChatId !== senderId) {
                    this.triggerLocalNotification(senderId, username, content, type);
                }
            }
        } catch (e) {
            //console.error("Error parseando NEW_MESSAGE", e);
        }
    });

    // --- EVENTO: ESCRIBIENDO ---
    this.eventSource.addEventListener("TYPING", (event: any) => {
        try {
            const data = JSON.parse(event.data);
            const isTypingValue = (data.typing !== undefined) ? data.typing : data.isTyping;
            this.typingListeners.forEach(cb => cb(data.senderId, isTypingValue));
        } catch (e) { 
          //console.error("Error SSE Typing", e); 
        }
    });

    // --- EVENTO: LEÍDO ---
    this.eventSource.addEventListener("READ_RECEIPT", (event: any) => {
        const readerId = event.data;
        if (readerId) {
            //console.log(`[${this.currentUser}] Leído por: ${readerId}`);
            this.readListeners.forEach(cb => cb(readerId));
        }
    });

    this.eventSource.addEventListener("open", () => {
      //console.log(`[${this.currentUser}] Conexión establecida.`);
      this.notifyConnectionStatus(true);
    });

    this.eventSource.addEventListener("error", (err) => {
      //console.log(`[${this.currentUser}] Reconectando...`, err);
      this.notifyConnectionStatus(false);
      if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
      }

      if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = setTimeout(() => {
          //console.log("Reintentando conexión...");
          this.connect();
      }, 3000);
    });
  }

  private async triggerLocalNotification(senderId: string, username: string, content: string, type: string = 'TEXT') {
    try {
        let bodyText = content;

        // Si es multimedia, mostramos un texto amigable en la notificación en vez de la URL
        switch(type) {
            case 'IMAGE': bodyText = '📷 Imagen'; break;
            case 'VIDEO': bodyText = '🎥 Video'; break;
            case 'AUDIO': bodyText = '🎵 Nota de voz'; break;
            case 'DOCUMENT': bodyText = '📄 Documento'; break;
            // TEXT se queda igual
        }

        await Notifications.scheduleNotificationAsync({
            content: {
                title: username,
                body: bodyText,
                data: { senderId },
                sound: 'default',
            },
            trigger: null,
        });
    } catch (e) { 
        //console.log("Error notificación local", e); 
    }
  }

  // private notifyStatusListeners() {
  //   const copy = new Set(this.onlineUsers);
  //   this.statusListeners.forEach(cb => cb(copy));
  // }

  disconnect() {
    if (this.eventSource) {
      // console.log(`[${this.currentUser}] Desconectando Global.`);
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

export const chatService = new ChatService();