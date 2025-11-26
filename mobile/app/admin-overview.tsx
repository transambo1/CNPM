import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  RefreshControl,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';

import { useRouter } from 'expo-router';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { app } from '../libs/firebase';
import { useAuth } from '../libs/AuthContext';

type QuickMenuItem = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string | number;
  subtitle: string;
  route: string;
};

const formatCurrency = (value?: number | null) =>
  `${Number(value ?? 0).toLocaleString('vi-VN')} đ`;

export default function AdminOverviewScreen() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const db = useMemo(() => getFirestore(app), []);

  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [summary, setSummary] = useState({
    orders: 0,
    users: 0,
    restaurants: 0,
    drones: 0,
    revenue: 0,
    delivered: 0,
    delivering: 0,
    processing: 0,
    droneIdle: 0,
    droneBusy: 0,
  });

  const loadSummary = useCallback(async () => {
    setRefreshing(true);
    try {
      const [ordersSnap, usersSnap, restaurantsSnap, dronesSnap] = await Promise.all([
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'restaurants')),
        getDocs(collection(db, 'drones')),
      ]);

      const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      const drones = dronesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

      const delivered = orders.filter((o) =>
        (o.status || '').toLowerCase().includes('đã giao')
      ).length;

      const delivering = orders.filter((o) =>
        (o.status || '').toLowerCase().includes('đang giao')
      ).length;

      const processing = orders.filter((o) =>
        (o.status || '').toLowerCase().includes('chờ')
      ).length;

      const revenue = orders
        .filter((o) => (o.status || '').toLowerCase().includes('đã giao'))
        .reduce((sum, o) => sum + Number(o.total || o.totalPrice || 0), 0);

      const droneIdle = drones.filter((d) =>
        ['rảnh', 'idle', 'available'].includes((d.status || '').toLowerCase())
      ).length;

      const droneBusy = drones.length - droneIdle;

      setSummary({
        orders: orders.length,
        users: usersSnap.size,
        restaurants: restaurantsSnap.size,
        drones: dronesSnap.size,
        revenue,
        delivered,
        delivering,
        processing,
        droneIdle,
        droneBusy,
      });
    } catch (err) {
      console.log('Admin summary load failed', err);
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
    loadSummary();
  }, [loading, user]);

  const quickMenuItems: QuickMenuItem[] = useMemo(
    () => [
      {
        key: 'orders',
        icon: 'receipt-outline',
        title: 'Đơn hàng',
        value: summary.orders,
        subtitle: `Chờ: ${summary.processing} | Đang giao: ${summary.delivering}`,
        route: '/admin/orders?filter=all',
      },
      {
        key: 'users',
        icon: 'people-outline',
        title: 'Người dùng',
        value: summary.users,
        subtitle: 'Tài khoản hoạt động',
        route: '/admin/users',
      },
      {
        key: 'restaurants',
        icon: 'business-outline',
        title: 'Nhà hàng',
        value: summary.restaurants,
        subtitle: 'Đối tác đang mở bán',
        route: '/admin/restaurants',
      },
      {
        key: 'drones',
        icon: 'airplane-outline',
        title: 'Drone',
        value: summary.drones,
        subtitle: `Rảnh: ${summary.droneIdle} | Đang giao: ${summary.droneBusy}`,
        route: '/admin/drones',
      },
      {
        key: 'revenue',
        icon: 'cash-outline',
        title: 'Doanh thu',
        value: formatCurrency(summary.revenue),
        subtitle: 'Theo đơn đã giao',
        route: '/admin/revenue',
      },
    ],
    [summary]
  );

  const handleNavigate = useCallback(
    (route: string) => {
      setMenuVisible(false);
      router.push(route as any);
    },
    [router]
  );

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace('/(auth)/login');
  }, []);

  if (loading) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadSummary} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Tổng quan hệ thống</Text>
            <Text style={styles.subtitle}>Đơn hàng, đối tác và drone</Text>
          </View>

          <TouchableOpacity style={styles.menuButton} onPress={() => setMenuVisible(true)}>
            <Ionicons name="menu-outline" size={22} color="#0b1f15" />
          </TouchableOpacity>
        </View>

        {/* STAT CARDS */}
        <View style={styles.row}>
          <StatCard icon="receipt-outline" label="Tổng đơn" value={summary.orders} color="#00b14f" style={styles.cardSpacer} />
          <StatCard icon="people-outline" label="Người dùng" value={summary.users} color="#007045" />
        </View>

        <View style={styles.row}>
          <StatCard icon="business-outline" label="Nhà hàng" value={summary.restaurants} color="#0c8f5f" style={styles.cardSpacer} />
          <StatCard icon="cash-outline" label="Doanh thu" value={formatCurrency(summary.revenue)} color="#00c362" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trạng thái đơn hàng</Text>
          <View style={styles.row}>
            <Pill label={`Đã giao: ${summary.delivered}`} tone="#00b14f" style={styles.pillSpacer} />
            <Pill label={`Đang giao: ${summary.delivering}`} tone="#ffaa00" style={styles.pillSpacer} />
            <Pill label={`Chờ xử lý: ${summary.processing}`} tone="#00683a" light />
          </View>
        </View>

        {/* DRONE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quản lý drone</Text>
          <View style={styles.row}>
            <StatCard icon="airplane-outline" label="Tổng drone" value={summary.drones} color="#00905a" style={styles.cardSpacer} />
            <StatCard icon="flash-outline" label="Sẵn sàng" value={summary.droneIdle} color="#35c46f" />
          </View>

          <View style={styles.row}>
            <StatCard icon="navigate-outline" label="Đang giao" value={summary.droneBusy} color="#f59e0b" />
          </View>
        </View>
      </ScrollView>

      {/* ========== MENU QUẢN TRỊ ========== */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <Pressable style={styles.menuContainer} onPress={(e) => e.stopPropagation()}>
            <ScrollView contentContainerStyle={styles.menuContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Menu quản trị</Text>
              <Text style={styles.modalSubtitle}>Chọn mục bạn muốn quản lý</Text>

              {quickMenuItems.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.modalItem}
                  onPress={() => handleNavigate(item.route)}
                >
                  <View style={styles.modalItemHeader}>
                    <View style={styles.menuIcon}>
                      <Ionicons name={item.icon} size={18} color="#0b1f15" />
                    </View>

                    <View style={styles.menuInfo}>
                      <Text style={styles.menuTitle}>{item.title}</Text>
                      <Text style={styles.menuSubtitleText}>{item.subtitle}</Text>
                    </View>

                    <Text style={styles.menuValue}>{item.value}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              <View style={styles.menuDivider} />

              <TouchableOpacity style={[styles.modalItem, styles.logoutButton]} onPress={handleLogout}>
                <View style={styles.modalItemHeader}>
                  <Ionicons name="log-out-outline" size={20} color="#E53935" />
                  <Text style={[styles.modalActionText, { color: '#E53935' }]}>Đăng xuất</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, color, style }: any) {
  return (
    <View style={[styles.card, { borderColor: color }, style]}>
      <View style={[styles.iconBadge, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>

      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
    </View>
  );
}

function Pill({ label, tone, light, style }: any) {
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: light ? `${tone}18` : `${tone}22`, borderColor: `${tone}35` },
        style,
      ]}
    >
      <Text style={[styles.pillText, { color: tone }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6fffa' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '800', color: '#0b1f15' },
  subtitle: { color: '#4b5d52', marginTop: 4, marginBottom: 18, maxWidth: '88%' },

  /* ===== MENU BUTTON ===== */
  menuButton: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d9e9df',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  /* ===== LAYOUT ===== */
  row: { flexDirection: 'row', marginBottom: 12 },
  section: { marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0b1f15', marginBottom: 8 },

  /* ===== CARDS ===== */
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d9e9df',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardSpacer: { marginRight: 12 },
  cardLabel: { color: '#4b5d52', fontWeight: '600' },
  cardValue: { fontSize: 20, fontWeight: '800', marginTop: 6 },

  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  /* ===== PILL ===== */
  pill: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flex: 1,
    alignItems: 'center',
  },
  pillSpacer: { marginRight: 10 },
  pillText: { fontWeight: '700' },

  /* ===== MENU MODAL ===== */
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },

  menuContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    maxHeight: '80%',
  },

  menuContent: { gap: 12, paddingBottom: 20 },

  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0b1f15' },
  modalSubtitle: { color: '#4b5d52', marginBottom: 6 },

  modalItem: {
    backgroundColor: '#f7fff9',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d9e9df',
  },

  modalItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  modalActionText: { fontWeight: '700', color: '#0b1f15' },
  logoutButton: { backgroundColor: '#fdecea', borderColor: '#f8b4ab' },

  menuDivider: { borderBottomWidth: 1, borderBottomColor: '#e0efe6', marginVertical: 10 },

  /* ===== SMALL ICON ===== */
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e6f7ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuInfo: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: '#0b1f15' },
  menuSubtitleText: { color: '#4b5d52', marginTop: 2 },
  menuValue: { fontWeight: '800', color: '#0b1f15' },
});
