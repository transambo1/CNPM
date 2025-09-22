// src/components/Header.jsx
import React from "react";

function Header({ cartCount, onToggleCart, showCart }) {
    return (
        <>
            <header className="header">
                <div className="header-left">
                    <h1>Kat Kem bán đồ</h1>
                </div>
                <div className="header-right">
                    <div>
                        <button >
                            Trang chủ
                        </button>
                    </div>
                    <div>
                        <button >
                            Thực đơn
                        </button>
                    </div>
                    <div>
                        <button >
                            Ưu đãi
                        </button>
                    </div>
                    <div>
                        <button >
                            Nhà hàng
                        </button>
                    </div>
                    <div>
                        <button >
                            Về chúng tôi
                        </button>
                    </div>
                    <div>
                        <button onClick={onToggleCart}>
                            {showCart ? "Đóng giỏ" : `Giỏ hàng (${cartCount})`}
                        </button>
                    </div>
                </div>
            </header>
        </>
    );
}

export default Header;
