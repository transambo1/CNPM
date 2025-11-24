// file: app/(tabs)/_layout.tsx
import { Tabs, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { useAuth } from "../../libs/AuthContext";
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native'; // <-- 1. IMPORT PLATFORM

export default function ProtectedLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user?.role === 'restaurant') {
      router.replace('/restaurant-admin');
      return;
    }
    if (user?.role === 'admin') {
      router.replace('/admin-overview');
      return;
    }
    if (!user) {
      router.replace("/(auth)/login");
    }
  }, [user, loading, router]);

  if (loading || !user || user.role === 'restaurant' || user.role === 'admin') {
    return null;
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#00A74F',
        tabBarInactiveTintColor: '#555',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = 'home';

          if (route.name === 'index') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'payment') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'activity') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size - 2} color={color} />;
        },
      })}
    >
      {/* Tab 1: Trang chủ */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Trang chủ",

          // --- BẮT ĐẦU SỬA ---
          // Chỉ áp dụng tính năng này khi KHÔNG PHẢI LÀ WEB
          tabBarHideOnScroll: Platform.OS !== 'web',
          // --- KẾT THÚC SỬA ---
        }}
      />

      {/* Tab 2: Thanh toán (ẩn khỏi tab bar, chỉ dùng để điều hướng từ giỏ hàng) */}


      {/* Tab 3: Lịch sử đơn hàng */}
      <Tabs.Screen
        name="activity"
        options={{
          title: "Lịch sử đơn",
        }}
      />

      {/* Tab 4: User (Profile) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Tài khoản",
        }}
      />
    </Tabs>
  );
}