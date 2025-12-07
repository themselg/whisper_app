import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, FlatList, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// const MOCK_CHATS = [
//   { id: '1', username: 'Soporte', lastMessage: 'Bienvenido a Whisper App', time: '10:00 AM' },
//   { id: '2', username: 'Haziel', lastMessage: '¿Ya terminaste el backend?', time: 'Yesterday' },
//   { id: '3', username: 'Yuliana', lastMessage: 'Reunión a las 5pm', time: 'Monday' },
// ];

export default function ChatsScreen() {
  const router = useRouter();

  const openChat = (userId: string, username: string) => {
    // Navegaremos a una ruta dinámica (la crearemos luego)
    // Pasamos el ID y el nombre como parámetros
    router.push({
      pathname: "/chat/[id]",
      params: { id: userId, name: username }
    });
  };

  const handleNewChat = () => {
    Alert.prompt(
      "Nuevo Chat",
      "Ingresa el ID o Usuario del destinatario:",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Chatear", 
          onPress: (text: string | undefined) => {
            if(text) openChat(text, text);
          }
        }
      ],
      "plain-text"
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Chats</ThemedText>
        <TouchableOpacity>
          <Ionicons name="search" size={24} color="#888" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={null}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.chatItem} 
            onPress={() => openChat(item.id, item.username)}
          >
            <View style={styles.avatar}>
              <ThemedText style={styles.avatarText}>
                {item.username.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
            <View style={styles.chatInfo}>
              <View style={styles.chatTop}>
                <ThemedText type="defaultSemiBold">{item.username}</ThemedText>
                <ThemedText style={styles.time}>{item.time}</ThemedText>
              </View>
              <ThemedText numberOfLines={1} style={styles.lastMessage}>
                {item.lastMessage}
              </ThemedText>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <ThemedText style={{textAlign: 'center', marginTop: 50, opacity: 0.5}}>
            No tienes chats activos
          </ThemedText>
        }
      />

      {/* Botón Flotante (FAB) */}
      <TouchableOpacity style={styles.fab} onPress={handleNewChat}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 52 : 72 },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    marginBottom: 20 
  },
  chatItem: { 
    flexDirection: 'row', alignItems: 'center', paddingVertical: 15, 
    borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150, 0.1)' 
  },
  avatar: { 
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#0a7ea4', 
    justifyContent: 'center', alignItems: 'center', marginRight: 15 
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  chatInfo: { flex: 1 },
  chatTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  time: { fontSize: 12, opacity: 0.5 },
  lastMessage: { opacity: 0.7 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    bottom: 22,
  }
});