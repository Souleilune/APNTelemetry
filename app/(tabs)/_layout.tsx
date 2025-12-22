import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

const COLORS = {
  primary: '#FF8C42',
  white: '#FFFFFF',
  tabIconSelected: '#FFFFFF',
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.primary,
          borderTopWidth: 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
          position: 'absolute',
          overflow: 'hidden',
        },
        tabBarActiveTintColor: COLORS.tabIconSelected,
        tabBarInactiveTintColor: COLORS.tabIconSelected,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <Ionicons 
              name={focused ? 'home' : 'home-outline'} 
              size={24} 
              color={COLORS.white} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="outlets"
        options={{
          title: 'Outlets',
          tabBarIcon: ({ focused }) => (
            <Ionicons 
              name={focused ? 'power' : 'power-outline'} 
              size={24} 
              color={COLORS.white} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="metrics"
        options={{
          title: "FAQ's",
          tabBarIcon: ({ focused }) => (
            <Ionicons 
              name={focused ? 'help-circle' : 'help-circle-outline'} 
              size={24} 
              color={COLORS.white} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <Ionicons 
              name={focused ? 'settings' : 'settings-outline'} 
              size={24} 
              color={COLORS.white} 
            />
          ),
        }}
      />
    </Tabs>
  );
}