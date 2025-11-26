// app/admin-orders.tsx  (ví dụ route)

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
} from 'react-native-safe-area-context';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
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
};

const formatCurrency = (value?: number | null) =>
  `${Number(value ?? 0).toLocaleString('vi-VN')} đ`;

/** Chuẩn hoá status từ string → StatusKey */
const normalizeStatus = (status?: string): StatusKey => {
  const s = (status ?? '').toLowerCase();

  if (!s) return 'pending';
  if (s.includes('hủy') || s.includes('huy') || s.includes('cancel')) return 'cancelled';
  if (
    s.includes('đã giao') ||
    s.includes('da giao') ||
    s.includes('delivered') ||
    s.includes('completed') ||
    s.includes('done')
  )
    return 'delivered';
  if (
    s.includes('đang giao') ||
    s.includes('dang giao') ||
    s.includes('delivering') ||
    s.includes('in_transit')
  )
    return 'delivering';

  return 'pending';
};

const STATUS_META: Record<StatusKey, { label: string; badge: any }> = {
  pending: { label: 'Chờ xử lý', badge: { backgroundColor: '#f0f4ff' } },
  delivering: { label: 'Đang giao', badge: { backgroundColor: '#fff4e5' } },
  delivered: { label: 'Đã giao', badge: { backgroundColor: '#e8f8ef' } },
  cancelled: { label: 'Đã hủy', badge: { backgroundColor: '#fdecea' } },
};

/** Convert createdAt trong Firestore về Date */
const getCreatedAtDate = (createdAt: any): Date | null => {
  if (!createdAt) return null;
  if (createdAt instanceof Date) return createdAt;
  if (createdAt instanceof Timestamp) return createdAt.toDate();
  if (typeof createdAt === 'number') return new Date(createdAt);
  return null;
};

export default function AdminOrdersScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const db = useMemo(() => getFirestore(app), []);

  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | StatusKey>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilterKey>('all');

  /** LOAD ĐƠN */
  const loadOrders = useCallback(async () => {
    setRefreshing(true);
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const data: OrderItem[] = snap.docs.map((d) => {
        const raw = d.data() as any;

        return {
          id: d.id,
          status: raw.status ?? '',
          normalizedStatus: normalizeStatus(raw.status),
          total: Number(raw.total ?? raw.totalPrice ?? 0),
          customerName: raw.customer?.name ?? raw.customerName ?? 'Khách lẻ',
          createdAt: raw.createdAt,
        };
      });

      // sort mới nhất lên trên
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

  /** CHECK ADMIN + load */
  useEffect(() => {
    if (loading) return;

    if (!user || user.role !== 'admin') {
      router.replace('/');
      return;
    }

    loadOrders();
  }, [user, loading, loadOrders]);

  /** Áp dụng filter theo status + thời gian */
  const filteredOrders = useMemo(() => {
    const now = new Date();

    return orders.filter((o) => {
      // filter status
      if (statusFilter !== 'all' && o.normalizedStatus !== statusFilter) {
        return false;
      }

      // filter thời gian
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
        const diff = now.getTime() - createdDate.getTime();
        return diff <= 7 * 24 * 60 * 60 * 1000;
      }

      if (timeFilter === '30d') {
        const diff = now.getTime() - createdDate.getTime();
        return diff <= 30 * 24 * 60 * 60 * 1000;
      }

      return true; // 'all'
    });
  }, [orders, statusFilter, timeFilter]);

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

      {/* FILTER STATUS */}
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

      {/* FILTER THỜI GIAN */}
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

      {/* LIST */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadOrders} />
        }
        contentContainerStyle={styles.listContent}
      >
        {filteredOrders.map((order) => (
          <View key={order.id} style={styles.card}>
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

            <TouchableOpacity
              style={styles.linkRow}
              onPress={() =>
                router.push({
                  pathname: '/order/[id]',
                  params: { id: order.id },
                } as never)
              }
            >
              <Ionicons name="open-outline" size={16} color="#0b1f15" />
              <Text style={styles.linkText}>Mở theo dõi đơn</Text>
            </TouchableOpacity>
          </View>
        ))}

        {filteredOrders.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={42} color="#7c8a80" />
            <Text style={styles.emptyTitle}>Không có đơn phù hợp</Text>
            <Text style={styles.emptySubtitle}>
              Thử đổi bộ lọc trạng thái hoặc thời gian khác.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* -------------------------- STYLES -------------------------- */

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

  /* Filter rows */
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },

  /* Status chips */
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

  /* Time chips */
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

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  linkText: { color: '#0b1f15', fontWeight: '700' },

  empty: { alignItems: 'center', padding: 20, gap: 8 },
  emptyTitle: { fontWeight: '700', color: '#0b1f15' },
  emptySubtitle: { color: '#4b5d52', textAlign: 'center' },
});
