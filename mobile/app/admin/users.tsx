import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, getFirestore } from 'firebase/firestore';

import { app } from '../../libs/firebase';
import { useAuth } from '../../libs/AuthContext';

type UserItem = { id: string; name?: string; email?: string; role?: string };

export default function AdminUsersScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const db = useMemo(() => getFirestore(app), []);

  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);

  const loadUsers = useCallback(async () => {
    setRefreshing(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const data = snap.docs.map((d) => {
        const raw = d.data() as any;
        return {
          id: d.id,
          name: raw.name ?? raw.fullName ?? 'Người dùng',
          email: raw.email ?? '',
          role: raw.role ?? 'user',
        } as UserItem;
      });
      setUsers(data);
    } catch (err) {
      console.error('load users failed', err);
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
    loadUsers();
  }, [user, loading, router, loadUsers]);

  if (loading || !user || user.role !== 'admin') return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin-overview'))} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0b1f15" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Người dùng</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadUsers} />}
        contentContainerStyle={styles.listContent}
      >
        {users.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Ionicons name="person-outline" size={18} color="#0b1f15" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>{item.email}</Text>
              </View>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{item.role}</Text>
              </View>
            </View>
          </View>
        ))}

        {users.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={42} color="#7c8a80" />
            <Text style={styles.emptyTitle}>Chưa có người dùng</Text>
            <Text style={styles.emptySubtitle}>Kéo để làm mới hoặc thử lại sau.</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e6f7ef',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0b1f15' },
  cardSubtitle: { color: '#4b5d52', marginTop: 4 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#f0f4ff' },
  roleText: { fontWeight: '700', color: '#0b1f15' },
  empty: { alignItems: 'center', padding: 20, gap: 8 },
  emptyTitle: { fontWeight: '700', color: '#0b1f15' },
  emptySubtitle: { color: '#4b5d52' },
});
