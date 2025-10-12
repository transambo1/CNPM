// src/components/Header.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import './Header.css'; // Quan trọng: Đảm bảo đã import file CSS

// Bỏ các useState không cần thiết
function Header({ cartCount, currentUser, setCurrentUser }) {
    const navigate = useNavigate();

    const categories = [
        { key: "All", label: "Tất cả", img: "/Images/all-items.png" },
        { key: "Chicken", label: "Gà rán", img: "/Images/ga-ran.png" },
        { key: "Burger", label: "Burger", img: "/Images/burger-icon.png" },
        { key: "FastFood", label: "Đồ ăn nhanh", img: "/Images/fast-food.png" },
        { key: "Drink", label: "Nước uống", img: "/Images/drinks.png" }
    ];

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem("currentUser");
        navigate("/");
    };

    return (
        <header className="header">
            <div className="header-left">
                <Link to="/">
                    <img src="/Images/Logo.png" alt="MEOWCHICK Logo" />
                </Link>
            </div>

            <div className="header-right">
                <div><button onClick={() => navigate("/")}>Trang chủ</button></div>
                
                <div className="menu-dropdown">
                    <button>Thực đơn</button>
                    <div className="dropdown-content">
                        {categories.map((c) => (
                            <Link key={c.key} to={`/menu/${c.key}`}>
                                <img src={c.img} alt={c.label} />
                                <span>{c.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>

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
                                <button className="dropdown-item" onClick={() => navigate("/order-history")}>
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