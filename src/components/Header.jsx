// src/components/Header.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";

function Header({ cartCount, currentUser, setCurrentUser }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem("currentUser");
        navigate("/");
    };

    return (
        <header className="header">
            <div className="header-left">
                <img src="/Images/Logo.png" alt="MEOWCHICK Logo" />
            </div>

            <div className="header-right">
                <div><button onClick={() => navigate("/")}>Trang chủ</button></div>
                <div><button onClick={() => navigate("/")}>Thực đơn</button></div>
                <div><button onClick={() => navigate("/")}>Ưu đãi</button></div>
                <div><button onClick={() => navigate("/")}>Nhà hàng</button></div>
                <div><button onClick={() => navigate("/")}>Về chúng tôi</button></div>

                <Link to="/Cart" className="cart-button">
                    Giỏ hàng ({cartCount > 0 ? cartCount : 0})
                </Link>

                <div className="user-actions">
                    {currentUser ? (
                        <div className="user-menu">
                        <div className="user-menu-trigger">
                            <FaUserCircle size={22} />
                            <span>{currentUser.username}</span>
                        </div>

                       
                            <div className="dropdown-menu">
                            <button
                                className="dropdown-item"
                                onClick={() => navigate("/order-history")}
                            >
                                Lịch sử đơn hàng
                            </button>
                            <button 
                                className="dropdown-item" 
                                onClick={handleLogout}
                            >
                                Đăng xuất
                            </button>
                            </div>
                      
                        </div>
                    ) : (
                        // Thêm className cho nút Đăng nhập
                        <Link to="/login" className="login-button">
                        Đăng nhập
                        </Link>
                    )}
</div>
            </div>
        </header>
    );
}

export default Header;

