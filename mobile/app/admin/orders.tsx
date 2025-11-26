// app/admin/orders.tsx

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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, getFirestore, Timestamp } from 'firebase/firestore';

import { app } from '../../libs/firebase';
import { useAuth } from '../../libs/AuthContext';

type StatusKey = 'pending' | 'delivering' | 'delivered' | 'cancelled';
type TimeFilterKey = 'all' | 'today' | '7d' | '30d';

type OrderItem = {
  id: string;
  status?: string;
  normalizedStatus: StatusKey;
  total: number;
  customerName: string;
  createdAt?: any;
  restaurantId?: string;
};

const formatCurrency = (value?: number | null) =>
  `${Number(value ?? 0).toLocaleString('vi-VN')} đ`;

/** Chuẩn hoá status */
const normalizeStatus = (status?: string): StatusKey => {
  const s = (status ?? '').toLowerCase();

  if (!s) return 'pending';
  if (s.includes('huy') || s.includes('cancel')) return 'cancelled';
  if (s.includes('đã giao') || s.includes('delivered') || s.includes('done'))
    return 'delivered';
  if (s.includes('đang giao') || s.includes('delivering'))
    return 'delivering';

  return 'pending';
};

const STATUS_META: Record<StatusKey, { label: string; badge: any }> = {
  pending: { label: 'Chờ xử lý', badge: { backgroundColor: '#f0f4ff' } },
  delivering: { label: 'Đang giao', badge: { backgroundColor: '#fff4e5' } },
  delivered: { label: 'Đã giao', badge: { backgroundColor: '#e8f8ef' } },
  cancelled: { label: 'Đã hủy', badge: { backgroundColor: '#fdecea' } },
};

const getCreatedAtDate = (createdAt: any): Date | null => {
  if (!createdAt) return null;
  if (createdAt instanceof Date) return createdAt;
  if (createdAt instanceof Timestamp) return createdAt.toDate();
  if (typeof createdAt === 'number') return new Date(createdAt);
  return null;
};

/* =============================================
      MINI DROPDOWN NHÀ HÀNG (Không tạo file mới)
   ============================================= */
function RestaurantDropdown({
  value,
  onChange,
  restaurants,
}: {
  value: string;
  onChange: (v: string) => void;
  restaurants: any[];
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <View style={{ marginHorizontal: 16, marginTop: 10, zIndex: 10 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', marginBottom: 6 }}>
        Lọc theo nhà hàng
      </Text>

      <TouchableOpacity
        style={styles.dropdownBox}
        onPress={() => setOpen(!open)}
      >
        <Text style={styles.dropdownValue}>
          {value === 'all'
            ? 'Tất cả'
            : restaurants.find((r) => r.id === value)?.name || '—'}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#0b1f15"
        />
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdownList}>
          <TouchableOpacity
            onPress={() => {
              onChange('all');
              setOpen(false);
            }}
            style={styles.dropdownItem}
          >
            <Text style={{ fontWeight: '500' }}>Tất cả</Text>
          </TouchableOpacity>

          {restaurants.map((r) => (
            <TouchableOpacity
              key={r.id}
              onPress={() => {
                onChange(r.id);
                setOpen(false);
              }}
              style={styles.dropdownItem}
            >
              <Text style={{ fontWeight: '500' }}>{r.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

/* ==========================================
              MAIN PAGE
   ========================================== */

export default function AdminOrdersScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const db = useMemo(() => getFirestore(app), []);

  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);

  const [statusFilter, setStatusFilter] = useState<'all' | StatusKey>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilterKey>('all');
  const [restaurantFilter, setRestaurantFilter] = useState('all');
  const [searchText, setSearchText] = useState('');

  /** LOAD DATA */
  const loadOrders = useCallback(async () => {
    setRefreshing(true);
    try {
      const orderSnap = await getDocs(collection(db, 'orders'));
      const restaurantSnap = await getDocs(collection(db, 'restaurants'));

      setRestaurants(
        restaurantSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );

      const data: OrderItem[] = orderSnap.docs.map((d) => {
        const raw = d.data() as any;

        return {
          id: d.id,
          status: raw.status ?? '',
          normalizedStatus: normalizeStatus(raw.status),
          total: Number(raw.total ?? raw.totalPrice ?? 0),
          customerName: raw.customer?.name ?? raw.customerName ?? 'Khách lẻ',
          createdAt: raw.createdAt,
          restaurantId: raw.restaurantId ?? '',
        };
      });

      data.sort((a, b) => {
        const da = getCreatedAtDate(a.createdAt)?.getTime() ?? 0;
        const dbb = getCreatedAtDate(b.createdAt)?.getTime() ?? 0;
        return dbb - da;
      });

      setOrders(data);
    } catch (err) {
      console.error('load orders failed', err);
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
    loadOrders();
  }, [user, loading, loadOrders]);

  /** FILTER LOGIC */
  const filteredOrders = useMemo(() => {
    const now = new Date();

    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.normalizedStatus !== statusFilter)
        return false;

      if (restaurantFilter !== 'all' && o.restaurantId !== restaurantFilter)
        return false;

      if (
        searchText.trim() &&
        !o.customerName.toLowerCase().includes(searchText.toLowerCase())
      )
        return false;

      const createdDate = getCreatedAtDate(o.createdAt);
      if (!createdDate) return timeFilter === 'all';

      if (timeFilter === 'today') {
        return (
          createdDate.getFullYear() === now.getFullYear() &&
          createdDate.getMonth() === now.getMonth() &&
          createdDate.getDate() === now.getDate()
        );
      }

      if (timeFilter === '7d') {
        return now.getTime() - createdDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
      }

      if (timeFilter === '30d') {
        return (
          now.getTime() - createdDate.getTime() <= 30 * 24 * 60 * 60 * 1000
        );
      }

      return true;
    });
  }, [orders, statusFilter, timeFilter, restaurantFilter, searchText]);

  if (loading || !user || user.role !== 'admin') return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace('/admin-overview')
          }
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#0b1f15" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Đơn hàng</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* SEARCH */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#85928a" />
        <TextInput
          placeholder="Tìm khách hàng..."
          placeholderTextColor="#85928a"
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* STATUS FILTER */}
      <View style={styles.filterRow}>
        {(['all', 'pending', 'delivering', 'delivered'] as const).map((key) => {
          const meta = key === 'all' ? { label: 'Tất cả' } : STATUS_META[key];
          const active = statusFilter === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setStatusFilter(key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* TIME FILTER */}
      <View style={[styles.filterRow, { marginTop: 4 }]}>
        {([
          { key: 'all', label: 'Tất cả' },
          { key: 'today', label: 'Hôm nay' },
          { key: '7d', label: '7 ngày' },
          { key: '30d', label: '30 ngày' },
        ] as { key: TimeFilterKey; label: string }[]).map((item) => {
          const active = timeFilter === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.timeChip,
                active && styles.timeChipActive,
              ]}
              onPress={() => setTimeFilter(item.key)}
            >
              <Text
                style={[
                  styles.timeChipText,
                  active && styles.timeChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* RESTAURANT DROPDOWN */}
      <RestaurantDropdown
        value={restaurantFilter}
        onChange={setRestaurantFilter}
        restaurants={restaurants}
      />

      {/* LIST */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadOrders} />
        }
        contentContainerStyle={styles.listContent}
      >
        {filteredOrders.map((order) => (
          <TouchableOpacity
            key={order.id}
            style={styles.card}
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: '/admin/orders/[id]',
                params: { id: order.id },
              } as never)
            }
          >
            <View style={styles.row}>
              <View>
                <Text style={styles.cardTitle}>Đơn #{order.id}</Text>
                <Text style={styles.cardSubtitle}>{order.customerName}</Text>
              </View>

              <View
                style={[
                  styles.badge,
                  STATUS_META[order.normalizedStatus].badge,
                ]}
              >
                <Text style={styles.badgeText}>
                  {STATUS_META[order.normalizedStatus].label}
                </Text>
              </View>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.metaLabel}>Tổng tiền</Text>
              <Text style={styles.valueText}>
                {formatCurrency(order.total)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {filteredOrders.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={42} color="#7c8a80" />
            <Text style={styles.emptyTitle}>Không có đơn phù hợp</Text>
            <Text style={styles.emptySubtitle}>
              Thử điều chỉnh bộ lọc hoặc tìm kiếm.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ==========================================
              STYLES
   ========================================== */
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0b1f15' },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderColor: '#d9e9df',
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0b1f15' },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },

  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d9e9df',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#e6f7ef',
    borderColor: '#00b14f',
  },
  filterChipText: { fontWeight: '700', color: '#0b1f15' },
  filterChipTextActive: { color: '#007045' },

  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#f8d9a0',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  timeChipActive: {
    backgroundColor: '#fff7e6',
    borderColor: '#ffb84d',
  },
  timeChipText: { fontWeight: '700', color: '#0b1f15' },
  timeChipTextActive: { color: '#c97a00' },

  dropdownBox: {
    borderWidth: 1,
    borderColor: '#d9e9df',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownValue: { color: '#0b1f15', fontWeight: '600' },
  dropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9e9df',
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f1',
  },

  listContent: { padding: 16, paddingBottom: 40, gap: 12 },

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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },

  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0b1f15' },
  cardSubtitle: { color: '#4b5d52', marginTop: 4 },

  metaLabel: { color: '#4b5d52' },
  valueText: { fontWeight: '800', color: '#0b1f15' },

  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontWeight: '700', color: '#0b1f15' },

  empty: { alignItems: 'center', padding: 20, gap: 8 },
  emptyTitle: { fontWeight: '700', color: '#0b1f15' },
  emptySubtitle: { color: '#4b5d52', textAlign: 'center' },
});
