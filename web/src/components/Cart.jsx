import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Cart.css";

function Cart({ cart = [], setCart }) {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mergedRef = useRef(false);

  // ✅ Lấy key của user hoặc guest
  const getCartKey = () =>
    currentUser
      ? `cart_${encodeURIComponent(currentUser.uid || currentUser.phonenumber)}`
      : "cart_guest";

  // ⚡ Load cart ngay lập tức từ localStorage (không cần chờ Firestore)
  useEffect(() => {
    const key = getCartKey();
    const stored = JSON.parse(localStorage.getItem(key) || "[]");
    console.log("⚡ Load cart nhanh:", key, stored);
    setCart(stored);
  }, []); // chạy 1 lần khi mount

  // 🧩 Merge cart_guest vào user cart sau khi đăng nhập thật
  useEffect(() => {
    if (!currentUser || mergedRef.current) return;

    const guestKey = "cart_guest";
    const userKey = getCartKey();

    const guestCart = JSON.parse(localStorage.getItem(guestKey) || "[]");
    const userCart = JSON.parse(localStorage.getItem(userKey) || "[]");

    if (guestCart.length > 0) {
      const merged = [...userCart];
      guestCart.forEach((g) => {
        const exist = merged.find((i) => i.id === g.id);
        if (exist) exist.quantity += g.quantity || 1;
        else merged.push(g);
      });

      localStorage.setItem(userKey, JSON.stringify(merged));
      localStorage.removeItem(guestKey);
      setCart(merged);
      mergedRef.current = true;
      console.log("🧩 Merge guest cart → user cart:", merged);
    } else {
      setCart(userCart);
    }
  }, [currentUser]);

  // 💾 Debounce save cart tránh lag
  useEffect(() => {
    if (!cart) return;
    const key = getCartKey();
    const timeout = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(cart));
      console.log("💾 Ghi cart (debounce):", key, cart);
    }, 300);
    return () => clearTimeout(timeout);
  }, [cart, currentUser]);

  // ✅ Tính tổng tiền
  const total = cart.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
    0
  );

  const handleQuantityChange = (id, newQty) => {
    if (newQty <= 0) return;
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: newQty } : item
      )
    );
  };

  const handleRemove = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCheckout = () => {
    if (!currentUser)
      navigate("/login", { state: { from: location.pathname } });
    else navigate("/checkout");
  };

  // Hiển thị rỗng
  if (!cart || cart.length === 0)
    return (
      <div className="cart-page-wrapper cart-page-empty-cart">
        <h2>🛒 Giỏ hàng của bạn trống</h2>
        <Link to="/">⬅ Quay lại menu</Link>
      </div>
    );

  return (
    <div className="cart-page-wrapper">
      <div className="cart-page-container">
        {/* ===== DANH SÁCH SẢN PHẨM ===== */}
        <div className="cart-page-cart-column">
          <h2>Giỏ hàng của tôi</h2>
          {cart.map((item) => (
            <div className="cart-page-item" key={item.id}>
              <img
                src={item.img || "/placeholder.png"}
                alt={item.name}
                loading="lazy"
              />
              <div className="cart-page-item-info">
                <h3>{item.name}</h3>
                <p>Giá: {item.price.toLocaleString("vi-VN")}₫</p>
                <div className="cart-page-qty-controls-tong">
                  <div className="cart-page-qty-controls">
                    <button
                      onClick={() =>
                        handleQuantityChange(item.id, item.quantity - 1)
                      }
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() =>
                        handleQuantityChange(item.id, item.quantity + 1)
                      }
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="cart-page-remove-btn"
                  >
                    ❌ Xóa
                  </button>
                </div>
              </div>
              <div className="cart-page-item-price">
                {(item.price * item.quantity).toLocaleString("vi-VN")}₫
              </div>
            </div>
          ))}
        </div>

        {/* ===== TỔNG KẾT & THANH TOÁN ===== */}
        <aside className="cart-page-summary-column">
          <div className="cart-page-summary-card">
            <h3>Tổng quan đơn hàng</h3>
            <ul>
              {cart.map((item) => (
                <li key={item.id} className="cart-page-summary-item">
                  <span>
                    {item.quantity} x {item.name}
                  </span>
                  <span>
                    {(item.price * item.quantity).toLocaleString("vi-VN")}₫
                  </span>
                </li>
              ))}
            </ul>

            <div className="cart-page-line">
              <span>Tổng đơn hàng</span>
              <strong>{total.toLocaleString("vi-VN")}₫</strong>
            </div>

            <div className="cart-page-line cart-page-total">
              <span>Tổng thanh toán</span>
              <strong>{total.toLocaleString("vi-VN")}₫</strong>
            </div>

            <button className="cart-page-btn-primary" onClick={handleCheckout}>
              Thanh toán
            </button>

            <Link to="/" className="cart-page-back-link">
              ⬅ Quay lại menu
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Cart;
