import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../../libs/AuthContext';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// 1. Định nghĩa các mục menu
const menuItems = [
  { id: '1', title: 'Thông tin cá nhân', icon: 'person-outline' as const, screen: '/profile/edit' },
  { id: '2', title: 'Địa chỉ đã lưu', icon: 'location-outline' as const, screen: '/profile/addresses' },
  { id: '3', title: 'Thanh toán', icon: 'wallet-outline' as const, screen: '/(tabs)/payment' },
  { id: '4', title: 'Lịch sử đơn hàng', icon: 'receipt-outline' as const, screen: '/(tabs)/activity' },
  { id: '5', title: 'Trung tâm trợ giúp', icon: 'help-buoy-outline' as const, screen: '/help' },
];

export default function ProfilePage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  // 2. Component Menu Item có thể tái sử dụng
  const MenuItem = ({ item }: { item: typeof menuItems[0] }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={() => router.push(item.screen as never)}
    >
      <Ionicons name={item.icon} size={24} color="#444" style={styles.menuIcon} />
      <Text style={styles.menuText}>{item.title}</Text>
      <Ionicons name="chevron-forward-outline" size={20} color="#bbb" />
    </TouchableOpacity>
  );

  // 3. Hiển thị loading
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#00A74F" />
      </SafeAreaView>
    );
  }

  // 4. Hiển thị khi không có user (sau khi loading)
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Không thể tải thông tin người dùng.</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.logoutButtonText}>Đăng nhập lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // 5. Giao diện chính
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Tài khoản</Text>

        {/* --- Thẻ thông tin cá nhân --- */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color="#fff" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.firstname} {user.lastname}</Text>
            <Text style={styles.profilePhone}>{user.phonenumber}</Text>
            <Text style={styles.profileAddress} numberOfLines={1}>{user.address}</Text>
          </View>
        </View>

        {/* --- Menu chức năng --- */}
        <View style={styles.menuSection}>
          {menuItems.map(item => (
            <MenuItem key={item.id} item={item} />
          ))}
        </View>

        {/* --- Nút Đăng xuất --- */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color="#E53935" style={styles.logoutIcon} />
          <Text style={styles.logoutButtonText}>Đăng xuất</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// 6. Styles mới chuyên nghiệp hơn
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5', // Màu nền xám nhạt
  },
  scrollContainer: {
    paddingBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#222',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00A74F', // Màu xanh lá
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 2,
  },
  profilePhone: {
    fontSize: 16,
    color: '#555',
  },
  profileAddress: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
  },
  menuSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    overflow: 'hidden', // Để bo góc cho các item bên trong
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5', // Màu nền
  },
  menuIcon: {
    marginRight: 15,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutButtonText: {
    color: '#E53935', // Màu đỏ
    fontSize: 16,
    fontWeight: 'bold',
  },
});