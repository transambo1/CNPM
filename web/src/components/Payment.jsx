// src/components/Payment.jsx
import React from "react";
import { Link } from "react-router-dom";
import './Payment.css';
function Payment({ cart = [] }) {
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

    return (
        <div className="checkout-page">
            <div className="checkout-container">
                <div className="cart-column">
                    <h2>Giỏ hàng của tôi</h2>
                    {cart.length === 0 ? <p>Không có sản phẩm</p> : (
                        cart.map(item => (
                            <div className="checkout-item" key={item.id}>
                                <img src={item.img || "/placeholder.png"} alt={item.name} />
                                <div className="checkout-item-info">
                                    <h3>{item.name}</h3>
                                    <p>Giá: {item.price.toLocaleString()}₫</p>
                                    <p>Số lượng: {item.quantity}</p>
                                </div>
                                <div className="checkout-item-price">{(item.price * item.quantity).toLocaleString()}₫</div>
                            </div>
                        ))
                    )}
                </div>

                <aside className="summary-column">
                    <div className="summary-card">
                        <h3>Tổng quan đơn hàng</h3>
                        <h3>{cart.length} món</h3>

                        <div className="coupon">
                            <input placeholder="Mã giảm giá" />
                            <button>Áp dụng</button>
                        </div>

                        <div className="summary-lines">
                            <div className="line"><span>Tổng đơn hàng</span><strong>{total.toLocaleString()}₫</strong></div>
                            <div className="line total"><span>Tổng thanh toán</span><strong>{total.toLocaleString()}₫</strong></div>
                        </div>

                        <button className="btn-primary full">Thanh toán</button>

                        <Link to="/">⬅ Quay lại menu</Link>
                    </div>
                </aside>
            </div>
        </div>
    );
}

export default Payment;