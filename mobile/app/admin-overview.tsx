import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, RefreshControl, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

import { app } from '../libs/firebase';
import { useAuth } from '../libs/AuthContext';

const formatCurrency = (value?: number | null) => `${Number(value ?? 0).toLocaleString('vi-VN')}₫`;

export default function AdminOverviewScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
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

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'admin') {
      router.replace('/');
      return;
    }
    loadSummary();
  }, [user, loading]);

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

  if (loading || !user || user.role !== 'admin') {
    return null;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadSummary} />}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Tổng quan hệ thống</Text>
      <Text style={styles.subtitle}>Đơn hàng, người dùng, nhà hàng và đội drone trong một màn hình.</Text>

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
  container: { flex: 1, backgroundColor: '#f6fffa' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: '#0b1f15' },
  subtitle: { color: '#4b5d52', marginTop: 4, marginBottom: 18 },
  row: { flexDirection: 'row', marginBottom: 12 },
  section: { marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0b1f15', marginBottom: 8 },
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
});

