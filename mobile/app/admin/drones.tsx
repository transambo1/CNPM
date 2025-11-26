import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection,
  getDocs,
  getFirestore,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';

import { app } from '../../libs/firebase';
import { useAuth } from '../../libs/AuthContext';

/* ========= TYPES ========= */
type DroneItem = {
  id: string;
  name: string;
  status: string;
  battery: number;
  restaurantId: string | null;
  restaurantName?: string;
  currentOrderId: string | null;
};

type RestaurantItem = { id: string; name?: string };
type OrderItem = { id: string; status?: string; customer?: { name?: string } };

type StatusFilter = 'Tất cả' | 'Rảnh' | 'Đang giao' | 'Bảo trì';

type FormState = {
  name: string;
  status: string;
  battery: string; // dùng string cho TextInput, khi lưu convert sang number
  restaurantId: string;
};

const STATUS_OPTIONS: StatusFilter[] = ['Tất cả', 'Rảnh', 'Đang giao', 'Bảo trì'];

export default function AdminDronesScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const db = useMemo(() => getFirestore(app), []);

  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [drones, setDrones] = useState<DroneItem[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);

  const [searchText, setSearchText] = useState('');
  const [restaurantFilter, setRestaurantFilter] = useState<string>('Tất cả');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Tất cả');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingDrone, setEditingDrone] = useState<DroneItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: '',
    status: 'Rảnh',
    battery: '100',
    restaurantId: '',
  });

  /* ========= LOAD DATA ========= */
  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [dronesSnap, restaurantsSnap, ordersSnap] = await Promise.all([
        getDocs(collection(db, 'drones')),
        getDocs(collection(db, 'restaurants')),
        getDocs(collection(db, 'orders')),
      ]);

      const restaurantsData: RestaurantItem[] = restaurantsSnap.docs.map((d) => {
        const raw = d.data() as any;
        return {
          id: d.id,
          name: raw.name ?? raw.restaurantName ?? 'Nhà hàng không tên',
        };
      });

      const getRestaurantName = (id: string | null): string =>
        id ? restaurantsData.find((r) => r.id === id)?.name ?? '—' : '—';

      const dronesData: DroneItem[] = dronesSnap.docs.map((d) => {
        const raw = d.data() as any;
        const restaurantId = raw.restaurantId ?? null;
        return {
          id: d.id,
          name: raw.name ?? raw.model ?? `Drone ${d.id}`,
          status: raw.status ?? 'Rảnh',
          battery: Number(raw.battery ?? 0),
          restaurantId,
          restaurantName: raw.restaurantName ?? getRestaurantName(restaurantId),
          currentOrderId: raw.currentOrderId ?? null,
        };
      });

      const ordersData: OrderItem[] = ordersSnap.docs.map((d) => {
        const raw = d.data() as any;
        return {
          id: d.id,
          status: raw.status,
          customer: raw.customer ?? { name: raw.customerName ?? 'Khách hàng' },
        };
      });

      setRestaurants(restaurantsData);
      setDrones(dronesData);
      setOrders(ordersData);
    } catch (err) {
      console.error('load drones failed', err);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu drone.');
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'admin') {
      router.replace('/');
      return;
    }
    fetchAll();
  }, [user, loading, router, fetchAll]);

  /* ========= HELPERS ========= */
  const getRestaurantName = useCallback(
    (id: string | null) =>
      id ? restaurants.find((r) => r.id === id)?.name ?? '—' : '—',
    [restaurants]
  );

  const getOrder = useCallback(
    (id: string | null) => (id ? orders.find((o: any) => o.id === id) ?? null : null),
    [orders]
  );

  const renderStatusBadge = (status: string) => {
    let bg = '#e5e7eb';
    let label = status;

    if (status === 'Rảnh') {
      bg = '#e6f7ef';
      label = '🟢 Rảnh';
    } else if (status === 'Đang giao') {
      bg = '#e0edff';
      label = '🔵 Đang giao';
    } else if (status === 'Bảo trì') {
      bg = '#fdecec';
      label = '🔴 Bảo trì';
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bg }]}>
        <Text style={styles.statusBadgeText}>{label}</Text>
      </View>
    );
  };

  /* ========= FILTERED DRONES ========= */
  const filteredDrones = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    return drones.filter((d) => {
      const nameMatch = !search || d.name.toLowerCase().includes(search);
      const restaurantName = getRestaurantName(d.restaurantId);
      const restaurantMatch =
        restaurantFilter === 'Tất cả' || restaurantName === restaurantFilter;
      const statusMatch =
        statusFilter === 'Tất cả' || d.status === statusFilter;

      return nameMatch && restaurantMatch && statusMatch;
    });
  }, [drones, searchText, restaurantFilter, statusFilter, getRestaurantName]);

  /* ========= OPEN MODAL (ADD / EDIT) ========= */
  const openAddModal = () => {
    setEditingDrone(null);
    setForm({
      name: '',
      status: 'Rảnh',
      battery: '100',
      restaurantId: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (d: DroneItem) => {
    if (d.status === 'Đang giao') {
      Alert.alert('Không thể chỉnh sửa', '🚫 Drone đang giao, không thể chỉnh sửa!');
      return;
    }

    setEditingDrone(d);
    setForm({
      name: d.name,
      status: d.status,
      battery: String(d.battery ?? 0),
      restaurantId: d.restaurantId ?? '',
    });
    setModalVisible(true);
  };

  /* ========= ADD DRONE ========= */
  const handleAdd = async () => {
    const name = form.name.trim();
    const batteryNum = Number(form.battery);
    if (!name || !form.restaurantId) {
      Alert.alert('Thiếu thông tin', 'Nhập tên drone và chọn nhà hàng.');
      return;
    }
    if (isNaN(batteryNum) || batteryNum < 0 || batteryNum > 100) {
      Alert.alert('Sai dữ liệu', 'Pin phải nằm trong khoảng 0–100%.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name,
        status: form.status || 'Rảnh',
        battery: batteryNum,
        restaurantId: form.restaurantId,
        restaurantName: getRestaurantName(form.restaurantId),
        currentOrderId: null,
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'drones'), payload);
      Alert.alert('Thành công', '✅ Đã thêm drone mới!');
      setModalVisible(false);
      setEditingDrone(null);
      fetchAll();
    } catch (err) {
      console.error('add drone failed', err);
      Alert.alert('Lỗi', 'Không thể thêm drone.');
    } finally {
      setSaving(false);
    }
  };

  /* ========= UPDATE DRONE ========= */
  const handleUpdate = async () => {
    if (!editingDrone) return;

    if (editingDrone.status === 'Đang giao') {
      Alert.alert('Không thể chỉnh sửa', '🚫 Drone đang giao, không thể chỉnh sửa!');
      return;
    }

    const name = form.name.trim();
    const batteryNum = Number(form.battery);
    if (!name || !form.restaurantId) {
      Alert.alert('Thiếu thông tin', 'Nhập tên drone và chọn nhà hàng.');
      return;
    }
    if (isNaN(batteryNum) || batteryNum < 0 || batteryNum > 100) {
      Alert.alert('Sai dữ liệu', 'Pin phải nằm trong khoảng 0–100%.');
      return;
    }

    try {
      setSaving(true);

      const droneRef = doc(db, 'drones', editingDrone.id);

      await updateDoc(droneRef, {
        name,
        status: form.status,
        battery: batteryNum,
        restaurantId: form.restaurantId,
        restaurantName: getRestaurantName(form.restaurantId),
      });

      // (Nếu sau này bạn muốn cho phép Đang giao -> Rảnh thì có thể mở logic bên dưới lại)
      /*
      if (editingDrone.status === 'Đang giao' && form.status === 'Rảnh') {
        if (editingDrone.currentOrderId) {
          const orderRef = doc(db, 'orders', editingDrone.currentOrderId);
          await updateDoc(orderRef, {
            status: 'Đã giao',
            deliveredAt: new Date().toISOString(),
            droneId: null,
          });

          await updateDoc(droneRef, { currentOrderId: null });
        }
      }
      */

      Alert.alert('Thành công', '✏️ Cập nhật drone thành công!');
      setModalVisible(false);
      setEditingDrone(null);
      fetchAll();
    } catch (err) {
      console.error('update drone failed', err);
      Alert.alert('Lỗi', 'Không thể cập nhật drone.');
    } finally {
      setSaving(false);
    }
  };

  /* ========= DELETE DRONE ========= */
  const handleDelete = async (d: DroneItem) => {
    if (d.status === 'Đang giao') {
      Alert.alert('Không thể xóa', '🚫 Drone đang giao, không thể xóa!');
      return;
    }

    Alert.alert(
      'Xóa drone',
      `Bạn có chắc muốn xóa drone "${d.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'drones', d.id));
              Alert.alert('Thành công', '🗑️ Đã xóa drone.');
              fetchAll();
            } catch (err) {
              console.error('delete drone failed', err);
              Alert.alert('Lỗi', 'Không thể xóa drone.');
            }
          },
        },
      ]
    );
  };

  /* ========= RENDER ========= */
  if (loading || !user || user.role !== 'admin') return null;
  if (initialLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <Text>Đang tải danh sách drone...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Drone (Admin)</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* FILTER + ACTIONS */}
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchAll} />
        }
        contentContainerStyle={styles.content}
      >
        {/* Search */}
        <View style={styles.filterCard}>
          <Text style={styles.filterLabel}>Tìm theo tên</Text>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Nhập tên drone..."
              placeholderTextColor="#9ca3af"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          {/* Filter nhà hàng */}
          <Text style={[styles.filterLabel, { marginTop: 12 }]}>Nhà hàng</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            <TouchableOpacity
              style={[
                styles.chip,
                restaurantFilter === 'Tất cả' && styles.chipActive,
              ]}
              onPress={() => setRestaurantFilter('Tất cả')}
            >
              <Text
                style={[
                  styles.chipText,
                  restaurantFilter === 'Tất cả' && styles.chipTextActive,
                ]}
              >
                Tất cả
              </Text>
            </TouchableOpacity>

            {restaurants.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.chip,
                  restaurantFilter === (r.name ?? '') && styles.chipActive,
                ]}
                onPress={() => setRestaurantFilter(r.name ?? '')}
              >
                <Text
                  style={[
                    styles.chipText,
                    restaurantFilter === (r.name ?? '') && styles.chipTextActive,
                  ]}
                >
                  {r.name ?? 'Nhà hàng'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Filter trạng thái */}
          <Text style={[styles.filterLabel, { marginTop: 12 }]}>Trạng thái</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {STATUS_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.chip,
                  statusFilter === s && styles.chipActiveStatus,
                ]}
                onPress={() => setStatusFilter(s)}
              >
                <Text
                  style={[
                    styles.chipText,
                    statusFilter === s && styles.chipTextActiveStatus,
                  ]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Add button */}
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
            <Ionicons
              name="add-circle-outline"
              size={18}
              color="#fff"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.addBtnText}>Thêm drone</Text>
          </TouchableOpacity>
        </View>

        {/* LIST DRONES */}
        <View style={{ gap: 12, marginTop: 12 }}>
          {filteredDrones.map((d) => {
            const order = getOrder(d.currentOrderId);
            const isBusy = d.status === 'Đang giao';

            return (
              <View key={d.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{d.name}</Text>
                    <Text style={styles.cardSubtitle}>Pin: {d.battery ?? 0}%</Text>
                    <Text style={styles.cardSubtitle}>
                      Nhà hàng: {getRestaurantName(d.restaurantId)}
                    </Text>
                    {order ? (
                      <Text style={styles.cardSubtitle}>
                        Đơn đang giao: #{d.currentOrderId} —{' '}
                        {order.customer?.name ?? 'Khách hàng'}
                      </Text>
                    ) : (
                      <Text style={styles.cardSubtitle}>Chưa gán đơn</Text>
                    )}
                  </View>

                  {renderStatusBadge(d.status)}
                </View>

                {/* ACTIONS */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.secondaryBtn,
                      isBusy && styles.disabledBtn,
                    ]}
                    disabled={isBusy}
                    onPress={() => openEditModal(d)}
                  >
                    <Ionicons
                      name="create-outline"
                      size={16}
                      color={isBusy ? '#9ca3af' : '#0b1f15'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.secondaryText,
                        isBusy && styles.disabledText,
                      ]}
                    >
                      Sửa
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.deleteBtn,
                      isBusy && styles.disabledBtn,
                    ]}
                    disabled={isBusy}
                    onPress={() => handleDelete(d)}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color="#fff"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.deleteText}>Xóa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {filteredDrones.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="airplane-outline" size={42} color="#7c8a80" />
              <Text style={styles.emptyTitle}>Chưa có drone phù hợp</Text>
              <Text style={styles.emptySubtitle}>
                Thử đổi bộ lọc hoặc kéo xuống để làm mới.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* MODAL ADD / EDIT */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModalVisible(false);
          setEditingDrone(null);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setModalVisible(false);
            setEditingDrone(null);
          }}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>
              {editingDrone ? 'Chỉnh sửa Drone' : 'Thêm Drone'}
            </Text>

            {/* Name */}
            <Text style={styles.modalLabel}>Tên drone</Text>
            <TextInput
              style={styles.modalInput}
              value={form.name}
              onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
              placeholder="Nhập tên drone..."
              placeholderTextColor="#9ca3af"
            />

            {/* Status */}
            <Text style={styles.modalLabel}>Trạng thái</Text>
            <View style={styles.chipRow}>
              {['Rảnh', 'Đang giao', 'Bảo trì'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.chip,
                    form.status === s && styles.chipActiveStatus,
                  ]}
                  disabled={editingDrone?.status === 'Đang giao'} // giống web: không cho chỉnh khi đang giao
                  onPress={() => setForm((f) => ({ ...f, status: s }))}
                >
                  <Text
                    style={[
                      styles.chipText,
                      form.status === s && styles.chipTextActiveStatus,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Battery */}
            <Text style={styles.modalLabel}>Mức pin (%)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={form.battery}
              onChangeText={(t) => setForm((f) => ({ ...f, battery: t }))}
              placeholder="0 - 100"
              placeholderTextColor="#9ca3af"
            />

            {/* Restaurant */}
            <Text style={styles.modalLabel}>Nhà hàng</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {restaurants.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.chip,
                    form.restaurantId === r.id && styles.chipActive,
                  ]}
                  onPress={() =>
                    setForm((f) => ({ ...f, restaurantId: r.id }))
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      form.restaurantId === r.id && styles.chipTextActive,
                    ]}
                  >
                    {r.name ?? 'Nhà hàng'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setModalVisible(false);
                  setEditingDrone(null);
                }}
              >
                <Text style={styles.modalCancelText}>Huỷ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSave, saving && { opacity: 0.6 }]}
                disabled={saving}
                onPress={editingDrone ? handleUpdate : handleAdd}
              >
                <Text style={styles.modalSaveText}>
                  {saving
                    ? 'Đang lưu...'
                    : editingDrone
                      ? 'Cập nhật'
                      : 'Thêm'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

/* ========= STYLES ========= */
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

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* FILTER CARD */
  filterCard: {
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
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f9fafb',
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 4,
  },

  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d9e9df',
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: '#e6f7ef',
    borderColor: '#00b14f',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0b1f15',
  },
  chipTextActive: {
    color: '#007045',
  },

  chipActiveStatus: {
    backgroundColor: '#FFF4E0',
    borderColor: '#FFA726',
  },
  chipTextActiveStatus: {
    color: '#FF7800',
  },

  addBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#00A74F',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  /* LIST */
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0b1f15',
  },
  cardSubtitle: {
    color: '#4b5d52',
    marginTop: 4,
    fontSize: 13,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontWeight: '700',
    fontSize: 12,
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
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryText: {
    color: '#0b1f15',
    fontWeight: '700',
    fontSize: 13,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#DC2626',
  },
  deleteText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  disabledText: {
    color: '#9ca3af',
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

  /* MODAL */
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
    marginBottom: 4,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 4,
    marginBottom: 2,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  modalCancel: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: {
    color: '#111827',
    fontWeight: '700',
  },
  modalSave: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#00A74F',
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: '800',
  },
});
