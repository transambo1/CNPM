import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import "./Header.css";

export default function Header({ currentUser, setCurrentUser }) {
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

    const categories = [
        { key: "Bảo hiểm Cá nhân", label: "Bảo hiểm Cá nhân" },
        { key: "Bảo hiểm Y tế", label: "Bảo hiểm Y tế" },
        { key: "Bảo hiểm Sức khỏe", label: "Bảo hiểm Sức khỏe" },
        { key: "Bảo hiểm Công ty", label: "Bảo hiểm Công ty" },
    ];

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem("currentUser");
        navigate("/");
    };

    return (
        <header className="header-container">
            <div className="header-left">
                <img
                    src="/Images/Logo.png"
                    alt="Logo"
                    className="header-logo"
                    onClick={() => navigate("/")}
                />
            </div>

            <nav className="header-menu">
                <button onClick={() => navigate("/")}>Trang chủ</button>

                <div
                    className="menu-dropdown"
                    onMouseEnter={() => setShowDropdown(true)}
                    onMouseLeave={() => setShowDropdown(false)}
                >
                    <button>Bảo hiểm ▾</button>

                    {showDropdown && (
                        <div className="dropdown-box">
                            {categories.map((c) => (
                                <Link
                                    key={c.key}
                                    to={`/menu/${encodeURIComponent(c.key)}`}
                                >
                                    {c.label}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <button onClick={() => navigate("/")}>Tin tức</button>
                <button onClick={() => navigate("/")}>Chi nhánh</button>
                <button onClick={() => navigate("/")}>Về chúng tôi</button>

                {currentUser?.role === "admin" && (
                    <>
                        <button onClick={() => navigate("/claim-list")}>
                            Quản lý bồi thường
                        </button>
                        <button onClick={() => navigate("/seller-orders")}>
                            Quản lý hợp đồng
                        </button>
                        <button onClick={() => navigate("/manage-products")}>
                            Quản lí bảo hiểm
                        </button>
                    </>
                )}
            </nav>

            <div className="header-user">
                {currentUser ? (
                    <div
                        className="user-box"
                        onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                        <FaUserCircle size={24} />
                        <span>{currentUser.username}</span>

                        {showUserMenu && (
                            <div className="user-dropdown">
                                <button onClick={() => navigate("/order-history")}>
                                    Lịch sử bảo hiểm
                                </button>
                                <button onClick={handleLogout}>Đăng xuất</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link className="login-btn" to="/Login">
                        Đăng nhập
                    </Link>
                )}
            </div>
        </header>
    );
}
