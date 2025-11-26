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
  restaurantName?: string;
  calories?: number;
  prepTime?: number;
};

export default function DetailProduct() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
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
        let restaurantName: string | undefined = d.restaurantName;
        const restaurantId = d.restaurantId as string | undefined;

        if (!restaurantName && restaurantId) {
          try {
            const restaurantDoc = await getDoc(doc(db, 'restaurants', restaurantId));
            if (restaurantDoc.exists()) {
              const restaurantData = restaurantDoc.data() as any;
              restaurantName = restaurantData.name ?? restaurantName;
            }
          } catch (error) {
            console.warn('Không thể tải tên nhà hàng:', error);
          }
        }

        setProduct({
          id: snap.id,
          name: d.name,
          img: d.img,
          price: Number(d.price ?? 0),
          description: d.description,
          rating: d.rating,
          reviews: d.reviews,
          ingredients: d.ingredients ?? [],
          restaurantId: restaurantId ?? '',
          restaurantName,
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

  const incrementQuantity = useCallback(() => {
    setQuantity((prev) => Math.min(99, prev + 1));
  }, []);

  const decrementQuantity = useCallback(() => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  }, []);

  const handleAddToCart = () => {
    if (!product) return;
    const result = addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      img: product.img,
      restaurantId: product.restaurantId,
      restaurantName: product.restaurantName,
    }, quantity, { restaurantName: product.restaurantName });

    if (result.status === 'conflict') {
      const currentName = result.activeRestaurantName || 'nhà hàng khác';
      const nextName = result.restaurantName || 'nhà hàng này';
      Alert.alert(
        'Tạo giỏ hàng mới?',
        `Bạn đang có giỏ hàng từ ${currentName}. Bạn có muốn tạo giỏ mới cho ${nextName} không?`,
        [
          { text: 'Huỷ', style: 'cancel' },
          {
            text: 'Tạo giỏ mới',
            style: 'default',
            onPress: () => {
              const retry = addToCart({
                id: product.id,
                name: product.name,
                price: product.price,
                img: product.img,
                restaurantId: product.restaurantId,
                restaurantName: product.restaurantName,
              }, quantity, { restaurantName: product.restaurantName, allowCreateNewCart: true });
              if (retry.status === 'added') {
                Alert.alert('Đã thêm vào giỏ', `${product.name} x${quantity}`);
              }
            },
          },
        ]
      );
      return;
    }

    if (result.status === 'added') {
      Alert.alert('Đã thêm vào giỏ', `${product.name} x${quantity}`);
    } else if (result.status === 'error') {
      Alert.alert('Không thể thêm vào giỏ', result.message);
    }
  };



  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
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
              {(product.reviews ?? 128) + ' đánh giá xuất sắc từ thực khách '}
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
                <Text style={styles.infoCardTitle}>Đảm bảo đúng chất lượng </Text>
                <Text style={styles.infoCardSubtitle}>Hoàn tiền nếu món không giống mô tả</Text>
              </View>
            </View>
            <View style={styles.infoCard}>

              <View style={styles.infoCardBody}>
                <Text style={styles.infoCardTitle}>Giao hàng siêu tốc</Text>
                <Text style={styles.infoCardSubtitle}>Drone sẽ giao đơn của bạn nhanh nhất</Text>
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

          {/*    <Ionicons name="bicycle-outline" size={20} color="#00A74F" />
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
  <Text style={styles.helperText}>
    Bạn có thể ghi chú yêu cầu riêng ở bước thanh toán.
  </Text>
</View>
*/}

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
        <View style={styles.buyRow}>
          <View style={styles.quantitySelector}>
            <TouchableOpacity
              onPress={decrementQuantity}
              style={[styles.quantityBtn, quantity === 1 && { opacity: 0.6 }]}
              accessibilityLabel="Giảm số lượng"
            >
              <Ionicons name="remove" size={18} color="#111" />
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{quantity}</Text>
            <TouchableOpacity
              onPress={incrementQuantity}
              style={styles.quantityBtn}
              accessibilityLabel="Tăng số lượng"
            >
              <Ionicons name="add" size={18} color="#111" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAddToCart}>
            <Ionicons name="cart" size={20} color="#fff" style={{ marginRight: 6 }} />
            <View>
              <Text style={styles.addButtonText}>Thêm vào giỏ</Text>
              <Text style={styles.addButtonSub}>{formatCurrency(product.price * quantity)}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF",
  },

  /* ------------------ APP BAR ------------------ */
  appBar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ffd6b0",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 3,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ffd6b0",
  },
  appBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1a1a",
  },

  /* ------------------ HERO IMAGE ------------------ */
  heroWrapper: {
    height: 260,
    width: "100%",
    backgroundColor: "#000",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  heroChipRow: {
    position: "absolute",
    left: 16,
    bottom: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  heroChipText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },

  /* ------------------ CONTENT ------------------ */
  content: {
    padding: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 6,
  },
  price: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ff5a00",
    marginBottom: 12,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  ratingText: {
    fontSize: 14,
    color: "#555",
  },

  description: {
    fontSize: 15,
    color: "#444",
    lineHeight: 22,
  },

  /* ------------------ INFO CARDS ------------------ */
  infoGrid: {
    marginTop: 24,
    gap: 12,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ffd6b0",
    shadowColor: "#000",
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
    fontWeight: "700",
    color: "#1a1a1a",
  },
  infoCardSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "#666",
  },

  /* ------------------ INGREDIENT LIST ------------------ */
  sectionBox: {
    marginTop: 26,
    padding: 18,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ffd6b0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 12,
    color: "#1a1a1a",
  },
  ingredient: {
    fontSize: 14,
    marginBottom: 5,
    color: "#555",
  },

  /* ------------------ BOTTOM BAR ------------------ */
  bottomBar: {
    padding: 16,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: "#ffd6b0",
    backgroundColor: "#fff",
    gap: 12,
  },

  buyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  quantitySelector: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ffd6b0",
    backgroundColor: "#fff",
  },
  quantityBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityValue: {
    minWidth: 36,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
  },

  /* ------------------ ADD TO CART BUTTON ------------------ */
  addButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#000000ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ff7a00",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  addButtonSub: {
    color: "#ffe2cc",
    fontSize: 12,
    marginTop: 2,
  },

  /* ------------------ VIEW CART ------------------ */
  viewCartButton: {
    backgroundColor: "#ff5a00",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewCartText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  viewCartSub: {
    color: "#ffe9db",
    fontSize: 13,
    marginTop: 2,
  },

  /* ------------------ EMPTY / ERROR ------------------ */
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  noData: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  returnBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ffd6b0",
    backgroundColor: "#fff5ee",
  },
  returnText: {
    color: "#ff5a00",
    fontWeight: "700",
    marginLeft: 6,
  },
});
