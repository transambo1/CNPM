// src/components/Cart.jsx
import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Cart.css"; // Đảm bảo file CSS này cũng được đổi tên

function Cart({ cart = [], onRemove, onChangeQuantity }) {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const total = cart.reduce((sum, item) => {
        const price = Number(item.price || 0);
        const qty = Number(item.quantity || 1);
        return sum + price * qty;
    }, 0);

    if (!cart || cart.length === 0) {
        return (
            // ✅ Đổi tên class
            <div className="cart-page-wrapper cart-page-empty-cart">
                <h2>🛒 Giỏ hàng của bạn trống</h2>
                <Link to="/">⬅ Quay lại menu</Link>
            </div>
        );
    }

    const handleCheckout = () => {
        if (!currentUser) {
            navigate("/login", { state: { from: location.pathname } });
        } else {
            navigate("/checkout");
        }
    };

    return (
        // ✅ Đổi tên class
        <div className="cart-page-wrapper">
            {/* ✅ Đổi tên class */}
            <div className="cart-page-container">
                {/* ✅ Đổi tên class */}
                <div className="cart-page-cart-column">
                    <h2>Giỏ hàng của tôi</h2>
                    {cart.map((item) => {
                        const price = Number(item.price || 0);
                        const qty = Number(item.quantity || 1);
                        return (
                            // ✅ Đổi tên class
                            <div className="cart-page-item" key={item.id}>
                                <img src={item.img || "/placeholder.png"} alt={item.name || "Sản phẩm"} loading="lazy" />
                                {/* ✅ Đổi tên class */}
                                <div className="cart-page-item-info">
                                    <h3>{item.name}</h3>
                                    <p>Giá: {price.toLocaleString("vi-VN")}₫</p>
                                    {/* ✅ Đổi tên class */}
                                    <div className="cart-page-qty-controls-tong">
                                        <div className="cart-page-qty-controls">
                                            <button onClick={() => onChangeQuantity(item.id, qty - 1)} disabled={qty <= 1}>-</button>
                                            <span>{qty}</span>
                                            <button onClick={() => onChangeQuantity(item.id, qty + 1)}>+</button>
                                            {/* ✅ Đổi tên class */}

                                        </div>
                                        <button onClick={() => onRemove(item.id)} className="cart-page-remove-btn">❌ Xóa</button>
                                    </div>
                                </div>
                                {/* ✅ Đổi tên class */}
                                <div className="cart-page-item-price">{(price * qty).toLocaleString("vi-VN")}₫</div>
                            </div>
                        );
                    })}
                </div>

                {/* ✅ Đổi tên class */}
                <aside className="cart-page-summary-column">
                    {/* ✅ Đổi tên class */}
                    <div className="cart-page-summary-card">
                        <h3>Tổng quan đơn hàng</h3>
                        <ul>
                            {cart.map((item) => (
                                // ✅ Thêm class cho li
                                <li key={item.id} className="cart-page-summary-item">
                                    <span>{item.quantity} x {item.name}</span>
                                    <span>{(item.price * item.quantity).toLocaleString("vi-VN")}₫</span>
                                </li>
                            ))}
                        </ul>
                        <h3>{cart.length} món</h3>

                        {/* ✅ Đổi tên class */}
                        <div className="cart-page-summary-lines">
                            {/* ✅ Đổi tên class */}
                            <div className="cart-page-line">
                                <span>Tổng đơn hàng</span>
                                <strong>{total.toLocaleString("vi-VN")}₫</strong>
                            </div>
                            {/* ✅ Đổi tên class */}
                            <div className="cart-page-line cart-page-total">
                                <span>Tổng thanh toán</span>
                                <strong>{total.toLocaleString("vi-VN")}₫</strong>
                            </div>

                            <button className="cart-page-btn-primary" onClick={handleCheckout}>Thanh toán</button>
                            {/* ✅ Đổi tên class */}
                            <Link to="/" className="cart-page-back-link">⬅ Quay lại menu</Link>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}

export default Cart;