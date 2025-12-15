import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { Audio, ResizeMode, Video } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import ImageViewing from 'react-native-image-viewing';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_URL } from '@/config/api';
import { authService } from '@/services/authService';
import { ChatMessage, chatService } from '@/services/chatService';
import { userService } from '@/services/userService';

// ==========================================
// SUB-COMPONENTES
// ==========================================

// 1. Mensaje Animado
const AnimatedMessageBubble = ({ children, shouldAnimate = true }: { children: React.ReactNode, shouldAnimate?: boolean }) => {
  const fadeAnim = useRef(new Animated.Value(shouldAnimate ? 0 : 1)).current;
  const slideAnim = useRef(new Animated.Value(shouldAnimate ? 20 : 0)).current;

  useEffect(() => {
    if (shouldAnimate) {
      Animated.parallel([
        Animated.timing(fadeAnim, { 
          toValue: 1, 
          duration: 300,
          useNativeDriver: true, 
          easing: Easing.out(Easing.quad) 
        }),
        Animated.timing(slideAnim, { 
          toValue: 0, 
          duration: 300, 
          useNativeDriver: true, 
          easing: Easing.out(Easing.back(1.5)) 
        }),
      ]).start();
    }
  }, [shouldAnimate]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
};

// 2. Burbuja de Video
const VideoBubble = ({ url, isMyMessage }: { url: string, isMyMessage: boolean }) => {
  const video = useRef<Video>(null);
  const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;

  return (
    <View style={{ marginTop: 4, marginBottom: 4 }}>
      <Video
        ref={video}
        style={{ width: 220, height: 160, borderRadius: 12, backgroundColor: '#000' }}
        source={{ uri: fullUrl }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        isLooping={false}
      />
    </View>
  );
};

// 3. Swipeable Message
const SwipeableMessage = ({ children, onReply, isMyMessage, primaryColor }: { children: React.ReactNode, onReply: () => void, isMyMessage: boolean, primaryColor: string }) => {
  const swipeableRef = useRef<Swipeable>(null);

  const renderLeftActions = (progress: any, dragX: any) => {
    const scale = dragX.interpolate({ inputRange: [0, 40], outputRange: [0, 1], extrapolate: 'clamp' });
    return (
      <View style={{ justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 20, width: 80 }}>
        <Animated.View style={{ transform: [{ scale }] }}>
            {Platform.OS === 'ios' 
             ? <Ionicons name="arrow-undo-circle" size={32} color={primaryColor} />
             : <MaterialCommunityIcons name="reply-circle" size={32} color={primaryColor} />}
        </Animated.View>
      </View>
    );
  };
  return (
    <Swipeable ref={swipeableRef} friction={2} leftThreshold={40} overshootLeft={false} renderLeftActions={renderLeftActions} onSwipeableOpen={() => { onReply(); swipeableRef.current?.close(); }}>
      {children}
    </Swipeable>
  );
};

// 4. Burbuja de Audio
const AudioBubble = ({ url, isMyMessage, onError, textColor = '#fff' }: { url: string, isMyMessage: boolean, onError: (title: string, msg: string) => void, textColor?: string }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { return () => { if (sound) sound.unloadAsync(); }; }, [sound]);

  const handlePlayPause = async () => {
    if (sound) {
      if (isPlaying) { await sound.pauseAsync(); setIsPlaying(false); } 
      else { await sound.playAsync(); setIsPlaying(true); }
      return;
    }
    setIsLoading(true);
    try {
      const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: fullUrl }, { shouldPlay: true, isLooping: false });
      setSound(newSound); setIsPlaying(true);
      newSound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) { setIsPlaying(false); await newSound.stopAsync(); await newSound.setPositionAsync(0); }
      });
    } catch (error) { onError("Error", "No se pudo reproducir."); } finally { setIsLoading(false); }
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, backgroundColor: isMyMessage ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', borderRadius: 10, width: 160 }}>
      <TouchableOpacity onPress={handlePlayPause} disabled={isLoading}>
        {isLoading ? <ActivityIndicator size="small" color={textColor} /> : 
          Platform.OS === 'ios' 
          ? <Ionicons name={isPlaying ? "pause-circle" : "play-circle"} size={36} color={textColor} />
          : <MaterialCommunityIcons name={isPlaying ? "pause-circle" : "play-circle"} size={36} color={textColor} />
        }
      </TouchableOpacity>
      <View><ThemedText style={{fontWeight: 'bold', color: textColor, fontSize: 14}}>Nota de voz</ThemedText><ThemedText style={{fontSize: 10, color: textColor, opacity: 0.7}}>{isPlaying ? "Reproduciendo..." : "Toca para oír"}</ThemedText></View>
    </View>
  );
};

// 5. Burbuja de Archivo
const FileBubble = ({ url, isMyMessage, onError, textColor = '#fff' }: { url: string, isMyMessage: boolean, onError: (title: string, msg: string) => void, textColor?: string }) => {
  const rawName = url.split('/').pop() || 'Documento';
  const fileName = decodeURIComponent(rawName.includes('_') ? rawName.split('_').slice(1).join('_') : rawName);
  const handleOpen = async () => {
    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
    const canOpen = await Linking.canOpenURL(fullUrl);
    if (canOpen) Linking.openURL(fullUrl).catch(() => onError("Error", "No se pudo abrir."));
    else onError("Error", "No hay app para este archivo.");
  };
  return (
    <TouchableOpacity onPress={handleOpen} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 4, marginTop: 2 }}>
      <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: isMyMessage ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', justifyContent: 'center', alignItems: 'center' }}>
        {Platform.OS === 'ios' ? <Ionicons name="document-text" size={24} color={textColor} /> : <MaterialCommunityIcons name="file-document" size={24} color={textColor} />}
      </View>
      <View style={{ flex: 1, maxWidth: 200 }}><ThemedText style={{ color: textColor, fontWeight: 'bold', fontSize: 14 }} numberOfLines={1} ellipsizeMode="middle">{fileName}</ThemedText><ThemedText style={{ color: textColor, fontSize: 10, opacity: 0.7 }}>Toca para descargar</ThemedText></View>
    </TouchableOpacity>
  );
};

// 6. Indicador Escribiendo
const TypingIndicator = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => { Animated.loop(Animated.sequence([Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true, delay }), Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true })])).start(); };
    animateDot(dot1, 0); animateDot(dot2, 200); animateDot(dot3, 400);
  }, []);
  const dotStyle = (anim: Animated.Value) => ({ opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }), transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] });
  return (
    <View style={[styles.messageBubble, styles.otherMessage, styles.typingBubble, { backgroundColor: isDark ? '#313135ff' : '#e5e5ea' }]}><Animated.View style={[styles.typingDot, dotStyle(dot1)]} /><Animated.View style={[styles.typingDot, dotStyle(dot2)]} /><Animated.View style={[styles.typingDot, dotStyle(dot3)]} /></View>
  );
};

// ==========================================
// PANTALLA PRINCIPAL
// ==========================================

export default function ChatScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const router = useRouter();
  const headerHeight = useHeaderHeight(); 
  const colorScheme = useColorScheme();

  // --- CONFIGURACIÓN DE COLORES NATIVOS ---
  const isIOS = Platform.OS === 'ios';
  const isDark = colorScheme === 'dark';
  
  const iosBlue = isDark ? '#0A84FF' : '#007AFF';
  const primaryColor = isIOS ? iosBlue : '#0a7ea4';
  
  const headerBg = isDark ? (isIOS ? '#000000' : '#101010') : '#fff';
  const headerText = isDark ? '#fff' : '#000';
  
  const screenBackgroundColor = (isIOS && isDark) ? '#000000' : undefined;

  const otherMessageBg = isDark ? '#313135ff' : '#e5e5ea';
  const otherMessageTextColor = isDark ? '#fff' : '#000';
  // ----------------------------------------

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isImageViewVisible, setIsImageViewVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  
  const [recording, setRecording] = useState<Audio.Recording | undefined>(undefined);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const [chatPartner, setChatPartner] = useState({ displayName: name, profilePicture: null as string | null });
  
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<any>(null);
  const recordingTimerRef = useRef<any>(null);
  const inputRef = useRef<TextInput>(null);
  const recordingAnim = useRef(new Animated.Value(1)).current;
  const mountTime = useRef(Date.now()).current; 

  useEffect(() => {
    if (!id) return;
    loadPartnerProfile();
    initializeChat();
    chatService.setActiveChat(id);
    chatService.connect();
    chatService.markAsRead(id);

    const subs = [
        chatService.subscribeToMessages((senderId) => { 
            if (senderId === id) { 
                // 1. ELIMINAR TYPING AL RECIBIR MENSAJE
                setIsTyping(false); 
                refreshMessages(); 
                chatService.markAsRead(id); 
            } 
        }),
        chatService.subscribeToTyping((senderId, status) => { if (senderId === id) { setIsTyping(status); } }),
        chatService.subscribeToReadReceipts((readerId) => { if (readerId === id) setMessages(prev => prev.map(msg => ({ ...msg, isRead: true }))); }),
        chatService.subscribeToConnectionStatus((isConnected) => { if (isConnected) { refreshMessages(); chatService.markAsRead(id); chatService.setActiveChat(id); } })
    ];


    return () => {
      chatService.setActiveChat(null);
      subs.forEach(unsub => unsub());
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [id]);

  const loadPartnerProfile = async () => {
    try {
      const user = await userService.getUserById(id);
      if (user) setChatPartner({ displayName: user.displayName || user.username, profilePicture: user.profilePicture || null });
    } catch (e) { console.log("Error perfil"); }
  };

  const initializeChat = async () => {
    const userId = await authService.getCurrentUserId();
    setMyUserId(userId);
    await refreshMessages();
    setLoading(false);
  };

  const refreshMessages = async () => {
    if (!id) return;
    const history = await chatService.getMessages(id);
    setMessages(history.reverse());
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'android') {
      setAlertTitle(title);
      setAlertMessage(message);
      setAlertVisible(true);
    } else {
      Alert.alert(title, message);
    }
  };

  const getPreviewText = (content: string, type?: string) => {
    if (type === 'IMAGE') return '📷 Foto';
    if (type === 'VIDEO') return '🎥 Video';
    if (type === 'AUDIO') return '🎵 Nota de voz';
    if (type === 'DOCUMENT') return '📄 Documento';
    return content;
  };

  const handlePickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showAlert('Permiso denegado', 'Se requiere acceso a la galería.'); return; }
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.7, allowsEditing: true });
    if (!result.canceled) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video';
        const msgType = isVideo ? 'VIDEO' : 'IMAGE';
        let mimeType = asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg');
        await sendFileMessage(asset.uri, mimeType, msgType);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled) {
        const asset = result.assets[0];
        let msgType = 'DOCUMENT';
        const mime = asset.mimeType || 'application/octet-stream';
        if (mime.startsWith('image/')) msgType = 'IMAGE'; else if (mime.startsWith('video/')) msgType = 'VIDEO';
        await sendFileMessage(asset.uri, mime, msgType);
      }
    } catch (err) { console.log('Error doc picker:', err); }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const startRecordingAnimation = () => {
    Animated.loop(Animated.sequence([Animated.timing(recordingAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }), Animated.timing(recordingAnim, { toValue: 1, duration: 800, useNativeDriver: true })])).start();
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') { showAlert("Permiso denegado", "Se requiere micrófono."); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording); setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => { setRecordingDuration(prev => prev + 1); }, 1000);
      startRecordingAnimation();
    } catch (err) { console.error('Fallo grabación', err); }
  };

  const cancelRecording = async () => {
    if (!recording) return;
    try { await recording.stopAndUnloadAsync(); } catch (e) { } 
    setRecording(undefined); setIsRecording(false); setRecordingDuration(0);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const sendRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecordingDuration(0);
    try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI(); 
        setRecording(undefined);
        if (uri) await sendFileMessage(uri, 'audio/m4a', 'AUDIO');
    } catch (error) { console.error("Error stop grabación", error); }
  };

  const sendFileMessage = async (uri: string, mimeType: string, msgType: string) => {
      if (!id) return;
      setIsUploading(true);
      const replyData = replyingTo ? { id: replyingTo.id || '', name: replyingTo.senderId === myUserId ? 'Tú' : chatPartner.displayName || 'Usuario', text: getPreviewText(replyingTo.content, replyingTo.type), type: replyingTo.type || 'TEXT' } : undefined;
      setReplyingTo(null);
      try {
          const url = await chatService.uploadFile(uri, mimeType);
          if (url) {
              const optimisticMsg: ChatMessage = { 
                content: url, senderId: myUserId || 'ME', recipientId: id, type: msgType as any, isRead: false,
                replyToId: replyData?.id, replyToName: replyData?.name, replyToText: replyData?.text, replyToType: replyData?.type as any,
                timestamp: new Date().toISOString()
              };
              setMessages(prev => [optimisticMsg, ...prev]);
              await chatService.sendMessage(url, id, msgType, replyData);
              refreshMessages();
          } else { showAlert("Error", "No se pudo subir."); }
      } catch (e) { console.error("Error envío", e); } finally { setIsUploading(false); }
  };

  const handleSendText = async () => {
    if (!inputText.trim() || !id) return;
    const content = inputText.trim();
    const replyData = replyingTo ? { id: replyingTo.id || '', name: replyingTo.senderId === myUserId ? 'Tú' : chatPartner.displayName || 'Usuario', text: getPreviewText(replyingTo.content, replyingTo.type), type: replyingTo.type || 'TEXT' } : undefined;
    setInputText(''); setReplyingTo(null);

    const optimisticMessage: ChatMessage = { 
        content: content, senderId: myUserId || 'ME', recipientId: id, type: 'TEXT', isRead: false,
        replyToId: replyData?.id, replyToName: replyData?.name, replyToText: replyData?.text, replyToType: replyData?.type as any,
        timestamp: new Date().toISOString()
    };
    setMessages((prev) => [optimisticMessage, ...prev]);
    try { await chatService.sendMessage(content, id, 'TEXT', replyData); refreshMessages(); } catch (error) { console.error(error); }
  };

  const handleInputChange = (text: string) => {
    setInputText(text);
    if (!id) return;
    chatService.sendTypingSignal(id, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { chatService.sendTypingSignal(id, false); }, 2000);
  };

  const openImageViewer = (url: string) => { setSelectedImageUrl(url); setIsImageViewVisible(true); };

  const renderMessage = ({ item, index }: { item: ChatMessage, index: number }) => {
    const isMyMessage = item.senderId === myUserId;
    const isLastMessage = index === 0;

    // 2. LÓGICA DE ANIMACIÓN BASADA EN TIEMPO
    const msgTime = item.timestamp ? new Date(item.timestamp).getTime() : Date.now();
    const shouldAnimate = msgTime > mountTime;

    const handleReply = () => { setReplyingTo(item); inputRef.current?.focus(); };

    return (
      <AnimatedMessageBubble shouldAnimate={shouldAnimate}>
        <SwipeableMessage onReply={handleReply} isMyMessage={isMyMessage} primaryColor={primaryColor}>
            <TouchableOpacity activeOpacity={0.9} onLongPress={() => { }} 
              style={[
                  styles.messageBubble, 
                  isMyMessage 
                    ? { alignSelf: 'flex-end', backgroundColor: primaryColor, borderBottomRightRadius: 2 } 
                    : [styles.otherMessage, { backgroundColor: otherMessageBg }]
              ]}
            >
              {item.replyToId && (
                  <View style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderLeftWidth: 3, borderLeftColor: isMyMessage ? 'rgba(255,255,255,0.5)' : primaryColor, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 6, borderRadius: 4 }}>
                      <ThemedText style={{fontSize: 11, fontWeight: 'bold', color: isMyMessage ? '#eee' : primaryColor, opacity: 0.9}}>{item.replyToName}</ThemedText>
                      <ThemedText numberOfLines={1} style={{fontSize: 12, color: isMyMessage ? '#ddd' : otherMessageTextColor}}>{item.replyToText}</ThemedText>
                  </View>
              )}
              {item.type === 'IMAGE' && <TouchableOpacity activeOpacity={0.9} onPress={() => openImageViewer(item.content)}><Image source={{ uri: item.content.startsWith('http') ? item.content : `${API_URL}${item.content}` }} style={styles.msgImage} /></TouchableOpacity>}
              {item.type === 'VIDEO' && <VideoBubble url={item.content} isMyMessage={isMyMessage} />}
              {item.type === 'DOCUMENT' && <FileBubble url={item.content} isMyMessage={isMyMessage} onError={showAlert} textColor={isMyMessage ? '#fff' : otherMessageTextColor} />}
              {item.type === 'AUDIO' && <AudioBubble url={item.content} isMyMessage={isMyMessage} onError={showAlert} textColor={isMyMessage ? '#fff' : otherMessageTextColor} />}
              {(item.type === 'TEXT' || !item.type) && <ThemedText style={[styles.messageText, isMyMessage ? styles.myMessageText : { color: otherMessageTextColor }]}>{item.content}</ThemedText>}
            </TouchableOpacity>
        </SwipeableMessage>
        {isMyMessage && isLastMessage && item.isRead && <ThemedText style={{ alignSelf: 'flex-end', fontSize: 10, color: primaryColor, marginRight: 4, marginBottom: 4 }}>Leído</ThemedText>}
      </AnimatedMessageBubble>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemedView style={[styles.container, screenBackgroundColor && { backgroundColor: screenBackgroundColor }]}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: headerBg },
          headerTintColor: headerText,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerBackButtonMenuEnabled: false,
          headerTitle: () => (
            <TouchableOpacity onPress={() => router.push({ pathname: "/user-profile/[id]", params: { id: id } })} style={styles.headerContainer}>
               <View style={styles.headerAvatarContainer}>
                  {chatPartner.profilePicture ? (
                    <Image source={{ uri: chatPartner.profilePicture }} style={styles.headerAvatar} />
                  ) : (
                    <View style={[styles.headerAvatar, styles.headerPlaceholder, { backgroundColor: primaryColor }]}>
                        <ThemedText style={{color:'#fff', fontWeight:'bold'}}>{chatPartner.displayName?.charAt(0).toUpperCase() || '?'}</ThemedText>
                    </View>
                  )}
               </View>
               <View>
                 <ThemedText type="defaultSemiBold" style={{ fontSize: 16, color: headerText }}>{chatPartner.displayName}</ThemedText>
                 {isTyping && <ThemedText style={{fontSize: 10, color: primaryColor, fontWeight: 'bold'}}>Escribiendo...</ThemedText>}
               </View>
            </TouchableOpacity>
          ),
          headerBackTitle: 'Volver',
        }}
      />

      {loading && <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 20 }} />}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={renderMessage}
        inverted 
        contentContainerStyle={styles.messagesList} 
        ListHeaderComponent={isTyping ? <AnimatedMessageBubble><TypingIndicator /></AnimatedMessageBubble> : null}
      />

      <KeyboardAvoidingView behavior='padding' keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 76 } style={styles.inputWrapper}>
        
        {replyingTo && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f0f0f0', borderLeftWidth: 4, borderLeftColor: primaryColor, marginHorizontal: 10, marginBottom: 5, borderRadius: 4 }}>
                <View style={{flex: 1}}><ThemedText style={{color: primaryColor, fontWeight: 'bold', fontSize: 12}}>Respondiendo a {replyingTo.senderId === myUserId ? 'ti mismo' : chatPartner.displayName}</ThemedText><ThemedText numberOfLines={1} style={{color: '#888', fontSize: 14}}>{getPreviewText(replyingTo.content, replyingTo.type)}</ThemedText></View>
                <TouchableOpacity onPress={() => setReplyingTo(null)}><Ionicons name="close-circle" size={24} color="#888" /></TouchableOpacity>
            </View>
        )}

        <View style={styles.inputContainer}>
          {isRecording ? (
             <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 5 }}>
                 <TouchableOpacity onPress={cancelRecording} style={{ padding: 10 }}>
                    {Platform.OS === 'ios' 
                    ? <Ionicons name="trash" size={24} color="#ff3b30" />
                    : <MaterialCommunityIcons name="trash-can" size={24} color="#ff3b30" />}
                 </TouchableOpacity>
                 <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}><Animated.View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#ff3b30', opacity: recordingAnim }} /><ThemedText style={{fontSize: 18, fontWeight: '600', fontVariant: ['tabular-nums']}}>{formatDuration(recordingDuration)}</ThemedText></View>
                 <TouchableOpacity onPress={sendRecording} style={[styles.sendButton, { backgroundColor: primaryColor }]} activeOpacity={0.7}>
                    {Platform.OS === 'ios' 
                    ? <Ionicons name="arrow-up" size={24} color="#fff" />
                    : <MaterialCommunityIcons name="arrow-up" size={24} color="#fff" />}
                 </TouchableOpacity>
             </View>
          ) : (
             <>
                <TouchableOpacity onPress={handlePickMedia} style={styles.attachButton} disabled={isUploading}>
                   {isUploading ? <ActivityIndicator size="small" color={primaryColor} /> : 
                  Platform.OS === 'ios' 
                  ? <Ionicons name="image" size={24} color={primaryColor} />
                  : <MaterialCommunityIcons name="image" size={24} color={primaryColor} />}
                </TouchableOpacity>
                <TouchableOpacity onPress={handlePickDocument} style={styles.attachButton} disabled={isUploading}>
                    { Platform.OS === 'ios' 
                    ? <Ionicons name="document" size={24} color={primaryColor} />
                    : <MaterialCommunityIcons name="file" size={24} color={primaryColor} />}
                </TouchableOpacity>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={inputText}
                  onChangeText={handleInputChange}
                  placeholder="Mensaje..."
                  placeholderTextColor="#888"
                  multiline
                  maxLength={500}
                />
                {inputText.trim().length > 0 ? (
                    <TouchableOpacity onPress={handleSendText} style={[styles.sendButton, { backgroundColor: primaryColor }]} activeOpacity={0.7}>
                      {Platform.OS === 'ios' 
                    ? <Ionicons name="arrow-up" size={24} color="#fff" />
                    : <MaterialCommunityIcons name="arrow-up" size={24} color="#fff" />}
                      </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={startRecording} style={[styles.sendButton, { backgroundColor: '#333' }]} activeOpacity={0.7}>
                    {Platform.OS === 'ios' 
                    ? <Ionicons name="mic" size={24} color="#fff" />
                    : <MaterialCommunityIcons name="microphone" size={24} color="#fff" />}
                    </TouchableOpacity>
                )}
             </>
          )}
        </View>
      </KeyboardAvoidingView>

      <ImageViewing
        images={[{ uri: selectedImageUrl.startsWith('http') ? selectedImageUrl : `${API_URL}${selectedImageUrl}` }]}
        imageIndex={0}
        visible={isImageViewVisible}
        onRequestClose={() => setIsImageViewVisible(false)}
      />

      {/* MODAL DE ALERTA ANDROID */}
      {Platform.OS === 'android' && (
        <Modal transparent visible={alertVisible} onRequestClose={() => setAlertVisible(false)} animationType="fade">
          <View style={styles.modalOverlay}>
            <ThemedView style={styles.modalView}>
              <ThemedText type="subtitle">{alertTitle}</ThemedText>
              <ThemedText style={styles.modalText}>{alertMessage}</ThemedText>
              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setAlertVisible(false)} style={[styles.modalButton, { backgroundColor: primaryColor }]}>
                  <ThemedText style={{ color: '#fff' }}>Aceptar</ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </View>
        </Modal>
      )}
    </ThemedView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { flexDirection: 'row', alignItems: 'center' },
  headerAvatarContainer: { marginRight: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  messagesList: { paddingHorizontal: 16, paddingTop: 16, gap: 4, paddingBottom: 20 },
  messageBubble: { maxWidth: '80%', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, marginBottom: 2, elevation: 1 },
  otherMessage: { alignSelf: 'flex-start', backgroundColor: '#313135ff', borderBottomLeftRadius: 2 },
  messageText: { fontSize: 16, color: '#fff', lineHeight: 22 },
  myMessageText: { color: '#fff' },
  msgImage: { width: 200, height: 200, borderRadius: 12, marginVertical: 4, backgroundColor: '#ccc' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 12, width: 60, height: 40, justifyContent: 'center', marginLeft: 0, marginBottom: 16 },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8e8e93' },
  inputWrapper: { width: '100%', backgroundColor: 'transparent', marginBottom: Platform.OS === 'ios' ? 32 : 40 },
  inputContainer: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', alignItems: 'flex-end' },
  attachButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 5 },
  input: { flex: 1, backgroundColor: '#f2f2f7', borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, marginRight: 10, fontSize: 16, color: '#000', maxHeight: 100 },
  sendButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  imageFooterContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', width: '100%', position: 'absolute', bottom: 0, justifyContent: 'center' },
  imageFooterContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  imageFooterText: { color: '#fff', flex: 1, marginRight: 10, fontSize: 14 },
  downloadButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { margin: 20, borderRadius: 20, padding: 25, alignItems: 'stretch', width: '85%', elevation: 5 },
  modalText: { marginBottom: 20, marginTop: 10, opacity: 0.8 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalButton: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
});