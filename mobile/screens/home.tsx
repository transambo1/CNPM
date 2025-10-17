import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Định nghĩa kiểu của Stack Navigator (App.js hoặc App.tsx có 3 screen)
type RootStackParamList = {
  Home: undefined;
  About: undefined;
  Settings: undefined;
};

// Gắn kiểu dữ liệu cho props
type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏠 Trang chủ</Text>
      <Button title="Giới thiệu" onPress={() => navigation.navigate('About')} />
      <Button title="Cài đặt" onPress={() => navigation.navigate('Settings')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});
