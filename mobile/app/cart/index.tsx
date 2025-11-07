import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../libs/CartContext';

const GREEN = '#00A74F';
const BORDER = '#EEF1F1';

type CartListItemProps = {
  id: string;
  name: string;
  img: string;
  price: number;
  quantity: number;
};

const CartItemRow = ({ item }: { item: CartListItemProps }) => {
  const { increment, decrement, removeFromCart } = useCart();

  return (
    <View style={styles.cartRow}>
      <Image source={{ uri: item.img }} style={styles.cartImage} />
      <View style={styles.cartInfo}>
        <Text style={styles.cartName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.cartPrice}>{item.price.toLocaleString('vi-VN')}đ</Text>
        <View style={styles.quantityRow}>
          <TouchableOpacity
            onPress={() => decrement(item.id)}
            style={styles.quantityButton}
            accessibilityLabel="Giảm số lượng"
          >
            <Ionicons name="remove" size={18} color="#111" />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <TouchableOpacity
            onPress={() => increment(item.id)}
            style={styles.quantityButton}
            accessibilityLabel="Tăng số lượng"
          >
            <Ionicons name="add" size={18} color="#111" />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => removeFromCart(item.id)}
        style={styles.removeButton}
        accessibilityLabel="Xóa món khỏi giỏ"
      >
        <Ionicons name="trash-outline" size={20} color="#999" />
      </TouchableOpacity>
    </View>
  );
};

export default function CartScreen() {
  const router = useRouter();
  const { items, totalItems, totalPrice } = useCart();

  const renderItem = ({ item }: { item: CartListItemProps }) => <CartItemRow item={item} />;

  const handleCheckout = () => {
    router.push({
      pathname: '/checkout/payment',
      params: { total: totalPrice.toString() },
    } as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.appBar}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.push('/'))}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Giỏ hàng</Text>
        <View style={{ width: 34 }} />
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={72} color="#ccc" />
          <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
          <Text style={styles.emptySubtitle}>
            Bắt đầu thêm món yêu thích từ GrabFood nào!
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.emptyButtonText}>Khám phá món ngon</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.footer}>
            <View>
              <Text style={styles.footerLabel}>Tổng cộng</Text>
              <Text style={styles.footerTotal}>{totalPrice.toLocaleString('vi-VN')}đ</Text>
              <Text style={styles.footerSub}>{totalItems} món trong giỏ</Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutButton, items.length === 0 && { opacity: 0.5 }]}
              onPress={handleCheckout}
              disabled={items.length === 0}
            >
              <Text style={styles.checkoutText}>Thanh toán</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  appBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#fff',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  cartImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#f2f4f5',
    marginRight: 12,
  },
  cartInfo: {
    flex: 1,
  },
  cartName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  cartPrice: {
    fontSize: 14,
    color: GREEN,
    fontWeight: '700',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    minWidth: 24,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 15,
  },
  removeButton: {
    padding: 6,
    marginLeft: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    color: '#222',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginTop: 6,
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: GREEN,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLabel: {
    fontSize: 13,
    color: '#666',
  },
  footerTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: GREEN,
  },
  footerSub: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GREEN,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 26,
  },
  checkoutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
