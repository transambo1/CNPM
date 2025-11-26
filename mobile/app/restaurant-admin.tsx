import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

type AdminTab = 'overview' | 'orders' | 'drones' | 'products';
type OrderFilter = 'all' | 'processing' | 'delivering' | 'delivered';
type TimeFilter = 'all' | '24h' | '7d' | '30d';
type DroneFilter = 'idle' | 'delivering' | 'maintaining';

const normalizeStatus = (value?: string | null) => (value ?? '').toLowerCase();

const parseTimestamp = (v: any): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (v instanceof Timestamp) return v.toDate();
  if (typeof v === 'object' && typeof v.seconds === 'number') return new Date(v.seconds * 1000);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatCurrency = (v?: number | null) => `${Number(v ?? 0).toLocaleString('vi-VN')} đ`;
const formatDateTime = (v?: Date | null) => (v ? v.toLocaleString('vi-VN') : '');

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

const isDroneIdle = (s?: string) => ['ranh', 'rảnh', 'idle', 'available', ''].includes(normalizeStatus(s));
const isDroneDelivering = (s?: string) => normalizeStatus(s).includes('giao') || normalizeStatus(s).includes('deliver');
const isDroneMaintaining = (s?: string) =>
  normalizeStatus(s).includes('bao tri') ||
  normalizeStatus(s).includes('bảo trì') ||
  normalizeStatus(s).includes('maintain');

function FadeIn({ children, depsKey }: { children: React.ReactNode; depsKey: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [depsKey]);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

export default function RestaurantAdminScreen() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const db = useMemo(() => getFirestore(app), []);

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [drones, setDrones] = useState<DroneRecord[]>([]);

  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [dronesLoaded, setDronesLoaded] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
  const [pickerOrder, setPickerOrder] = useState<OrderRecord | null>(null);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [markingOrderId, setMarkingOrderId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [droneFilter, setDroneFilter] = useState<DroneFilter>('idle');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    if (user.role !== 'restaurant') router.replace('/');
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

    const unsubOrders = onSnapshot(
      query(collection(db, 'orders'), where('restaurantId', '==', user.restaurantId)),
      (snap) => {
        const arr = snap.docs.map((d) => {
          const v = d.data() as any;
          return {
            id: d.id,
            status: v.status,
            createdAt: parseTimestamp(v.createdAt),
            total: Number(v.total ?? v.totalPrice ?? 0),
            customer: v.customer,
            items: Array.isArray(v.items) ? v.items : [],
            droneId: v.droneId ?? null,
          } as OrderRecord;
        });
        arr.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
        setOrders(arr);
        setOrdersLoaded(true);
      },
      () => setOrdersLoaded(true)
    );

    const unsubDrones = onSnapshot(
      query(collection(db, 'drones'), where('restaurantId', '==', user.restaurantId)),
      (snap) => {
        setDrones(
          snap.docs.map((d) => {
            const v = d.data() as any;
            return {
              id: d.id,
              name: v.name ?? v.model ?? `Drone ${d.id}`,
              status: v.status,
              battery: Number(v.battery ?? 0),
              currentOrderId: v.currentOrderId ?? null,
            } as DroneRecord;
          })
        );
        setDronesLoaded(true);
      },
      () => setDronesLoaded(true)
    );

    return () => {
      unsubOrders();
      unsubDrones();
    };
  }, [db, user?.restaurantId]);

  const availableDrones = useMemo(
    () => drones.filter((d) => isDroneIdle(d.status) && !d.currentOrderId),
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

  const overviewStats = useMemo(() => {
    const delivered = orders.filter((o) => isDeliveredStatus(o.status)).length;
    const delivering = orders.filter((o) => isDeliveringStatus(o.status)).length;
    const processing = orders.filter((o) => isProcessingStatus(o.status)).length;
    const revenue = orders
      .filter((o) => isDeliveredStatus(o.status))
      .reduce((sum, o) => sum + Number(o.total ?? o.totalPrice ?? 0), 0);
    const droneIdle = drones.filter((d) => isDroneIdle(d.status)).length;

    return {
      orders: orders.length,
      delivered,
      delivering,
      processing,
      revenue,
      drones: drones.length,
      droneIdle,
      droneBusy: Math.max(0, drones.length - droneIdle),
    };
  }, [orders, drones]);

  const filteredOrders = useMemo(() => {
    const term = search.toLowerCase().trim();
    const now = Date.now();
    const inRange = (dt?: Date | null) => {
      if (!dt) return true;
      const diff = now - dt.getTime();
      if (timeFilter === '24h') return diff <= 24 * 3600 * 1000;
      if (timeFilter === '7d') return diff <= 7 * 24 * 3600 * 1000;
      if (timeFilter === '30d') return diff <= 30 * 24 * 3600 * 1000;
      return true;
    };

    const list = orders.filter((o) => {
      const matches =
        o.id.toLowerCase().includes(term) ||
        (o.customer?.name ?? '').toLowerCase().includes(term) ||
        (o.customer?.address ?? '').toLowerCase().includes(term);
      return matches && inRange(o.createdAt);
    });

    if (orderFilter === 'processing') return list.filter((o) => isProcessingStatus(o.status));
    if (orderFilter === 'delivering') return list.filter((o) => isDeliveringStatus(o.status));
    if (orderFilter === 'delivered') return list.filter((o) => isDeliveredStatus(o.status));
    return list;
  }, [orders, search, timeFilter, orderFilter]);

  const isLoading = loading || !ordersLoaded || !dronesLoaded;

  const handleLogout = useCallback(() => {
    Alert.alert('Đăng xuất', 'Bạn chắc chắn muốn đăng xuất?', [
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

  const handleAssignDrone = useCallback(async (drone: DroneRecord) => {
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

      Alert.alert('Thành công', `Đã gán drone ${drone.name} cho đơn #${pickerOrder.id}`);
      setPickerOrder(null);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể gán drone.');
    } finally {
      setAssigningOrderId(null);
    }
  }, [pickerOrder, db]);

  const handleMarkDelivered = useCallback(async (order: OrderRecord) => {
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
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái.');
    } finally {
      setMarkingOrderId(null);
    }
  }, [db]);

  const handleSelectTab = useCallback((tab: AdminTab) => {
    if (tab === 'products') {
      router.push('/restaurant-admin-products');
      return;
    }
    setActiveTab(tab);
  }, [router]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#00A74F" />
      </SafeAreaView>
    );
  }

  const orderSectionMeta: Record<OrderFilter, { title: string; count: number }> = {
    all: { title: 'Tất cả đơn', count: filteredOrders.length },
    processing: { title: 'Đơn đang xử lý', count: filteredOrders.length },
    delivering: { title: 'Đơn đang giao', count: filteredOrders.length },
    delivered: { title: 'Đơn đã giao', count: filteredOrders.length },
  };

  const fadeKey = `${activeTab}-${orderFilter}-${filteredOrders.length}-${filteredDrones.length}-${droneFilter}`;


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Quản lý nhà hàng</Text>
          <Text style={styles.subtitle}>{user?.restaurantName ?? 'Nhà hàng của bạn'}</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#1A1C1E" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'overview' && (
          <FadeIn depsKey={`overview-${overviewStats.orders}-${overviewStats.revenue}-${overviewStats.drones}`}>
            <View style={styles.overviewGrid}>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewLabel}>Tổng đơn</Text>
                <Text style={styles.overviewValue}>{overviewStats.orders}</Text>
                <Text style={styles.overviewHint}>
                  Đã giao {overviewStats.delivered} | Đang giao {overviewStats.delivering}
                </Text>
              </View>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewLabel}>Doanh thu</Text>
                <Text style={styles.overviewValue}>{formatCurrency(overviewStats.revenue)}</Text>
                <Text style={styles.overviewHint}>Tính trên đơn đã giao</Text>
              </View>
            </View>

            <View style={styles.overviewGrid}>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewLabel}>Xử lý</Text>
                <Text style={styles.overviewValue}>{overviewStats.processing} chờ xử lý</Text>
                <Text style={styles.overviewHint}>Kiểm tra để gán drone sớm</Text>
              </View>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewLabel}>Drone</Text>
                <Text style={styles.overviewValue}>{overviewStats.drones} drone</Text>
                <Text style={styles.overviewHint}>Rảnh {overviewStats.droneIdle} | Bận {overviewStats.droneBusy}</Text>
              </View>
            </View>

            <View style={styles.quickActions}>
              <Text style={styles.sectionHeaderText}>Chuyển nhanh</Text>
              <View style={styles.quickActionRow}>
                <TouchableOpacity style={styles.quickAction} onPress={() => setActiveTab('orders')}>
                  <Ionicons name="receipt-outline" size={18} color="#007C35" />
                  <Text style={styles.quickActionText}>Đơn hàng</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickAction} onPress={() => setActiveTab('drones')}>
                  <Ionicons name="airplane-outline" size={18} color="#007C35" />
                  <Text style={styles.quickActionText}>Drone</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickAction} onPress={() => handleSelectTab('products')}>
                  <Ionicons name="cube-outline" size={18} color="#007C35" />
                  <Text style={styles.quickActionText}>Sản phẩm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </FadeIn>
        )}

        {activeTab === 'orders' && (
          <>
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
                {(['all', 'processing', 'delivering', 'delivered'] as OrderFilter[]).map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.chip, orderFilter === v && styles.chipActive]}
                    onPress={() => setOrderFilter(v)}
                  >
                    <Text style={[styles.chipText, orderFilter === v && styles.chipTextActive]}>
                      {v === 'all'
                        ? 'Tất cả'
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
                          ? '24 giờ'
                          : tf === '7d'
                            ? '7 ngày'
                            : '30 ngày'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <FadeIn depsKey={fadeKey}>
              <View style={styles.sectionHeaderCard}>
                <Text style={styles.sectionHeaderText}>
                  {orderSectionMeta[orderFilter].title} - {orderSectionMeta[orderFilter].count} đơn
                </Text>
              </View>

              <View style={{ marginTop: 10 }}>
                {filteredOrders.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="receipt-outline" size={48} color="#999" />
                    <Text style={styles.emptyTitle}>Không có đơn hàng phù hợp</Text>
                    <Text style={styles.emptySubtitle}>Thử thay đổi bộ lọc.</Text>
                  </View>
                ) : (
                  filteredOrders.map((order) => {
                    const assignedDrone = drones.find((d) => d.id === order.droneId);
                    const status = order.status ?? '';
                    const canAssign = !isDeliveredStatus(status) && !isDeliveringStatus(status);

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
                            <Text style={styles.orderLabel}>{order.customer?.address}</Text>
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
                                  {assignedDrone.name} - {assignedDrone.battery ?? 0}%
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
                                  <Text style={styles.primaryButtonText}>
                                    Giao bằng drone
                                  </Text>
                                )}
                              </TouchableOpacity>
                            ) : isDeliveringStatus(status) ? (
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
            </FadeIn>
          </>
        )}

        {activeTab === 'drones' && (
          <>
            <View style={styles.filterBlock}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {(['idle', 'delivering', 'maintaining'] as DroneFilter[]).map((df) => (
                  <TouchableOpacity
                    key={df}
                    style={[styles.chip, droneFilter === df && styles.chipActive]}
                    onPress={() => setDroneFilter(df)}
                  >
                    <Text style={[styles.chipText, droneFilter === df && styles.chipTextActive]}>
                      {df === 'idle'
                        ? 'Rảnh'
                        : df === 'delivering'
                          ? 'Đang giao'
                          : 'Bảo trì'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <FadeIn depsKey={fadeKey}>
              <View style={styles.sectionHeaderCard}>
                <Text style={styles.sectionHeaderText}>Quản lý {filteredDrones.length} drone</Text>
              </View>

              <View style={{ marginTop: 10 }}>
                {filteredDrones.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="airplane-outline" size={48} color="#999" />
                    <Text style={styles.emptyTitle}>Không có drone phù hợp</Text>
                    <Text style={styles.emptySubtitle}>Hãy chọn bộ lọc khác.</Text>
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

                          {assignedOrder && (
                            <View style={styles.droneOrderBox}>
                              <Text style={styles.droneOrderTitle}>Đơn #{assignedOrder.id}</Text>
                              <Text numberOfLines={2} style={styles.droneOrderSubtitle}>
                                {assignedOrder.customer?.address ?? 'Không rõ địa chỉ'}
                              </Text>
                            </View>
                          )}
                        </View>

                        <TouchableOpacity
                          style={styles.droneBtn}
                          onPress={async () => {
                            try {
                              const newStatus = isDroneIdle(drone.status) ? 'Đang bảo trì' : 'Rảnh';
                              await updateDoc(doc(db, 'drones', drone.id), { status: newStatus });
                              Alert.alert('Cập nhật', `Trạng thái drone đã đổi thành "${newStatus}"`);
                            } catch { }
                          }}
                        >
                          <Text style={styles.droneBtnText}>Đổi trạng thái</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </View>
            </FadeIn>
          </>
        )}
      </ScrollView>

      <View style={styles.bottomTabBar}>
        {[{ key: 'overview', label: 'Tổng quan', icon: 'grid-outline' },
        { key: 'orders', label: 'Đơn hàng', icon: 'receipt-outline' },
        { key: 'drones', label: 'Drone', icon: 'airplane-outline' },
        { key: 'products', label: 'Sản phẩm', icon: 'cube-outline' }].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.bottomTabItem}
            onPress={() => handleSelectTab(tab.key as AdminTab)}
          >
            <Ionicons
              name={tab.icon as any}
              size={22}
              color={activeTab === tab.key ? '#00A74F' : '#6C6F75'}
            />
            <Text style={[styles.bottomTabLabel, activeTab === tab.key && styles.bottomTabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={!!pickerOrder} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn drone để giao</Text>

            {availableDrones.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Ionicons name="alert-circle-outline" size={32} color="#FF7043" />
                <Text style={styles.modalEmptyText}>Không có drone nào rảnh.</Text>
              </View>
            ) : (
              availableDrones.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={styles.modalOption}
                  onPress={() => handleAssignDrone(d)}
                >
                  <View>
                    <Text style={styles.modalOptionTitle}>{d.name}</Text>
                    <Text style={styles.modalOptionSubtitle}>
                      Pin {d.battery}% - {d.status}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#00A74F" />
                </TouchableOpacity>
              ))
            )}

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setPickerOrder(null)}
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
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: { padding: 20, paddingBottom: 140, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1C1E' },
  subtitle: { marginTop: 4, fontSize: 15, color: '#4A4C50' },
  logoutButton: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bottomTabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  bottomTabLabel: { color: '#6C6F75', fontWeight: '600', fontSize: 12 },
  bottomTabLabelActive: { color: '#00A74F' },
  overviewGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 12 },
  overviewCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  overviewLabel: { color: '#6C6F75', fontWeight: '600', marginBottom: 6 },
  overviewValue: { fontSize: 20, fontWeight: '800', color: '#1A1C1E' },
  overviewHint: { marginTop: 4, color: '#6C6F75' },
  quickActions: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  quickActionRow: { flexDirection: 'row', gap: 10 },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#E6F6EC',
  },
  quickActionText: { color: '#007C35', fontWeight: '700' },
  filterBlock: { gap: 12, marginTop: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1A1C1E',
  },
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE5DD',
  },
  chipActive: {
    backgroundColor: '#E6F6EC',
    borderColor: '#00A74F',
  },
  chipText: { color: '#1A1C1E', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#007C35' },
  sectionHeaderCard: {
    marginTop: 16,
    backgroundColor: '#E6F6EC',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  sectionHeaderText: { color: '#007C35', fontWeight: '700', fontSize: 15 },
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
  droneOrderBox: {
    marginTop: 8,
    backgroundColor: '#F0F4FF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    gap: 4,
  },
  droneOrderTitle: { fontWeight: '700', color: '#111827' },
  droneOrderSubtitle: { color: '#4B5563', fontSize: 13 },
  droneBtn: { backgroundColor: '#00A74F', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  droneBtnText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E6F6EC',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  droneTagText: { color: '#007C35', fontWeight: '600', fontSize: 13 },
  droneTagMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F2F4',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
  disabledButton: {
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  disabledButtonText: { color: '#8C8C8C', fontWeight: '600' },
  emptyState: {
    alignItems: 'center',
    gap: 12,
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1A1C1E', textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#6C6F75', textAlign: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1C1E' },
  modalEmpty: { alignItems: 'center', gap: 12, paddingVertical: 12 },
  modalEmptyText: { fontSize: 14, color: '#6C6F75', textAlign: 'center' },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  modalOptionTitle: { fontSize: 16, fontWeight: '600', color: '#1A1C1E' },
  modalOptionSubtitle: { fontSize: 13, color: '#6C6F75', marginTop: 4 },
  modalCancel: {
    marginTop: 4,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#00A74F',
  },
  modalCancelText: { color: '#00A74F', fontWeight: '600' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 13, fontWeight: '600', color: '#1A1C1E' },
  statusProcessing: { backgroundColor: '#FFF7E6' },
  statusDelivering: { backgroundColor: '#E6F0FF' },
  statusDelivered: { backgroundColor: '#E6F6EC' },
  statusPending: { backgroundColor: '#F1F2F4' },
});
