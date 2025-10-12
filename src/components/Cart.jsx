// src/components/Cart.jsx
import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import './Cart.css';

function Cart({ cart, onRemove, onChangeQuantity, currentUser }) {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const navigate = useNavigate();
    const location = useLocation();

    if (cart.length === 0) {
        return (
            <div className="cart-page empty-cart">
                <h2>Giỏ hàng của bạn trống</h2>
                <Link to="/">⬅ Quay lại menu</Link>
            </div>
        );
    }

    // Hàm xử lý bấm Thanh toán
    const handleCheckout = () => {
        if (!currentUser) {
            // Lưu lại trang hiện tại (/cart)
            navigate("/login", { state: { from: location.pathname } });
        } else {
            navigate("/checkout");
        }
    };

    return (
        <div className="cart-page">
            <div className="cart-container">
                {/* Cột trái: danh sách sản phẩm */}
                <div className="cart-column">
                    <h2>Giỏ hàng của tôi</h2>
                    {cart.map(item => (
                        <div className="cart-item" key={item.id}>
                            <img src={item.img || "/placeholder.png"} alt={item.name} />
                            <div className="cart-item-info">
                                <h3>{item.name}</h3>
                                <p>Giá: {item.price.toLocaleString()}₫</p>
                                <div className="qty-controls">
                                    <button onClick={() => onChangeQuantity(item.id, item.quantity - 1)}>-</button>
                                    <span style={{ margin: "0 15px" }}>{item.quantity}</span>
                                    <button onClick={() => onChangeQuantity(item.id, item.quantity + 1)}>+</button>
                                    <button onClick={() => onRemove(item.id)}>Xóa</button>
                                </div>
                            </div>
                            <div className="cart-item-price">
                                {(item.price * item.quantity).toLocaleString()}₫
                            </div>
                        </div>
                    ))}
                </div>

                {/* Cột phải: tổng kết */}
                <aside className="summary-column">
                    <div className="summary-card">
                        <h3>Tổng quan đơn hàng</h3>
                        <ul>
                            {cart.map((item) => (
                                <li key={item.id}>
                                    <span>
                                        {item.quantity}x {item.name}
                                    </span>
                                    <span>
                                        {(item.price * item.quantity).toLocaleString()}₫
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <h3>{cart.length} món</h3>

                        <div className="coupon">
                            <input placeholder="Mã giảm giá" />
                            <button>Áp dụng</button>
                        </div>

                        <div className="summary-lines">
                            <div className="line">
                                <span>Tổng đơn hàng</span>
                                <strong>{total.toLocaleString()}₫</strong>
                            </div>
                            <div className="line total">
                                <span>Tổng thanh toán</span>
                                <strong>{total.toLocaleString()}₫</strong>
                            </div>
                        </div>

                        {/* Nút thanh toán kiểm tra login */}
                        <button className="btn-primary" onClick={handleCheckout}>
                            Thanh toán
                        </button>

                        <Link to="/" className="back-to-menu-link">⬅ Quay lại menu</Link>
                    </div>
                </aside>
            </div>
        </div>
    );
}

export default Cart;
