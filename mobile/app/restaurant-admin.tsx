import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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

type OrderItem = {
  id: string;
  name?: string;
  quantity?: number;
};

type OrderRecord = {
  id: string;
  status?: string;
  createdAt?: Date | null;
  total?: number;
  customer?: {
    name?: string;
    phone?: string;
    address?: string;
  };
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

const normalizeStatus = (value?: string | null) => (value ?? '').toLowerCase();

const parseTimestamp = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatCurrency = (value?: number | null) =>
  `${Number(value ?? 0).toLocaleString('vi-VN')}₫`;

const formatDateTime = (value?: Date | null) => {
  if (!value) return '—';
  return value.toLocaleString('vi-VN');
};

const isProcessingStatus = (status?: string) => {
  const s = normalizeStatus(status);
  return (
    s.includes('chờ') ||
    s.includes('xử lý') ||
    s.includes('processing') ||
    s === 'confirmed'
  );
};

const isDeliveringStatus = (status?: string) => {
  const s = normalizeStatus(status);
  return s.includes('đang giao') || s.includes('delivering');
};

const isDeliveredStatus = (status?: string) => {
  const s = normalizeStatus(status);
  return s.includes('đã giao') || s.includes('delivered');
};

const isDroneIdle = (status?: string) => {
  const s = normalizeStatus(status);
  return s === '' || s === 'rảnh' || s === 'idle' || s === 'available';
};

export default function RestaurantAdminScreen() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const db = useMemo(() => getFirestore(app), []);

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [drones, setDrones] = useState<DroneRecord[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [dronesLoaded, setDronesLoaded] = useState(false);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [markingOrderId, setMarkingOrderId] = useState<string | null>(null);
  const [pickerOrder, setPickerOrder] = useState<OrderRecord | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    if (user.role !== 'restaurant') {
      router.replace('/');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user?.restaurantId) {
      setOrders([]);
      setDrones([]);
      setOrdersLoaded(true);
      setDronesLoaded(true);
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

    const unsubscribeOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any;
          return {
            id: docSnap.id,
            status: data.status,
            createdAt: parseTimestamp(data.createdAt),
            total: Number(data.total ?? data.totalPrice ?? 0),
            customer: data.customer,
            items: Array.isArray(data.items) ? data.items : [],
            droneId: data.droneId ?? null,
          } as OrderRecord;
        });
        data.sort((a, b) => {
          const tA = a.createdAt?.getTime() ?? 0;
          const tB = b.createdAt?.getTime() ?? 0;
          return tB - tA;
        });
        setOrders(data);
        setOrdersLoaded(true);
      },
      (error) => {
        console.error('Failed to subscribe orders', error);
        Alert.alert('Lỗi', 'Không thể tải danh sách đơn hàng.');
        setOrdersLoaded(true);
      }
    );

    const unsubscribeDrones = onSnapshot(
      dronesQuery,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any;
          return {
            id: docSnap.id,
            name: data.name ?? data.model ?? `Drone ${docSnap.id}`,
            status: data.status,
            battery: Number(data.battery ?? 0),
            currentOrderId: data.currentOrderId ?? null,
          } as DroneRecord;
        });
        setDrones(data);
        setDronesLoaded(true);
      },
      (error) => {
        console.error('Failed to subscribe drones', error);
        Alert.alert('Lỗi', 'Không thể tải danh sách drone.');
        setDronesLoaded(true);
      }
    );

    return () => {
      unsubscribeOrders();
      unsubscribeDrones();
    };
  }, [db, user?.restaurantId]);

  const availableDrones = useMemo(
    () =>
      drones.filter(
        (drone) => isDroneIdle(drone.status) && !drone.currentOrderId
      ),
    [drones]
  );

  const stats = useMemo(() => {
    const total = orders.length;
    const processing = orders.filter((order) => isProcessingStatus(order.status)).length;
    const delivering = orders.filter((order) => isDeliveringStatus(order.status)).length;
    const delivered = orders.filter((order) => isDeliveredStatus(order.status)).length;
    return { total, processing, delivering, delivered };
  }, [orders]);

  const findDrone = useCallback(
    (id?: string | null) => drones.find((drone) => String(drone.id) === String(id)),
    [drones]
  );

  const handleLogout = useCallback(() => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản nhà hàng?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            console.error('Failed to logout', error);
          } finally {
            router.replace('/(auth)/login');
          }
        },
      },
    ]);
  }, [logout, router]);

  const handleAssignDrone = useCallback(
    async (drone: DroneRecord) => {
      if (!pickerOrder || !user?.restaurantId) return;
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
        console.error('Failed to assign drone', error);
        Alert.alert('Lỗi', 'Không thể gán drone. Vui lòng thử lại.');
      } finally {
        setAssigningOrderId(null);
      }
    },
    [db, pickerOrder, user?.restaurantId]
  );

  const handleMarkDelivered = useCallback(
    async (order: OrderRecord) => {
      if (!order) return;
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

        Alert.alert('Thành công', `Đơn #${order.id} đã được đánh dấu hoàn tất.`);
      } catch (error) {
        console.error('Failed to mark delivered', error);
        Alert.alert('Lỗi', 'Không thể cập nhật trạng thái đơn.');
      } finally {
        setMarkingOrderId(null);
      }
    },
    [db]
  );

  const isLoading = loading || !ordersLoaded || !dronesLoaded;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#00A74F" />
      </SafeAreaView>
    );
  }

  if (!user?.restaurantId) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.emptyTitle}>Không tìm thấy nhà hàng được gán.</Text>
        <Text style={styles.emptySubtitle}>
          Vui lòng liên hệ quản trị viên để được cấp quyền quản lý nhà hàng.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/') }>
          <Ionicons name="arrow-back" size={18} color="#00A74F" />
          <Text style={styles.backButtonText}>Quay lại trang chính</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Quản lý nhà hàng</Text>
            <Text style={styles.subtitle}>{user.restaurantName ?? 'Nhà hàng của bạn'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#E53935" />
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statRow}>
          <View style={[styles.statCard, styles.statPrimary]}>
            <Text style={[styles.statLabel, styles.statPrimaryText]}>Tổng đơn</Text>
            <Text style={[styles.statValue, styles.statPrimaryText]}>{stats.total}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Đang xử lý</Text>
            <Text style={styles.statValue}>{stats.processing}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Đang giao</Text>
            <Text style={styles.statValue}>{stats.delivering}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Đã giao</Text>
            <Text style={styles.statValue}>{stats.delivered}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Đơn hàng gần đây</Text>
          <View style={styles.sectionBadge}>
            <Ionicons name="bicycle-outline" size={16} color="#00A74F" />
            <Text style={styles.sectionBadgeText}>{availableDrones.length} drone rảnh</Text>
          </View>
        </View>

        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#999" />
            <Text style={styles.emptyTitle}>Chưa có đơn hàng nào</Text>
            <Text style={styles.emptySubtitle}>
              Khi có khách đặt, đơn hàng sẽ xuất hiện tại đây để bạn xử lý và gán drone giao.
            </Text>
          </View>
        ) : (
          orders.map((order) => {
            const assignedDrone = findDrone(order.droneId ?? undefined);
            const status = order.status ?? '—';
            const canAssign = !isDeliveredStatus(status) && !isDeliveringStatus(status);
            const canMarkDelivered = isDeliveringStatus(status);

            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
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
                    <Text style={styles.orderLabel}>{order.customer?.address ?? 'Không rõ địa chỉ'}</Text>
                  </View>
                </View>

                <View style={styles.orderInfoRow}>
                  <Ionicons name="fast-food-outline" size={18} color="#555" />
                  <View style={styles.orderInfoText}>
                    {order.items?.slice(0, 3).map((item) => (
                      <Text key={item.id} style={styles.orderSubLabel}>
                        • {item.name} x{item.quantity ?? 1}
                      </Text>
                    ))}
                    {(order.items?.length ?? 0) > 3 && (
                      <Text style={styles.orderSubLabel}>
                        + {Math.max(0, (order.items?.length ?? 0) - 3)} món khác
                      </Text>
                    )}
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
                          {assignedDrone.name ?? 'Drone'} • {assignedDrone.battery ?? 0}% pin
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
      </ScrollView>

      <Modal visible={!!pickerOrder} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn drone giao hàng</Text>
            {availableDrones.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Ionicons name="alert-circle-outline" size={32} color="#FF7043" />
                <Text style={styles.modalEmptyText}>Hiện chưa có drone nào rảnh.</Text>
              </View>
            ) : (
              availableDrones.map((drone) => (
                <TouchableOpacity
                  key={drone.id}
                  style={styles.modalOption}
                  onPress={() => handleAssignDrone(drone)}
                  disabled={assigningOrderId === pickerOrder?.id}
                >
                  <View>
                    <Text style={styles.modalOptionTitle}>{drone.name ?? 'Drone không tên'}</Text>
                    <Text style={styles.modalOptionSubtitle}>Pin {drone.battery ?? 0}%</Text>
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
    </SafeAreaView>
  );
}

const getStatusStyle = (status: string) => {
  if (isDeliveredStatus(status)) return styles.statusDelivered;
  if (isDeliveringStatus(status)) return styles.statusDelivering;
  if (isProcessingStatus(status)) return styles.statusProcessing;
  return styles.statusPending;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    color: '#4A4C50',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E53935',
    backgroundColor: '#FDECEA',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C62828',
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  statPrimary: {
    backgroundColor: '#00A74F',
  },
  statPrimaryText: {
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4A4C50',
  },
  statValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E6F6EC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  sectionBadgeText: {
    color: '#007C35',
    fontWeight: '600',
    fontSize: 13,
  },
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
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  orderDate: {
    marginTop: 2,
    color: '#6C6F75',
    fontSize: 13,
  },
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
  orderInfoRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  orderInfoText: {
    flex: 1,
    gap: 2,
  },
  orderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1C1E',
  },
  orderSubLabel: {
    fontSize: 13,
    color: '#6C6F75',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  totalLabel: {
    fontSize: 13,
    color: '#6C6F75',
  },
  totalValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  actionColumn: {
    alignItems: 'flex-end',
    gap: 10,
  },
  droneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E6F6EC',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  droneTagText: {
    color: '#007C35',
    fontWeight: '600',
    fontSize: 13,
  },
  droneTagMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F2F4',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  droneMutedText: {
    fontSize: 13,
    color: '#85888E',
  },
  primaryButton: {
    backgroundColor: '#00A74F',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  successButton: {
    backgroundColor: '#2E7D32',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  disabledButtonText: {
    color: '#8C8C8C',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6C6F75',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  modalEmpty: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  modalEmptyText: {
    fontSize: 14,
    color: '#6C6F75',
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1C1E',
  },
  modalOptionSubtitle: {
    fontSize: 13,
    color: '#6C6F75',
    marginTop: 4,
  },
  modalCancel: {
    marginTop: 4,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#00A74F',
  },
  modalCancelText: {
    color: '#00A74F',
    fontWeight: '600',
  },
  backButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#00A74F',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#E6F6EC',
  },
  backButtonText: {
    color: '#007C35',
    fontWeight: '600',
  },
});
