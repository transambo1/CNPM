import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../libs/CartContext';

const GREEN = '#00A74F';
const BORDER = '#EEF1F1';

const formatCurrency = (value: number) =>
  (Number(value) || 0).toLocaleString('vi-VN', { minimumFractionDigits: 0 }) + 'đ';

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
  const {
    items,
    totalPrice,
    activeItemCount,
    cartSummaries,
    activeRestaurantId,
    activeRestaurantName,
    selectCart,
  } = useCart();

  const hasItems = items.length > 0;

  const renderItem = ({ item }: { item: CartListItemProps }) => <CartItemRow item={item} />;

  const cartTabs = useMemo(() => {
    if (cartSummaries.length === 0) return null;

    return (
      <View style={styles.tabSection}>
        <Text style={styles.tabLabel}>Giỏ hàng của bạn</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 6, gap: 12 }}
        >
          {cartSummaries.map((cart) => {
            const isActive = cart.restaurantId === activeRestaurantId;
            return (
              <TouchableOpacity
                key={cart.restaurantId}
                onPress={() => selectCart(cart.restaurantId)}
                style={[styles.tabChip, isActive && styles.tabChipActive]}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabChipTitle, isActive && styles.tabChipTitleActive]} numberOfLines={1}>
                  {cart.restaurantName || 'Nhà hàng khác'}
                </Text>
                <Text style={[styles.tabChipSub, isActive && styles.tabChipSubActive]}>
                  {cart.itemCount} món • {formatCurrency(cart.totalPrice)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [cartSummaries, activeRestaurantId, selectCart]);

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

      {!hasItems ? (
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
          {cartTabs}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {activeRestaurantName || 'Nhà hàng'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {activeItemCount} món • {formatCurrency(totalPrice)}
            </Text>
          </View>

          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={<View style={{ height: 12 }} />}
          />

          <View style={styles.footer}>
            <View>
              <Text style={styles.footerLabel}>Tổng cộng</Text>
              <Text style={styles.footerTotal}>{formatCurrency(totalPrice)}</Text>
              <Text style={styles.footerSub}>{activeItemCount} món trong giỏ</Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutButton, !hasItems && { opacity: 0.5 }]}
              onPress={handleCheckout}
              disabled={!hasItems}
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
  tabSection: {
    paddingTop: 12,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tabChip: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 180,
    backgroundColor: '#fff',
  },
  tabChipActive: {
    backgroundColor: '#E6F7EF',
    borderColor: '#9EE0BF',
  },
  tabChipTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  tabChipTitleActive: {
    color: '#047857',
  },
  tabChipSub: {
    fontSize: 13,
    color: '#6B7280',
  },
  tabChipSubActive: {
    color: '#047857',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
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
