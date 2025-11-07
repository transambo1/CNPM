import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

import { Ionicons } from "@expo/vector-icons";
import { app } from "../../libs/firebase";
import { useCart } from "../../libs/CartContext";


// ==== Types ====
type Product = {
  id: string;
  name: string;
  img: string;
  price: number;
  rating?: number;   // optional
  reviews?: number;  // optional
};

type Restaurant = {
  id: string;
  name: string;
  image: string;
  address: string;
};

// ==== Screen ====
export default function RestaurantMenu() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // restaurantId

  const [products, setProducts] = useState<Product[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const { totalItems } = useCart();

  const titleText = useMemo(
    () => (restaurant?.name ? restaurant.name : "Nhà hàng"),
    [restaurant?.name]
  );

  useEffect(() => {
  const fetchAll = async () => {
    setLoading(true);
    const db = getFirestore(app);

    try {
      // ✅ 1) Restaurant info bằng Document ID
      const docRef = doc(db, "restaurants", id as string);
      const rSnap = await getDoc(docRef);

      if (rSnap.exists()) {
        const r = rSnap.data() as any;
        setRestaurant({
          id: id as string,
          name: r.name,
          address: r.address,
          image: r.image,
        });
      }

      // ✅ 2) Products theo restaurantId
      const pQuery = query(collection(db, "products"), where("restaurantId", "==", id));
      const pSnap = await getDocs(pQuery);

      const pData = pSnap.docs.map((doc) => {
        const d = doc.data() as any;
        return {
          id: doc.id,
          name: d.name,
          img: d.img,
          price: d.price,
          rating: d.rating ?? undefined,
          reviews: d.reviews ?? undefined,
        } as Product;
      });

      setProducts(pData);
    } catch (e) {
      console.error("Fetch restaurant menu error:", e);
    } finally {
      setLoading(false);
    }
  };

  fetchAll();
}, [id]);


  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.card}
    onPress={() =>
  router.push({
    pathname: "/product/[id]",
    params: { id: item.id },
  })
}


    >
      <Image source={{ uri: item.img }} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.name}
        </Text>

        <View style={styles.cardMetaRow}>
          <Ionicons name="star" size={14} color="#FFC107" />
          <Text style={styles.cardMetaText}>
            {item.rating ? item.rating.toFixed(1) : "4.5"}
          </Text>
          <Text style={styles.cardMetaSub}>
            {"  "}({item.reviews ?? 120})
          </Text>
        </View>

        <Text style={styles.cardPrice}>{(item.price ?? 0).toLocaleString()}đ</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <ActivityIndicator size="large" color="#00A74F" style={{ marginTop: 50 }} />;
  }

  return (
    <View style={styles.container}>
      {/* Top AppBar (Back + Title) */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#111" />
        </TouchableOpacity>
        <Text numberOfLines={1} style={styles.appBarTitle}>
          {titleText}
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/cart')}
          style={styles.cartButton}
          accessibilityLabel="Xem giỏ hàng"
        >
          <Ionicons name="cart-outline" size={24} color="#111" />
          {totalItems > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Header banner của nhà hàng */}
      {restaurant && (
        <View style={styles.header}>
          <Image source={{ uri: restaurant.image }} style={styles.headerImage} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {restaurant.name}
            </Text>
            <Text style={styles.headerAddress} numberOfLines={1}>
              {restaurant.address}
            </Text>
            <View style={styles.headerTags}>
              <View style={styles.tagPill}>
                <Ionicons name="bicycle-outline" size={14} color="#00A74F" />
                <Text style={styles.tagText}>Giao nhanh</Text>
              </View>
              <View style={styles.tagPill}>
                <Ionicons name="pricetag-outline" size={14} color="#00A74F" />
                <Text style={styles.tagText}>Ưu đãi</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {products.length === 0 ? (
        <Text style={styles.noData}>Nhà hàng này chưa có món ăn</Text>
      ) : (
        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 6 }}
        />
      )}
    </View>
  );
}

// ==== Styles (GrabFood Premium) ====
const GREEN = "#00A74F";
const BORDER = "#EEF1F1";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  // AppBar
  appBar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: "#fff",
  },
  backBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  appBarTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#111" },
  cartButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  // Restaurant header
  header: {
    flexDirection: "row",
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: "#fff",
  },
  headerImage: {
    width: 86,
    height: 86,
    borderRadius: 12,
    backgroundColor: "#F2F4F5",
  },
  headerInfo: { flex: 1, justifyContent: "center" },
  headerName: { fontSize: 18, fontWeight: "800", color: "#111", marginBottom: 4 },
  headerAddress: { fontSize: 13, color: "#666" },
  headerTags: { flexDirection: "row", gap: 8, marginTop: 10 },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: GREEN,
    borderRadius: 999,
    backgroundColor: "#F5FFF9",
  },
  tagText: { fontSize: 12, color: GREEN, fontWeight: "600" },

  // Product card (premium)
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }),
  },
  cardImage: {
    width: 92,
    height: 92,
    borderRadius: 12,
    backgroundColor: "#F2F4F5",
    marginRight: 12,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 6 },
  cardMetaRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  cardMetaText: { marginLeft: 4, fontSize: 13, color: "#222", fontWeight: "600" },
  cardMetaSub: { fontSize: 12, color: "#666" },
  cardPrice: { fontSize: 16, color: GREEN, fontWeight: "800", marginTop: 2 },

  // No data
  noData: { textAlign: "center", marginTop: 30, fontSize: 16, color: "#777" },
});
