// OrderTrackingScreen.tsx — PART 1/2
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
// ❗ Expo Go: KHÔNG dùng PROVIDER_GOOGLE
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import {
  doc,
  getFirestore,
  onSnapshot,
  Timestamp,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { app } from '../../libs/firebase';

/* ========= TYPES ========= */
type LatLng = { latitude: number; longitude: number };

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
  speed?: number | null; // km/h
};

/* ========= CONFIG ========= */
const DEFAULT_DRONE_SPEED_KMH = 35;
const MAP_HEIGHT = Math.min(380, Dimensions.get('window').height * 0.45);

/* ========= UTILS ========= */
const toNumberOrNull = (value: any): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const buildCoordinate = (lat?: number | null, lon?: number | null): LatLng | null => {
  const latitude = toNumberOrNull(lat);
  const longitude = toNumberOrNull(lon);
  if (latitude === null || longitude === null) return null;
  return { latitude, longitude };
};

const toRadians = (v: number) => (v * Math.PI) / 180;
const haversineDistanceKm = (a: LatLng, b: LatLng): number => {
  const R = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const computeBearing = (from: LatLng, to: LatLng) => {
  const φ1 = toRadians(from.latitude);
  const φ2 = toRadians(to.latitude);
  const λ1 = toRadians(from.longitude);
  const λ2 = toRadians(to.longitude);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
};

const computeRegion = (points: LatLng[]) => {
  if (!points.length) return null;
  const lats = points.map(p => p.latitude);
  const lons = points.map(p => p.longitude);
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
  } as Region;
};

const formatCurrency = (value: number) =>
  (Number(value) || 0).toLocaleString('vi-VN', { minimumFractionDigits: 0 }) + 'đ';

const formatDateTime = (date?: Date) => {
  if (!date) return '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${hh}:${mm} • ${dd}/${mo}/${yyyy}`;
};

/* EASING (Expo Go friendly) */
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* ========= COMPONENT ========= */
export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetail | null>(null);

  const [droneDoc, setDroneDoc] = useState<DroneInfo | null>(null);
  const [dronePos, setDronePos] = useState<LatLng | null>(null); // vị trí hiển thị (được nội suy mượt)
  const lastDronePos = useRef<LatLng | null>(null);
  const [droneHeading, setDroneHeading] = useState(0);

  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [droneDistanceKm, setDroneDistanceKm] = useState<number | null>(null);
  const [droneEtaMinutes, setDroneEtaMinutes] = useState<number | null>(null);

  const db = useMemo(() => getFirestore(app), []);
  const mapRef = useRef<MapView | null>(null);

  // Bạn đã nói "Có icon rồi"
  const droneIcon = require('../../assets/images/drone.png'); // PNG 40–60px

  /* ===== LISTEN ORDER ===== */
  useEffect(() => {

    const orderId = Array.isArray(id) ? id[0] : id;
    if (!orderId) return;

    const unsub = onSnapshot(
      doc(db, 'orders', String(orderId)),
      (snapshot) => {
        if (!snapshot.exists()) {
          setOrder(null);
          setLoading(false);
          return;
        }
        const data = snapshot.data() as any;

        const createdAt =
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : data.createdAt
              ? new Date(data.createdAt)
              : undefined;

        const customerRaw = data.customer ?? {};
        const restRaw = data.restaurantLocation ?? data.restaurant?.location ?? {};

        const restaurantCoord = (() => {
          const lat = restRaw.latitude ?? data.restaurant?.latitude ?? data.restaurantLat;
          const lon = restRaw.longitude ?? data.restaurant?.longitude ?? data.restaurantLon;
          return buildCoordinate(lat, lon) ?? undefined;
        })();

        const customerCoord = (() => {
          const lat = customerRaw.latitude ?? data.customerLatitude ?? data.latitude;
          const lon = customerRaw.longitude ?? data.customerLongitude ?? data.longitude;
          return buildCoordinate(lat, lon);
        })();

        setOrder({
          id: snapshot.id,
          status: data.status ?? 'pending',
          statusCode: data.statusCode ?? data.stage ?? data.status_code,
          statusText: data.statusText ?? data.status_text,
          code: data.code,
          totalPrice: Number(data.totalPrice ?? data.total ?? 0),
          paymentMethod: data.paymentMethod ?? 'Tiền mặt',
          createdAt,
          restaurantName:
            data.restaurantName ?? data.storeName ?? data.restaurant?.name ?? 'Nhà hàng',
          restaurantAddress: data.restaurantAddress ?? data.restaurant?.address ?? '',
          restaurantLocation: restaurantCoord,
          deliveryAddress: data.deliveryAddress ?? customerRaw.address ?? data.address ?? '',
          deliveryNote: data.deliveryNote ?? customerRaw.note ?? data.note ?? '',
          contactName: data.contactName ?? customerRaw.name ?? data.customerName ?? '',
          contactPhone: data.contactPhone ?? customerRaw.phone ?? data.customerPhone ?? '',
          customer: {
            name: customerRaw.name ?? data.customerName ?? '',
            phone: customerRaw.phone ?? data.customerPhone ?? '',
            address: data.deliveryAddress ?? customerRaw.address ?? data.address ?? '',
            note: data.deliveryNote ?? customerRaw.note ?? '',
            latitude: customerCoord?.latitude ?? null,
            longitude: customerCoord?.longitude ?? null,
          },
          droneId: data.droneId
            ? String(data.droneId)
            : data.drone?.id
              ? String(data.drone.id)
              : null,
          items: Array.isArray(data.items)
            ? data.items.map((it: any) => ({
              productId: it.productId ?? it.id ?? '',
              name: it.name ?? 'Món ăn',
              quantity: Number(it.quantity ?? 1),
              price: Number(it.price ?? 0),
              img: it.img,
            }))
            : [],
        });

        setLoading(false);
      },
      (err) => {
        console.warn('Order listen error:', err);
        setOrder(null);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [db, id]);

  /* ===== LISTEN DRONE DOC + SMOOTH (Expo Go friendly, không dùng AnimatedRegion) ===== */
  useEffect(() => {
    console.log("🚀 Listening drone:", order?.droneId);
    if (!order?.droneId) {
      setDroneDoc(null);
      return;
    }
    const unsub = onSnapshot(doc(db, 'drones', String(order.droneId)), (snap) => {
      if (!snap.exists()) {
        setDroneDoc(null);
        return;
      }
      const d = snap.data() as any;
      const nextPos = buildCoordinate(toNumberOrNull(d.latitude), toNumberOrNull(d.longitude));
      const info: DroneInfo = {
        id: snap.id,
        name: d.name,
        status: d.status,
        battery: typeof d.battery === 'number' ? d.battery : Number(d.battery ?? 0),
        latitude: nextPos?.latitude ?? null,
        longitude: nextPos?.longitude ?? null,
        speed: toNumberOrNull(d.speed),
      };
      setDroneDoc(info);
      console.log("📡 Drone update:", info);

      if (nextPos) smoothMoveTo(nextPos, info.speed);

    });
    return () => unsub();
  }, [db, order?.droneId]);


  /* ===== SMOOTH MOVE (requestAnimationFrame) ===== */
  const rAFRef = useRef<number | null>(null);
  const cancelRAF = () => {
    if (rAFRef.current != null) {
      cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
    }
  };

  const smoothMoveTo = (target: LatLng, speedKmh?: number | null) => {
    console.log("Drone moving to:", target);

    const start = lastDronePos.current ?? dronePos ?? target;
    const end = target;

    // cập nhật hướng
    const brg = computeBearing(start, end);
    setDroneHeading(brg);

    // thời lượng = min/max theo khoảng cách & tốc độ
    const distKm = haversineDistanceKm(start, end);
    const sp = speedKmh && speedKmh > 1 ? speedKmh : DEFAULT_DRONE_SPEED_KMH;
    const duration = Math.min(3500, Math.max(800, (distKm / Math.max(5, sp)) * 3600 * 1000));

    let startTs: number | null = null;
    cancelRAF();

    const step = (ts: number) => {
      if (startTs === null) startTs = ts;
      const t = Math.min(1, (ts - startTs) / duration);
      const e = easeInOutCubic(t);

      const lat = start.latitude + (end.latitude - start.latitude) * e;
      const lon = start.longitude + (end.longitude - start.longitude) * e;

      const cur = { latitude: lat, longitude: lon };
      setDronePos(cur);

      if (t < 1) {
        rAFRef.current = requestAnimationFrame(step);
      } else {
        lastDronePos.current = end;
        rAFRef.current = null;
      }
    };

    // thiết lập vị trí bắt đầu nếu chưa có
    if (!dronePos) {
      setDronePos(start);
      lastDronePos.current = start;
    }
    rAFRef.current = requestAnimationFrame(step);


  };

  useEffect(() => {
    return () => cancelRAF();
  }, []);


  /* ===== MAP REGION + ETA ===== */
  useEffect(() => {
    const points: LatLng[] = [];
    const restPt =
      order?.restaurantLocation?.latitude != null &&
        order?.restaurantLocation?.longitude != null
        ? {
          latitude: Number(order.restaurantLocation.latitude),
          longitude: Number(order.restaurantLocation.longitude),
        }
        : null;

    const custPt =
      order?.customer?.latitude != null && order?.customer?.longitude != null
        ? {
          latitude: Number(order.customer.latitude),
          longitude: Number(order.customer.longitude),
        }
        : null;

    if (restPt) points.push(restPt);
    if (custPt) points.push(custPt);
    if (dronePos) points.push(dronePos);

    // 🟢 Fit map chỉ 1 lần (khi drone bắt đầu di chuyển)
    if (points.length && !lastDronePos.current) {
      const region = computeRegion(points);
      if (region) {
        setMapRegion(region);
        (mapRef.current as any)?.fitToCoordinates(points, {
          edgePadding: { top: 50, left: 50, right: 50, bottom: 50 },
          animated: true,
        });
      }
    }

    // ✅ Tính ETA & khoảng cách
    if (custPt && dronePos) {
      const dist = haversineDistanceKm(dronePos, custPt);
      setDroneDistanceKm(dist);
      const sp = droneDoc?.speed && droneDoc?.speed > 1 ? droneDoc.speed : DEFAULT_DRONE_SPEED_KMH;
      setDroneEtaMinutes(sp ? (dist / sp) * 60 : null);
    } else {
      setDroneDistanceKm(null);
      setDroneEtaMinutes(null);
    }
  }, [order, dronePos, droneDoc?.speed]);

  /* ===== STATUS & META ===== */
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
    }
    if (!status) return 'pending';
    const s = status.toLowerCase();
    if (s.includes('huỷ') || s.includes('hủy') || s.includes('cancel')) return 'cancelled';
    if (s.includes('đến nơi') || s.includes('tới nơi') || s.includes('arriv')) return 'arrived';
    if (s.includes('đã giao') || s.includes('delivered') || s.includes('completed')) return 'completed';
    if (s.includes('đang giao') || s.includes('delivering')) return 'delivering';
    if (s.includes('drone') && s.includes('điều phối')) return 'drone_assigned';
    if (s.includes('xác nhận') || s.includes('confirmed') || s.includes('chuẩn bị')) return 'confirmed';
    return 'pending';
  };

  const STATUS_META: Record<
    string,
    { label: string; description: string; color: string; icon: keyof typeof Ionicons.glyphMap }
  > = {
    pending: { label: 'Đặt đơn thành công', description: 'Đang chờ nhà hàng xác nhận.', color: '#F59E0B', icon: 'time-outline' },
    confirmed: { label: 'Nhà hàng xác nhận', description: 'Đang chuẩn bị điều phối drone.', color: '#3B82F6', icon: 'restaurant-outline' },
    drone_assigned: { label: 'Drone chuẩn bị', description: 'Drone đã được gán và sắp cất cánh.', color: '#6366F1', icon: 'airplane-outline' },
    delivering: { label: 'Drone đang giao', description: 'Drone đang trên đường tới địa chỉ của bạn.', color: '#00A74F', icon: 'rocket-outline' },
    arrived: { label: 'Drone đã đến', description: 'Vui lòng kiểm tra và xác nhận đã nhận.', color: '#10B981', icon: 'location-outline' },
    completed: { label: 'Đã giao', description: 'Chúc bạn ngon miệng!', color: '#059669', icon: 'checkmark-circle-outline' },
    cancelled: { label: 'Đã huỷ', description: 'Đơn đã bị huỷ.', color: '#EF4444', icon: 'close-circle-outline' },
  };

  const normalizedStatus = normalizeStatus(order?.status, order?.statusCode);
  const statusMeta = STATUS_META[normalizedStatus] ?? STATUS_META.pending;
  const isCancelled = normalizedStatus === 'cancelled';
  const isCompleted = normalizedStatus === 'completed' && !isCancelled;
  const isArrived = normalizedStatus === 'arrived';
  const mapEnabledStatuses = ['confirmed', 'drone_assigned', 'delivering', 'arrived', 'completed'];

  const restaurantPoint =
    order?.restaurantLocation?.latitude != null &&
      order?.restaurantLocation?.longitude != null
      ? {
        latitude: Number(order.restaurantLocation.latitude),
        longitude: Number(order.restaurantLocation.longitude),
      }
      : null;

  const customerPoint =
    order?.customer?.latitude != null && order?.customer?.longitude != null
      ? { latitude: Number(order.customer.latitude), longitude: Number(order.customer.longitude) }
      : null;

  const distanceLabel =
    droneDistanceKm == null ? '' : droneDistanceKm < 0.1 ? '< 100m' : `${droneDistanceKm.toFixed(1)} km`;

  const etaLabel =
    droneEtaMinutes == null
      ? ''
      : droneEtaMinutes < 1
        ? 'Gần tới nơi'
        : droneEtaMinutes < 60
          ? `${Math.round(droneEtaMinutes)} phút`
          : `${Math.floor(droneEtaMinutes / 60)}h${Math.round(droneEtaMinutes % 60)
            .toString()
            .padStart(2, '0')}`;

  const closeToCustomer = droneDistanceKm !== null && droneDistanceKm <= 0.15;
  const shouldShowConfirm =
    !isCancelled && !isCompleted && (isArrived || (normalizedStatus === 'delivering' && closeToCustomer));
  const shouldShowMap =
    mapRegion && !isCancelled && mapEnabledStatuses.includes(normalizedStatus) && (restaurantPoint || customerPoint);
  const handleConfirmDelivered = async () => {
    try {
      if (!order) return;
      const orderRef = doc(db, "orders", order.id);
      await updateDoc(orderRef, {
        status: "completed",
        statusText: "Đơn hàng đã hoàn tất",
        updatedAt: serverTimestamp(),
      });
      Alert.alert("✅ Thành công", "Đơn hàng đã được xác nhận hoàn tất.");
    } catch (err) {
      console.error("Lỗi khi xác nhận:", err);
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái đơn hàng.");
    }
  };

  /* ===== RENDER ===== */
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
        <Text style={styles.emptySubtitle}>Đơn có thể đã bị xoá hoặc không tồn tại.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)/activity')}>
          <Text style={styles.primaryBtnText}>Về lịch sử đơn</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* App Bar */}
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
        {/* Status card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusIconWrapper, { backgroundColor: `${statusMeta.color}15` }]}>
            <Ionicons name={statusMeta.icon} size={26} color={statusMeta.color} />
          </View>
          <Text style={[styles.statusLabel, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          <Text style={styles.statusDescription}>{order.statusText ?? statusMeta.description}</Text>
          {order.createdAt ? <Text style={styles.statusMeta}>Đặt lúc {formatDateTime(order.createdAt)}</Text> : null}
        </View>

        {/* Timeline */}
        {(() => {
          const ORDER_STEPS = [
            { key: 'pending', title: 'Đặt đơn thành công', subtitle: 'Đang chờ nhà hàng xác nhận.' },
            { key: 'confirmed', title: 'Nhà hàng xác nhận', subtitle: 'Sẽ sớm điều phối drone.' },
          ];
          const stepKey = isCancelled ? 'pending' : normalizedStatus === 'pending' ? 'pending' : 'confirmed';
          const stepIndex = Math.max(0, ORDER_STEPS.findIndex(s => s.key === stepKey));

          return (
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
                        {reached ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
                      </View>
                      {index < ORDER_STEPS.length - 1 ? (
                        <View style={[styles.timelineLine, reached && { backgroundColor: `${statusMeta.color}55` }]} />
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
        })()}

        {/* Map card */}
        {(() => {
          const showMap =
            mapRegion && !isCancelled && mapEnabledStatuses.includes(normalizedStatus) && (restaurantPoint || customerPoint);
          if (!showMap) return null;

          return (
            <View style={[styles.card, styles.mapCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Hành trình giao hàng</Text>
                <View style={styles.mapHeaderRight}>
                  {droneDoc?.name ? (
                    <View style={styles.mapBadge}>
                      <Ionicons name="airplane-outline" size={12} />
                      <Text style={styles.mapBadgeText}>{droneDoc.name}</Text>
                    </View>
                  ) : null}
                  {typeof droneDoc?.battery === 'number' ? (
                    <View style={styles.mapBadge}>
                      <Ionicons name="battery-half-outline" size={12} />
                      <Text style={styles.mapBadgeText}>{Math.round(droneDoc.battery)}%</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.mapContainer}>
                <MapView
                  ref={mapRef}
                  style={styles.mapView}
                  initialRegion={mapRegion || undefined}
                  scrollEnabled
                  zoomEnabled
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

                  {/* Drone marker */}
                  <Marker
                    {...({ coordinate: dronePos, anchor: { x: 0.5, y: 0.5 }, flat: true, rotation: droneHeading, image: droneIcon } as any)}
                  />


                  {/* Route nhà hàng -> khách */}
                  {restaurantPoint && customerPoint ? (
                    <Polyline
                      coordinates={[restaurantPoint, customerPoint]}
                      strokeColor="#CBD5F5"
                      strokeWidth={3}
                      lineDashPattern={[6, 4]}
                    />
                  ) : null}

                  {/* Drone -> khách (đoạn còn lại) */}
                  {dronePos && customerPoint ? (
                    <Polyline
                      coordinates={[dronePos, customerPoint]}
                      strokeColor="#22C55E"
                      strokeWidth={4}
                    />
                  ) : null}
                </MapView>


              </View>

              <View style={styles.mapInfoRow}>
                <View style={styles.mapInfoItem}>
                  <Ionicons name="navigate-outline" size={16} />
                  <Text style={styles.mapInfoText}>
                    {distanceLabel ? `Còn ${distanceLabel}` : 'Đang cập nhật vị trí drone'}
                  </Text>
                </View>
                <View style={styles.mapInfoItem}>
                  <Ionicons name="time-outline" size={16} />
                  <Text style={styles.mapInfoText}>
                    {etaLabel ? `ETA ${etaLabel}` : 'Đang ước tính thời gian'}
                  </Text>
                </View>
                {droneDoc?.status ? (
                  <View style={styles.mapInfoItem}>
                    <Ionicons name="radio-outline" size={16} />
                    <Text style={styles.mapInfoText}>{String(droneDoc.status)}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })()}

        {/* Items */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Chi tiết món</Text>
            <Text style={styles.cardMeta}>
              {order.items.length} món • {formatCurrency(order.totalPrice)}
            </Text>
          </View>
          <View style={{ gap: 16 }}>
            {order.items.map((it) => (
              <View key={it.productId} style={styles.itemRow}>
                {it.img ? (
                  <Image source={{ uri: it.img }} style={styles.itemImage} />
                ) : (
                  <View style={styles.itemImagePlaceholder}>
                    <Ionicons name="fast-food-outline" size={20} color="#9CA3AF" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={2}>{it.name}</Text>
                  <Text style={styles.itemSub}>x{it.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>{formatCurrency(it.price * it.quantity)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Info */}
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
                {order.contactName ? `${order.contactName} • ` : ''}{order.contactPhone ?? ''}
              </Text>
            </View>
          ) : null}
          {order.droneId ? (
            <View style={styles.infoRow}>
              <Ionicons name="airplane-outline" size={20} color="#475569" />
              <Text style={styles.infoText}>
                Drone #{order.droneId}{droneDoc?.status ? ` • ${String(droneDoc.status)}` : ''}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Confirm Delivered Button */}
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

        {/* Completed */}
        {isCompleted ? (
          <View style={styles.successCard}>
            <Ionicons name="happy-outline" size={30} color="#047857" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.successTitle}>Đơn hàng đã hoàn tất!</Text>
              <Text style={styles.successSubtitle}>Cảm ơn bạn đã sử dụng dịch vụ.</Text>
            </View>
            <TouchableOpacity style={styles.rateBtn}>
              <Text style={styles.rateBtnText}>Đánh giá</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Cancelled */}
        {isCancelled ? (
          <View style={styles.cancelledCard}>
            <Ionicons name="alert" size={26} color="#B91C1C" />
            <Text style={styles.cancelledText}>Đơn hàng của bạn đã bị huỷ.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ===== STYLES ===== */
const BORDER = '#E5E7EB';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F6F7' },
  centered: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  loadingText: { marginTop: 12, fontSize: 15, color: '#475569' },

  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  appBarTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  appBarSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  statusCard: {
    margin: 16, marginBottom: 12, padding: 18, borderRadius: 18, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2, alignItems: 'center',
  },
  statusIconWrapper: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statusLabel: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  statusDescription: { fontSize: 15, color: '#475569', textAlign: 'center' },
  statusMeta: { fontSize: 13, color: '#6B7280', marginTop: 12 },

  timeline: { marginHorizontal: 16, marginBottom: 16, borderRadius: 18, backgroundColor: '#fff', padding: 18 },
  timelineRow: { flexDirection: 'row' },
  timelineIndicatorWrapper: { alignItems: 'center', marginRight: 14 },
  timelineIndicator: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CBD5F5',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginTop: 4, marginBottom: -4 },
  timelineContent: { flex: 1, paddingBottom: 18 },
  timelineTitle: { fontSize: 15, fontWeight: '600', color: '#94A3B8' },
  timelineSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },

  card: { marginHorizontal: 16, marginBottom: 16, padding: 18, borderRadius: 18, backgroundColor: '#fff', gap: 18 },
  mapCard: { paddingBottom: 18 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  cardMeta: { fontSize: 14, color: '#6B7280' },
  mapHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  mapContainer: { height: Math.min(400, Dimensions.get('window').height * 0.58), borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  mapView: { flex: 1 },

  mapBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#EEF2FF' },
  mapBadgeText: { marginLeft: 4, color: '#1D4ED8', fontSize: 12, fontWeight: '600' },

  mapInfoRow: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mapInfoItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: '#EFF6FF' },
  mapInfoText: { marginLeft: 6, color: '#1D4ED8', fontSize: 13, fontWeight: '600' },

  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemImage: { width: 54, height: 54, borderRadius: 12, marginRight: 12 },
  itemImagePlaceholder: { width: 54, height: 54, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  itemSub: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  itemPrice: { fontSize: 15, fontWeight: '700', color: '#111827', marginLeft: 12 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { flex: 1, fontSize: 14, color: '#1F2937' },

  confirmBtn: {
    marginHorizontal: 16, marginBottom: 16, borderRadius: 18, backgroundColor: '#16A34A',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, elevation: 3,
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  confirmBtnHint: { color: '#DCFCE7', fontSize: 12, marginTop: 2 },

  successCard: { marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 18, backgroundColor: '#ECFDF5', flexDirection: 'row', alignItems: 'center' },
  successTitle: { fontSize: 16, fontWeight: '700', color: '#047857' },
  successSubtitle: { fontSize: 13, color: '#047857', marginTop: 4 },
  rateBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: '#047857' },
  rateBtnText: { color: '#fff', fontWeight: '600' },

  cancelledCard: { marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 16, backgroundColor: '#FEF2F2', flexDirection: 'row', gap: 12, alignItems: 'center' },
  cancelledText: { flex: 1, fontSize: 14, color: '#B91C1C' },

  emptyTitle: { marginTop: 18, fontSize: 20, fontWeight: '700', color: '#111827' },
  emptySubtitle: { marginTop: 8, fontSize: 14, color: '#64748B', textAlign: 'center' },
  primaryBtn: { marginTop: 20, backgroundColor: '#00A74F', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 20 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
