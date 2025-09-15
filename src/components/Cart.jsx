// src/components/Cart.jsx
import React from "react";

function Cart({ cart, onRemove, onChangeQuantity, done }) {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <div className="cart">
            <h2>Giỏ hàng</h2>
            {cart.length === 0 ? (
                <p>Giỏ hàng trống</p>
            ) : (
                <>
                    <ul>
                        {cart.map((item) => (
                            <li key={item.id} className="cart-item">
                                <div>
                                    <strong>{item.name}</strong>
                                    <div>Giá: {item.price.toLocaleString()} VND</div>
                                </div>

                                <div className="cart-controls">
                                    <button onClick={() => onChangeQuantity(item.id, Math.max(item.quantity - 1, 0))}>-</button>
                                    <span style={{ margin: "0 8px" }}>{item.quantity}</span>
                                    <button onClick={() => onChangeQuantity(item.id, item.quantity + 1)}>+</button>
                                    <button onClick={() => onRemove(item.id)} style={{ marginLeft: 12 }}>Xóa</button>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <div className="cart-total">
                        <strong>Tổng: {total.toLocaleString()} VND</strong>
                        <button onClcik={done}>
                            {done ? (<p> Đã thanh toán </p>) : (<p>Thanh toán</p>)}
                        </button>
                    </div>

                </>
            )}
        </div>
    );
}

export default Cart;
