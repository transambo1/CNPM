import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Pressable,
  Text,
  TouchableOpacity,
  View,
  TextInput, // ⬅️ FIX: Bổ sung import
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Timestamp,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

import { app } from '../libs/firebase';
import { useAuth } from '../libs/AuthContext';

/* ========= TYPES ========= */
type OrderItem = { id: string; name?: string; quantity?: number };
type OrderRecord = {
  id: string;
  status?: string;
  createdAt?: Date | null;
  total?: number;
  customer?: { name?: string; phone?: string; address?: string };
  items?: OrderItem[];
  droneId?: string | null;
};
type DroneRecord = {
  id: string;
  name?: string;
  status?: string;
  battery?: number;
  currentOrderId?: string | null;
};

type ViewMode = 'all' | 'processing' | 'delivering' | 'delivered' | 'drones';
type TimeFilter = 'all' | '24h' | '7d' | '30d';
type DroneFilter = 'delivering' | 'idle' | 'maintaining';

/* ========= HELPERS ========= */
const normalizeStatus = (value?: string | null) => (value ?? '').toLowerCase();

const parseTimestamp = (v: any): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (v instanceof Timestamp) return v.toDate();
  if (typeof v === 'object' && typeof v.seconds === 'number')
    return new Date(v.seconds * 1000);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatCurrency = (v?: number | null) =>
  `${Number(v ?? 0).toLocaleString('vi-VN')} đ`;

const formatDateTime = (v?: Date | null) =>
  v ? v.toLocaleString('vi-VN') : '';

const isProcessingStatus = (s?: string) =>
  normalizeStatus(s).includes('cho') ||
  normalizeStatus(s).includes('chờ') ||
  normalizeStatus(s).includes('xu ly') ||
  normalizeStatus(s).includes('xử lý') ||
  normalizeStatus(s).includes('processing') ||
  normalizeStatus(s) === 'confirmed';

const isDeliveringStatus = (s?: string) =>
  normalizeStatus(s).includes('ang giao') ||
  normalizeStatus(s).includes('đang giao') ||
  normalizeStatus(s).includes('delivering');

const isDeliveredStatus = (s?: string) =>
  normalizeStatus(s).includes('a giao') ||
  normalizeStatus(s).includes('đã giao') ||
  normalizeStatus(s).includes('delivered');

const isDroneIdle = (s?: string) =>
  ['ranh', 'rảnh', 'idle', 'available', ''].includes(normalizeStatus(s));

const isDroneDelivering = (s?: string) =>
  normalizeStatus(s).includes('giao') || normalizeStatus(s).includes('deliver');

const isDroneMaintaining = (s?: string) =>
  normalizeStatus(s).includes('bao tri') ||
  normalizeStatus(s).includes('bảo trì') ||
  normalizeStatus(s).includes('maintain');

/* ========= FADE WRAPPER ========= */
function FadeIn({ children, depsKey }: { children: React.ReactNode; depsKey: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [depsKey, opacity]);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

/* ========= SCREEN ========= */
export default function RestaurantAdminScreen() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const db = useMemo(() => getFirestore(app), []);

  // Data
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [drones, setDrones] = useState<DroneRecord[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [dronesLoaded, setDronesLoaded] = useState(false);

  // UI/State
  const [pickerOrder, setPickerOrder] = useState<OrderRecord | null>(null);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [markingOrderId, setMarkingOrderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [droneFilter, setDroneFilter] = useState<DroneFilter>('idle');

  // View control
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [menuVisible, setMenuVisible] = useState(false);

  /* ----- Auth Guard ----- */
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    if (user.role !== 'restaurant') router.replace('/');
  }, [loading, user, router]);

  /* ----- Firestore subscriptions ----- */
  useEffect(() => {
    if (!user?.restaurantId) {
      setOrders([]); setDrones([]);
      setOrdersLoaded(true); setDronesLoaded(true);
      return;
    }

    setOrdersLoaded(false);
    setDronesLoaded(false);

    const ordersQuery = query(
      collection(db, 'orders'),
      where('restaurantId', '==', user.restaurantId)
    );
    const dronesQuery = query(
      collection(db, 'drones'),
      where('restaurantId', '==', user.restaurantId)
    );

    const unsubOrders = onSnapshot(
      ordersQuery,
      (snap) => {
        const data = snap.docs.map((d) => {
          const val = d.data() as any;
          return {
            id: d.id,
            status: val.status,
            createdAt: parseTimestamp(val.createdAt),
            total: Number(val.total ?? val.totalPrice ?? 0),
            customer: val.customer,
            items: Array.isArray(val.items) ? val.items : [],
            droneId: val.droneId ?? null,
          } as OrderRecord;
        });
        data.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
        setOrders(data);
        setOrdersLoaded(true);
      },
      () => setOrdersLoaded(true)
    );

    const unsubDrones = onSnapshot(
      dronesQuery,
      (snap) => {
        const data = snap.docs.map((d) => {
          const val = d.data() as any;
          return {
            id: d.id,
            name: val.name ?? val.model ?? `Drone ${d.id}`,
            status: val.status,
            battery: Number(val.battery ?? 0),
            currentOrderId: val.currentOrderId ?? null,
          } as DroneRecord;
        });
        setDrones(data);
        setDronesLoaded(true);
      },
      () => setDronesLoaded(true)
    );

    return () => { unsubOrders(); unsubDrones(); };
  }, [db, user?.restaurantId]);

  /* ----- Derived ----- */
  const availableDrones = useMemo(
    () => drones.filter((dr) => isDroneIdle(dr.status) && !dr.currentOrderId),
    [drones]
  );

  const filteredDrones = useMemo(() => {
    return drones.filter((dr) => {
      if (droneFilter === 'idle') return isDroneIdle(dr.status);
      if (droneFilter === 'delivering') return isDroneDelivering(dr.status);
      if (droneFilter === 'maintaining') return isDroneMaintaining(dr.status);
      return true;
    });
  }, [drones, droneFilter]);

  const filteredOrders = useMemo(() => {
    switch (viewMode) {
      case 'processing':
        return orders.filter((o) => isProcessingStatus(o.status));
      case 'delivering':
        return orders.filter((o) => isDeliveringStatus(o.status));
      case 'delivered':
        return orders.filter((o) => isDeliveredStatus(o.status));
      case 'all':
      default:
        return orders;
    }
  }, [orders, viewMode]);

  const isLoading = loading || !ordersLoaded || !dronesLoaded;

  /* ----- Actions ----- */
  const handleLogout = useCallback(() => {
    setMenuVisible(false);
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            setTimeout(() => router.replace('/(auth)/login'), 100);
          } catch (err) { }
        },
      },
    ]);
  }, [logout, router]);

  const handleAssignDrone = useCallback(
    async (drone: DroneRecord) => {
      if (!pickerOrder) return;
      setAssigningOrderId(pickerOrder.id);
      try {
        await updateDoc(doc(db, 'drones', drone.id), {
          status: 'Đang giao',
          currentOrderId: pickerOrder.id,
          destination: pickerOrder.customer?.address ?? null,
        });
        await updateDoc(doc(db, 'orders', pickerOrder.id), {
          status: 'Đang giao',
          droneId: drone.id,
          statusText: 'Đang giao bằng drone',
        });
        Alert.alert('Thành công', `Đã gán ${drone.name ?? 'drone'} cho đơn #${pickerOrder.id}.`);
        setPickerOrder(null);
      } catch (error) {
        Alert.alert('Lỗi', 'Không thể gán drone.');
      } finally {
        setAssigningOrderId(null);
      }
    },
    [db, pickerOrder]
  );

  const handleMarkDelivered = useCallback(
    async (order: OrderRecord) => {
      setMarkingOrderId(order.id);
      try {
        await updateDoc(doc(db, 'orders', order.id), {
          status: 'Đã giao',
          statusText: 'Đã giao bằng drone',
        });
        if (order.droneId) {
          await updateDoc(doc(db, 'drones', order.droneId), {
            status: 'Rảnh',
            currentOrderId: null,
            destination: null,
          });
        }
        Alert.alert('Hoàn tất', `Đơn #${order.id} đã giao xong.`);
      } catch (error) {
        Alert.alert('Lỗi', 'Không thể cập nhật trạng thái.');
      } finally {
        setMarkingOrderId(null);
      }
    },
    [db]
  );

  /* ----- Render ----- */
  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#00A74F" />
      </SafeAreaView>
    );
  }

  const sectionMeta: Record<ViewMode, { icon: string; title: string; count: number }> = {
    all: { icon: '', title: 'Tổng tất cả', count: filteredOrders.length },
    processing: { icon: '', title: 'Đơn đang xử lý', count: filteredOrders.length },
    delivering: { icon: '', title: 'Đơn đang giao', count: filteredOrders.length },
    delivered: { icon: '', title: 'Đơn đã giao', count: filteredOrders.length },
    drones: { icon: '', title: 'Quản lý Drone', count: filteredDrones.length },
  };

  const fadeKey = `${viewMode}:${filteredOrders.length}:${filteredDrones.length}:${droneFilter}`;
  const menuItems: { key: ViewMode | 'products'; label: string; type: 'view' | 'navigate' }[] = [
    { key: 'all', label: 'Tổng đơn hàng', type: 'view' },
    { key: 'processing', label: 'Đơn đang xử lý', type: 'view' },
    { key: 'delivering', label: 'Đơn đang giao', type: 'view' },
    { key: 'delivered', label: 'Đơn đã giao', type: 'view' },
    { key: 'drones', label: 'Quản lý Drone', type: 'view' },
    { key: 'products', label: 'Quản lý sản phẩm', type: 'navigate' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Quản lý nhà hàng</Text>
            <Text style={styles.subtitle}>{user?.restaurantName ?? 'Nhà hàng của bạn'}</Text>
          </View>

          <TouchableOpacity style={styles.menuButton} onPress={() => setMenuVisible(true)}>
            <Ionicons name="menu-outline" size={26} color="#1A1C1E" />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filterBlock}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#6C6F75" />
            <TextInput
              style={styles.searchInput}
              placeholder="Mã đơn, tên khách, địa chỉ"
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {(['all', 'processing', 'delivering', 'delivered'] as ViewMode[]).map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.chip, viewMode === v && styles.chipActive]}
                onPress={() => setViewMode(v)}
              >
                <Text style={[styles.chipText, viewMode === v && styles.chipTextActive]}>
                  {v === 'all'
                    ? 'Tất cả đơn'
                    : v === 'processing'
                      ? 'Đang xử lý'
                      : v === 'delivering'
                        ? 'Đang giao'
                        : 'Đã giao'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {(['all', '24h', '7d', '30d'] as TimeFilter[]).map((tf) => (
              <TouchableOpacity
                key={tf}
                style={[styles.chip, timeFilter === tf && styles.chipActive]}
                onPress={() => setTimeFilter(tf)}
              >
                <Text style={[styles.chipText, timeFilter === tf && styles.chipTextActive]}>
                  {tf === 'all'
                    ? 'Tất cả thời gian'
                    : tf === '24h'
                      ? '24h gần nhất'
                      : tf === '7d'
                        ? '7 ngày'
                        : '30 ngày'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Section Header Card */}
        <FadeIn depsKey={fadeKey}>
          <View style={styles.sectionHeaderCard}>
            <Text style={styles.sectionHeaderText}>
              {sectionMeta[viewMode].title}{' '}
              {viewMode !== 'drones' ? (
                <Text style={styles.sectionHeaderCount}> {sectionMeta[viewMode].count} đơn</Text>
              ) : (
                <Text style={styles.sectionHeaderCount}> {sectionMeta[viewMode].count} drone</Text>
              )}
            </Text>
          </View>

          {viewMode === 'drones' ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.chipRow, { marginTop: 8 }]}
            >
              {(['idle', 'delivering', 'maintaining'] as DroneFilter[]).map((df) => (
                <TouchableOpacity
                  key={df}
                  style={[styles.chip, droneFilter === df && styles.chipActive]}
                  onPress={() => setDroneFilter(df)}
                >
                  <Text style={[styles.chipText, droneFilter === df && styles.chipTextActive]}>
                    {df === 'idle' ? 'Rảnh' : df === 'delivering' ? 'Đang giao' : 'Bảo trì'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}

          {/* Content */}
          {viewMode === 'drones' ? (
            <View style={{ marginTop: 8 }}>
              {filteredDrones.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="airplane-outline" size={48} color="#999" />
                  <Text style={styles.emptyTitle}>Chưa có drone nào</Text>
                  <Text style={styles.emptySubtitle}>
                    Bạn chưa được cấp drone hoặc không có drone phù hợp bộ lọc.
                  </Text>
                </View>
              ) : (
                filteredDrones.map((drone) => {
                  const assignedOrder = orders.find((o) => o.id === drone.currentOrderId);
                  return (
                    <View key={drone.id} style={styles.droneCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.droneName}>{drone.name}</Text>
                        <Text style={styles.droneSub}>
                          Pin: {drone.battery ?? 0}% | Trạng thái: {drone.status ?? 'Không rõ'}
                        </Text>
                        {assignedOrder ? (
                          <View style={styles.droneOrderBox}>
                            <Text style={styles.droneOrderTitle}>Đơn #{assignedOrder.id}</Text>
                            <Text style={styles.droneOrderSubtitle} numberOfLines={2}>
                              {assignedOrder.customer?.address ?? 'Chưa có địa chỉ'}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* FIXED: Không còn thẻ dư, không còn đóng sai */}
                      <TouchableOpacity
                        style={styles.droneBtn}
                        onPress={async () => {
                          try {
                            const newStatus = isDroneIdle(drone.status) ? 'Đang bảo trì' : 'Rảnh';
                            await updateDoc(doc(db, 'drones', drone.id), { status: newStatus });
                            Alert.alert('Cập nhật', `Trạng thái drone đã đổi thành "${newStatus}"`);
                          } catch (err) {
                            Alert.alert('Lỗi', 'Không thể cập nhật trạng thái drone.');
                          }
                        }}
                      >
                        <Text style={styles.droneBtnText}>Đổi trạng thái</Text>
                      </TouchableOpacity>

                    </View>
                  );
                })
              )}
            </View>
          ) : (
            <View style={{ marginTop: 8 }}>
              {filteredOrders.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="receipt-outline" size={48} color="#999" />
                  <Text style={styles.emptyTitle}>Không có đơn hàng phù hợp</Text>
                  <Text style={styles.emptySubtitle}>
                    Hãy thử chọn mục khác trong menu ở góc phải phía trên.
                  </Text>
                </View>
              ) : (
                filteredOrders.map((order) => {
                  const assignedDrone = drones.find((d) => d.id === order.droneId);
                  const status = order.status ?? '';
                  const canAssign = !isDeliveredStatus(status) && !isDeliveringStatus(status);
                  const canMarkDelivered = isDeliveringStatus(status);

                  return (
                    <View key={order.id} style={styles.orderCard}>
                      <View style={styles.orderHeaderRow}>
                        <View>
                          <Text style={styles.orderCode}>Đơn #{order.id}</Text>
                          <Text style={styles.orderDate}>{formatDateTime(order.createdAt)}</Text>
                        </View>
                        <View style={[styles.statusBadge, getStatusStyle(status)]}>
                          <Text style={styles.statusText}>{status}</Text>
                        </View>
                      </View>

                      <View style={styles.orderInfoRow}>
                        <Ionicons name="person-outline" size={18} color="#555" />
                        <View style={styles.orderInfoText}>
                          <Text style={styles.orderLabel}>{order.customer?.name ?? 'Khách lẻ'}</Text>
                          <Text style={styles.orderSubLabel}>{order.customer?.phone}</Text>
                        </View>
                      </View>

                      <View style={styles.orderInfoRow}>
                        <Ionicons name="location-outline" size={18} color="#555" />
                        <View style={styles.orderInfoText}>
                          <Text style={styles.orderLabel}>
                            {order.customer?.address ?? 'Không rõ địa chỉ'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.orderFooter}>
                        <View>
                          <Text style={styles.totalLabel}>Tổng tiền</Text>
                          <Text style={styles.totalValue}>{formatCurrency(order.total)}</Text>
                        </View>

                        <View style={styles.actionColumn}>
                          {assignedDrone ? (
                            <View style={styles.droneTag}>
                              <Ionicons name="airplane-outline" size={16} color="#00A74F" />
                              <Text style={styles.droneTagText}>
                                {assignedDrone.name} {assignedDrone.battery ?? 0}% pin
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.droneTagMuted}>
                              <Ionicons name="airplane-outline" size={16} color="#999" />
                              <Text style={styles.droneMutedText}>Chưa có drone</Text>
                            </View>
                          )}

                          {canAssign ? (
                            <TouchableOpacity
                              style={styles.primaryButton}
                              onPress={() => setPickerOrder(order)}
                              disabled={assigningOrderId === order.id}
                            >
                              {assigningOrderId === order.id ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Text style={styles.primaryButtonText}>Giao bằng drone</Text>
                              )}
                            </TouchableOpacity>
                          ) : canMarkDelivered ? (
                            <TouchableOpacity
                              style={[styles.primaryButton, styles.successButton]}
                              onPress={() => handleMarkDelivered(order)}
                              disabled={markingOrderId === order.id}
                            >
                              {markingOrderId === order.id ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Text style={styles.primaryButtonText}>Đã giao xong</Text>
                              )}
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.disabledButton}>
                              <Text style={styles.disabledButtonText}>Đơn đã xử lý</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </FadeIn>
      </ScrollView>

      {/* Modal chọn Drone */}
      <Modal visible={!!pickerOrder} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn drone để giao</Text>
            {availableDrones.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Ionicons name="alert-circle-outline" size={32} color="#FF7043" />
                <Text style={styles.modalEmptyText}>Hiện chưa có drone nào rảnh.</Text>
              </View>
            ) : (
              availableDrones.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={styles.modalOption}
                  onPress={() => handleAssignDrone(d)}
                  disabled={assigningOrderId === pickerOrder?.id}
                >
                  <View>
                    <Text style={styles.modalOptionTitle}>{d.name}</Text>
                    <Text style={styles.modalOptionSubtitle}>Pin {d.battery}% - {d.status}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#00A74F" />
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setPickerOrder(null)}
              disabled={assigningOrderId === pickerOrder?.id}
            >
              <Text style={styles.modalCancelText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Menu */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <Pressable
            style={styles.menuContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.menuTitle}>Tuỳ chọn</Text>

            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.menuItem}
                onPress={() => {
                  if (item.type === 'navigate') {
                    setMenuVisible(false);
                    router.push('/restaurant-admin-products');
                    return;
                  }
                  setViewMode(item.key as ViewMode);
                  setMenuVisible(false);
                }}
              >
                <Text style={styles.menuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: '#FDECEA' }]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={18} color="#E53935" />
              <Text style={[styles.menuItemText, { color: '#E53935' }]}>Đăng xuất</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

/* ========= STYLE ========= */
const getStatusStyle = (status: string) => {
  if (isDeliveredStatus(status)) return styles.statusDelivered;
  if (isDeliveringStatus(status)) return styles.statusDelivering;
  if (isProcessingStatus(status)) return styles.statusProcessing;
  return styles.statusPending;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F5F7FA' },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },

  /* Header */
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1C1E' },
  subtitle: { marginTop: 4, fontSize: 15, color: '#4A4C50' },
  menuButton: {
    padding: 8, backgroundColor: '#fff', borderRadius: 999,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },

  /* Search Box */
  filterBlock: { gap: 12, marginTop: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1A1C1E',
  },

  /* Chips */
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: '#007C35' },
  chipText: { color: '#333', fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  /* Section Header Card */
  sectionHeaderCard: {
    marginTop: 16,
    backgroundColor: '#E6F6EC',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  sectionHeaderText: { color: '#007C35', fontWeight: '700', fontSize: 15 },
  sectionHeaderCount: { color: '#007C35', fontWeight: '700', fontSize: 15 },

  /* Drone list */
  droneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  droneName: { fontSize: 16, fontWeight: '700', color: '#1A1C1E' },
  droneSub: { color: '#6C6F75', fontSize: 13, marginTop: 4 },

  droneBtn: { backgroundColor: '#00A74F', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  droneBtnText: { color: '#FFF', fontWeight: '600', fontSize: 13 },

  droneOrderBox: { marginTop: 10 },
  droneOrderTitle: { fontWeight: '700', fontSize: 14, color: '#1A1C1E' },
  droneOrderSubtitle: { fontSize: 13, color: '#6C6F75', marginTop: 2 },

  /* Orders list */
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
    marginTop: 12,
  },
  orderHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderCode: { fontSize: 16, fontWeight: '700', color: '#1A1C1E' },
  orderDate: { marginTop: 2, color: '#6C6F75', fontSize: 13 },
  orderInfoRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  orderInfoText: { flex: 1, gap: 2 },
  orderLabel: { fontSize: 14, fontWeight: '600', color: '#1A1C1E' },
  orderSubLabel: { fontSize: 13, color: '#6C6F75' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },

  totalLabel: { fontSize: 13, color: '#6C6F75' },
  totalValue: { marginTop: 4, fontSize: 18, fontWeight: '700', color: '#1A1C1E' },

  actionColumn: { alignItems: 'flex-end', gap: 10 },

  droneTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E6F6EC', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
  },
  droneTagText: { color: '#007C35', fontWeight: '600', fontSize: 13 },
  droneTagMuted: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F1F2F4', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
  },
  droneMutedText: { fontSize: 13, color: '#85888E' },

  primaryButton: {
    backgroundColor: '#00A74F',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700' },
  successButton: { backgroundColor: '#2E7D32' },
  disabledButton: { backgroundColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  disabledButtonText: { color: '#8C8C8C', fontWeight: '600' },

  /* Empty state */
  emptyState: {
    alignItems: 'center', gap: 12, padding: 32,
    backgroundColor: '#FFFFFF', borderRadius: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1A1C1E', textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#6C6F75', textAlign: 'center' },

  /* Modal chọn drone */
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalContent: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1C1E' },
  modalEmpty: { alignItems: 'center', gap: 12, paddingVertical: 12 },
  modalEmptyText: { fontSize: 14, color: '#6C6F75', textAlign: 'center' },
  modalOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E0E0E0',
  },
  modalOptionTitle: { fontSize: 16, fontWeight: '600', color: '#1A1C1E' },
  modalOptionSubtitle: { fontSize: 13, color: '#6C6F75', marginTop: 4 },
  modalCancel: {
    marginTop: 4, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 999, borderWidth: 1, borderColor: '#00A74F',
  },
  modalCancelText: { color: '#00A74F', fontWeight: '600' },

  /* Menu */
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  menuContainer: { width: '80%', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20 },
  menuTitle: { fontSize: 18, fontWeight: '700', color: '#1A1C1E', marginBottom: 10, textAlign: 'center' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 8, marginBottom: 6, backgroundColor: '#F5F7FA',
  },
  menuItemText: { fontSize: 15, fontWeight: '600', color: '#1A1C1E' },
  menuDivider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 8 },

  /* Status badges */
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    color: '#1A1C1E',
    fontWeight: '600',
    fontSize: 13,
  },
  statusProcessing: {
    backgroundColor: '#FFF7E6',
  },
  statusDelivering: {
    backgroundColor: '#E6F0FF',
  },
  statusDelivered: {
    backgroundColor: '#E6F6EC',
  },
  statusPending: {
    backgroundColor: '#F1F2F4',
  },

});
