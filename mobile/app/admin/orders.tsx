import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, getFirestore } from 'firebase/firestore';

import { app } from '../../libs/firebase';
import { useAuth } from '../../libs/AuthContext';

type OrderItem = {
  id: string;
  status?: string;
  total?: number;
  customerName?: string;
  createdAt?: any;
};

const formatCurrency = (value?: number | null) => `${Number(value ?? 0).toLocaleString('vi-VN')} đ`;

export default function AdminOrdersScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const db = useMemo(() => getFirestore(app), []);

  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<OrderItem[]>([]);

  const loadOrders = useCallback(async () => {
    setRefreshing(true);
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const data = snap.docs.map((d) => {
        const raw = d.data() as any;
        return {
          id: d.id,
          status: raw.status ?? '',
          total: Number(raw.total ?? raw.totalPrice ?? 0),
          customerName: raw.customer?.name ?? raw.customerName ?? 'Khách lẻ',
          createdAt: raw.createdAt,
        } as OrderItem;
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
  }, [user, loading, router, loadOrders]);

  if (loading || !user || user.role !== 'admin') return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin-overview'))} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0b1f15" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadOrders} />}
        contentContainerStyle={styles.listContent}
      >
        {orders.map((order) => (
          <View key={order.id} style={styles.card}>
            <View style={styles.row}>
              <View>
                <Text style={styles.cardTitle}>Đơn #{order.id}</Text>
                <Text style={styles.cardSubtitle}>{order.customerName}</Text>
              </View>
              <View style={[styles.badge, getStatusStyle(order.status)]}>
                <Text style={styles.badgeText}>{order.status || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.metaLabel}>Tổng tiền</Text>
              <Text style={styles.valueText}>{formatCurrency(order.total)}</Text>
            </View>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } } as never)}
            >
              <Ionicons name="open-outline" size={16} color="#0b1f15" />
              <Text style={styles.linkText}>Mở màn theo dõi đơn</Text>
            </TouchableOpacity>
          </View>
        ))}

        {orders.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={42} color="#7c8a80" />
            <Text style={styles.emptyTitle}>Chưa có đơn hàng</Text>
            <Text style={styles.emptySubtitle}>Kéo để làm mới hoặc thử lại sau.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStatusStyle = (status?: string) => {
  const s = (status || '').toLowerCase();
  if (s.includes('đã giao') || s.includes('delivered')) return { backgroundColor: '#e8f8ef' };
  if (s.includes('đang giao')) return { backgroundColor: '#fff4e5' };
  if (s.includes('chờ') || s.includes('processing')) return { backgroundColor: '#f0f4ff' };
  return { backgroundColor: '#f2f2f2' };
};

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
  emptySubtitle: { color: '#4b5d52' },
});
