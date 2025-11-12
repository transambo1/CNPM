import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useAuth } from '../../libs/AuthContext';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, getFirestore } from 'firebase/firestore';
import { app } from '../../libs/firebase'; // 🔥 đảm bảo bạn đã export app trong firebase.js

export default function ProfilePage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const db = getFirestore(app);

  const [showDetails, setShowDetails] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [form, setForm] = useState({
    firstname: user?.firstname || '',
    lastname: user?.lastname || '',
    phonenumber: user?.phonenumber || '',
    address: user?.address || '',
  });

  const handleSave = async () => {
    try {
      if (!user) return;

      const ref = doc(db, 'users', (user as any).uid || (user as any).id);
      await updateDoc(ref, form);

      Alert.alert('✅ Thành công', 'Thông tin cá nhân đã được cập nhật.');
      setShowEdit(false);
    } catch (e) {
      console.error(e);
      Alert.alert('❌ Lỗi', 'Không thể lưu thông tin.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#00A74F" />
      </SafeAreaView>
    );
  }

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

  const formatCreatedAt = () => {
    const c: any = (user as any)?.createdAt;
    if (!c) return 'Không rõ';
    const seconds = c.seconds || c._seconds;
    return seconds ? new Date(seconds * 1000).toLocaleDateString('vi-VN') : 'Không rõ';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Tài khoản</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color="#fff" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user.firstname} {user.lastname}
            </Text>
            <Text style={styles.profilePhone}>{user.phonenumber}</Text>
            <Text style={styles.profileAddress} numberOfLines={1}>
              {user.address}
            </Text>
          </View>
        </View>

        {/* --- Hiển thị menu hoặc chi tiết --- */}
        {!showDetails ? (
          <View style={styles.menuSection}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowDetails(true)}
            >
              <Ionicons name="person-outline" size={24} color="#444" style={styles.menuIcon} />
              <Text style={styles.menuText}>Thông tin cá nhân</Text>
              <Ionicons name="chevron-forward-outline" size={20} color="#bbb" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/(tabs)/activity' as never)}
            >
              <Ionicons name="receipt-outline" size={24} color="#444" style={styles.menuIcon} />
              <Text style={styles.menuText}>Lịch sử đơn hàng</Text>
              <Ionicons name="chevron-forward-outline" size={20} color="#bbb" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>

            <Text style={styles.label}>Họ và tên</Text>
            <Text style={styles.value}>
              {user.firstname} {user.lastname}
            </Text>

            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email || 'Chưa có email'}</Text>

            <Text style={styles.label}>Số điện thoại</Text>
            <Text style={styles.value}>{user.phonenumber || 'Chưa cập nhật'}</Text>

            <Text style={styles.label}>Địa chỉ</Text>
            <Text style={styles.value}>{user.address || 'Chưa có địa chỉ'}</Text>

            <Text style={styles.label}>Ngày tạo tài khoản</Text>
            <Text style={styles.value}>{formatCreatedAt()}</Text>

            <TouchableOpacity style={styles.editButton} onPress={() => setShowEdit(true)}>
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={styles.editText}>Chỉnh sửa thông tin</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={() => setShowDetails(false)}>
              <Ionicons name="arrow-back" size={20} color="#00A74F" />
              <Text style={styles.backText}>Quay lại</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color="#E53935" style={styles.logoutIcon} />
          <Text style={styles.logoutButtonText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ✅ Modal chỉnh sửa */}
      <Modal visible={showEdit} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chỉnh sửa thông tin</Text>

            <TextInput
              placeholder="Họ"
              style={styles.input}
              value={form.firstname}
              onChangeText={(text) => setForm({ ...form, firstname: text })}
            />
            <TextInput
              placeholder="Tên"
              style={styles.input}
              value={form.lastname}
              onChangeText={(text) => setForm({ ...form, lastname: text })}
            />
            <TextInput
              placeholder="Số điện thoại"
              style={styles.input}
              value={form.phonenumber}
              onChangeText={(text) => setForm({ ...form, phonenumber: text })}
              keyboardType="phone-pad"
            />
            <TextInput
              placeholder="Địa chỉ"
              style={styles.input}
              value={form.address}
              onChangeText={(text) => setForm({ ...form, address: text })}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveText}>Lưu</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowEdit(false)}>
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  scrollContainer: { paddingBottom: 30 },
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
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00A74F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#222' },
  profilePhone: { fontSize: 16, color: '#555' },
  profileAddress: { fontSize: 14, color: '#777', marginTop: 4 },
  menuSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    overflow: 'hidden',
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  menuIcon: { marginRight: 15 },
  menuText: { flex: 1, fontSize: 16, color: '#333', fontWeight: '500' },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 10, color: '#222' },
  label: { color: '#666', fontSize: 15, marginTop: 10 },
  value: { color: '#222', fontSize: 17, fontWeight: '500', marginTop: 3 },
  editButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00A74F',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  editText: { color: '#fff', fontWeight: '600', marginLeft: 8, fontSize: 16 },
  backButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  backText: { color: '#00A74F', fontSize: 15, marginLeft: 6, fontWeight: '500' },
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
  },
  logoutIcon: { marginRight: 8 },
  logoutButtonText: { color: '#E53935', fontSize: 16, fontWeight: 'bold' },

  // ✅ modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    fontSize: 16,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  saveButton: {
    flex: 1,
    backgroundColor: '#00A74F',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 5,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 5,
  },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelText: { color: '#333', fontWeight: '500', fontSize: 16 },
});
