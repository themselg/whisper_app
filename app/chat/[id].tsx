import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { authService } from '@/services/authService';
import { ChatMessage, chatService, MessageType } from '@/services/chatService';

export default function ChatScreen() {
  const { id, name } = useLocalSearchParams<{ id: string, name: string }>(); // Recibimos el ID y Nombre del otro usuario
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setupChat();
    
    // Al salir de la pantalla, nos desconectamos
    return () => {
      chatService.disconnect();
    };
  }, []);

  const setupChat = async () => {
    // 1. Obtenemos nuestro propio ID para saber qué mensajes son míos (alinearlos a la derecha)
    const userId = await authService.getCurrentUserId();
    setMyUserId(userId);

    // 2. Conectamos al WebSocket
    await chatService.connect((newMessage) => {
      // Callback cuando llega un mensaje del servidor
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      scrollToBottom();
    });

    setIsConnecting(false);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !id) return;

    const content = inputText.trim();
    setInputText(''); // Limpiamos input inmediatamente para buena UX

    try {
      // Enviamos al backend
      await chatService.sendMessage(content, id);

      if (myUserId) {
        const optimisticMessage: ChatMessage = {
          type: MessageType.CHAT,
          content: content,
          senderId: myUserId,
          recipientId: id,
        };
        setMessages((prev) => [...prev, optimisticMessage]);
        scrollToBottom();
      }
    } catch (error) {
      console.error("Error enviando mensaje", error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMyMessage = item.senderId === myUserId;

    return (
      <View style={[
        styles.messageBubble,
        isMyMessage ? styles.myMessage : styles.otherMessage
      ]}>
        <ThemedText style={[
          styles.messageText, 
          isMyMessage ? styles.myMessageText : null
        ]}>
          {item.content}
        </ThemedText>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Configuramos el título de la barra superior dinámicamente */}
      <Stack.Screen options={{ title: name || `Chat con ${id}` }} />

      {isConnecting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0a7ea4" />
          <ThemedText>Conectando...</ThemedText>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={scrollToBottom} // Auto-scroll al recibir mensajes
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="#888"
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Ionicons name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    alignItems: 'center', padding: 10, backgroundColor: 'rgba(255,255,255,0.8)'
  },
  messagesList: { padding: 16, gap: 10, paddingBottom: 20 },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 4,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#0a7ea4',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#e5e5ea', // Gris claro clásico de chats
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 16, color: '#000' },
  myMessageText: { color: '#fff' },
  
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#0a7ea4',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});