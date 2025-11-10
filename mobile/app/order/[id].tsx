import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// eslint-disable-next-line import/no-unresolved
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import {
  doc,
  getFirestore,
  onSnapshot,
  Timestamp,
  updateDoc,
  serverTimestamp,
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
  statusCode?: string;
  statusText?: string;
  code?: string;
  totalPrice: number;
  paymentMethod?: string;
  createdAt?: Date;
  restaurantName?: string;
  restaurantAddress?: string;
  restaurantLocation?: { latitude: number | null; longitude: number | null };
  deliveryAddress?: string;
  deliveryNote?: string;
  contactName?: string;
  contactPhone?: string;
  customer?: {
    name?: string;
    phone?: string;
    address?: string;
    note?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  droneId?: string | null;
  items: OrderItem[];
};

type DroneInfo = {
  id: string;
  name?: string;
  status?: string;
  battery?: number;
  latitude?: number | null;
  longitude?: number | null;
  speed?: number | null;
};

type LatLng = { latitude: number; longitude: number };

const DEFAULT_DRONE_SPEED_KMH = 35;
const MAP_HEIGHT = Math.min(340, Dimensions.get('window').width * 0.9);

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

const toNumberOrNull = (value: any): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const buildCoordinate = (latitude?: number | null, longitude?: number | null): LatLng | null => {
  const lat = toNumberOrNull(latitude);
  const lon = toNumberOrNull(longitude);
  if (lat === null || lon === null) return null;
  return { latitude: lat, longitude: lon };
};

const computeRegion = (points: LatLng[]): Region | null => {
  if (!points.length) return null;
  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const latitudeDelta = Math.max((maxLat - minLat) * 1.6, 0.01);
  const longitudeDelta = Math.max((maxLon - minLon) * 1.6, 0.01);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta,
    longitudeDelta,
  };
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const haversineDistanceKm = (a: LatLng, b: LatLng): number => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h = sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
  return earthRadiusKm * c;
};

const formatDistance = (km?: number | null) => {
  if (km === null || km === undefined || Number.isNaN(km)) return '';
  if (km < 0.1) return '< 100m';
  return `${km.toFixed(1)} km`;
};

const formatEtaMinutes = (minutes?: number | null) => {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return '';
  if (minutes < 1) return 'Gần tới nơi';
  if (minutes < 60) return `${Math.round(minutes)} phút`; 
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours >= 1) {
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  }
  return `${Math.round(minutes)} phút`;
};

const STATUS_META: Record<
  string,
  { label: string; description: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  pending: {
    label: 'Đặt đơn thành công',
    description: 'Grab đã ghi nhận đơn và chờ nhà hàng xác nhận.',
    color: '#F59E0B',
    icon: 'time-outline',
  },
  confirmed: {
    label: 'Nhà hàng xác nhận',
    description: 'Nhà hàng đã xác nhận và drone đang được chuẩn bị để giao.',
    color: '#3B82F6',
    icon: 'restaurant-outline',
  },
  drone_assigned: {
    label: 'Drone chuẩn bị cất cánh',
    description: 'Drone đang được điều phối để giao đơn.',
    color: '#6366F1',
    icon: 'airplane-outline',
  },
  delivering: {
    label: 'Drone đang giao',
    description: 'Drone đang trên đường bay tới địa chỉ của bạn.',
    color: '#00A74F',
    icon: 'rocket-outline',
  },
  arrived: {
    label: 'Drone đã đến nơi',
    description: 'Kiểm tra và xác nhận đã nhận món ăn.',
    color: '#10B981',
    icon: 'location-outline',
  },
  completed: {
    label: 'Đã giao',
    description: 'Chúc bạn ngon miệng! Đừng quên đánh giá món ăn nhé.',
    color: '#059669',
    icon: 'checkmark-circle-outline',
  },
  cancelled: {
    label: 'Đã huỷ',
    description: 'Đơn hàng đã bị huỷ. Nếu đây là nhầm lẫn, bạn có thể đặt lại đơn.',
    color: '#EF4444',
    icon: 'close-circle-outline',
  },
};

const ORDER_STEPS: { key: string; title: string; subtitle: string }[] = [
  {
    key: 'pending',
    title: 'Đặt đơn thành công',
    subtitle: 'Grab đã ghi nhận đơn hàng của bạn và chờ nhà hàng xác nhận.',
  },
  {
    key: 'confirmed',
    title: 'Nhà hàng xác nhận',
    subtitle: 'Món ăn sẵn sàng để drone giao tới bạn.',
  },
];

const normalizeStatus = (status?: string, statusCode?: string) => {
  const code = (statusCode ?? '').toLowerCase();
  switch (code) {
    case 'pending':
    case 'processing':
    case 'waiting':
      return 'pending';
    case 'confirmed':
    case 'accepted':
    case 'preparing':
      return 'confirmed';
    case 'assigned':
    case 'drone_assigned':
      return 'drone_assigned';
    case 'delivering':
    case 'in_transit':
      return 'delivering';
    case 'arrived':
      return 'arrived';
    case 'completed':
    case 'done':
    case 'delivered':
      return 'completed';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    default:
      break;
  }

  if (!status) return 'pending';
  const lower = status.toLowerCase();
  if (lower.includes('hủy') || lower.includes('huỷ') || lower.includes('cancel')) return 'cancelled';
  if (lower.includes('đến nơi') || lower.includes('tới nơi') || lower.includes('arriv')) return 'arrived';
  if (lower.includes('đã giao') || lower.includes('delivered') || lower.includes('completed')) return 'completed';
  if (lower.includes('đang giao') || lower.includes('giao bằng drone') || lower.includes('delivering'))
    return 'delivering';
  if (lower.includes('drone') && lower.includes('điều phối')) return 'drone_assigned';
  if (lower.includes('xác nhận') || lower.includes('chuẩn bị') || lower.includes('confirmed'))
    return 'confirmed';
  if (lower.includes('pending') || lower.includes('chờ') || lower.includes('xử lý') || lower.includes('xử lí'))
    return 'pending';
  return 'pending';
};

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [drone, setDrone] = useState<DroneInfo | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [droneDistanceKm, setDroneDistanceKm] = useState<number | null>(null);
  const [droneEtaMinutes, setDroneEtaMinutes] = useState<number | null>(null);
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

        const customerRaw = data.customer ?? {};
        const restaurantLocationRaw = data.restaurantLocation ?? data.restaurant?.location ?? {};
        const restaurantCoord = buildCoordinate(
          restaurantLocationRaw.latitude ?? data.restaurant?.latitude ?? data.restaurantLat,
          restaurantLocationRaw.longitude ?? data.restaurant?.longitude ?? data.restaurantLon
        );

        const customerCoord = buildCoordinate(
          customerRaw.latitude ?? data.customerLatitude ?? data.latitude,
          customerRaw.longitude ?? data.customerLongitude ?? data.longitude
        );

        const restaurantName =
          data.restaurantName ?? data.storeName ?? data.restaurant?.name ?? 'GrabFood';
        const restaurantAddress = data.restaurantAddress ?? data.restaurant?.address ?? '';
        const deliveryAddress =
          data.deliveryAddress ?? customerRaw.address ?? data.address ?? restaurantAddress;
        const deliveryNote = data.deliveryNote ?? customerRaw.note ?? data.note ?? '';

        const customerName = customerRaw.name ?? data.contactName ?? data.customerName ?? '';
        const customerPhone = customerRaw.phone ?? data.contactPhone ?? data.customerPhone ?? '';
        const customerEmail = customerRaw.email ?? data.customerEmail ?? customerRaw.username ?? '';

        setOrder({
          id: snapshot.id,
          status: data.status ?? 'pending',
          statusCode: data.statusCode ?? data.stage ?? data.status_code ?? undefined,
          statusText: data.statusText ?? data.status_text,
          code: data.code,
          totalPrice: Number(data.totalPrice ?? data.total ?? 0),
          paymentMethod: data.paymentMethod ?? 'Tiền mặt',
          createdAt,
          restaurantName,
          restaurantAddress,
          restaurantLocation: restaurantCoord
            ? { latitude: restaurantCoord.latitude, longitude: restaurantCoord.longitude }
            : undefined,
          deliveryAddress,
          deliveryNote,
          contactName: data.contactName ?? customerName,
          contactPhone: data.contactPhone ?? customerPhone,
          customer: {
            name: customerName,
            phone: customerPhone,
            email: customerEmail,
            address: deliveryAddress,
            note: deliveryNote,
            latitude: customerCoord?.latitude ?? null,
            longitude: customerCoord?.longitude ?? null,
          },
          droneId: data.droneId ? String(data.droneId) : data.drone?.id ? String(data.drone.id) : null,
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

  useEffect(() => {
    if (!order?.droneId) {
      setDrone(null);
      return;
    }

    const droneRef = doc(db, 'drones', String(order.droneId));
    const unsub = onSnapshot(
      droneRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setDrone(null);
          return;
        }
        const data = snapshot.data() as any;
        setDrone({
          id: snapshot.id,
          name: data.name,
          status: data.status,
          battery: typeof data.battery === 'number' ? data.battery : Number(data.battery ?? 0),
          latitude: toNumberOrNull(data.latitude),
          longitude: toNumberOrNull(data.longitude),
          speed: toNumberOrNull(data.speed),
        });
      },
      (error) => {
        console.warn('Không thể theo dõi drone:', error);
        setDrone(null);
      }
    );

    return () => unsub();
  }, [db, order?.droneId]);

  useEffect(() => {
    const points: LatLng[] = [];
    const restaurantPoint = buildCoordinate(
      order?.restaurantLocation?.latitude,
      order?.restaurantLocation?.longitude
    );
    const customerPoint = buildCoordinate(order?.customer?.latitude, order?.customer?.longitude);
    const dronePoint = buildCoordinate(drone?.latitude, drone?.longitude);

    if (restaurantPoint) points.push(restaurantPoint);
    if (customerPoint) points.push(customerPoint);
    if (dronePoint) points.push(dronePoint);

    if (points.length > 0) {
      setMapRegion(computeRegion(points));
    } else {
      setMapRegion(null);
    }

    if (customerPoint && dronePoint) {
      const distance = haversineDistanceKm(dronePoint, customerPoint);
      setDroneDistanceKm(distance);
      const speed = drone?.speed && drone.speed > 1 ? drone.speed : DEFAULT_DRONE_SPEED_KMH;
      if (speed && speed > 0.5) {
        setDroneEtaMinutes((distance / speed) * 60);
      } else {
        setDroneEtaMinutes(null);
      }
    } else {
      setDroneDistanceKm(null);
      setDroneEtaMinutes(null);
    }
  }, [order, drone]);

  const normalizedStatus = normalizeStatus(order?.status, order?.statusCode);
  const statusMeta = STATUS_META[normalizedStatus] ?? STATUS_META.pending;
  const isCancelled = normalizedStatus === 'cancelled';
  const isCompleted = normalizedStatus === 'completed' && !isCancelled;
  const isArrived = normalizedStatus === 'arrived';
  const stepKey = isCancelled
    ? 'pending'
    : normalizedStatus === 'pending'
    ? 'pending'
    : 'confirmed';
  const stepIndex = Math.max(0, ORDER_STEPS.findIndex((step) => step.key === stepKey));

  const restaurantPoint = useMemo(
    () => buildCoordinate(order?.restaurantLocation?.latitude, order?.restaurantLocation?.longitude),
    [order?.restaurantLocation?.latitude, order?.restaurantLocation?.longitude]
  );
  const customerPoint = useMemo(
    () => buildCoordinate(order?.customer?.latitude, order?.customer?.longitude),
    [order?.customer?.latitude, order?.customer?.longitude]
  );
  const dronePoint = useMemo(
    () => buildCoordinate(drone?.latitude, drone?.longitude),
    [drone?.latitude, drone?.longitude]
  );

  const distanceLabel = formatDistance(droneDistanceKm);
  const etaLabel = formatEtaMinutes(droneEtaMinutes);
  const closeToCustomer = droneDistanceKm !== null && droneDistanceKm <= 0.15;
  const shouldShowConfirm =
    !isCancelled && !isCompleted && (isArrived || (normalizedStatus === 'delivering' && closeToCustomer));
  const mapEnabledStatuses = ['confirmed', 'drone_assigned', 'delivering', 'arrived', 'completed'];
  const shouldShowMap =
    mapRegion && !isCancelled && mapEnabledStatuses.includes(normalizedStatus) && (restaurantPoint || customerPoint);

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

  const handleConfirmDelivered = async () => {
    if (!order) return;
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'Đã giao',
        statusCode: 'completed',
        statusText: 'Khách đã xác nhận đã nhận món ăn.',
        completedAt: serverTimestamp(),
      });

      if (order.droneId) {
        try {
          await updateDoc(doc(db, 'drones', String(order.droneId)), {
            status: 'Rảnh',
            currentOrderId: null,
            destination: null,
          });
        } catch (droneError) {
          console.warn('Không thể cập nhật trạng thái drone:', droneError);
        }
      }

      Alert.alert('Đã xác nhận', 'Cảm ơn bạn! Drone sẽ quay về trạm.');
    } catch (error) {
      console.warn('Không thể xác nhận đã nhận hàng:', error);
      Alert.alert('Lỗi', 'Không thể xác nhận đã nhận đơn. Vui lòng thử lại sau.');
    }
  };

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

        {shouldShowMap ? (
          <View style={[styles.card, styles.mapCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Hành trình giao hàng</Text>
              <View style={styles.mapHeaderRight}>
                {drone?.name ? (
                  <View style={styles.mapBadge}>
                    <Ionicons name="airplane-outline" size={12} color="#2563EB" />
                    <Text style={styles.mapBadgeText}>{drone.name}</Text>
                  </View>
                ) : null}
                {typeof drone?.battery === 'number' ? (
                  <View style={styles.mapBadge}>
                    <Ionicons name="battery-half-outline" size={12} color="#16A34A" />
                    <Text style={styles.mapBadgeText}>{Math.round(drone.battery)}%</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.mapContainer}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.mapView}
                initialRegion={mapRegion}
                region={mapRegion}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
              >
                {restaurantPoint ? (
                  <Marker
                    coordinate={restaurantPoint}
                    title={order.restaurantName || 'Nhà hàng'}
                    description={order.restaurantAddress}
                    pinColor="#047857"
                  />
                ) : null}
                {customerPoint ? (
                  <Marker
                    coordinate={customerPoint}
                    title={order.customer?.name || 'Khách hàng'}
                    description={order.deliveryAddress}
                    pinColor="#EF4444"
                  />
                ) : null}
                {dronePoint ? (
                  <Marker
                    coordinate={dronePoint}
                    title={drone?.name || 'Drone'}
                    description={drone?.status}
                    pinColor="#0EA5E9"
                  />
                ) : null}
                {restaurantPoint && customerPoint ? (
                  <Polyline
                    coordinates={[restaurantPoint, customerPoint]}
                    strokeColor="#CBD5F5"
                    strokeWidth={3}
                    lineDashPattern={[6, 4]}
                  />
                ) : null}
                {dronePoint && customerPoint ? (
                  <Polyline
                    coordinates={[dronePoint, customerPoint]}
                    strokeColor="#22C55E"
                    strokeWidth={4}
                  />
                ) : null}
              </MapView>
            </View>
            <View style={styles.mapInfoRow}>
              <View style={styles.mapInfoItem}>
                <Ionicons name="navigate-outline" size={16} color="#0EA5E9" />
                <Text style={styles.mapInfoText}>
                  {distanceLabel ? `Còn ${distanceLabel}` : 'Đang cập nhật vị trí drone'}
                </Text>
              </View>
              <View style={styles.mapInfoItem}>
                <Ionicons name="time-outline" size={16} color="#0EA5E9" />
                <Text style={styles.mapInfoText}>
                  {etaLabel ? `ETA ${etaLabel}` : 'Đang ước tính thời gian'}
                </Text>
              </View>
              {drone?.status ? (
                <View style={styles.mapInfoItem}>
                  <Ionicons name="radio-outline" size={16} color="#0EA5E9" />
                  <Text style={styles.mapInfoText}>{String(drone.status)}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : !isCancelled && mapEnabledStatuses.includes(normalizedStatus) && normalizedStatus !== 'completed' ? (
          <View style={[styles.card, styles.mapCard, styles.mapPlaceholderCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Hành trình giao hàng</Text>
            </View>
            <Text style={styles.placeholderText}>
              {normalizedStatus === 'confirmed'
                ? 'Nhà hàng đã xác nhận. Drone sẽ sớm khởi hành, vui lòng chờ trong giây lát.'
                : 'Đang chờ cập nhật vị trí drone. Vui lòng giữ kết nối internet ổn định.'}
            </Text>
          </View>
        ) : null}

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
          {order.restaurantAddress ? (
            <View style={styles.infoRow}>
              <Ionicons name="map-outline" size={20} color="#475569" />
              <Text style={styles.infoText}>{order.restaurantAddress}</Text>
            </View>
          ) : null}
          {order.deliveryAddress ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color="#475569" />
              <Text style={styles.infoText}>{order.deliveryAddress}</Text>
            </View>
          ) : null}
          {order.deliveryNote ? (
            <View style={styles.infoRow}>
              <Ionicons name="clipboard-outline" size={20} color="#475569" />
              <Text style={styles.infoText}>{order.deliveryNote}</Text>
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
          {order.droneId ? (
            <View style={styles.infoRow}>
              <Ionicons name="airplane-outline" size={20} color="#475569" />
              <Text style={styles.infoText}>
                Drone #{order.droneId}
                {drone?.status ? ` • ${String(drone.status)}` : ''}
              </Text>
            </View>
          ) : null}
        </View>

        {shouldShowConfirm ? (
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmDelivered} activeOpacity={0.9}>
            <Ionicons name="checkmark-done" size={22} color="#fff" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.confirmBtnText}>Đã nhận hàng</Text>
              <Text style={styles.confirmBtnHint}>Xác nhận để hoàn tất đơn và giải phóng drone</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </TouchableOpacity>
        ) : null}

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
  mapCard: {
    paddingBottom: 18,
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
  mapHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapContainer: {
    height: MAP_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
  },
  mapView: {
    flex: 1,
  },
  mapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
  },
  mapBadgeText: {
    marginLeft: 4,
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '600',
  },
  mapInfoRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mapInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
  },
  mapInfoText: {
    marginLeft: 6,
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '600',
  },
  mapPlaceholderCard: {
    paddingBottom: 18,
  },
  placeholderText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 13,
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
  confirmBtn: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmBtnHint: {
    color: '#DCFCE7',
    fontSize: 12,
    marginTop: 2,
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
