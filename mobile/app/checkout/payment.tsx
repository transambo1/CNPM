// app/(checkout)/payment.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    FlatList,
    Image,
    ActivityIndicator,
    Animated,
    Dimensions,
    PanResponder,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { app } from "../../libs/firebase";
import { useCart } from "../../libs/CartContext";
import {
    getFirestore,
    collection,
    getDocs,
    query,
    where,
} from "firebase/firestore";

// ===== Types & Utils =====
type Product = {
    id: string;
    name: string;
    img: string;
    price: number;
    restaurantId: string;
    description?: string;
};

type PaymentMethod = "momo" | "bank" | "vnpay";

const VND = (v: number) =>
    (Number(v) || 0).toLocaleString("vi-VN", { minimumFractionDigits: 0 }) + "đ";

const screenH = Dimensions.get("window").height;

// ===== Simple BottomSheet (no libs) =====
function useBottomSheet(
    initialOpen = false,
    snapHeight = Math.min(560, screenH * 0.86)
) {
    const translateY = useRef(new Animated.Value(initialOpen ? 0 : snapHeight)).current;
    const [open, setOpen] = useState<boolean>(initialOpen);

    const openSheet = () => {
        setOpen(true);
        Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
            speed: 16,
        }).start();
    };

    const closeSheet = () => {
        Animated.spring(translateY, {
            toValue: snapHeight,
            useNativeDriver: true,
            bounciness: 0,
            speed: 26,
        }).start(() => setOpen(false));
    };

    const pan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > Math.abs(g.dy),
            onPanResponderMove: (_e, g) => {
                if (g.dy >= 0) {
                    const next = Math.min(snapHeight, g.dy);
                    translateY.setValue(next);
                }
            },
            onPanResponderRelease: (_e, g) => {
                if (g.dy > 120 || g.vy > 0.6) closeSheet();
                else openSheet();
            },
        })
    ).current;

    return { translateY, open, openSheet, closeSheet, pan, snapHeight };
}

// ===== Swipeable cart row (delete on strong swipe) =====
type SwipeItemProps = {
    p: { id: string; name: string; img: string; price: number; quantity: number };
    onDelete: (id: string) => void;
};

const SwipeableCartRow: React.FC<SwipeItemProps> = ({ p, onDelete }) => {
    const transX = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;
    const DEL_BTN_WIDTH = 84;
    const THRESH_SHOW = -60;    // vuốt > 60px: show nút Xoá
    const THRESH_DELETE = -140; // vuốt mạnh: xoá luôn

    const springTo = useCallback((toX: number) => {
        Animated.spring(transX, {
            toValue: toX,
            useNativeDriver: true,
            bounciness: 6,
            speed: 18,
        }).start();
    }, [transX]);

    const removeAnimated = useCallback(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
            Animated.spring(transX, { toValue: -260, useNativeDriver: true, bounciness: 0, speed: 24 }),
        ]).start(() => onDelete(p.id));
    }, [onDelete, opacity, p.id, transX]);

    const pan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > Math.abs(g.dy),
            onPanResponderMove: (_e, g) => {
                if (g.dx < 0) transX.setValue(g.dx);
            },
            onPanResponderRelease: (_e, g) => {
                if (g.dx < THRESH_DELETE || g.vx < -0.8) {
                    removeAnimated(); // xoá luôn
                } else if (g.dx < THRESH_SHOW) {
                    springTo(-DEL_BTN_WIDTH); // mở nút xoá
                } else {
                    springTo(0); // đóng
                }
            },
        })
    ).current;

    return (
        <View style={styles.swipeContainer}>
            {/* Delete bg */}
            <View style={styles.deleteBg}>
                <TouchableOpacity style={styles.deleteBtn} onPress={removeAnimated}>
                    <Text style={styles.deleteTxt}>Xoá</Text>
                </TouchableOpacity>
            </View>

            {/* Foreground row */}
            <Animated.View
                style={[styles.swipeRow, { transform: [{ translateX: transX }], opacity }]}
                {...pan.panHandlers}
            >
                <Image source={{ uri: p.img }} style={styles.cartImg} />
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Text numberOfLines={1} style={styles.cartName}>{p.name}</Text>
                    <Text style={styles.cartSub}>x{p.quantity}</Text>
                </View>
                <Text style={styles.cartPrice}>{VND(p.price * p.quantity)}</Text>
            </Animated.View>
        </View>
    );
};

// ===== Main Screen =====
export default function PaymentScreen() {
    const { items, totalPrice, addToCart, clearCart, removeFromCart } = useCart();
    const restaurantId = items[0]?.restaurantId ?? null;

    const db = useMemo(() => getFirestore(app), []);
    const [menu, setMenu] = useState<Product[]>([]);
    const [loadingMenu, setLoadingMenu] = useState(false);
    const [search, setSearch] = useState("");

    const [payment, setPayment] = useState<PaymentMethod>("momo");

    // Undo snackbar
    const [undoItem, setUndoItem] = useState<null | {
        id: string; name: string; img: string; price: number; quantity: number; restaurantId: string;
    }>(null);
    const undoTimer = useRef<NodeJS.Timeout | null>(null);

    // BottomSheets
    const addSheet = useBottomSheet(false);
    const paySheet = useBottomSheet(false, Math.min(420, screenH * 0.6));

    // Filtered menu
    const filteredMenu = useMemo(() => {
        const k = search.trim().toLowerCase();
        if (!k) return menu;
        return menu.filter(
            (p) =>
                p.name.toLowerCase().includes(k) ||
                (p.description || "").toLowerCase().includes(k)
        );
    }, [menu, search]);

    // Fetch menu cùng nhà hàng
    useEffect(() => {
        const fetchMenu = async () => {
            if (!restaurantId) return;
            setLoadingMenu(true);
            try {
                const qRef = query(collection(db, "products"), where("restaurantId", "==", restaurantId));
                const snap = await getDocs(qRef);
                const list: Product[] = snap.docs.map((d) => {
                    const x = d.data() as any;
                    return {
                        id: d.id,
                        name: x.name,
                        img: x.img,
                        price: Number(x.price ?? 0),
                        restaurantId: x.restaurantId,
                        description: x.description,
                    };
                });
                setMenu(list);
            } finally {
                setLoadingMenu(false);
            }
        };
        fetchMenu();
    }, [db, restaurantId]);

    // Xoá item + set undo
    const hardDelete = useCallback((id: string) => {
        const it = items.find(x => x.id === id);
        if (!it) return;

        removeFromCart(id); // dùng đúng CartContext của bạn

        setUndoItem({
            id: it.id, name: it.name, img: it.img, price: it.price,
            quantity: it.quantity, restaurantId: it.restaurantId,
        });
        if (undoTimer.current) clearTimeout(undoTimer.current);
        undoTimer.current = setTimeout(() => {
            setUndoItem(null);
            undoTimer.current = null;
        }, 3000);
    }, [items, removeFromCart]);

    // Undo
    const undoDelete = useCallback(() => {
        if (!undoItem) return;
        for (let i = 0; i < (undoItem.quantity || 1); i++) {
            addToCart({
                id: undoItem.id,
                name: undoItem.name,
                img: undoItem.img,
                price: undoItem.price,
                restaurantId: undoItem.restaurantId,
            });
        }
        if (undoTimer.current) clearTimeout(undoTimer.current);
        undoTimer.current = null;
        setUndoItem(null);
    }, [undoItem, addToCart]);

    // Auto exit nếu giỏ trống
    useEffect(() => {
        if (items.length === 0) {
            const t = setTimeout(() => router.push("/(tabs)"), 250);
            return () => clearTimeout(t);
        }
    }, [items.length]);

    const openProduct = (id: string) => router.push(`/product/${id}`);

    const ProductRowQuick: React.FC<{ p: Product }> = ({ p }) => (
        <View style={styles.addRow}>
            <TouchableOpacity
                style={styles.addRowLeft}
                onPress={() => openProduct(p.id)}
                activeOpacity={0.85}
            >
                <Image source={{ uri: p.img }} style={styles.addImg} />
                <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={styles.addName}>{p.name}</Text>
                    <Text style={styles.addPrice}>{VND(p.price)}</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.plusBtn}
                onPress={() =>
                    addToCart({
                        id: p.id,
                        name: p.name,
                        img: p.img,
                        price: p.price,
                        restaurantId: p.restaurantId,
                    })
                }
            >
                <Text style={styles.plusTxt}>＋</Text>
            </TouchableOpacity>
        </View>
    );

    const handleOrder = () => {
        clearCart();
        router.push("/(tabs)");
    };

    const total = totalPrice;

    return (
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => {
                                if (addSheet.open) addSheet.closeSheet();
                                if (paySheet.open) paySheet.closeSheet();
                                if (router.canGoBack()) router.back();
                                else router.push("/(tabs)");
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={styles.headerClose}>✕</Text>
                        </TouchableOpacity>
                        <Text numberOfLines={1} style={styles.headerTitle}>Thanh toán</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    {/* Tóm tắt đơn hàng */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Tóm tắt đơn hàng</Text>
                            <TouchableOpacity onPress={addSheet.openSheet}>
                                <Text style={styles.linkGreen}>Thêm món</Text>
                            </TouchableOpacity>
                        </View>

                        {items.length === 0 ? (
                            <Text style={styles.muted}>Giỏ hàng của bạn đang trống.</Text>
                        ) : (
                            <View style={{ gap: 10 }}>
                                {items.map((it) => (
                                    <SwipeableCartRow
                                        key={it.id}
                                        p={{ id: it.id, name: it.name, img: it.img, price: it.price, quantity: it.quantity }}
                                        onDelete={hardDelete}
                                    />
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Tùy chọn giao hàng (placeholder) */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Tùy chọn giao hàng</Text>
                        <View style={styles.shipChoice}>
                            <Text style={styles.shipChoiceActive}>Nhanh • 25 phút</Text>
                            <Text style={styles.mutedSmall}>(Có thể cộng/trừ phí sau này nếu bạn muốn)</Text>
                        </View>
                    </View>

                    {/* Phương thức thanh toán */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Thông tin thanh toán</Text>
                            <TouchableOpacity onPress={paySheet.openSheet}>
                                <Text style={styles.linkGreen}>Xem tất cả</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.payMethodRow} onPress={paySheet.openSheet} activeOpacity={0.8}>
                            <View style={styles.payMethodLeft}>
                                <View style={styles.pmIcon}>
                                    <Text style={styles.pmIconTxt}>
                                        {payment === "momo" ? "Mo" : payment === "bank" ? "Ng" : "VP"}
                                    </Text>
                                </View>
                                <Text style={styles.payMethodText}>
                                    {payment === "momo" ? "MoMo" : payment === "bank" ? "Ngân hàng" : "VNPay"}
                                </Text>
                            </View>
                            <Text style={styles.chev}>{">"}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Tạm tính */}
                    <View style={styles.card}>
                        <View style={styles.rowSplit}>
                            <Text style={styles.muted}>Tạm tính</Text>
                            <Text style={styles.bold}>{VND(totalPrice)}</Text>
                        </View>
                        <View style={styles.rowSplit}>
                            <Text style={styles.muted}>Phí giao hàng</Text>
                            <Text style={styles.bold}>Miễn phí</Text>
                        </View>
                        <View style={[styles.rowSplit, { marginTop: 8 }]}>
                            <Text style={styles.totalTxt}>Tổng cộng</Text>
                            <Text style={styles.totalPrice}>{VND(total)}</Text>
                        </View>
                    </View>

                    {/* Gợi ý thêm (spacing rộng) */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Gợi ý thêm</Text>
                            <TouchableOpacity onPress={addSheet.openSheet}>
                                <Text style={styles.linkGreen}>Xem tất cả</Text>
                            </TouchableOpacity>
                        </View>

                        {loadingMenu ? (
                            <ActivityIndicator color="#00A74F" />
                        ) : menu.length === 0 ? (
                            <Text style={styles.muted}>Nhà hàng chưa có món bổ sung.</Text>
                        ) : (
                            <View style={{ gap: 20 }}>
                                {menu.slice(0, 4).map((p) => (
                                    <ProductRowQuick key={p.id} p={p} />
                                ))}
                            </View>
                        )}
                    </View>
                </ScrollView>

                {/* Footer */}
                <View style={styles.footer}>
                    <View>
                        <Text style={styles.footerLabel}>Tổng cộng</Text>
                        <Text style={styles.footerTotal}>{VND(total)}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.primaryBtn, items.length === 0 && { opacity: 0.5 }]}
                        onPress={handleOrder}
                        disabled={items.length === 0}
                    >
                        <Text style={styles.primaryTxt}>Đặt đơn</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Overlay */}
            {(addSheet.open || paySheet.open) && (
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => {
                        if (paySheet.open) paySheet.closeSheet();
                        if (addSheet.open) addSheet.closeSheet();
                    }}
                    style={styles.overlay}
                />
            )}

            {/* Sheet: Thêm món */}
            <Animated.View
                style={[styles.sheet, { height: addSheet.snapHeight, transform: [{ translateY: addSheet.translateY }] }]}
                {...addSheet.pan.panHandlers}
            >
                <View style={styles.grabber} />
                <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Thêm món từ nhà hàng</Text>
                    <TouchableOpacity onPress={addSheet.closeSheet}><Text style={styles.sheetClose}>Đóng</Text></TouchableOpacity>
                </View>

                <View style={styles.searchRow}>
                    <TextInput
                        placeholder="Tìm món, ví dụ: bò, gà, nước…"
                        placeholderTextColor="#94A3B8"
                        value={search}
                        onChangeText={setSearch}
                        style={styles.searchInput}
                    />
                </View>

                <View style={{ flex: 1 }}>
                    {loadingMenu ? (
                        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                            <ActivityIndicator color="#00A74F" />
                        </View>
                    ) : (
                        <FlatList
                            data={filteredMenu}
                            keyExtractor={(it) => it.id}
                            removeClippedSubviews
                            initialNumToRender={10}
                            maxToRenderPerBatch={12}
                            windowSize={7}
                            contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 14, gap: 14 }}
                            ItemSeparatorComponent={() => <View style={styles.sep} />}
                            renderItem={({ item }) => <ProductRowQuick p={item} />}
                        />
                    )}
                </View>
            </Animated.View>

            {/* Sheet: Chọn phương thức thanh toán */}
            <Animated.View
                style={[styles.sheet, { height: paySheet.snapHeight, transform: [{ translateY: paySheet.translateY }] }]}
                {...paySheet.pan.panHandlers}
            >
                <View style={styles.grabber} />
                <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Chọn phương thức thanh toán</Text>
                    <TouchableOpacity onPress={paySheet.closeSheet}><Text style={styles.sheetClose}>Đóng</Text></TouchableOpacity>
                </View>

                <View style={{ paddingHorizontal: 16, gap: 10 }}>
                    {(["momo", "bank", "vnpay"] as PaymentMethod[]).map((m) => (
                        <TouchableOpacity
                            key={m}
                            style={[styles.pmRow, payment === m && { borderColor: "#16A34A" }]}
                            onPress={() => { setPayment(m); paySheet.closeSheet(); }}
                            activeOpacity={0.85}
                        >
                            <View style={styles.pmIcon}><Text style={styles.pmIconTxt}>{m === "momo" ? "Mo" : m === "bank" ? "Ng" : "VP"}</Text></View>
                            <Text style={styles.pmLabel}>{m === "momo" ? "MoMo" : m === "bank" ? "Ngân hàng" : "VNPay"}</Text>
                            <View style={{ flex: 1 }} />
                            <View style={[styles.radio, payment === m && styles.radioActive]} />
                        </TouchableOpacity>
                    ))}
                </View>
            </Animated.View>

            {/* Snackbar Undo */}
            {undoItem && (
                <View style={styles.snackbar}>
                    <Text style={styles.snackText} numberOfLines={1}>Đã xoá {undoItem.name}</Text>
                    <TouchableOpacity onPress={undoDelete}><Text style={styles.snackUndo}>HOÀN TÁC</Text></TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

// ===== Styles =====
const BORDER = "#F1F5F9";

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#fff" },

    header: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
    },
    headerClose: { fontSize: 18, color: "#111" },
    headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "800" },

    card: {
        backgroundColor: "#fff",
        marginHorizontal: 14,
        marginTop: 12,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: BORDER,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    cardTitle: { fontSize: 16, fontWeight: "800", color: "#111" },
    linkGreen: { color: "#00A74F", fontWeight: "700" },

    muted: { color: "#64748B" },
    mutedSmall: { color: "#94A3B8", fontSize: 12 },
    bold: { fontWeight: "700", color: "#111" },

    rowSplit: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
    itemName: { flex: 1, marginRight: 8, fontSize: 14, fontWeight: "600", color: "#111" },
    itemPrice: { fontSize: 14, fontWeight: "800", color: "#111" },

    // Swipe card row
    swipeContainer: { position: "relative", overflow: "hidden", borderRadius: 12 },
    deleteBg: {
        position: "absolute", right: 0, top: 0, bottom: 0, width: 84,
        backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center", borderRadius: 12,
    },
    deleteBtn: { paddingHorizontal: 10, paddingVertical: 8 },
    deleteTxt: { color: "#fff", fontWeight: "800" },

    swipeRow: {
        backgroundColor: "#fff",
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#EEF2F7",
    },
    cartImg: { width: 56, height: 56, borderRadius: 10, backgroundColor: "#F1F5F9", marginRight: 10 },
    cartName: { fontSize: 14, fontWeight: "700", color: "#111" },
    cartSub: { fontSize: 12, color: "#64748B", marginTop: 2 },
    cartPrice: { fontSize: 14, fontWeight: "800", color: "#111" },

    // Ship choice
    shipChoice: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: "#DCFCE7",
        backgroundColor: "#F0FFF4",
        borderRadius: 12,
        padding: 12,
        gap: 4,
    },
    shipChoiceActive: { color: "#16A34A", fontWeight: "700" },

    // Suggestions (quick add)
    addRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    addRowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 12 },
    addImg: { width: 56, height: 56, borderRadius: 10, backgroundColor: "#F1F5F9" },
    addName: { fontSize: 14, fontWeight: "700", color: "#111" },
    addPrice: { fontSize: 13, fontWeight: "700", color: "#00A74F", marginTop: 2 },
    plusBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: "#00A74F", alignItems: "center", justifyContent: "center",
    },
    plusTxt: { color: "#fff", fontSize: 20, lineHeight: 20, fontWeight: "800" },

    // Footer
    footer: {
        position: "absolute", left: 0, right: 0, bottom: 0,
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        padding: 16, borderTopWidth: 1, borderTopColor: "#EEF2F7", backgroundColor: "#fff",
    },
    footerLabel: { fontSize: 12, color: "#64748B" },
    footerTotal: { fontSize: 20, fontWeight: "900", color: "#111" },
    primaryBtn: { backgroundColor: "#00A74F", paddingVertical: 14, paddingHorizontal: 28, borderRadius: 30 },
    primaryTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },

    // Overlay + sheets
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
    sheet: {
        position: "absolute", left: 0, right: 0, bottom: 0,
        backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 12,
    },
    grabber: { alignSelf: "center", marginTop: 8, marginBottom: 6, width: 48, height: 5, borderRadius: 999, backgroundColor: "#E2E8F0" },
    sheetHeader: { paddingHorizontal: 16, paddingVertical: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    sheetTitle: { fontSize: 16, fontWeight: "800" },
    sheetClose: { color: "#111", fontWeight: "700" },
    searchRow: { paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4 },
    searchInput: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#F8FAFC", color: "#111" },
    sep: { height: 10 },

    // Payment methods sheet
    pmRow: { flexDirection: "row", alignItems: "center", padding: 12, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, backgroundColor: "#fff" },
    pmLabel: { fontSize: 15, fontWeight: "700", color: "#111" },
    payMethodRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
    payMethodLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
    pmIcon: { width: 34, height: 34, borderRadius: 8, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
    pmIconTxt: { fontWeight: "800", color: "#111" },
    payMethodText: { fontSize: 15, fontWeight: "700", color: "#111" },
    chev: { color: "#94A3B8", fontSize: 16 },
    radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#CBD5E1" },
    radioActive: { borderColor: "#16A34A", backgroundColor: "#16A34A" },

    // Snackbar
    snackbar: {
        position: "absolute", left: 12, right: 12, bottom: 86,
        backgroundColor: "#111", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    snackText: { color: "#fff", fontSize: 13, marginRight: 12, flex: 1 },
    snackUndo: { color: "#22C55E", fontWeight: "800" },
});
