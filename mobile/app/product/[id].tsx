import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { app } from "../../libs/firebase";
import { useCart } from "../../libs/CartContext";

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
};

export default function DetailProduct() {
  const { id } = useLocalSearchParams(); // product id
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { addItem, restaurantId: cartRestaurantId } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      const db = getFirestore(app);

      try {
        const docRef = doc(db, "products", id as string);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const d = snap.data() as any;
          setProduct({
            id: snap.id,
            name: d.name,
            img: d.img,
            price: d.price,
            description: d.description,
            rating: d.rating,
            reviews: d.reviews,
            ingredients: d.ingredients ?? [],
            restaurantId: d.restaurantId, // <-- Needed for Smart Back
          });
        } else {
          console.warn("Không tìm thấy sản phẩm!");
        }
      } catch (error) {
        console.error("Lỗi fetch product:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleBack = () => {
  if (router.canGoBack()) router.back();
  else if (product?.restaurantId) router.push(`/restaurant/${product.restaurantId}` as never);
  else router.push("/" as never);
};

  useEffect(() => {
    setQuantity(1);
  }, [id]);

  const isDifferentRestaurant = useMemo(() => {
    if (!product) return false;
    if (!cartRestaurantId) return false;
    return cartRestaurantId !== product.restaurantId;
  }, [cartRestaurantId, product]);

  const increaseQuantity = () => setQuantity((prev) => Math.min(prev + 1, 99));
  const decreaseQuantity = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = () => {
    if (!product) return;

    addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        img: product.img,
        restaurantId: product.restaurantId,
      },
      quantity
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#00A74F" style={{ marginTop: 50 }} />;
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={styles.noData}>Không tìm thấy món ăn!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* AppBar with Smart Back */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#111" />
        </TouchableOpacity>
        <Text numberOfLines={1} style={styles.appBarTitle}>
          {product.name}
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 140 }}>
        <Image source={{ uri: product.img }} style={styles.image} />

        <View style={styles.content}>
          <Text style={styles.name}>{product.name}</Text>

          <View style={styles.row}>
            <Ionicons name="star" size={16} color="#FFC107" />
            <Text style={styles.ratingText}>
              {product.rating ?? 4.5}{" "}
              <Text style={styles.reviewCount}>({product.reviews ?? 120} đánh giá)</Text>
            </Text>
          </View>

          <Text style={styles.price}>{product.price.toLocaleString()}đ</Text>

          {product.description && (
            <Text style={styles.description}>{product.description}</Text>
          )}

          {product.ingredients && product.ingredients.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.sectionTitle}>Thành phần</Text>
              {product.ingredients.map((ing, index) => (
                <Text key={index} style={styles.ingredient}>
                  • {ing}
                </Text>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.quantitySelector}>
          <TouchableOpacity
            onPress={decreaseQuantity}
            style={[styles.quantityButton, quantity === 1 && styles.quantityButtonDisabled]}
            disabled={quantity === 1}
          >
            <Ionicons name="remove" size={18} color={quantity === 1 ? "#999" : "#111"} />
          </TouchableOpacity>
          <Text style={styles.quantityValue}>{quantity}</Text>
          <TouchableOpacity onPress={increaseQuantity} style={styles.quantityButton}>
            <Ionicons name="add" size={18} color="#111" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.addCartButton, isDifferentRestaurant && styles.addCartButtonWarning]}
          activeOpacity={0.9}
          onPress={handleAddToCart}
        >
          <View>
            <Text style={styles.addCartText}>Thêm vào giỏ</Text>
            <Text style={styles.addCartSubText}>
              {(product.price * quantity).toLocaleString()}đ
            </Text>
          </View>
          <Ionicons name="cart" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ==== Styles (GrabFood Premium) ====
const GREEN = "#00A74F";
const BORDER = "#EEF1F1";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  appBar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: "#fff",
    zIndex: 10,
  },
  backBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  appBarTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#111" },

  image: { width: "100%", height: 260, resizeMode: "cover" },

  content: { padding: 16 },
  name: { fontSize: 22, fontWeight: "800", color: "#111", marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  ratingText: { marginLeft: 6, fontSize: 14, color: "#111", fontWeight: "600" },
  reviewCount: { color: "#666", fontWeight: "400" },
  price: { fontSize: 20, fontWeight: "800", color: GREEN, marginBottom: 10 },
  description: { fontSize: 15, color: "#555", lineHeight: 22, marginTop: 5 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 6, color: "#111" },
  ingredient: { fontSize: 15, color: "#444", marginLeft: 4, marginVertical: 2 },

  noData: { fontSize: 16, color: "#777" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  quantitySelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F7F8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButtonDisabled: {
    opacity: 0.4,
  },
  quantityValue: { fontSize: 18, fontWeight: "700", marginHorizontal: 8 },
  addCartButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: GREEN,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  addCartButtonWarning: {
    backgroundColor: "#FF7043",
  },
  addCartText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  addCartSubText: { color: "#F0FFEB", fontSize: 13, marginTop: 2 },
});
