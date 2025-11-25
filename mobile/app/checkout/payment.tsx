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
    Alert,
    Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { app } from "../../libs/firebase";
import { useCart } from "../../libs/CartContext";
import { useAuth } from "../../libs/AuthContext";
import {
    getFirestore,
    collection,
    getDocs,
    query,
    where,
    addDoc,
    serverTimestamp,
    onSnapshot,
    orderBy,
    doc,
    writeBatch,
    getDoc,
    updateDoc,
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

type PaymentMethod = "cod" | "qr";

const VND = (v: number) =>
    (Number(v) || 0).toLocaleString("vi-VN", { minimumFractionDigits: 0 }) + "đ";

type AddressItem = {
    id: string;
    label?: string;
    detail: string;
    note?: string;
    contactName?: string;
    phone?: string;
    isDefault?: boolean;
    fromProfile?: boolean;
    latitude?: number | null;
    longitude?: number | null;
};

type NewAddressForm = {
    label: string;
    detail: string;
    note: string;
    contactName: string;
    phone: string;
    isDefault: boolean;
};

const sanitizeAddressDetail = (input: string) => {
    const raw = (input || "").trim();
    if (!raw) return "";
    const separators = ["|", "•", "-", "–"];
    for (const sep of separators) {
        if (raw.includes(sep)) {
            const unique: string[] = [];
            raw
                .split(sep)
                .map((segment) => segment.trim())
                .filter(Boolean)
                .forEach((segment) => {
                    if (!unique.some((item) => item.toLowerCase() === segment.toLowerCase())) {
                        unique.push(segment);
                    }
                });
            if (unique.length === 1) {
                return unique[0];
            }
            if (unique.length > 1) {
                return unique.join(", ");
            }
        }
    }
    return raw;
};

type Coordinates = {
    latitude: number;
    longitude: number;
};

const fetchCoordinatesForAddress = async (rawAddress: string): Promise<Coordinates | null> => {
    const address = rawAddress.trim();
    if (!address) return null;

    try {
        const query = `${address}, Ho Chi Minh City, Vietnam`;
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=vn`;
        const response = await fetch(url, {
            headers: {
                Accept: "application/json",
                "User-Agent": "CNPM-Mobile/1.0 (+https://github.com/transambo1)",
            },
        });

        if (!response.ok) {
            console.warn("Geocode request failed:", response.status, response.statusText);
            return null;
        }

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            const latitude = Number.parseFloat(data[0].lat);
            const longitude = Number.parseFloat(data[0].lon);

            if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
                return { latitude, longitude };
            }
        }

        return null;
    } catch (error) {
        console.warn("Geocode error:", error);
        return null;
    }
};

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
    const {
        items,
        totalPrice,
        addToCart,
        clearCart,
        removeFromCart,
        activeRestaurantId,
        activeRestaurantName,
    } = useCart();
    const { user } = useAuth();
    const restaurantId = activeRestaurantId ?? items[0]?.restaurantId ?? null;

    const db = useMemo(() => getFirestore(app), []);
    const defaultContactName = useMemo(() => {
        const fullName = [user?.firstname, user?.lastname].filter(Boolean).join(" ").trim();
        return fullName || user?.username || "";
    }, [user?.firstname, user?.lastname, user?.username]);
    const defaultPhone = useMemo(() => user?.phonenumber ?? "", [user?.phonenumber]);

    const [menu, setMenu] = useState<Product[]>([]);
    const [loadingMenu, setLoadingMenu] = useState(false);
    const [search, setSearch] = useState("");

    const [payment, setPayment] = useState<PaymentMethod>("cod");
    const [restaurantInfo, setRestaurantInfo] = useState<
        { name: string; address?: string; latitude?: number | null; longitude?: number | null }
        | null
    >(null);

    const [addresses, setAddresses] = useState<AddressItem[]>([]);
    const [addressLoading, setAddressLoading] = useState(false);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [addressSheetMode, setAddressSheetMode] = useState<"list" | "form">("list");
    const [newAddressForm, setNewAddressForm] = useState<NewAddressForm>({
        label: "",
        detail: "",
        note: "",
        contactName: defaultContactName,
        phone: defaultPhone,
        isDefault: true,
    });
    const [savingAddress, setSavingAddress] = useState(false);
    const [placingOrder, setPlacingOrder] = useState(false);

    // Undo snackbar
    const [undoItem, setUndoItem] = useState<null | {
        id: string; name: string; img: string; price: number; quantity: number; restaurantId: string; restaurantName?: string;
    }>(null);
    const undoTimer = useRef<NodeJS.Timeout | null>(null);

    // BottomSheets
    const addSheet = useBottomSheet(false);
    const paySheet = useBottomSheet(false, Math.min(420, screenH * 0.6));
    const addressSheet = useBottomSheet(false, Math.min(520, screenH * 0.82));

    const profileAddress = useMemo<AddressItem | null>(() => {
        if (!user?.address) return null;
        const detail = sanitizeAddressDetail(user.address);
        if (!detail) return null;
        return {
            id: "__profile",
            label: "Địa chỉ hiện tại",
            detail,
            contactName: defaultContactName,
            phone: defaultPhone,
            isDefault: addresses.length === 0,
            fromProfile: true,
        };
    }, [user?.address, defaultContactName, defaultPhone, addresses.length]);


    const combinedAddresses = useMemo(() => {
        const list = [...addresses];
        if (profileAddress) {
            list.unshift(profileAddress);
        }
        return list;
    }, [addresses, profileAddress]);

    const selectedAddress = useMemo(() => {
        if (!selectedAddressId) {
            return combinedAddresses[0] ?? null;
        }
        return (
            combinedAddresses.find((addr) => addr.id === selectedAddressId) ??
            combinedAddresses[0] ??
            null
        );
    }, [combinedAddresses, selectedAddressId]);

    useEffect(() => {
        if (combinedAddresses.length === 0) {
            setSelectedAddressId(null);
            return;
        }
        const hasCurrent = combinedAddresses.some((addr) => addr.id === selectedAddressId);
        if (!hasCurrent) {
            const defaultAddr = combinedAddresses.find((addr) => addr.isDefault) ?? combinedAddresses[0];
            if (defaultAddr) {
                setSelectedAddressId(defaultAddr.id);
            }
        }
    }, [combinedAddresses, selectedAddressId]);

    useEffect(() => {
        setNewAddressForm((prev) => ({
            ...prev,
            contactName: prev.contactName || defaultContactName,
            phone: prev.phone || defaultPhone,
        }));
    }, [defaultContactName, defaultPhone]);

    useEffect(() => {
        if (!addressSheet.open) {
            setAddressSheetMode("list");
        }
    }, [addressSheet.open]);

    const resetNewAddressForm = useCallback(() => {
        setNewAddressForm({
            label: "",
            detail: "",
            note: "",
            contactName: defaultContactName,
            phone: defaultPhone,
            isDefault: addresses.length === 0,
        });
    }, [addresses.length, defaultContactName, defaultPhone]);

    useEffect(() => {
        if (!user?.id) {
            setAddresses([]);
            setAddressLoading(false);
            setSelectedAddressId(null);
            return;
        }

        setAddressLoading(true);
        const addressesRef = collection(db, "users", user.id, "addresses");
        const q = query(addressesRef, orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const mapped: AddressItem[] = snapshot.docs
                    .map((docSnap) => {
                        const data = docSnap.data() as any;
                        const detailRaw = (data.detail ?? data.address ?? "").toString().trim();
                        const detail = sanitizeAddressDetail(detailRaw);
                        if (!detail) return null;
                        return {
                            id: docSnap.id,
                            label: data.label ?? data.title ?? "",
                            detail,
                            note: data.note ?? "",
                            contactName: data.contactName ?? data.recipient ?? "",
                            phone: data.phone ?? data.phoneNumber ?? "",
                            isDefault: Boolean(data.isDefault),
                            latitude: typeof data.latitude === "number" ? data.latitude : null,
                            longitude: typeof data.longitude === "number" ? data.longitude : null,
                        } as AddressItem;
                    })
                    .filter((addr): addr is AddressItem => Boolean(addr));

                setAddresses(mapped);
                setAddressLoading(false);
            },
            (error) => {
                console.warn("Không thể tải địa chỉ:", error);
                setAddresses([]);
                setAddressLoading(false);
            }
        );

        return () => unsubscribe();
    }, [db, user?.id]);
    useEffect(() => {
        if (!restaurantId) {
            setRestaurantInfo(null);
            return;
        }

        const fetchRestaurant = async () => {
            try {
                const ref = doc(db, "restaurants", restaurantId);
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    const data = snap.data() as any;
                    setRestaurantInfo({
                        name: data.name ?? data.title ?? "GrabFood",
                        address: data.address,
                        latitude: typeof data.latitude === "number" ? data.latitude : null,
                        longitude: typeof data.longitude === "number" ? data.longitude : null,
                    });
                } else {
                    setRestaurantInfo(null);
                }
            } catch (error) {
                console.warn("Không thể tải thông tin nhà hàng:", error);
                setRestaurantInfo(null);
            }
        };

        fetchRestaurant();
    }, [db, restaurantId]);

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
        const it = items.find((x) => x.id === id);
        if (!it) return;

        removeFromCart(id);

        setUndoItem({
            id: it.id,
            name: it.name,
            img: it.img,
            price: it.price,
            quantity: it.quantity,
            restaurantId: it.restaurantId,
            restaurantName: it.restaurantName,
        });
        if (undoTimer.current) clearTimeout(undoTimer.current);
       undoTimer.current = setTimeout(() => {
    setUndoItem(null);
    undoTimer.current = null;
}, 3000) as any;
    }, [items, removeFromCart]);

    // Undo
    const undoDelete = useCallback(() => {
        if (!undoItem) return;
        const result = addToCart({
            id: undoItem.id,
            name: undoItem.name,
            img: undoItem.img,
            price: undoItem.price,
            restaurantId: undoItem.restaurantId,
            restaurantName: undoItem.restaurantName,
        }, undoItem.quantity || 1, { restaurantName: undoItem.restaurantName, allowCreateNewCart: true });
        if (result.status !== "added") {
            return;
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

    const openAddressSheet = useCallback(() => {
        if (!user?.id) {
            Alert.alert("Cần đăng nhập", "Vui lòng đăng nhập để quản lý địa chỉ giao hàng.");
            router.push("/login");
            return;
        }
        setAddressSheetMode("list");
        addressSheet.openSheet();
    }, [addressSheet, user?.id]);

    const handleSelectAddress = useCallback(
        (addr: AddressItem) => {
            setSelectedAddressId(addr.id);
            addressSheet.closeSheet();
            setAddressSheetMode("list");
        },
        [addressSheet]
    );

    const handleSaveAddress = useCallback(async () => {
        if (!user?.id) {
            Alert.alert("Cần đăng nhập", "Vui lòng đăng nhập để lưu địa chỉ giao hàng.");
            router.push("/login");
            return;
        }

        const detailInput = newAddressForm.detail.trim();
        if (!detailInput) {
            Alert.alert("Thiếu thông tin", "Vui lòng nhập địa chỉ chi tiết.");
            return;
        }

        const detail = sanitizeAddressDetail(detailInput);

        setSavingAddress(true);
        try {
            // ✅ M1: Fetch tọa độ ngay khi lưu địa chỉ
            const coords = await fetchCoordinatesForAddress(detail);

            if (!coords || !coords.latitude || !coords.longitude) {
                Alert.alert(
                    "Không tìm thấy vị trí",
                    "Vui lòng nhập địa chỉ rõ hơn (VD: '28 An Dương Vương, Phường 9, Quận 5')."
                );
                setSavingAddress(false);
                return;
            }

            const addressesRef = collection(db, "users", user.id, "addresses");

            const payload = {
                label: newAddressForm.label.trim(),
                detail,
                note: newAddressForm.note.trim(),
                contactName: newAddressForm.contactName.trim(),
                phone: newAddressForm.phone.trim(),
                isDefault: newAddressForm.isDefault || addresses.length === 0,
                latitude: coords.latitude,
                longitude: coords.longitude,
                createdAt: serverTimestamp(),
            };

            const docRef = await addDoc(addressesRef, payload);

            // ❗ Nếu là default -> remove default ở các address khác
            if (payload.isDefault && addresses.length > 0) {
                const batch = writeBatch(db);
                addresses.forEach((addr) => {
                    if (addr.id !== docRef.id) {
                        batch.update(doc(addressesRef, addr.id), { isDefault: false });
                    }
                });
                await batch.commit();
            }

            setSelectedAddressId(docRef.id);
            resetNewAddressForm();
            addressSheet.closeSheet();
            setAddressSheetMode("list");
        } catch (error) {
            console.error("Không thể lưu địa chỉ mới:", error);
            Alert.alert("Lỗi", "Không thể lưu địa chỉ mới. Vui lòng thử lại.");
        } finally {
            setSavingAddress(false);
        }
    }, [user?.id, newAddressForm, addresses, db, addressSheet, resetNewAddressForm]);


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
                onPress={() => {
                    const result = addToCart({
                        id: p.id,
                        name: p.name,
                        img: p.img,
                        price: p.price,
                        restaurantId: p.restaurantId,
                        restaurantName: restaurantInfo?.name,
                    }, 1, { restaurantName: restaurantInfo?.name, allowCreateNewCart: true });
                    if (result.status === "conflict") {
                        Alert.alert(
                            "Không thể thêm món",
                            "Bạn đang xem giỏ hàng của nhà hàng khác. Hãy chuyển sang giỏ phù hợp để tiếp tục."
                        );
                    }
                }}
            >
                <Text style={styles.plusTxt}>＋</Text>
            </TouchableOpacity>
        </View>
    );

    const handleOrder = useCallback(async () => {
        if (items.length === 0) return;

        if (!user?.id) {
            Alert.alert("Cần đăng nhập", "Bạn cần đăng nhập để đặt hàng.");
            router.push("/login");
            return;
        }

        if (!selectedAddress) {
            Alert.alert("Thiếu địa chỉ", "Vui lòng chọn hoặc thêm địa chỉ giao hàng.");
            openAddressSheet();
            return;
        }

        const addressDetail = sanitizeAddressDetail(selectedAddress.detail);
        if (!addressDetail) {
            Alert.alert("Thiếu địa chỉ", "Địa chỉ giao hàng không hợp lệ. Vui lòng cập nhật lại.");
            openAddressSheet();
            return;
        }

        const normalizedAddress = addressDetail.trim();
        const customerName = (selectedAddress.contactName || "").trim()
            || [user?.lastname, user?.firstname].filter(Boolean).join(" ").trim()
            || user?.username
            || "Khách hàng";
        const customerPhone = (selectedAddress.phone || "").trim() || user?.phonenumber || "";

        const normalizeCoordinate = (value: number | null | undefined) =>
            typeof value === "number" && Number.isFinite(value) ? value : null;

        let latitude = normalizeCoordinate(selectedAddress.latitude);
        let longitude = normalizeCoordinate(selectedAddress.longitude);

        setPlacingOrder(true);
        try {
            if (latitude === null || longitude === null) {
                const fetched = await fetchCoordinatesForAddress(normalizedAddress);
                if (!fetched) {
                    Alert.alert(
                        "Thiếu tọa độ",
                        "Không thể xác định tọa độ cho địa chỉ này. Vui lòng cập nhật địa chỉ cụ thể hơn trước khi đặt hàng."
                    );
                    openAddressSheet();
                    return;
                }

                const fetchedLat = Number(fetched.latitude);
                const fetchedLng = Number(fetched.longitude);

                if (!Number.isFinite(fetchedLat) || !Number.isFinite(fetchedLng)) {
                    Alert.alert(
                        "Thiếu tọa độ",
                        "Không thể xác định tọa độ cho địa chỉ này. Vui lòng cập nhật địa chỉ cụ thể hơn trước khi đặt hàng."
                    );
                    openAddressSheet();
                    return;
                }

                latitude = fetchedLat;
                longitude = fetchedLng;

                if (
                    user?.id &&
                    selectedAddress.id &&
                    !selectedAddress.fromProfile
                ) {
                    try {
                        await updateDoc(
                            doc(db, "users", user.id, "addresses", selectedAddress.id),
                            {
                                latitude,
                                longitude,
                            }
                        );
                    } catch (error) {
                        console.warn("Không thể cập nhật tọa độ cho địa chỉ:", error);
                    }
                } else if (user?.id && selectedAddress.fromProfile) {
                    try {
                        await updateDoc(doc(db, "users", user.id), {
                            address: normalizedAddress,
                            latitude,
                            longitude,
                        });
                    } catch (error) {
                        console.warn("Không thể cập nhật tọa độ hồ sơ:", error);
                    }
                }
            }

            if (
                latitude === null ||
                longitude === null ||
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {
                Alert.alert(
                    "Thiếu tọa độ",
                    "Địa chỉ này chưa có thông tin tọa độ. Vui lòng chọn địa chỉ khác hoặc cập nhật lại địa chỉ."
                );
                openAddressSheet();
                return;
            }

            const latValue = Number(latitude);
            const lngValue = Number(longitude);

            const ordersRef = collection(db, "orders");
            const orderItems = items.map((item) => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                restaurantId: item.restaurantId,
            }));

            const total = Number(totalPrice) || 0;
            const normalizedName = customerName.trim() || "Khách hàng";
            const customerEmail = user?.email ?? "";
            const newOrder = {
                userId: user?.id ?? "unknown_user",
                restaurantId,
                restaurantName: restaurantInfo?.name ?? activeRestaurantName ?? "",
                customer: {
                    name: normalizedName,
                    phone: customerPhone,
                    email: customerEmail,
                    address: normalizedAddress,
                    latitude: latValue,
                    longitude: lngValue,
                },
                items: orderItems,
                total,
                status: "Chờ xử lý",
                createdAt: serverTimestamp(),
                droneId: null,
            };

            const docRef = await addDoc(ordersRef, newOrder);

            clearCart(activeRestaurantId ?? undefined);
            router.replace(`/order/${docRef.id}` as never);
        } catch (error) {
            console.error("Không thể đặt đơn:", error);
            Alert.alert("Lỗi", "Không thể đặt đơn. Vui lòng thử lại.");
        } finally {
            setPlacingOrder(false);
        }
    }, [
        items,
        user?.id,
        user?.firstname,
        user?.lastname,
        user?.phonenumber,
        user?.username,
        user?.email,
        selectedAddress,
        openAddressSheet,
        db,
        restaurantId,
        restaurantInfo,
        activeRestaurantName,
        totalPrice,
        clearCart,
        activeRestaurantId,
    ]);

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

                    {/* Địa chỉ giao hàng */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Giao tới</Text>
                            <TouchableOpacity onPress={openAddressSheet}>
                                <Text style={styles.linkGreen}>
                                    {combinedAddresses.length > 0 ? "Thay đổi" : "Thêm mới"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {addressLoading ? (
                            <ActivityIndicator color="#00A74F" style={{ marginTop: 8 }} />
                        ) : selectedAddress ? (
                            <View style={styles.addressSummary}>
                                {selectedAddress.label ? (
                                    <Text style={styles.addressLabel}>{selectedAddress.label}</Text>
                                ) : null}
                                <Text style={styles.addressLine}>{selectedAddress.detail}</Text>
                                {selectedAddress.note ? (
                                    <Text style={styles.addressNote}>{selectedAddress.note}</Text>
                                ) : null}
                                <View style={styles.addressMetaRow}>
                                    {selectedAddress.contactName ? (
                                        <Text style={styles.addressMeta}>{selectedAddress.contactName}</Text>
                                    ) : null}
                                    {selectedAddress.phone ? (
                                        <Text style={styles.addressMeta}>{selectedAddress.phone}</Text>
                                    ) : null}
                                </View>
                            </View>
                        ) : (
                            <Text style={[styles.muted, { marginTop: 8 }]}>
                                Bạn chưa có địa chỉ giao hàng. Thêm mới để tiếp tục đặt món.
                            </Text>
                        )}
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
                {payment === "cod" ? "COD" : "QR"}
            </Text>
        </View>

        <Text style={styles.payMethodText}>
            {payment === "cod" ? "Thanh toán khi nhận hàng (COD)" : "Thanh toán bằng mã QR"}
        </Text>
    </View>

   
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
                        style={[styles.primaryBtn, (items.length === 0 || placingOrder) && { opacity: 0.5 }]}
                        onPress={handleOrder}
                        disabled={items.length === 0 || placingOrder}
                    >
                        {placingOrder ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.primaryTxt}>Đặt đơn</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Overlay */}
            {(addSheet.open || paySheet.open || addressSheet.open) && (
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => {
                        if (paySheet.open) paySheet.closeSheet();
                        if (addSheet.open) addSheet.closeSheet();
                        if (addressSheet.open) {
                            addressSheet.closeSheet();
                            setAddressSheetMode("list");
                        }
                    }}
                    style={styles.overlay}
                />
            )}

            {/* Sheet: Địa chỉ giao hàng */}
            <Animated.View
                style={[styles.sheet, { height: addressSheet.snapHeight, transform: [{ translateY: addressSheet.translateY }] }]}
                {...addressSheet.pan.panHandlers}
            >
                <View style={styles.grabber} />
                <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>
                        {addressSheetMode === "list" ? "Chọn địa chỉ giao hàng" : "Thêm địa chỉ mới"}
                    </Text>
                    <TouchableOpacity
                        onPress={() => {
                            setAddressSheetMode("list");
                            addressSheet.closeSheet();
                        }}
                    >
                        <Text style={styles.sheetClose}>Đóng</Text>
                    </TouchableOpacity>
                </View>

                {addressSheetMode === "list" ? (
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {addressLoading ? (
                            <ActivityIndicator color="#00A74F" style={{ marginTop: 12 }} />
                        ) : combinedAddresses.length === 0 ? (
                            <View style={styles.emptyAddressBox}>
                                <Text style={styles.muted}>Bạn chưa lưu địa chỉ nào.</Text>
                                <TouchableOpacity
                                    style={styles.secondaryBtn}
                                    onPress={() => {
                                        resetNewAddressForm();
                                        setAddressSheetMode("form");
                                    }}
                                >
                                    <Text style={styles.secondaryBtnTxt}>+ Thêm địa chỉ mới</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                {combinedAddresses.map((addr) => {
                                    const active = selectedAddress?.id === addr.id;
                                    return (
                                        <TouchableOpacity
                                            key={addr.id}
                                            style={[styles.addressItem, active && styles.addressItemActive]}
                                            onPress={() => handleSelectAddress(addr)}
                                            activeOpacity={0.85}
                                        >
                                            <View style={[styles.radio, active && styles.radioActive]} />
                                            <View style={{ flex: 1 }}>
                                                {addr.label ? (
                                                    <Text style={styles.addressItemLabel}>{addr.label}</Text>
                                                ) : null}
                                                <Text style={styles.addressItemDetail}>{addr.detail}</Text>
                                                {addr.note ? (
                                                    <Text style={styles.addressItemNote}>{addr.note}</Text>
                                                ) : null}
                                                <View style={styles.addressItemMetaRow}>
                                                    {addr.contactName ? (
                                                        <Text style={styles.addressItemMeta}>{addr.contactName}</Text>
                                                    ) : null}
                                                    {addr.phone ? (
                                                        <Text style={styles.addressItemMeta}>{addr.phone}</Text>
                                                    ) : null}
                                                </View>
                                                {addr.isDefault ? (
                                                    <Text style={styles.addressBadge}>Mặc định</Text>
                                                ) : null}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                                <TouchableOpacity
                                    style={styles.secondaryBtn}
                                    onPress={() => {
                                        resetNewAddressForm();
                                        setAddressSheetMode("form");
                                    }}
                                >
                                    <Text style={styles.secondaryBtnTxt}>+ Thêm địa chỉ mới</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </ScrollView>
                ) : (
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}
                        showsVerticalScrollIndicator={false}
                    >
                        <TextInput
                            placeholder="Ghi chú địa chỉ (ví dụ: Nhà, Công ty)"
                            placeholderTextColor="#94A3B8"
                            value={newAddressForm.label}
                            onChangeText={(value) => setNewAddressForm((prev) => ({ ...prev, label: value }))}
                            style={styles.addressInput}
                        />
                        <TextInput
                            placeholder="Địa chỉ chi tiết"
                            placeholderTextColor="#94A3B8"
                            value={newAddressForm.detail}
                            onChangeText={(value) => setNewAddressForm((prev) => ({ ...prev, detail: value }))}
                            style={[styles.addressInput, { height: 80 }]}
                            multiline
                        />
                        <TextInput
                            placeholder="Ghi chú giao hàng (không bắt buộc)"
                            placeholderTextColor="#94A3B8"
                            value={newAddressForm.note}
                            onChangeText={(value) => setNewAddressForm((prev) => ({ ...prev, note: value }))}
                            style={[styles.addressInput, { height: 68 }]}
                            multiline
                        />
                        <TextInput
                            placeholder="Tên người nhận"
                            placeholderTextColor="#94A3B8"
                            value={newAddressForm.contactName}
                            onChangeText={(value) => setNewAddressForm((prev) => ({ ...prev, contactName: value }))}
                            style={styles.addressInput}
                        />
                        <TextInput
                            placeholder="Số điện thoại"
                            placeholderTextColor="#94A3B8"
                            keyboardType="phone-pad"
                            value={newAddressForm.phone}
                            onChangeText={(value) => setNewAddressForm((prev) => ({ ...prev, phone: value }))}
                            style={styles.addressInput}
                        />
                        <View style={styles.defaultRow}>
                            <Text style={styles.defaultLabel}>Đặt làm địa chỉ mặc định</Text>
                           <View style={styles.switchWrapper}>
    <Switch
        value={newAddressForm.isDefault || addresses.length === 0}
        onValueChange={(value) =>
            setNewAddressForm((prev) => ({ ...prev, isDefault: value }))
        }
        disabled={addresses.length === 0}
        trackColor={{
            true: "#ffb899",
            false: "#ffe8d9",
        }}
        thumbColor={
            newAddressForm.isDefault || addresses.length === 0
                ? "#ff6200ff"
                : "#fff"
        }
    />
</View>

                        </View>
                        <TouchableOpacity
                            style={[styles.primaryBtn, { marginTop: 4 }, savingAddress && { opacity: 0.6 }]}
                            onPress={handleSaveAddress}
                            disabled={savingAddress}
                        >
                            {savingAddress ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.primaryTxt}>Lưu địa chỉ</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                )}
            </Animated.View>

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

          {/* Sheet: Chọn phương thức thanh toán  */}
<Animated.View
    style={[styles.sheet, { height: paySheet.snapHeight, transform: [{ translateY: paySheet.translateY }] }]}
    {...paySheet.pan.panHandlers}
>
    <View style={styles.grabber} />
    <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>Chọn phương thức thanh toán</Text>
        <TouchableOpacity onPress={paySheet.closeSheet}>
            <Text style={styles.sheetClose}>Đóng</Text>
        </TouchableOpacity>
    </View>

    <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {(["cod", "qr"] as PaymentMethod[]).map((m) => (
            <TouchableOpacity
                key={m}
                style={[styles.pmRow, payment === m && { borderColor: "#16A34A" }]}
                onPress={() => { setPayment(m); paySheet.closeSheet(); }}
                activeOpacity={0.85}
            >
                <View style={styles.pmIcon}>
                    <Text style={styles.pmIconTxt}>
                        {m === "cod" ? "COD" : "QR"}
                    </Text>
                </View>

                <Text style={styles.pmLabel}>
                    {m === "cod" ? "Thanh toán khi nhận hàng (COD)" : "Thanh toán bằng mã QR"}
                </Text>

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
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#fff" },

    /* ================== HEADER ================== */
    header: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#ffd6b0",
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 6,
        elevation: 3,
    },
    headerClose: { fontSize: 20, color: "#1a1a1a", fontWeight: "800" },
    headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: "#1a1a1a" },

    /* ================== CARD ================== */
    card: {
        backgroundColor: "#fff",
        marginHorizontal: 14,
        marginTop: 12,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#ffd6b0",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 6,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    cardTitle: { fontSize: 16, fontWeight: "800", color: "#1a1a1a" },
    linkGreen: { color: "#ff5a00", fontWeight: "800" },

    /* ================== ADDRESS ================== */
    addressSummary: { marginTop: 6, gap: 6 },
    addressLabel: { fontSize: 13, fontWeight: "700", color: "#ff5a00" },
    addressLine: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
    addressNote: { fontSize: 13, color: "#666" },
    addressMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    addressMeta: { fontSize: 13, color: "#999" },

    /* ================== ROW SPLIT ================== */
    rowSplit: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
    },
    muted: { color: "#777" },
    bold: { fontWeight: "800", color: "#1a1a1a" },
    totalTxt: { fontSize: 16, fontWeight: "800", color: "#1a1a1a" },
    totalPrice: { fontSize: 18, fontWeight: "900", color: "#ff5a00" },

    /* ================== SWIPE ROW ================== */
    swipeContainer: { position: "relative", overflow: "hidden", borderRadius: 16 },
    deleteBg: {
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: 84,
        backgroundColor: "#ff5a00",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
    },
    deleteBtn: { paddingHorizontal: 10, paddingVertical: 6 },
    deleteTxt: { color: "#fff", fontWeight: "800", fontSize: 14 },
    swipeRow: {
        backgroundColor: "#fff",
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#ffd6b0",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 5,
        elevation: 2,
    },
    cartImg: { width: 56, height: 56, borderRadius: 14, backgroundColor: "#fff2e8", marginRight: 12 },
    cartName: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
    cartSub: { fontSize: 12, color: "#777", marginTop: 2 },
    cartPrice: { fontSize: 15, fontWeight: "800", color: "#ff5a00" },

    /* ================== ADD ROW (GỢI Ý THÊM) ================== */
    addRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    addRowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    addImg: { width: 56, height: 56, borderRadius: 14, backgroundColor: "#fff2e8" },
    addName: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
    addPrice: { fontSize: 14, fontWeight: "700", color: "#ff5a00" },
    plusBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#ff7a00",
        alignItems: "center",
        justifyContent: "center",
    },
    plusTxt: { color: "#fff", fontSize: 20, fontWeight: "900" },

    /* ================== PAYMENT METHOD ================== */
    payMethodRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#ffd6b0",
    },
    pmIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: "#fff4ec",
        alignItems: "center",
        justifyContent: "center",
    },
    pmIconTxt: { fontWeight: "800", color: "#ff5a00" },
    payMethodText: { fontSize: 15, fontWeight: "800", color: "#1a1a1a" },
    chev: { color: "#aaa", fontSize: 18 },

    /* ================== INPUT ================== */
    addressInput: {
        borderWidth: 1,
        borderColor: "#ffd6b0",
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: "#fff8f2",
        color: "#1a1a1a",
        fontSize: 15,
    },

    /* ================== SHEET ================== */
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },

    sheet: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 16,
        borderWidth: 1,
        borderColor: "#ffd6b0",
    },
    grabber: {
        alignSelf: "center",
        width: 50,
        height: 6,
        backgroundColor: "#ffd6b0",
        borderRadius: 999,
        marginVertical: 10,
    },
    sheetHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    sheetTitle: { fontSize: 17, fontWeight: "800", color: "#1a1a1a" },
    sheetClose: { color: "#ff5a00", fontWeight: "800" },

    pmRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderRadius: 14,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#ffd6b0",
        marginBottom: 10,
    },
    pmLabel: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
    radio: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: "#ffd6b0",
    },
    radioActive: { borderColor: "#ff5a00", backgroundColor: "#ff5a00" },

    /* ================== BUTTONS ================== */
    primaryBtn: {
        backgroundColor: "#ff7a00",
        paddingVertical: 14,
        paddingHorizontal: 26,
        borderRadius: 30,
    },
    primaryTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },

    secondaryBtn: {
        borderWidth: 1,
        borderColor: "#ff7a00",
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 999,
        alignItems: "center",
    },
    secondaryBtnTxt: { color: "#ff7a00", fontWeight: "800" },

    /* ================== FOOTER ================== */
    footer: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: "#ffd6b0",
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: -3 },
        shadowRadius: 6,
        elevation: 4,
    },
    footerLabel: { fontSize: 13, color: "#666" },
    footerTotal: { fontSize: 20, fontWeight: "900", color: "#ff5a00" },

    /* ================== SNACKBAR ================== */
    snackbar: {
        position: "absolute",
        left: 12,
        right: 12,
        bottom: 90,
        backgroundColor: "#1a1a1a",
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    snackText: { color: "#fff", fontSize: 13, flex: 1, marginRight: 10 },
    snackUndo: { color: "#ff7a00", fontWeight: "800" },
    
addressItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderColor: "#ffd6b0",
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
},

addressItemActive: {
    borderColor: "#ff7a00",
    backgroundColor: "#fff5ec",
},

addressItemLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ff7a00",
    marginBottom: 3,
},

addressItemDetail: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 3,
},

addressItemNote: {
    fontSize: 13,
    color: "#777",
    marginBottom: 4,
},

addressItemMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
},

addressItemMeta: {
    fontSize: 12,
    color: "#999",
},

addressBadge: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "800",
    color: "#ff5a00",
    backgroundColor: "#ffe6d4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
},
searchRow: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
},

searchInput: {
    borderWidth: 1,
    borderColor: "#ffd6b0",
    backgroundColor: "#fff8f2",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1a1a1a",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
},
defaultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginTop: 4,
},

defaultLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
},
payMethodLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
},
emptyAddressBox: {
    borderWidth: 1,
    borderColor: "#ffd6b0",
    backgroundColor: "#fff8f2",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
},
sep: {
    height: 1,
    backgroundColor: "#ffe2c7",
    marginVertical: 4,
},

switchWrapper: {
    padding: 2,
    borderWidth: 2,
    borderColor: "#ffb899",     // viền cam đậm
    borderRadius: 20,
},

});


