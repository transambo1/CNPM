import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCart, CartItem } from "../../libs/CartContext";

export default function PaymentScreen() {
  const router = useRouter();
  const { items, totalPrice, updateQuantity, removeItem, clearCart, restaurantId } = useCart();

  const navigateHome = () => router.push("/(tabs)/index" as never);

  const handleIncrease = (id: string, current: number) => {
    updateQuantity(id, Math.min(current + 1, 99));
  };

  const handleDecrease = (id: string, current: number) => {
    const next = current - 1;
    updateQuantity(id, next);
  };

  const handleCheckout = () => {
    if (!items.length) {
      Alert.alert("Giỏ hàng trống", "Vui lòng chọn món trước khi thanh toán.");
      return;
    }

    Alert.alert("Đặt hàng thành công", "GrabFood sẽ giao món cho bạn sớm nhất!", [
      {
        text: "OK",
        onPress: () => {
          clearCart();
          navigateHome();
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <Image source={{ uri: item.img }} style={styles.cartImage} />
      <View style={styles.cartBody}>
        <Text style={styles.cartName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.cartPrice}>{(item.price * item.quantity).toLocaleString()}đ</Text>

        <View style={styles.cartControls}>
          <TouchableOpacity
            style={[styles.quantityBtn, item.quantity <= 1 && styles.quantityBtnDisabled]}
            onPress={() => handleDecrease(item.id, item.quantity)}
            disabled={item.quantity <= 1}
          >
            <Ionicons
              name="remove"
              size={18}
              color={item.quantity <= 1 ? "#999" : "#111"}
            />
          </TouchableOpacity>
          <Text style={styles.cartQuantity}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.quantityBtn}
            onPress={() => handleIncrease(item.id, item.quantity)}
          >
            <Ionicons name="add" size={18} color="#111" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeBtn}>
        <Ionicons name="trash" size={18} color="#E53935" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Giỏ hàng</Text>
        {restaurantId && (
          <View style={styles.headerTag}>
            <Ionicons name="storefront-outline" size={14} color="#00A74F" />
            <Text style={styles.headerTagText}>Nhà hàng #{restaurantId}</Text>
          </View>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color="#C5CDD3" />
          <Text style={styles.emptyText}>Giỏ hàng của bạn đang trống</Text>
          <TouchableOpacity style={styles.startOrderBtn} onPress={navigateHome}>
            <Text style={styles.startOrderText}>Bắt đầu đặt món</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 16, paddingBottom: 140 }}
        />
      )}

      <View style={styles.summaryBar}>
        <View>
          <Text style={styles.summaryLabel}>Tổng cộng</Text>
          <Text style={styles.summaryPrice}>{totalPrice.toLocaleString()}đ</Text>
        </View>
        <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout} activeOpacity={0.9}>
          <Text style={styles.checkoutText}>Thanh toán</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const GREEN = "#00A74F";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F1",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#111" },
  headerTag: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5FFF9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  headerTagText: { color: GREEN, fontWeight: "600", fontSize: 12 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  emptyText: { fontSize: 16, color: "#777" },
  startOrderBtn: {
    backgroundColor: GREEN,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  startOrderText: { color: "#fff", fontWeight: "700" },
  cartItem: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F1",
    alignItems: "center",
    gap: 14,
  },
  cartImage: { width: 68, height: 68, borderRadius: 12, backgroundColor: "#F2F4F5" },
  cartBody: { flex: 1 },
  cartName: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 6 },
  cartPrice: { fontSize: 14, color: GREEN, fontWeight: "700" },
  cartControls: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  quantityBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F7F8",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityBtnDisabled: { opacity: 0.4 },
  cartQuantity: { fontSize: 16, fontWeight: "700", minWidth: 24, textAlign: "center" },
  removeBtn: { padding: 6 },
  summaryBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: "#EEF1F1",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: { color: "#666", fontSize: 13 },
  summaryPrice: { color: "#111", fontSize: 18, fontWeight: "800", marginTop: 4 },
  checkoutBtn: {
    backgroundColor: GREEN,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkoutText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
