import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, getFirestore } from 'firebase/firestore';

import { app } from '../../libs/firebase';
import { useAuth } from '../../libs/AuthContext';

type RevenueStats = {
  totalRevenue: number;
  deliveredCount: number;
  deliveringCount: number;
  processingCount: number;
};

const formatCurrency = (value?: number | null) => `${Number(value ?? 0).toLocaleString('vi-VN')} đ`;

export default function AdminRevenueScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const db = useMemo(() => getFirestore(app), []);

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    deliveredCount: 0,
    deliveringCount: 0,
    processingCount: 0,
  });

  const loadRevenue = useCallback(async () => {
    setRefreshing(true);
    try {
      const snap = await getDocs(collection(db, 'orders'));
      let totalRevenue = 0;
      let deliveredCount = 0;
      let deliveringCount = 0;
      let processingCount = 0;

      snap.docs.forEach((d) => {
        const raw = d.data() as any;
        const status = (raw.status || '').toLowerCase();
        const total = Number(raw.total ?? raw.totalPrice ?? 0);
        if (status.includes('đã giao') || status.includes('da giao')) {
          deliveredCount += 1;
          totalRevenue += total;
        } else if (status.includes('đang giao') || status.includes('dang giao')) {
          deliveringCount += 1;
        } else if (status.includes('chờ') || status.includes('cho') || status.includes('processing')) {
          processingCount += 1;
        }
      });

      setStats({ totalRevenue, deliveredCount, deliveringCount, processingCount });
    } catch (err) {
      console.error('load revenue failed', err);
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
    loadRevenue();
  }, [user, loading, router, loadRevenue]);

  if (loading || !user || user.role !== 'admin') return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin-overview'))} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0b1f15" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Doanh thu</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadRevenue} />}
        contentContainerStyle={styles.listContent}
      >
        <View style={[styles.card, { backgroundColor: '#f2fcf6', borderColor: '#c9eed7' }]}>
          <Text style={styles.label}>Tổng doanh thu</Text>
          <Text style={styles.totalText}>{formatCurrency(stats.totalRevenue)}</Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.card, styles.rowCard]}>
            <Text style={styles.label}>Đơn đã giao</Text>
            <Text style={styles.value}>{stats.deliveredCount}</Text>
          </View>
          <View style={[styles.card, styles.rowCard]}>
            <Text style={styles.label}>Đang giao</Text>
            <Text style={styles.value}>{stats.deliveringCount}</Text>
          </View>
          <View style={[styles.card, styles.rowCard]}>
            <Text style={styles.label}>Chờ xử lý</Text>
            <Text style={styles.value}>{stats.processingCount}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color="#0b1f15" />
          <Text style={styles.infoText}>
            Doanh thu được tính theo những đơn có trạng thái "Đã giao". Kiểm tra chi tiết từng đơn trong danh sách.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
  label: { color: '#4b5d52', fontWeight: '600' },
  totalText: { fontSize: 26, fontWeight: '800', color: '#0b1f15', marginTop: 6 },
  row: { flexDirection: 'row', gap: 10 },
  rowCard: { flex: 1 },
  value: { fontSize: 18, fontWeight: '800', color: '#0b1f15', marginTop: 6 },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#f7fff9',
    borderColor: '#d9e9df',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  infoText: { flex: 1, color: '#0b1f15' },
});
