import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
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
  const { addToCart, totalItems, totalPrice } = useCart();

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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
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
        {totalItems > 0 && (
          <TouchableOpacity
            style={styles.viewCartButton}
            onPress={() => router.push('/cart')}
          >
            <View>
              <Text style={styles.viewCartText}>Xem giỏ hàng ({totalItems})</Text>
              <Text style={styles.viewCartSub}>{totalPrice.toLocaleString()}đ</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.addButton} onPress={handleAddToCart}>
          <Ionicons name="cart" size={20} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.addButtonText}>Thêm vào giỏ</Text>
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
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 26 : 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    gap: 12,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
    paddingVertical: 14,
    borderRadius: 28,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  viewCartButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#111",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 18,
  },
  viewCartText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  viewCartSub: {
    color: "#E5E5EA",
    marginTop: 2,
    fontSize: 13,
  },
});
