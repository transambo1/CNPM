import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

import { app } from '../../libs/firebase';
import { useCart } from '../../libs/CartContext';

const formatCurrency = (value: number) =>
  value.toLocaleString('vi-VN', { minimumFractionDigits: 0 }) + 'đ';

type Product = {
  id: string;
  name: string;
  img: string;
  price: number;
  description?: string;
  rating?: number;
  reviews?: number;
  ingredients?: string[];
  restaurantId: string;
  calories?: number;
  prepTime?: number;
};

export default function DetailProduct() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToCart, totalItems, totalPrice } = useCart();
  const db = useMemo(() => getFirestore(app), []);

  const fetchProduct = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'products', Array.isArray(id) ? id[0] : id);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const d = snap.data() as any;
        setProduct({
          id: snap.id,
          name: d.name,
          img: d.img,
          price: Number(d.price ?? 0),
          description: d.description,
          rating: d.rating,
          reviews: d.reviews,
          ingredients: d.ingredients ?? [],
          restaurantId: d.restaurantId,
          calories: d.calories,
          prepTime: d.prepTime ?? d.eta,
        });
      } else {
        setProduct(null);
      }
    } catch (error) {
      console.error('Lỗi fetch product:', error);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [db, id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (product?.restaurantId) {
      router.push(`/restaurant/${product.restaurantId}` as never);
      return;
    }
    router.push('/' as never);
  }, [product?.restaurantId, router]);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      img: product.img,
      restaurantId: product.restaurantId,
    });
    Alert.alert('Đã thêm vào giỏ', `${product.name} x1`);
  };

  const handleAddToCart = () => {
    if (!product) return;
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      img: product.img,
      restaurantId: product.restaurantId,
    });
    Alert.alert("Đã thêm vào giỏ", `${product.name} x1`);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }] }>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#00A74F" />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={52} color="#94A3B8" />
          <Text style={styles.noData}>Không tìm thấy món ăn!</Text>
          <TouchableOpacity style={styles.returnBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={18} color="#00A74F" style={{ marginRight: 6 }} />
            <Text style={styles.returnText}>Quay lại trang trước</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.appBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#111" />
        </TouchableOpacity>
        <Text numberOfLines={1} style={styles.appBarTitle}>
          {product.name}
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrapper}>
          <Image source={{ uri: product.img }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          <View style={styles.heroChipRow}>
            <View style={styles.heroChip}>
              <Ionicons name="star" size={14} color="#FFC107" />
              <Text style={styles.heroChipText}>{(product.rating ?? 4.5).toFixed(1)} điểm</Text>
            </View>
            <View style={styles.heroChip}>
              <Ionicons name="time-outline" size={14} color="#fff" />
              <Text style={styles.heroChipText}>{product.prepTime ?? 20} phút</Text>
            </View>
            {product.calories ? (
              <View style={styles.heroChip}>
                <Ionicons name="flame-outline" size={14} color="#fff" />
                <Text style={styles.heroChipText}>{product.calories} kcal</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>{formatCurrency(product.price)}</Text>

          <View style={styles.ratingRow}>
            <Ionicons name="thumbs-up-outline" size={16} color="#00A74F" style={{ marginRight: 6 }} />
            <Text style={styles.ratingText}>
              {(product.reviews ?? 128) + ' đánh giá xuất sắc từ thực khách Grab'}
            </Text>
          </View>

          {product.description ? (
            <Text style={styles.description}>{product.description}</Text>
          ) : (
            <Text style={styles.description}>
              Món ăn được chế biến tươi mỗi ngày, đảm bảo vệ sinh an toàn thực phẩm và hương vị trọn vẹn.
            </Text>
          )}

          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#00A74F" />
              <View style={styles.infoCardBody}>
                <Text style={styles.infoCardTitle}>Đảm bảo GrabFood</Text>
                <Text style={styles.infoCardSubtitle}>Hoàn tiền nếu món không giống mô tả</Text>
              </View>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="bicycle-outline" size={20} color="#00A74F" />
              <View style={styles.infoCardBody}>
                <Text style={styles.infoCardTitle}>Giao hàng siêu tốc</Text>
                <Text style={styles.infoCardSubtitle}>Tài xế gần nhất sẽ nhận đơn của bạn</Text>
              </View>
            </View>
          </View>

          {product.ingredients && product.ingredients.length > 0 ? (
            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>Thành phần nổi bật</Text>
              {product.ingredients.map((ing, index) => (
                <Text key={index} style={styles.ingredient}>
                  • {ing}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Gợi ý thêm</Text>
            <View style={styles.addonRow}>
              <View style={styles.addonChip}>
                <Ionicons name="ice-cream-outline" size={16} color="#00A74F" />
                <Text style={styles.addonText}>Thêm topping</Text>
              </View>
              <View style={styles.addonChip}>
                <Ionicons name="water-outline" size={16} color="#00A74F" />
                <Text style={styles.addonText}>Combo nước mát</Text>
              </View>
            </View>
            <Text style={styles.helperText}>Bạn có thể ghi chú yêu cầu riêng ở bước thanh toán.</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        {totalItems > 0 && (
          <TouchableOpacity style={styles.viewCartButton} onPress={() => router.push('/cart')}>
            <View>
              <Text style={styles.viewCartText}>Xem giỏ hàng ({totalItems})</Text>
              <Text style={styles.viewCartSub}>{formatCurrency(totalPrice)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.addButton} onPress={handleAddToCart}>
          <Ionicons name="cart" size={20} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.addButtonText}>Thêm vào giỏ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F8FB',
  },
  appBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E9F0',
    backgroundColor: '#fff',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F3F6',
  },
  appBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  heroWrapper: {
    height: 260,
    backgroundColor: '#000',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  heroChipRow: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  heroChipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  content: {
    padding: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111',
    marginBottom: 8,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    color: '#00A74F',
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  description: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  infoGrid: {
    marginTop: 24,
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  infoCardBody: {
    marginLeft: 12,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  infoCardSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#64748B',
  },
  sectionBox: {
    marginTop: 28,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 10,
  },
  ingredient: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 6,
  },
  addonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  addonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    backgroundColor: '#F0FFF4',
  },
  addonText: {
    marginLeft: 6,
    color: '#047857',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 13,
    color: '#6B7280',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#fff',
    gap: 12,
  },
  viewCartButton: {
    backgroundColor: '#00A74F',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewCartText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  viewCartSub: {
    color: '#E2E8F0',
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#111',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  noData: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  returnBtn: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#E6F7EF',
  },
  returnText: {
    color: '#008D4C',
    fontWeight: '600',
  },
});
