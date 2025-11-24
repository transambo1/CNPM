import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
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

const formatCurrency = (value?: number | null) => `${Number(value ?? 0).toLocaleString('vi-VN')}₫`;

export default function AdminOverviewScreen() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const db = useMemo(() => getFirestore(app), []);

  const [refreshing, setRefreshing] = useState(false);
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

      const delivered = orders.filter((o) => (o.status || '').toLowerCase().includes('đã giao')).length;
      const delivering = orders.filter((o) => (o.status || '').toLowerCase().includes('đang giao')).length;
      const processing = orders.filter((o) => (o.status || '').toLowerCase().includes('chờ')).length;
      const revenue = orders
        .filter((o) => (o.status || '').toLowerCase().includes('đã giao'))
        .reduce((sum, o) => sum + Number(o.total || o.totalPrice || 0), 0);

      const droneIdle = drones.filter((d) => ['rảnh', 'idle', 'available', ''].includes((d.status || '').toLowerCase())).length;
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
    } catch (error) {
      console.error('Failed to load admin overview', error);
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
  }, [user, loading, loadSummary, router]);

  const quickMenuItems = useMemo(
    () => [
      {
        key: 'orders',
        icon: 'receipt-outline',
        title: 'Đơn hàng',
        value: summary.orders,
        subtitle: `Đang chờ: ${summary.processing} | Đang giao: ${summary.delivering}`,
        detail: `Đã giao: ${summary.delivered}, đang giao: ${summary.delivering}, chờ xử lý: ${summary.processing}`,
      },
      {
        key: 'users',
        icon: 'people-outline',
        title: 'Người dùng',
        value: summary.users,
        subtitle: 'Người dùng hoạt động trên hệ thống',
        detail: 'Thông tin người dùng đã được đồng bộ với trang chủ.',
      },
      {
        key: 'restaurants',
        icon: 'business-outline',
        title: 'Nhà hàng',
        value: summary.restaurants,
        subtitle: 'Số lượng đối tác đang mở bán',
        detail: 'Số liệu khớp với danh sách hiển thị ngoài trang chủ.',
      },
      {
        key: 'drones',
        icon: 'airplane-outline',
        title: 'Drone',
        value: summary.drones,
        subtitle: `Rảnh: ${summary.droneIdle} | Đang giao: ${summary.droneBusy}`,
        detail: `Sẵn sàng: ${summary.droneIdle}, đang giao hoặc bảo trì: ${summary.droneBusy}`,
      },
      {
        key: 'revenue',
        icon: 'cash-outline',
        title: 'Doanh thu',
        value: formatCurrency(summary.revenue),
        subtitle: 'Cập nhật theo đơn đã giao',
        detail: `Doanh thu đang hiển thị giống trang chủ: ${formatCurrency(summary.revenue)}`,
      },
    ],
    [summary]
  );

  const [menuVisible, setMenuVisible] = useState(false);

  const handleMenuPress = useCallback((detail: string) => {
    Alert.alert('Thông tin nhanh', `${detail}\nBạn có thể đối chiếu với dữ liệu ngoài trang chủ.`);
  }, []);

  const handleManage = useCallback(
    (key: string) => {
      switch (key) {
        case 'orders':
          Alert.alert('Quản lý đơn hàng', `Tổng: ${summary.orders}\nĐã giao: ${summary.delivered}\nĐang giao: ${summary.delivering}\nChờ xử lý: ${summary.processing}`);
          break;
        case 'users':
          Alert.alert('Quản lý người dùng', `Có ${summary.users} tài khoản. Bạn có thể sửa, xoá hoặc chặn người dùng trong trang quản trị web.`);
          break;
        case 'restaurants':
          Alert.alert('Quản lý nhà hàng', `Có ${summary.restaurants} đối tác. Cho phép tạm dừng hoặc chặn nhà hàng giống trên web.`);
          break;
        case 'drones':
          Alert.alert('Quản lý drone', `Tổng: ${summary.drones}\nRảnh: ${summary.droneIdle}\nĐang giao/Bận: ${summary.droneBusy}`);
          break;
        default:
          Alert.alert('Doanh thu', `Hiện tại: ${formatCurrency(summary.revenue)} (tính theo đơn đã giao).`);
      }
    },
    [summary]
  );

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace('/(auth)/login');
  }, [logout, router]);

  if (loading || !user || user.role !== 'admin') {
    return null;
  }

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
            <Text style={styles.subtitle}>Đơn hàng, người dùng, nhà hàng và đội drone trong một màn hình.</Text>
          </View>
          <TouchableOpacity style={styles.menuButton} onPress={() => setMenuVisible(true)}>
            <Ionicons name="menu-outline" size={22} color="#0b1f15" />
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Menu dữ liệu</Text>
          <Text style={styles.menuSubtitle}>Xem nhanh các chỉ số hiển thị ngoài trang chủ</Text>
          {quickMenuItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.menuItem}
              onPress={() => handleMenuPress(item.detail)}
              activeOpacity={0.9}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon as any} size={18} color="#0b1f15" />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitleText}>{item.subtitle}</Text>
              </View>
              <Text style={styles.menuValue}>{item.value}</Text>
            </TouchableOpacity>
          ))}
        </View>

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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quản lý drone</Text>
          <View style={styles.row}>
            <StatCard icon="airplane-outline" label="Tổng drone" value={summary.drones} color="#00905a" style={styles.cardSpacer} />
            <StatCard icon="flash-outline" label="Sẵn sàng" value={summary.droneIdle} color="#35c46f" />
          </View>
          <View style={styles.row}>
            <StatCard icon="navigate-outline" label="Đang giao" value={summary.droneBusy} color="#f59e0b" />
            <View style={[styles.card, styles.cardWide]}>
              <Text style={styles.cardLabel}>Ghi chú vận hành</Text>
              <Text style={styles.cardValue}>Luôn giữ pin trên 40%, ưu tiên đơn gần.</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <Pressable style={styles.menuContainer} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Menu quản trị</Text>
            <Text style={styles.modalSubtitle}>Tương tự trang admin web: xem số liệu, sửa/xoá/chặn.</Text>

            {quickMenuItems.map((item) => (
              <View key={item.key} style={styles.modalItem}>
                <View style={styles.modalItemHeader}>
                  <View style={styles.menuIcon}>
                    <Ionicons name={item.icon as any} size={18} color="#0b1f15" />
                  </View>
                  <View style={styles.menuInfo}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuSubtitleText}>{item.subtitle}</Text>
                  </View>
                  <Text style={styles.menuValue}>{item.value}</Text>
                </View>

                <View style={styles.modalActionsRow}>
                  <TouchableOpacity style={styles.modalActionButton} onPress={() => handleMenuPress(item.detail)}>
                    <Ionicons name="eye-outline" size={16} color="#0b1f15" />
                    <Text style={styles.modalActionText}>Xem chi tiết</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalActionButton} onPress={() => handleManage(item.key)}>
                    <Ionicons name="create-outline" size={16} color="#0b1f15" />
                    <Text style={styles.modalActionText}>Sửa / chặn</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={styles.menuDivider} />

            <TouchableOpacity style={[styles.modalActionButton, styles.logoutButton]} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#E53935" />
              <Text style={[styles.modalActionText, { color: '#E53935' }]}>Đăng xuất</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, color, style }: { icon: any; label: string; value: any; color: string; style?: any }) {
  return (
    <View style={[styles.card, { borderColor: color }, style]}>
      <View style={[styles.iconBadge, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
    </View>
  );
}

function Pill({ label, tone, light, style }: { label: string; tone: string; light?: boolean; style?: any }) {
  return (
    <View style={[styles.pill, { backgroundColor: light ? `${tone}18` : `${tone}22`, borderColor: `${tone}35` }, style]}>
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
  subtitle: { color: '#4b5d52', marginTop: 4, marginBottom: 18, maxWidth: '90%' },
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
  row: { flexDirection: 'row', marginBottom: 12 },
  section: { marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0b1f15', marginBottom: 8 },
  menuSection: { marginBottom: 10 },
  menuSubtitle: { color: '#4b5d52', marginBottom: 6 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#d9e9df',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e6f7ef',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuInfo: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: '#0b1f15' },
  menuSubtitleText: { color: '#4b5d52', marginTop: 2 },
  menuValue: { fontWeight: '800', color: '#0b1f15' },
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
    elevation: 2,
  },
  cardWide: { flexBasis: '48%' },
  cardSpacer: { marginRight: 12 },
  cardLabel: { color: '#4b5d52', fontWeight: '600' },
  cardValue: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  menuContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0b1f15' },
  modalSubtitle: { color: '#4b5d52' },
  modalItem: {
    backgroundColor: '#f7fff9',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d9e9df',
    gap: 10,
  },
  modalItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalActionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d9e9df',
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  modalActionText: { fontWeight: '700', color: '#0b1f15' },
  logoutButton: { backgroundColor: '#fdecea', borderColor: '#f8b4ab' },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: '#e0efe6', marginVertical: 4 },
});

