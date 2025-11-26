import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

import { app } from '../../libs/firebase';
import { useAuth } from '../../libs/AuthContext';

type UserItem = {
  id: string;
  name?: string;

  phone?: string;
  status?: string;
  role?: string;
  restaurantId?: string | null;
};

type StatusFilter = 'all' | 'active' | 'banned';
type RoleFilter = 'all' | 'customer' | 'restaurant' | 'admin';

const STATUS_META: Record<StatusFilter, { label: string; badge: any }> = {
  all: { label: 'Tất cả', badge: {} },
  active: { label: 'Active', badge: { backgroundColor: '#e8f8ef' } },
  banned: { label: 'Banned', badge: { backgroundColor: '#fdecec' } },
};

const ROLE_META: Record<RoleFilter, { label: string }> = {
  all: { label: 'Tất cả' },
  customer: { label: 'customer' },
  restaurant: { label: 'restaurant' },
  admin: { label: 'admin' },
};

export default function AdminUsersScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const db = useMemo(() => getFirestore(app), []);

  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [nameInput, setNameInput] = useState('');

  const [phoneInput, setPhoneInput] = useState('');
  const [saving, setSaving] = useState(false);

  /** LỌC USER THEO STATUS + ROLE */
  const filteredUsers = useMemo(
    () =>
      users.filter((u) => {
        const st = (u.status ?? 'active') as StatusFilter;
        const rl = (u.role ?? 'customer') as RoleFilter;
        const okStatus = statusFilter === 'all' || st === statusFilter;
        const okRole = roleFilter === 'all' || rl === roleFilter;
        return okStatus && okRole;
      }),
    [users, statusFilter, roleFilter]
  );

  /** LOAD USERS */
  const loadUsers = useCallback(async () => {
    setRefreshing(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const data = snap.docs.map((d) => {
        const raw = d.data() as any;
        const name =
          (raw.name ??
            raw.fullName ??
            `${raw.firstname ?? ''} ${raw.lastname ?? ''}`.trim()) ||
          'Người dùng';

        return {
          id: d.id,
          name,

          phone: raw.phonenumber ?? raw.phone ?? '',
          status: raw.status ?? 'active',
          role: raw.role ?? 'customer',
          restaurantId: raw.restaurantId ?? raw.restaurant?.id ?? null,
        } as UserItem;
      });

      setUsers(data);
    } catch (err) {
      console.error('load users failed', err);
    } finally {
      setRefreshing(false);
    }
  }, [db]);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'admin') {
      router.replace('/');
      return;
    }
    loadUsers();
  }, [user, loading, loadUsers, router]);

  const openEditUser = useCallback((target: UserItem) => {
    setEditingUser(target);
    setNameInput(target.name ?? '');

    setPhoneInput(target.phone ?? '');
  }, []);

  const handleToggleStatus = useCallback(
    async (target: UserItem) => {
      const nextStatus =
        (target.status ?? 'active') === 'banned' ? 'active' : 'banned';

      try {
        await updateDoc(doc(db, 'users', target.id), { status: nextStatus });

        if (target.role === 'restaurant' && target.restaurantId) {
          await updateDoc(doc(db, 'restaurants', target.restaurantId), {
            status: nextStatus,
          });

          const productsSnap = await getDocs(
            query(
              collection(db, 'products'),
              where('restaurantId', '==', target.restaurantId)
            )
          );

          await Promise.all(
            productsSnap.docs.map((p) =>
              updateDoc(p.ref, {
                isActive: nextStatus !== 'banned',
                available: nextStatus !== 'banned',
              })
            )
          );
        }

        Alert.alert(
          'Đã cập nhật',
          nextStatus === 'banned'
            ? 'Đã khóa tài khoản và nhà hàng liên quan.'
            : 'Đã mở khóa tài khoản.'
        );

        loadUsers();
      } catch (err) {
        console.error('toggle user failed', err);
        Alert.alert('Lỗi', 'Không thể cập nhật trạng thái.');
      }
    },
    [db, loadUsers]
  );

  const handleSaveUser = useCallback(async () => {
    if (!editingUser) return;
    const trimmedName = nameInput.trim();

    const trimmedPhone = phoneInput.trim();

    if (!trimmedName) {
      Alert.alert('Thiếu thông tin', 'Nhập tên người dùng.');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        name: trimmedName,
        fullName: trimmedName,
        username: trimmedName,

        phonenumber: trimmedPhone,
        phone: trimmedPhone,
      });

      Alert.alert('Đã lưu', 'Thông tin người dùng đã được cập nhật.');
      setEditingUser(null);
      setNameInput('');
      setEmailInput('');
      setPhoneInput('');
      loadUsers();
    } catch (err) {
      console.error('update user failed', err);
      Alert.alert('Lỗi', 'Không thể lưu thay đổi.');
    } finally {
      setSaving(false);
    }
  }, [db, editingUser, nameInput, phoneInput, loadUsers]);

  if (loading || !user || user.role !== 'admin') return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/admin-overview')
          }
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#0b1f15" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Người dùng</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* FILTER STATUS */}
      <View style={styles.filterRow}>
        {(['all', 'active', 'banned'] as StatusFilter[]).map((key) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.filterChip,
              statusFilter === key && styles.filterChipActive,
            ]}
            onPress={() => setStatusFilter(key)}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === key && styles.filterChipTextActive,
              ]}
            >
              {STATUS_META[key].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* FILTER ROLE */}
      <View style={[styles.filterRow, { marginTop: 8 }]}>
        {(['all', 'customer', 'restaurant', 'admin'] as RoleFilter[]).map(
          (key) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.filterChip,
                roleFilter === key && styles.filterChipRoleActive,
              ]}
              onPress={() => setRoleFilter(key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  roleFilter === key && styles.filterChipTextRoleActive,
                ]}
              >
                {ROLE_META[key].label}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {/* LIST USERS */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadUsers} />
        }
        contentContainerStyle={styles.listContent}
      >
        {filteredUsers.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Ionicons name="person-outline" size={18} color="#0b1f15" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Tên: {item.name}</Text>


                {item.phone ? (
                  <Text style={styles.cardSubtitle}>Số điện thoại: {item.phone}</Text>
                ) : null}
              </View>

              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{item.role}</Text>
              </View>
            </View>

            <View style={styles.userMetaRow}>
              <View
                style={[
                  styles.statusBadge,
                  STATUS_META[(item.status ?? 'active') as StatusFilter].badge,
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {STATUS_META[(item.status ?? 'active') as StatusFilter].label}
                </Text>
              </View>

              {item.restaurantId ? (
                <Text style={styles.cardSubtitle}>RID: {item.restaurantId}</Text>
              ) : null}
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => openEditUser(item)}
              >
                <Ionicons
                  name="create-outline"
                  size={16}
                  color="#0b1f15"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.secondaryText}>Chỉnh sửa</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (item.status ?? 'active') === 'banned' && styles.outlineButton,
                ]}
                onPress={() => handleToggleStatus(item)}
              >
                <Ionicons
                  name={
                    (item.status ?? 'active') === 'banned'
                      ? 'lock-open-outline'
                      : 'ban-outline'
                  }
                  size={16}
                  color={
                    (item.status ?? 'active') === 'banned' ? '#0b1f15' : '#fff'
                  }
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.primaryText,
                    (item.status ?? 'active') === 'banned' && styles.outlineText,
                  ]}
                >
                  {(item.status ?? 'active') === 'banned' ? 'Mở khóa' : 'Khóa'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {filteredUsers.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={42} color="#7c8a80" />
            <Text style={styles.emptyTitle}>Chưa có người dùng</Text>
            <Text style={styles.emptySubtitle}>
              Kéo xuống để làm mới danh sách.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* MODAL EDIT USER */}
      <Modal
        visible={!!editingUser}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingUser(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setEditingUser(null)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Chỉnh sửa người dùng</Text>

            <TextInput
              style={styles.modalInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Họ tên"
              placeholderTextColor="#9ca3af"
            />



            <TextInput
              style={styles.modalInput}
              value={phoneInput}
              onChangeText={setPhoneInput}
              placeholder="Số điện thoại"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setEditingUser(null)}
              >
                <Text style={styles.modalCancelText}>Huỷ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSave, saving && { opacity: 0.6 }]}
                onPress={handleSaveUser}
                disabled={saving}
              >
                <Text style={styles.modalSaveText}>
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

/* ------- styles giữ nguyên như bạn gửi, chỉ dùng với View thay vì ScrollView horizontal ------- */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6fffa' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e4efe8',
    backgroundColor: '#fff',
  },

  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#eef7f2',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0b1f15',
  },

  filterRow: {
    paddingHorizontal: 5,
    paddingTop: 10,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },

  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d9e9df',
    backgroundColor: '#fff',
    marginRight: 3,
    alignSelf: 'center',
  },

  filterChipActive: {
    backgroundColor: '#e6f7ef',
    borderColor: '#00b14f',
  },

  filterChipText: {
    fontWeight: '700',
    color: '#0b1f15',
  },

  filterChipTextActive: {
    color: '#007045',
  },

  filterChipRoleActive: {
    backgroundColor: '#FFF4E0',
    borderColor: '#FFA726',
  },

  filterChipTextRoleActive: {
    color: '#FF7800',
  },

  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d9e9df',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e6f7ef',
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0b1f15',
  },

  cardSubtitle: {
    color: '#4b5d52',
    marginTop: 4,
  },

  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f0f4ff',
  },

  roleText: {
    fontWeight: '700',
  },

  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },

  statusBadgeText: {
    fontWeight: '700',
    color: '#0b1f15',
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },

  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  secondaryText: {
    color: '#0b1f15',
    fontWeight: '700',
  },

  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#00A74F',
  },

  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },

  outlineButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#00A74F',
  },

  outlineText: {
    color: '#0b1f15',
  },

  empty: {
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },

  emptyTitle: {
    fontWeight: '700',
    color: '#0b1f15',
  },

  emptySubtitle: {
    color: '#4b5d52',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0b1f15',
  },

  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },

  modalCancel: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },

  modalCancelText: {
    color: '#111827',
    fontWeight: '700',
  },

  modalSave: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#00A74F',
  },

  modalSaveText: {
    color: '#fff',
    fontWeight: '800',
  },
});
