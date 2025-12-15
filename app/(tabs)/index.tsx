import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { authService } from '@/services/authService';
import { chatService, Conversation } from '@/services/chatService';

export default function ChatsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  
  // CONFIGURACIÓN DE COLORES NATIVOS
  const isIOS = Platform.OS === 'ios';
  const isDark = colorScheme === 'dark';
  
  const iosBlue = isDark ? '#0088FF' : '#007AFF';
  const primaryColor = isIOS ? iosBlue : '#0a7ea4';

  const itemBorderColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)';
  const chevronColor = isDark ? '#3a3a3c' : '#c7c7cc'; 
  
  const screenBackgroundColor = (isIOS && isDark) ? '#000000' : undefined;
  const androidBannerBg = isDark ? '#1f1f1f' : '#eef4f8'; 
  // -----------------------------------------------------------------

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const [promptVisible, setPromptVisible] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isMounted = useRef(true);

  // --- LÓGICA DE CONEXIÓN ---
  useEffect(() => {
    const unsubscribe = chatService.subscribeToConnectionStatus((isConnected) => {
      if (isConnected) {
        //console.log("[Index] Conexión recuperada. Actualizando lista...");
        loadConversations(false); 
      }
    });
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // --- LÓGICA AL ENFOCAR PANTALLA ---
  useFocusEffect(
    useCallback(() => {
      loadConversations(false);
      
      const unsubscribeMessages = chatService.subscribeToMessages((senderId) => {
          //console.log("[Index] Nuevo mensaje. Actualizando orden...");
          loadConversations(false);
      });
      
      chatService.setActiveChat(null); 
      
      return () => unsubscribeMessages();
    }, [])
  );

  const loadConversations = async (showLoading = true) => {
    // Solo ponemos loading si el componente sigue vivo
    if (showLoading && isMounted.current) setLoading(true);
    
    try {
        if (!myUserId) {
             const id = await authService.getCurrentUserId();
             // Check isMounted
             if (isMounted.current) setMyUserId(id);
        }
        
        const data = await chatService.getConversations();
        
        // Check isMounted antes de actualizar la lista
        if (isMounted.current) {
            setConversations(data);
            const totalUnread = data.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
            chatService.notifyUnreadCount(totalUnread);
        }
    } catch (error) {
        //console.error("Error cargando chats:", error);
    } finally {
        // Check isMounted crítico para evitar loop de carga
        if (isMounted.current) setLoading(false);
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations(false);
    if (isMounted.current) setRefreshing(false);
  };

  const openChat = (userId: string, username: string) => {
    router.push({
      pathname: "/chat/[id]",
      params: { id: userId, name: username }
    });
  };

  const initiateChatSearch = async (usernameToFind: string) => {
    setPromptVisible(false);
    if (!usernameToFind.trim()) return;
    
    if (isMounted.current) setIsSearching(true);
    
    const user = await chatService.findUserByUsername(usernameToFind.trim());
    
    // Si el usuario cerró la app o cambió de pantalla mientras buscaba, no hacemos nada
    if (!isMounted.current) return;

    setIsSearching(false);
    setPromptVisible(false);
    setSearchUsername('');

    if (user) {
      openChat(user.id, user.username);
    } else {
      if (Platform.OS === 'android') {
        setErrorMessage("Usuario no encontrado.");
        setErrorVisible(true);
      } else {
        Alert.alert("Error", "Usuario no encontrado.");
      }
    }
  };

  const handleNewChat = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Nuevo Chat',
        'Ingresa el nombre de usuario',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Buscar', onPress: (text?: string) => { if (text) initiateChatSearch(text); } },
        ],
        'plain-text'
      );
    } else {
      setPromptVisible(true);
    }
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessagePreview = (content: string, type?: string) => {
    switch (type) {
      case 'IMAGE': return '📷 Imagen';
      case 'VIDEO': return '🎥 Video';
      case 'AUDIO': return '🎵 Nota de voz';
      case 'DOCUMENT': return '📄 Documento';
      case 'TEXT':
      default: return content;
    }
  };

  return (
    <ThemedView style={[styles.container, screenBackgroundColor && { backgroundColor: screenBackgroundColor }]}>
      
      {/* HEADER CON LÓGICA BANNER PARA ANDROID */}
      <View style={[
        styles.header,
        // Si es Android, aplicamos estilos de "Banner" MD3
        !isIOS && {
          backgroundColor: androidBannerBg,
          marginHorizontal: -20,
          marginTop: -52,
          paddingTop: 50,
          paddingHorizontal: 20,
          paddingBottom: 24,
          marginBottom: 15
        }
      ]}>
        <ThemedText type="title" style={!isIOS && { fontSize: 28 }}>Chats</ThemedText>
        
        {isIOS && (
          <TouchableOpacity onPress={handleNewChat}>
            <Ionicons name='create-outline' size={24} color={primaryColor} />
          </TouchableOpacity> 
        )}
      </View>

      {isSearching && (
        <View style={styles.searchingOverlay}>
          <ActivityIndicator size="large" color={primaryColor} />
          <ThemedText style={{marginTop: 10, fontWeight:'bold', color: '#fff'}}>Buscando...</ThemedText>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.contactId}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openChat(item.contactId, item.displayName || item.username)}
              style={({ pressed }) => [
                styles.chatItem,
                { borderColor: itemBorderColor, opacity: pressed ? 0.7 : 1 }
              ]}
              android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            >
              {/* AVATAR */}
              <View style={styles.avatarContainer}>
                {item.profilePicture ? (
                  <Image source={{ uri: item.profilePicture }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: primaryColor }]}>
                    <ThemedText style={styles.avatarText}>
                      {(item.displayName || item.username).charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                )}
              </View>
              
              <View style={styles.chatInfo}>
                <View style={styles.chatTop}>
                  <ThemedText type="defaultSemiBold" style={styles.usernameText}>
                    {item.displayName || item.username}
                  </ThemedText>
                  <ThemedText style={styles.time}>{formatTime(item.timestamp)}</ThemedText>
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, flexDirection: 'row', marginRight: 10 }}>
                     <ThemedText 
                        numberOfLines={1} 
                        style={[
                            styles.lastMessage, 
                            item.unreadCount > 0 
                              ? { fontWeight: '600', color: isDark ? '#fff' : '#000' }
                              : { color: '#888' },
                            (item.lastMessageType && item.lastMessageType !== 'TEXT') ? { fontStyle: 'italic' } : {}
                        ]}
                      >
                        {item.lastSenderId === myUserId ? 'Tú: ' : ''}
                        {getMessagePreview(item.lastMessage, item.lastMessageType)}
                      </ThemedText>
                  </View>

                  {item.unreadCount > 0 && (
                    <View style={[styles.unreadBadge, { backgroundColor: primaryColor }]}>
                      <ThemedText style={styles.unreadText}>
                        {item.unreadCount > 99 ? '99+' : item.unreadCount}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>

              {isIOS && (
                <Ionicons name="chevron-forward" size={20} color={chevronColor} style={{ marginLeft: 8 }} />
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <ThemedText style={{textAlign: 'center', marginTop: 50, opacity: 0.5}}>
              No tienes chats activos
            </ThemedText>
          }
        />
      )}

      {/* MODAL ANDROID */}
      {Platform.OS === 'android' && (
        <Modal
          transparent
          visible={promptVisible}
          onRequestClose={() => setPromptVisible(false)}
          animationType="fade">
          <View style={styles.modalOverlay}>
            <ThemedView style={styles.modalView}>
              <ThemedText type="subtitle">Nuevo Chat</ThemedText>
              <ThemedText style={styles.modalText}>Ingresa el nombre de usuario</ThemedText>
              <TextInput
                style={[styles.input, { color: isDark ? '#fff' : '#000', borderColor: '#888' }]}
                value={searchUsername}
                onChangeText={setSearchUsername}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setPromptVisible(false)} style={styles.button}>
                  <ThemedText>Cancelar</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => initiateChatSearch(searchUsername)} style={[styles.button, { backgroundColor: primaryColor }]}>
                  <ThemedText style={{ color: '#fff' }}>Buscar</ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </View>
        </Modal>
      )}

      {/* ERROR MODAL ANDROID */}
      {Platform.OS === 'android' && (
        <Modal
          transparent
          visible={errorVisible}
          onRequestClose={() => setErrorVisible(false)}
          animationType="fade">
          <View style={styles.modalOverlay}>
            <ThemedView style={styles.modalView}>
              <ThemedText type="subtitle">Error</ThemedText>
              <ThemedText style={styles.modalText}>{errorMessage}</ThemedText>
              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setErrorVisible(false)} style={[styles.button, { backgroundColor: primaryColor }]}>
                  <ThemedText style={{ color: '#fff' }}>Aceptar</ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </View>
        </Modal>
      )}

      {/* FAB ANDROID */}
      {Platform.OS === 'android' && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: primaryColor }]} onPress={handleNewChat} activeOpacity={0.8}>
          <MaterialCommunityIcons name="pencil" size={26} color="#fff" />
        </TouchableOpacity>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 52 : 72 },
  searchingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10, justifyContent: 'center', alignItems: 'center' },
  chatItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    paddingHorizontal: 0,
    borderBottomWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 0, 
  },
  
  avatarContainer: { marginRight: 15 },
  avatarImage: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  
  chatInfo: { flex: 1 },
  chatTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  
  time: { fontSize: 12, opacity: 0.5 },
  lastMessage: { opacity: 0.7, flex: 1, marginRight: 10 },
  usernameText: { fontSize: 17, fontWeight: Platform.OS === 'ios' ? '600' : 'bold' },
  
  unreadBadge: { borderRadius: 12, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  
  fab: { 
    position: 'absolute', right: 24, bottom: 24, 
    width: 56, height: 56, borderRadius: 16, 
    justifyContent: 'center', alignItems: 'center', 
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, 
  },
  
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { margin: 20, borderRadius: 20, padding: 25, alignItems: 'stretch', width: '85%', elevation: 5, shadowOpacity: 0.25, shadowRadius: 4 },
  modalText: { marginBottom: 15, opacity: 0.8 },
  input: { height: 40, marginBottom: 20, borderWidth: 1, padding: 10, borderRadius: 8 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  button: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
});