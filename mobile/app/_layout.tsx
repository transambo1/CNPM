// app/_layout.tsx
import React from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../libs/AuthContext";
import { CartProvider } from "../libs/CartContext";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Tabs (Home, Activity, Profile...) */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          {/* Screens ngoài Tabs (Stack Navigation) */}
          <Stack.Screen name="restaurant/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="product/[id]" options={{ headerShown: false }} />

          {/* Auth stack (optional but recommended) */}
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
