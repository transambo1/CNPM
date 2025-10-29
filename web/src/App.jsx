import React, { useEffect, useState } from "react";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./context/AuthContext"; // 🔹 Lấy currentUser từ context
import "leaflet/dist/leaflet.css";
import "./App.css";

// ===== USER COMPONENTS =====
import ProductList from "./components/ProductList";
import ProductDetail from "./components/ProductDetail";
import Cart from "./components/Cart";
import Checkout from "./components/Checkout";
import SellerOrders from "./components/SellerOrders";
import OrderHistory from "./components/OrderHistory";
import Login from "./components/Login";
import Register from "./components/Register";
import RestaurantList from "./components/RestaurantList";
import RestaurantDetail from "./components/RestaurantDetail";
import WaitingForConfirmation from "./components/WaitingForConfirmation";

// ===== ADMIN =====
import UserLayout from "./layouts/UserLayout";
import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./admin/pages/Dashboard";
import Orders from "./admin/pages/Orders";
import Users from "./admin/pages/Users";
import OrderDetail from "./admin/components/OrdersDetail";
import Products from "./admin/pages/Products";

// ===== RESTAURANT ADMIN =====
import RestaurantLayout from "./layouts/RestaurantLayout";
import RestaurantDashboard from "./components/RestaurantDashboard";
import RestaurantOrders from "./components/RestaurantOrders";
import RestaurantOrderDetail from "./components/RestaurantOrderDetail";
import RestaurantProducts from "./components/RestaurantProducts";
import DroneList from "./components/DroneList";

function App() {
  const { currentUser } = useAuth(); // 🔹 Lấy currentUser từ context

  // ==========================
  // 🔥 Dữ liệu Firebase
  // ==========================
  const [restaurantsData, setRestaurantsData] = useState([]);
  const [productsData, setProductsData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const restaurantsSnap = await getDocs(collection(db, "restaurants"));
        const restaurantList = restaurantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRestaurantsData(restaurantList);

        const productsSnap = await getDocs(collection(db, "products"));
        const productList = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProductsData(productList);

        console.log("✅ Firebase data loaded:", {
          restaurants: restaurantList.length,
          products: productList.length,
        });
      } catch (err) {
        console.error("🔥 Lỗi khi lấy dữ liệu Firebase:", err);
      }
    };
    fetchData();
  }, []);

  // ==========================
  // 🛒 Giỏ hàng
  // ==========================
  const [cart, setCart] = useState(() => {
    try {
      if (currentUser) {
        const key = `cart_${encodeURIComponent(currentUser.phonenumber)}`;
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
      } else {
        const raw = localStorage.getItem("my_cart");
        return raw ? JSON.parse(raw) : [];
      }
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      if (currentUser) {
        const key = `cart_${encodeURIComponent(currentUser.phonenumber)}`;
        localStorage.setItem(key, JSON.stringify(cart));
      } else {
        localStorage.setItem("my_cart", JSON.stringify(cart));
      }
    } catch {}
  }, [currentUser]);

  const handleAdd = (product) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      return [...prev, { ...product, quantity: 1, restaurantName: product.restaurantName, restaurantId: product.restaurantId }];
    });
  };

  const handleRemove = (productId) => {
    setCart(prev => prev.filter(p => p.id !== productId));
  };

  const handleChangeQuantity = (productId, qty) => {
    if (qty <= 0) handleRemove(productId);
    else setCart(prev => prev.map(p => p.id === productId ? { ...p, quantity: qty } : p));
  };

  // ==========================
  // 🧭 Routing
  // ==========================
  return (
    <BrowserRouter>
      <Routes>
        {/* ===== USER LAYOUT ===== */}
        <Route
          path="/"
          element={<UserLayout cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} />}
        >
          <Route index element={<ProductList onAdd={handleAdd} products={productsData} />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="menu/:categoryKey" element={<ProductList onAdd={handleAdd} products={productsData} />} />
          <Route path="product-detail/:id" element={<ProductDetail onAdd={handleAdd} />} />
          <Route path="cart" element={<Cart cart={cart} onRemove={handleRemove} onChangeQuantity={handleChangeQuantity} />} />
          <Route path="checkout" element={<Checkout cart={cart} setCart={setCart} />} />
          <Route path="order-history" element={<OrderHistory />} />
          <Route path="seller-orders" element={<SellerOrders />} />
          <Route path="waiting/:orderId" element={<WaitingForConfirmation />} />
          <Route path="restaurant" element={<RestaurantList restaurants={restaurantsData} />} />
          <Route path="restaurant/:id" element={<RestaurantDetail products={productsData} restaurants={restaurantsData} onAdd={handleAdd} />} />
        </Route>

        {/* ===== ADMIN & RESTAURANT LAYOUT ===== */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="products" element={<Products />} />
          <Route path="users" element={<Users />} />
        </Route>

        <Route path="/restaurantadmin/*" element={<RestaurantLayout />}>
          <Route index element={<RestaurantDashboard />} />
          <Route path="orders" element={<RestaurantOrders />} />
          <Route path="orders/:id" element={<RestaurantOrderDetail />} />
          <Route path="products" element={<RestaurantProducts />} />
          <Route path="drones" element={<DroneList />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
