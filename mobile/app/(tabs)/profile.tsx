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
              <Ionicons name="arrow-back" size={20} color="#ff7a00" />
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
  container: {
    flex: 1,
    backgroundColor: "#fff", // nền cam nhạt theo web
  },

  scrollContainer: { paddingBottom: 30 },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#222",
    paddingHorizontal: 22,
    paddingTop: 25,
    paddingBottom: 15,
  },

  /* ===========================
        PROFILE CARD 
  ============================*/
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 22,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f2f2f2",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#ff7a00",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 18,
  },

  profileInfo: { flex: 1 },

  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
  },

  profilePhone: {
    fontSize: 15,
    color: "#666",
    marginTop: 4,
  },

  profileAddress: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },

  /* ===========================
        MENU BOX
  ============================*/
  menuSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f2f2f2",
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 22,
    borderBottomWidth: 1,
    borderBottomColor: "#f2f2f2",
  },

  menuIcon: { marginRight: 15 },

  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },

  /* ===========================
        DETAIL PANEL
  ============================*/
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 22,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f2f2f2",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
    marginBottom: 10,
  },

  label: {
    color: "#666",
    fontSize: 14,
    marginTop: 12,
  },

  value: {
    fontSize: 17,
    fontWeight: "600",
    color: "#222",
    marginTop: 4,
  },

  /* ===========================
        BUTTONS
  ============================*/
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
    backgroundColor: "#ff7a00",
    shadowColor: "#ff7a00",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  editText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8,
  },

  backButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },

  backText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ff7a00",
    marginLeft: 6,
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 30,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f2f2f2",
  },

  logoutButtonText: {
    color: "#E53935",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 6,
  },

  logoutIcon: { marginRight: 6 },

  /* ===========================
        MODAL
  ============================*/
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalContent: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: "#f2f2f2",
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#222",
    textAlign: "center",
    marginBottom: 12,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    backgroundColor: "#fff",
    fontSize: 15,
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },

  saveButton: {
    flex: 1,
    backgroundColor: "#ff7a00",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginRight: 6,
  },

  saveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  cancelButton: {
    flex: 1,
    backgroundColor: "#eee",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginLeft: 6,
  },

  cancelText: {
    color: "#444",
    fontWeight: "600",
    fontSize: 15,
  },
});
