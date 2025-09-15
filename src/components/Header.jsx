// src/components/Header.jsx
import React from "react";

function Header({ cartCount, onToggleCart, showCart }) {
    return (
        <>
            <header className="header">
                <h1>Mini Web Bán Hàng</h1>
                <div>
                    <button onClick={onToggleCart}>
                        {showCart ? ".//App.jsx" : "Trang chủ"}
                    </button>
                </div>
                <div>
                    <button onClick={onToggleCart}>
                        {showCart ? "Đóng giỏ" : "Đăng nhập"}
                    </button>
                </div>
                <div>
                    <button onClick={onToggleCart}>
                        {showCart ? "Đóng giỏ" : `Giỏ hàng (${cartCount})`}
                    </button>
                </div>

            </header>
        </>
    );
}

export default Header;
