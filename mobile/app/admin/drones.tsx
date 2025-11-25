import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, getFirestore } from 'firebase/firestore';

import { app } from '../../libs/firebase';
import { useAuth } from '../../libs/AuthContext';

type DroneItem = { id: string; name?: string; status?: string; battery?: number; currentOrderId?: string | null };

export default function AdminDronesScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const db = useMemo(() => getFirestore(app), []);

  const [refreshing, setRefreshing] = useState(false);
  const [drones, setDrones] = useState<DroneItem[]>([]);

  const loadDrones = useCallback(async () => {
    setRefreshing(true);
    try {
      const snap = await getDocs(collection(db, 'drones'));
      const data = snap.docs.map((d) => {
        const raw = d.data() as any;
        return {
          id: d.id,
          name: raw.name ?? raw.model ?? `Drone ${d.id}`,
          status: raw.status ?? 'unknown',
          battery: Number(raw.battery ?? 0),
          currentOrderId: raw.currentOrderId ?? null,
        } as DroneItem;
      });
      setDrones(data);
    } catch (err) {
      console.error('load drones failed', err);
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
    loadDrones();
  }, [user, loading, router, loadDrones]);

  if (loading || !user || user.role !== 'admin') return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin-overview'))} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0b1f15" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Drone</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadDrones} />}
        contentContainerStyle={styles.listContent}
      >
        {drones.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>Pin: {item.battery ?? 0}%</Text>
                {item.currentOrderId ? (
                  <Text style={styles.cardSubtitle}>Đơn đang giao: #{item.currentOrderId}</Text>
                ) : (
                  <Text style={styles.cardSubtitle}>Chưa gán đơn</Text>
                )}
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </View>
          </View>
        ))}

        {drones.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="airplane-outline" size={42} color="#7c8a80" />
            <Text style={styles.emptyTitle}>Chưa có drone</Text>
            <Text style={styles.emptySubtitle}>Kéo xuống để làm mới hoặc thử lại sau.</Text>
          </View>
        ) : null}
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
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0b1f15' },
  cardSubtitle: { color: '#4b5d52', marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#f0f4ff', alignSelf: 'flex-start' },
  badgeText: { fontWeight: '700', color: '#0b1f15' },
  empty: { alignItems: 'center', padding: 20, gap: 8 },
  emptyTitle: { fontWeight: '700', color: '#0b1f15' },
  emptySubtitle: { color: '#4b5d52' },
});
