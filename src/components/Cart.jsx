// src/components/Cart.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";

function Cart({ cart, onRemove, onChangeQuantity }) {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const navigate = useNavigate();

    if (cart.length === 0) {
        return (
            <div className="cart-page">
                <h2>Giỏ hàng của bạn trống</h2>
                <Link to="/">⬅ Quay lại menu</Link>
            </div>
        );
    }

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

                        <Link to="/Checkout">
                            <button className="btn-primary">Thanh toán</button>
                        </Link>

                        <Link to="/">⬅ Quay lại menu</Link>
                    </div>
                </aside>
            </div>
        </div>
    );


}

export default Cart;
