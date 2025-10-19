import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";
import Login from "./components/Login";
import Register from "./components/Register";
import ProductList from "./components/ProductList";
import ProductDetail from "./components/ProductDetail";
import Cart from "./components/Cart";
import SellerOrders from "./components/SellerOrders";
import OrderHistory from "./components/OrderHistory";
import Checkout from "./components/Checkout";

import "./App.css";

function App() {
  // ==========================
  // 👤 Quản lý người dùng
  // ==========================
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem("currentUser");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // ==========================
  // 🛒 Quản lý giỏ hàng (đọc từ localStorage NGAY TỪ ĐẦU)
  // ==========================
  const [cart, setCart] = useState(() => {
    try {
      if (currentUser) {
        const key = `cart_${encodeURIComponent(currentUser.username)}`;
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
      } else {
        const raw = localStorage.getItem("my_cart");
        return raw ? JSON.parse(raw) : [];
      }
    } catch (err) {
      console.error("Load cart error:", err);
      return [];
    }
  });

  // ==========================
  // ⏱️ Khi đăng nhập hoặc đăng xuất, đồng bộ giỏ hàng tương ứng
  // ==========================
  useEffect(() => {
    if (currentUser) {
      try {
        const key = `cart_${encodeURIComponent(currentUser.username)}`;
        const raw = localStorage.getItem(key);
        setCart(raw ? JSON.parse(raw) : []);
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
      } catch (err) {
        console.error("Load cart error:", err);
        setCart([]);
      }
    } else {
      const guestCart = localStorage.getItem("my_cart");
      setCart(guestCart ? JSON.parse(guestCart) : []);
      localStorage.removeItem("currentUser");
    }
  }, [currentUser]);

  // ==========================
  // 💾 Lưu giỏ hàng mỗi khi thay đổi
  // ==========================
  useEffect(() => {
    try {
      if (currentUser) {
        const key = `cart_${encodeURIComponent(currentUser.username)}`;
        localStorage.setItem(key, JSON.stringify(cart));
      } else {
        localStorage.setItem("my_cart", JSON.stringify(cart));
      }
    } catch (err) {
      console.error("Save cart error:", err);
    }
  }, [cart, currentUser]);

  // ==========================
  // 🧩 Các hàm xử lý giỏ hàng
  // ==========================
  const handleAdd = (product) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleRemove = (productId) => {
    setCart((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleChangeQuantity = (productId, qty) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((p) => p.id !== productId));
    } else {
      setCart((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, quantity: qty } : p
        )
      );
    }
  };

  return (
    <div className="app">
      <Header
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />

      <main className="routes-container">
        <Routes>
          <Route path="/" element={<ProductList onAdd={handleAdd} />} />
          <Route path="/login" element={<Login setCurrentUser={setCurrentUser} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/menu/:categoryKey" element={<ProductList onAdd={handleAdd} />} />

          <Route path="/product-detail/:id" element={<ProductDetail onAdd={handleAdd} />} />
          <Route path="/order-history" element={<OrderHistory />} />
          <Route path="/seller-orders" element={<SellerOrders />} />
          <Route
            path="/cart"
            element={
              <Cart
                cart={cart}
                onRemove={handleRemove}
                onChangeQuantity={handleChangeQuantity}
                currentUser={currentUser}
              />
            }
          />
          <Route
            path="/checkout"
            element={<Checkout cart={cart} currentUser={currentUser} setCart={setCart} />}
          />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
