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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { app } from "../../libs/firebase";

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

      {/* Floating Add to Cart Button */}
      <TouchableOpacity style={styles.floatingBtn}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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

  floatingBtn: {
    position: "absolute",
    bottom: 28,
    right: 22,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 5 },
    }),
  },
});
