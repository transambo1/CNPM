// src/components/Header.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import "./Header.css";

function Header({ cartCount, currentUser, setCurrentUser }) {
    const navigate = useNavigate();
    const [searchValue, setSearchValue] = useState("");

    const categories = [
        { key: "All", label: "Tất cả", img: "/Images/Hambur.jpg" },
        { key: "Gà Rán", label: "Gà rán", img: "/Images/Garan.jpg" },
        { key: "Burger", label: "Burger", img: "/Images/Hambur.jpg" },
        { key: "Sandwich", label: "Sandwich", img: "/Images/Hambur.jpg" },
        { key: "Tacos", label: "Tacos", img: "/Images/Hambur.jpg" },
    ];

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem("currentUser");
        navigate("/");
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchValue.trim() !== "") {
            navigate(`/menu/All?search=${encodeURIComponent(searchValue)}`);
            setSearchValue("");
        }
    };

    return (
        <header className="header">
            <div className="header-left">
                <Link to="/">
                    <img src="/Images/Logo.png" alt="MEOWCHICK Logo" />
                </Link>
            </div>

            <div className="header-center">
                <form className="search-form" onSubmit={handleSearch}>
                    <input
                        type="text"
                        placeholder="Tìm món ăn..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                    />
                    <button type="submit">
                        <img src="/Images/search.png" alt="SEARCH" />
                    </button>
                </form>
            </div>

            <div className="header-right">
                <button onClick={() => navigate("/")}>Trang chủ</button>

                {/* Dropdown Thực đơn */}
                <div className="menu-dropdown">
                    <button onClick={() => navigate("/menu/All")}>Thực đơn</button>
                    <div className="dropdown-content">
                        {categories.map((c) => (
                            <Link key={c.key} to={`/menu/${c.key}`}>
                                <img src={c.img} alt={c.label} />
                                <span>{c.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                <button onClick={() => navigate("/")}>Ưu đãi</button>
                <button onClick={() => navigate("/")}>Nhà hàng</button>
                <button onClick={() => navigate("/")}>Về chúng tôi</button>

                <Link to="/Cart" className="cart-button">
                    Giỏ hàng ({cartCount > 0 ? cartCount : 0})
                </Link>

                <div className="user-actions">
                    {currentUser ? (
                        <div className="user-menu">
                            <div className="user-menu-trigger">
                                <FaUserCircle size={22} />
                                <span>{currentUser.firstname} {currentUser.lastname}</span>
                            </div>
                            <div className="dropdown-menu">
                                <button
                                    className="dropdown-item"
                                    onClick={() => navigate("/order-history")}
                                >
                                    Lịch sử đơn hàng
                                </button>
                                <button className="dropdown-item" onClick={handleLogout}>
                                    Đăng xuất
                                </button>
                            </div>
                        </div>
                    ) : (
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
