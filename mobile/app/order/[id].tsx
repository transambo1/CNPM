import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  doc,
  getFirestore,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';

import { app } from '../../libs/firebase';

type OrderItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  img?: string;
};

type OrderDetail = {
  id: string;
  status: string;
  statusText?: string;
  code?: string;
  totalPrice: number;
  paymentMethod?: string;
  createdAt?: Date;
  restaurantName?: string;
  deliveryAddress?: string;
  contactName?: string;
  contactPhone?: string;
  items: OrderItem[];
};

const formatCurrency = (value: number) =>
  (Number(value) || 0).toLocaleString('vi-VN', { minimumFractionDigits: 0 }) + 'đ';

const formatDateTime = (date?: Date) => {
  if (!date) return '';
  return `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')} • ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${date.getFullYear()}`;
};

const STATUS_META: Record<
  string,
  { label: string; description: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  pending: {
    label: 'Chờ xác nhận',
    description: 'Nhà hàng đang tiếp nhận đơn hàng của bạn.',
    color: '#F59E0B',
    icon: 'time-outline',
  },
  confirmed: {
    label: 'Đang chuẩn bị',
    description: 'Bếp đang chế biến món ăn.',
    color: '#3B82F6',
    icon: 'restaurant-outline',
  },
  delivering: {
    label: 'Đang giao',
    description: 'Tài xế đang trên đường tới bạn.',
    color: '#00A74F',
    icon: 'bicycle-outline',
  },
  completed: {
    label: 'Đã giao',
    description: 'Chúc bạn ngon miệng! Đừng quên đánh giá món ăn nhé.',
    color: '#10B981',
    icon: 'checkmark-circle-outline',
  },
  cancelled: {
    label: 'Đã huỷ',
    description: 'Đơn hàng đã được huỷ. Nếu đây là nhầm lẫn, bạn có thể đặt lại đơn.',
    color: '#EF4444',
    icon: 'close-circle-outline',
  },
};

const ORDER_STEPS: { key: string; title: string; subtitle: string }[] = [
  {
    key: 'pending',
    title: 'Đặt đơn thành công',
    subtitle: 'Grab đã nhận thông tin đơn hàng của bạn.',
  },
  {
    key: 'confirmed',
    title: 'Nhà hàng xác nhận',
    subtitle: 'Nhà hàng đang chuẩn bị món ăn.',
  },
  {
    key: 'delivering',
    title: 'Tài xế đang giao',
    subtitle: 'Đơn hàng đang được giao tới bạn.',
  },
  {
    key: 'completed',
    title: 'Hoàn tất đơn hàng',
    subtitle: 'Bạn đã nhận được món ăn.',
  },
];

const normalizeStatus = (status?: string) => {
  if (!status) return 'pending';
  const lower = status.toLowerCase();
  if (lower === 'delivered' || lower === 'done') return 'completed';
  if (lower === 'processing') return 'confirmed';
  return lower;
};

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const db = useMemo(() => getFirestore(app), []);

  useEffect(() => {
    const orderId = Array.isArray(id) ? id[0] : id;
    if (!orderId) return;

    const unsub = onSnapshot(
      doc(db, 'orders', orderId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setOrder(null);
          setLoading(false);
          return;
        }

        const data = snapshot.data() as any;
        const createdAt = data.createdAt instanceof Timestamp
          ? data.createdAt.toDate()
          : data.createdAt
          ? new Date(data.createdAt)
          : undefined;

        const items: OrderItem[] = Array.isArray(data.items)
          ? data.items.map((item: any) => ({
              productId: item.productId ?? item.id ?? '',
              name: item.name ?? 'Món ăn',
              quantity: Number(item.quantity ?? 1),
              price: Number(item.price ?? 0),
              img: item.img,
            }))
          : [];

        setOrder({
          id: snapshot.id,
          status: data.status ?? 'pending',
          statusText: data.statusText,
          code: data.code,
          totalPrice: Number(data.totalPrice ?? data.total ?? 0),
          paymentMethod: data.paymentMethod ?? 'Tiền mặt',
          createdAt,
          restaurantName: data.restaurantName ?? data.storeName,
          deliveryAddress: data.deliveryAddress ?? data.address,
          contactName: data.contactName ?? data.customerName,
          contactPhone: data.contactPhone ?? data.customerPhone,
          items,
        });
        setLoading(false);
      },
      (error) => {
        console.warn('Không thể theo dõi đơn hàng:', error);
        setOrder(null);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [db, id]);

  const normalizedStatus = normalizeStatus(order?.status);
  const statusMeta = STATUS_META[normalizedStatus] ?? STATUS_META.pending;
  const isCancelled = normalizedStatus === 'cancelled';
  const isCompleted = normalizedStatus === 'completed' && !isCancelled;
  const stepIndex = Math.max(
    0,
    ORDER_STEPS.findIndex((step) => step.key === (isCancelled ? 'pending' : normalizedStatus))
  );

  const renderTimeline = () => (
    <View style={styles.timeline}>
      {ORDER_STEPS.map((step, index) => {
        const reached = index <= stepIndex && !isCancelled;
        return (
          <View key={step.key} style={styles.timelineRow}>
            <View style={styles.timelineIndicatorWrapper}>
              <View
                style={[
                  styles.timelineIndicator,
                  reached && { backgroundColor: statusMeta.color, borderColor: statusMeta.color },
                ]}
              >
                {reached ? (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                ) : null}
              </View>
              {index < ORDER_STEPS.length - 1 ? (
                <View
                  style={[
                    styles.timelineLine,
                    reached && { backgroundColor: `${statusMeta.color}55` },
                  ]}
                />
              ) : null}
            </View>
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineTitle, reached && { color: '#111827' }]}>{step.title}</Text>
              <Text style={styles.timelineSubtitle}>{step.subtitle}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#00A74F" />
        <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="alert-circle-outline" size={64} color="#94A3B8" />
        <Text style={styles.emptyTitle}>Không tìm thấy đơn hàng</Text>
        <Text style={styles.emptySubtitle}>
          Có thể đơn hàng đã bị xoá hoặc bạn chưa từng đặt đơn này.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)/activity')}>
          <Text style={styles.primaryBtnText}>Về lịch sử đơn</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.appBar}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/activity'))}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={26} color="#111" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.appBarTitle}>Theo dõi đơn hàng</Text>
          {order.code ? <Text style={styles.appBarSubtitle}>Mã đơn: {order.code}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/activity')}>
          <Ionicons name="file-tray-full-outline" size={24} color="#111" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.statusCard}>
          <View style={[styles.statusIconWrapper, { backgroundColor: `${statusMeta.color}15` }]}>
            <Ionicons name={statusMeta.icon} size={26} color={statusMeta.color} />
          </View>
          <Text style={[styles.statusLabel, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          <Text style={styles.statusDescription}>
            {order.statusText ?? statusMeta.description}
          </Text>
          {order.createdAt ? (
            <Text style={styles.statusMeta}>Đặt lúc {formatDateTime(order.createdAt)}</Text>
          ) : null}
        </View>

        {!isCancelled ? renderTimeline() : null}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Chi tiết món</Text>
            <Text style={styles.cardMeta}>{order.items.length} món • {formatCurrency(order.totalPrice)}</Text>
          </View>
          <View style={{ gap: 16 }}>
            {order.items.map((item) => (
              <View key={item.productId} style={styles.itemRow}>
                {item.img ? (
                  <Image source={{ uri: item.img }} style={styles.itemImage} />
                ) : (
                  <View style={styles.itemImagePlaceholder}>
                    <Ionicons name="fast-food-outline" size={20} color="#9CA3AF" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.itemSub}>x{item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>{formatCurrency(item.price * item.quantity)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin giao hàng</Text>
          {order.restaurantName ? (
            <View style={styles.infoRow}>
              <Ionicons name="storefront-outline" size={20} color="#475569" />
              <Text style={styles.infoText}>{order.restaurantName}</Text>
            </View>
          ) : null}
          {order.deliveryAddress ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color="#475569" />
              <Text style={styles.infoText}>{order.deliveryAddress}</Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={20} color="#475569" />
            <Text style={styles.infoText}>Thanh toán: {order.paymentMethod ?? 'Tiền mặt'}</Text>
          </View>
          {(order.contactName || order.contactPhone) ? (
            <View style={styles.infoRow}>
              <Ionicons name="person-circle-outline" size={20} color="#475569" />
              <Text style={styles.infoText}>
                {order.contactName ? `${order.contactName} • ` : ''}
                {order.contactPhone ?? ''}
              </Text>
            </View>
          ) : null}
        </View>

        {isCompleted ? (
          <View style={styles.successCard}>
            <Ionicons name="happy-outline" size={30} color="#047857" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.successTitle}>Đơn hàng đã hoàn tất!</Text>
              <Text style={styles.successSubtitle}>Hãy chia sẻ đánh giá của bạn để Grab phục vụ tốt hơn.</Text>
            </View>
            <TouchableOpacity style={styles.rateBtn}>
              <Text style={styles.rateBtnText}>Đánh giá</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {isCancelled ? (
          <View style={styles.cancelledCard}>
            <Ionicons name="alert" size={26} color="#B91C1C" />
            <Text style={styles.cancelledText}>
              Đơn hàng của bạn đã bị huỷ. Nếu cần hỗ trợ, vui lòng liên hệ GrabCare.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F6F7',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#475569',
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  appBarSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statusCard: {
    margin: 16,
    marginBottom: 12,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    alignItems: 'center',
  },
  statusIconWrapper: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  statusDescription: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
  },
  statusMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 12,
  },
  timeline: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: '#fff',
    padding: 18,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineIndicatorWrapper: {
    alignItems: 'center',
    marginRight: 14,
  },
  timelineIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5F5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
    marginBottom: -4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 18,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94A3B8',
  },
  timelineSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#fff',
    gap: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  cardMeta: {
    fontSize: 14,
    color: '#6B7280',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 54,
    height: 54,
    borderRadius: 12,
    marginRight: 12,
  },
  itemImagePlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  itemSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  successCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#047857',
  },
  successSubtitle: {
    fontSize: 13,
    color: '#047857',
    marginTop: 4,
  },
  rateBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#047857',
  },
  rateBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelledCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  cancelledText: {
    flex: 1,
    fontSize: 14,
    color: '#B91C1C',
  },
  emptyTitle: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: '#00A74F',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 20,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
