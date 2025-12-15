import { chatService } from '@/services/chatService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Badge, Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, useColorScheme } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // COLORES DINÁMICOS MD3
  const md3Colors = {
    background: isDark ? '#1e1e1e' : '#f0f2f5',
    pillColor: '#0a7ea4', 
    activeIcon: '#fff', 
    activeLabel: isDark ? '#e6e1e5' : '#1d1b20', 
    inactiveIcon: isDark ? '#c4c7c5' : '#444746',
  };

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = chatService.subscribeToUnreadCount((count) => {
      setUnreadCount(count);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // NativeTabs para iOS
  if (Platform.OS === 'ios') {
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <Label>Chats</Label>
          {unreadCount > 0 && <Badge>{unreadCount.toString()}</Badge>}
          <Icon sf={{ default: 'message', selected: 'message.fill' }} />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <Label>Perfil</Label>
          <Icon sf={{ default: 'person', selected: 'person.fill' }} />
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  // Tabs personalizadas para Android
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: md3Colors.activeLabel, 
        tabBarInactiveTintColor: md3Colors.inactiveIcon,
        tabBarStyle: {
          backgroundColor: md3Colors.background,
          height: 115,
          paddingBottom: 10,
          paddingTop: 10,
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 0,
        },
        headerShown: false,
        tabBarBadgeStyle: {
          backgroundColor: '#b3261e',
          color: 'white',
          fontSize: 10,
          height: 16,
          minWidth: 16,
          borderRadius: 8,
          top: -4, 
        }
      }}>
      
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ focused, color }) => (
            // Usamos un View condicional para el fondo (Píldora)
            <View style={[styles.pillContainer, { backgroundColor: focused ? md3Colors.pillColor : 'transparent' }]}>
               <MaterialCommunityIcons 
                  name={focused ? 'message-text' : 'message-text-outline'} 
                  size={24} 
                  // El icono cambia de color si está enfocado para contrastar con la píldora
                  color={focused ? md3Colors.activeIcon : color} 
               />
            </View>
          ),
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused, color }) => (
             <View style={[styles.pillContainer, { backgroundColor: focused ? md3Colors.pillColor : 'transparent' }]}>
                <MaterialCommunityIcons 
                  name={focused ? 'account' : 'account-outline'} 
                  size={24} 
                  color={focused ? md3Colors.activeIcon : color} 
                />
             </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pillContainer: {
    width: 64,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
});