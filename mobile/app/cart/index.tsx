import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
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
    clearCart,
    clearAll,
  } = useCart();

  const hasItems = items.length > 0;
  const hasAnyCart = cartSummaries.length > 0;

  const renderItem = ({ item }: { item: CartListItemProps }) => <CartItemRow item={item} />;

  const handleClearCart = useCallback(
    (restaurantId?: string) => {
      if (!restaurantId) return;
      const summary = cartSummaries.find((cart) => cart.restaurantId === restaurantId);
      const title = summary?.restaurantName || 'nhà hàng này';
      Alert.alert(
        'Xóa giỏ hàng',
        `Bạn có chắc muốn xóa toàn bộ món của ${title}?`,
        [
          { text: 'Huỷ', style: 'cancel' },
          {
            text: 'Xóa',
            style: 'destructive',
            onPress: () => clearCart(restaurantId),
          },
        ]
      );
    },
    [cartSummaries, clearCart]
  );

  const handleClearAll = useCallback(() => {
    if (cartSummaries.length === 0) return;
    Alert.alert('Xóa tất cả giỏ hàng', 'Bạn muốn xóa mọi giỏ hàng hiện có?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xóa hết',
        style: 'destructive',
        onPress: clearAll,
      },
    ]);
  }, [cartSummaries.length, clearAll]);

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
              <View
                key={cart.restaurantId}
                style={[styles.tabChipWrapper, isActive && styles.tabChipWrapperActive]}
              >
                <TouchableOpacity
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
                <TouchableOpacity
                  onPress={() => handleClearCart(cart.restaurantId)}
                  style={[styles.tabRemoveBtn, isActive && styles.tabRemoveBtnActive]}
                  accessibilityLabel={`Xóa giỏ hàng ${cart.restaurantName || ''}`}
                >
                  <Ionicons name="trash-outline" size={16} color={isActive ? '#B91C1C' : '#64748B'} />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [cartSummaries, activeRestaurantId, selectCart, handleClearCart]);

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
        {hasAnyCart ? (
          <TouchableOpacity
            style={styles.clearAllBtn}
            onPress={handleClearAll}
            accessibilityLabel="Xóa tất cả giỏ hàng"
          >
            <Ionicons name="trash-bin-outline" size={20} color="#B91C1C" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 34 }} />
        )}
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
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle} numberOfLines={1}>
                {activeRestaurantName || 'Nhà hàng'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {activeItemCount} món • {formatCurrency(totalPrice)}
              </Text>
            </View>
            {activeRestaurantId ? (
              <TouchableOpacity
                onPress={() => handleClearCart(activeRestaurantId)}
                style={styles.clearCartAction}
                accessibilityLabel="Xóa giỏ hàng hiện tại"
              >
                <Ionicons name="trash-outline" size={16} color="#B91C1C" />
                <Text style={styles.clearCartText}>Xóa giỏ</Text>
              </TouchableOpacity>
            ) : null}
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

  /* ===================== APP BAR ===================== */
  appBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ffd6b0',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 3,
  },

  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },

  appBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
  },

  clearAllBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },

  /* ===================== CART TABS ===================== */
  tabSection: { paddingTop: 12 },

  tabLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  tabChipWrapper: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ffd6b0',
    backgroundColor: '#fff',
  },

  tabChipWrapperActive: {
    borderColor: '#ffbd8a',
    backgroundColor: '#ffffffff',
  },

  tabChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 180,
    backgroundColor: '#fff',
  },

  tabChipActive: {
    backgroundColor: '#ffffff',
  },

  tabChipTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },

  tabChipTitleActive: {
    color: '#ff5a00',
  },

  tabChipSub: {
    fontSize: 13,
    color: '#666',
  },

  tabChipSubActive: {
    color: '#ff5a00',
    fontWeight: '700',
  },

  tabRemoveBtn: {
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#fff5ee',
    borderLeftWidth: 1,
    borderLeftColor: '#ffd6b0',
  },

  tabRemoveBtnActive: {
    backgroundColor: '#ffe4dd',
    borderLeftColor: '#ffc5b8',
  },

  /* ===================== SECTION HEADER ===================== */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ffd6b0',
    backgroundColor: '#fff',
    gap: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
  },

  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },

  clearCartAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
  },

  clearCartText: {
    marginLeft: 6,
    color: '#cc2e2e',
    fontSize: 12,
    fontWeight: '700',
  },

  /* ===================== CART ROW ===================== */
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffd6b0',
    marginBottom: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  cartImage: {
    width: 70,
    height: 70,
    borderRadius: 14,
    backgroundColor: '#fff2e8',
    marginRight: 12,
  },

  cartInfo: { flex: 1 },

  cartName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },

  cartPrice: {
    fontSize: 14,
    color: '#ff5a00',
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
    borderColor: '#ffd6b0',
    backgroundColor: '#fff8f2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quantityText: {
    minWidth: 24,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 15,
    color: '#1a1a1a',
  },

  removeButton: {
    padding: 6,
    marginLeft: 10,
  },

  /* ===================== EMPTY STATE ===================== */
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
    color: '#1a1a1a',
  },

  emptySubtitle: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginTop: 6,
  },

  emptyButton: {
    marginTop: 24,
    backgroundColor: '#ff7a00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
  },

  emptyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  /* ===================== FOOTER ===================== */
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ffd6b0',
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
    fontSize: 20,
    fontWeight: '800',
    color: '#ff5a00',
  },

  footerSub: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },

  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff7a00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 26,
  },

  checkoutText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});
