import React, { useEffect, useState } from "react";
import { Routes, Route, BrowserRouter, Navigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./context/AuthContext";
import "leaflet/dist/leaflet.css";
import "./App.css";

/* USER PAGES */
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

/* LAYOUTS */
import UserLayout from "./layouts/UserLayout";
import AdminLayout from "./layouts/AdminLayout";
import RestaurantLayout from "./layouts/RestaurantLayout";

/* ADMIN PAGES */
import Dashboard from "./admin/pages/Dashboard";
import Orders from "./admin/pages/Orders";
import Users from "./admin/pages/Users";
import OrderDetail from "./admin/components/OrdersDetail";
import Products from "./admin/pages/Products";
import AdminCreateRestaurant from "./admin/pages/AdminCreateRestaurant"; 
import AdminDroneManager from "./admin/pages/AdminDroneManager"; 

/* RESTAURANT ADMIN */
import RestaurantDashboard from "./components/RestaurantDashboard";
import RestaurantOrders from "./components/RestaurantOrders";
import RestaurantOrderDetail from "./components/RestaurantOrderDetail";
import RestaurantProducts from "./components/RestaurantProducts";
import DroneList from "./components/DroneList";

/* ✅ Protected Routes */
function AdminRoute({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser || currentUser.role !== "admin") {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RestaurantRoute({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser || currentUser.role !== "restaurant") {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  const { currentUser } = useAuth();

  /* ===== Cart ===== */
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
  }, [cart, currentUser]);

  const handleAdd = (product, quantity = 1) => {
    const safeQty = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) =>
          p.id === product.id
            ? { ...p, quantity: p.quantity + safeQty }
            : p
        );
      }
      return [
        ...prev,
        {
          ...product,
          quantity: safeQty,
          restaurantName: product.restaurantName,
          restaurantId: product.restaurantId,
        },
      ];
    });
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* USER */}
        <Route path="/" element={<UserLayout cartCount={cart.reduce((s, i) => s + i.quantity, 0)} />}>
          <Route index element={<ProductList onAdd={handleAdd} />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="product-detail/:id" element={<ProductDetail onAdd={handleAdd} />} />
          <Route path="cart" element={<Cart cart={cart} setCart={setCart} />} />
          <Route path="checkout" element={<Checkout cart={cart} setCart={setCart} />} />
          <Route path="order-history" element={<OrderHistory />} />
          <Route path="waiting/:orderId" element={<WaitingForConfirmation />} />
          <Route path="restaurant" element={<RestaurantList />} />
          <Route path="restaurant/:id" element={<RestaurantDetail onAdd={handleAdd} />} />
        </Route>

        {/* ADMIN */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="dashboards" element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="products" element={<Products />} />
          <Route path="users" element={<Users />} />
          <Route path="create-restaurant" element={<AdminCreateRestaurant />} />
            <Route path="drones" element={<AdminDroneManager />} />

        </Route>

        {/* RESTAURANT ADMIN */}
        <Route path="/restaurantadmin" element={<RestaurantRoute><RestaurantLayout /></RestaurantRoute>}>
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
