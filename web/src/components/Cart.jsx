// src/components/Cart.jsx
import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Cart.css";

function Cart({ cart = [], onRemove, onChangeQuantity }) {
    const { currentUser } = useAuth(); // ✅ lấy trực tiếp từ context
    const navigate = useNavigate();
    const location = useLocation();

    // Tổng tiền
    const total = cart.reduce((sum, item) => {
        const price = Number(item.price || 0);
        const qty = Number(item.quantity || 1);
        return sum + price * qty;
    }, 0);

    if (!cart || cart.length === 0) {
        return (
            <div className="cart-page empty-cart">
                <h2>🛒 Giỏ hàng của bạn trống</h2>
                <Link to="/">⬅ Quay lại menu</Link>
            </div>
        );
    }

    const handleCheckout = () => {
        if (!currentUser) {
            // Redirect về login kèm thông tin từ đâu
            navigate("/login", { state: { from: location.pathname } });
        } else {
            navigate("/checkout");
        }
    };

    return (
        <div className="cart-page">
            <div className="cart-container">
                <div className="cart-column">
                    <h2>Giỏ hàng của tôi</h2>
                    {cart.map((item) => {
                        const price = Number(item.price || 0);
                        const qty = Number(item.quantity || 1);
                        return (
                            <div className="cart-item" key={item.id}>
                                <img src={item.img || "/placeholder.png"} alt={item.name || "Sản phẩm"} loading="lazy" />
                                <div className="cart-item-info">
                                    <h3>{item.name}</h3>
                                    <p>Giá: {price.toLocaleString("vi-VN")}₫</p>
                                    <div className="qty-controls">
                                        <button onClick={() => onChangeQuantity(item.id, qty - 1)} disabled={qty <= 1}>-</button>
                                        <span>{qty}</span>
                                        <button onClick={() => onChangeQuantity(item.id, qty + 1)}>+</button>
                                        <button onClick={() => onRemove(item.id)} className="remove-btn">❌ Xóa</button>
                                    </div>
                                </div>
                                <div className="cart-item-price">{(price * qty).toLocaleString("vi-VN")}₫</div>
                            </div>
                        );
                    })}
                </div>

                <aside className="summary-column">
                    <div className="summary-card">
                        <h3>Tổng quan đơn hàng</h3>
                        <ul>
                            {cart.map((item) => (
                                <li key={item.id}>
                                    <span>{item.quantity} x {item.name}</span>
                                    <span>{(item.price * item.quantity).toLocaleString("vi-VN")}₫</span>
                                </li>
                            ))}
                        </ul>
                        <h3>{cart.length} món</h3>

                        <div className="summary-lines">
                            <div className="line">
                                <span>Tổng đơn hàng</span>
                                <strong>{total.toLocaleString("vi-VN")}₫</strong>
                            </div>
                            <div className="line total">
                                <span>Tổng thanh toán</span>
                                <strong>{total.toLocaleString("vi-VN")}₫</strong>
                            </div>
                        </div>

                        <button className="btn-primary" onClick={handleCheckout}>Thanh toán</button>
                        <Link to="/" className="back-to-menu-link">⬅ Quay lại menu</Link>
                    </div>
                </aside>
            </div>
        </div>
    );
}

export default Cart;
