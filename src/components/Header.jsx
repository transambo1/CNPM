// src/components/Header.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";

function Header({ cartCount, onToggleCart, showCart }) {
    const navigate = useNavigate();

    return (
        <>
            <header className="header">
                <div className="header-left">
                     <img 
                            src="/Images/Logo.png" 
                            alt="MEOWCHICK Logo" 
                        />
                </div>
                <div className="header-right">
                    <div>
                        <button onClick={() => navigate("/")} >
                            Trang chủ
                        </button>
                    </div>
                    <div>
                        <button onClick={() => navigate("/")}>
                            Thực đơn
                        </button>
                    </div>
                    <div>
                        <button onClick={() => navigate("/")}>
                            Ưu đãi
                        </button>
                    </div>
                    <div>
                        <button onClick={() => navigate("/")}>
                            Nhà hàng
                        </button>
                    </div>
                    <div>
                        <button onClick={() => navigate("/")}>
                            Về chúng tôi
                        </button>
                    </div>
                     <Link to="/Cart" className="cart-button">
                        Giỏ hàng ({cartCount > 0 ? cartCount : 0})
                     </Link>
                 

                </div>
            </header>
        </>
    );
}

export default Header;
