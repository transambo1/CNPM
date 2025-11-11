import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  getDocs,
  getFirestore,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';

import { useAuth } from '../../libs/AuthContext';
import { app } from '../../libs/firebase';

const STATUS_META: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: 'Đang xử lý', color: '#F59E0B', icon: 'time-outline' },
  confirmed: { label: 'Đã xác nhận', color: '#3B82F6', icon: 'checkmark-done-outline' },
  delivering: { label: 'Đang giao', color: '#00A74F', icon: 'bicycle-outline' },
  completed: { label: 'Hoàn tất', color: '#10B981', icon: 'checkmark-circle-outline' },
  cancelled: { label: 'Đã hủy', color: '#EF4444', icon: 'close-circle-outline' },
};

const formatCurrency = (value: number) =>
  value.toLocaleString('vi-VN', { minimumFractionDigits: 0 }) + 'đ';

const formatDateTime = (date: Date) => {
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
};

type OrderItem = {
  id: string;
  code: string;
  status: string;
  total: number;
  items: number;
  createdAt: Date;
  paymentMethod?: string;
  restaurantName?: string;
  deliveryAddress?: string;
};

export default function OrderHistoryScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const db = useMemo(() => getFirestore(app), []);

  const fetchOrders = useCallback(async () => {
    if (!user?.id) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('userId', '==', user.id));
      const snapshot = await getDocs(q);
      const mapped = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        const createdAtValue = data.createdAt instanceof Timestamp
          ? data.createdAt.toDate()
          : data.createdAt
          ? new Date(data.createdAt)
          : new Date();

        return {
          id: docSnap.id,
          code: data.code ?? `ĐH-${docSnap.id.slice(-6).toUpperCase()}`,
          status: data.status ?? 'pending',
          total: Number(data.totalPrice ?? data.total ?? 0),
          items: Array.isArray(data.items)
            ? data.items.reduce((sum: number, item: any) => sum + (Number(item.quantity ?? 1) || 1), 0)
            : Number(data.itemsCount ?? data.quantity ?? data.totalItems ?? 0),
          createdAt: createdAtValue,
          paymentMethod: data.paymentMethod ?? 'Tiền mặt',
          restaurantName: data.restaurantName ?? data.storeName ?? 'GrabFood',
          deliveryAddress: data.deliveryAddress ?? data.address ?? '',
        } as OrderItem;
      });

      mapped.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setOrders(mapped);
    } catch (error) {
      console.warn('Không thể tải lịch sử đơn hàng:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [db, user?.id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [fetchOrders]);

  const renderStatus = (status: string) => {
    const meta = STATUS_META[status] ?? STATUS_META.pending;
    return (
      <View style={[styles.statusPill, { backgroundColor: `${meta.color}20` }]}> 
        <Ionicons name={meta.icon} size={14} color={meta.color} style={{ marginRight: 4 }} />
        <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
      </View>
    );
  };

  const renderOrder = ({ item }: { item: OrderItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.codeText}>{item.code}</Text>
        {renderStatus(item.status)}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.rowBetween}>
          <View style={styles.rowCenter}>
            <Ionicons name="storefront-outline" size={18} color="#111" style={{ marginRight: 6 }} />
            <Text style={styles.restaurantName} numberOfLines={1}>
              {item.restaurantName}
            </Text>
          </View>
          <Text style={styles.totalText}>{formatCurrency(item.total)}</Text>
        </View>
        <View style={[styles.rowBetween, { marginTop: 10 }] }>
          <View style={styles.rowCenter}>
            <Ionicons name="receipt-outline" size={16} color="#666" style={{ marginRight: 4 }} />
            <Text style={styles.metaText}>{item.items} món • {item.paymentMethod}</Text>
          </View>
          <Text style={styles.timeText}>{formatDateTime(item.createdAt)}</Text>
        </View>
        {item.deliveryAddress ? (
          <View style={[styles.rowCenter, { marginTop: 10 }]}>
            <Ionicons name="location-outline" size={16} color="#666" style={{ marginRight: 4 }} />
            <Text style={styles.addressText} numberOfLines={2}>{item.deliveryAddress}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.footerHint}>Chi tiết đơn hàng sẽ xuất hiện tại đây sớm thôi</Text>
        <Ionicons name="chevron-forward" size={18} color="#00A74F" />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch sử đơn hàng</Text>
        <Text style={styles.headerSubtitle}>Theo dõi trạng thái và nội dung các đơn gần đây</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={[styles.listContent, orders.length === 0 && { flexGrow: 1 }]}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="file-tray-outline" size={52} color="#B0BEC5" />
              <Text style={styles.emptyTitle}>Bạn chưa có đơn hàng nào</Text>
              <Text style={styles.emptySubtitle}>
                Các đơn hàng sẽ xuất hiện tại đây sau khi bạn đặt món.
              </Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00A74F"
            colors={["#00A74F"]}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F8FB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#F6F8FB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111',
  },
  headerSubtitle: {
    marginTop: 6,
    color: '#607080',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    gap: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    maxWidth: 180,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00A74F',
  },
  metaText: {
    fontSize: 13,
    color: '#54606F',
  },
  timeText: {
    fontSize: 13,
    color: '#54606F',
  },
  addressText: {
    fontSize: 13,
    color: '#54606F',
    flex: 1,
  },
  cardFooter: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerHint: {
    fontSize: 12,
    color: '#00A74F',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#607080',
    textAlign: 'center',
    lineHeight: 20,
  },
});
