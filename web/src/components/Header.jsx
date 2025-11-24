import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import "./Header.css"; // <-- CSS mới theo phong cách Grab

function Header({ cartCount }) {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const { currentUser, logout } = useAuth();
  if (currentUser === undefined) return null;

  useEffect(() => {
    console.log("Header currentUser:", currentUser);
  }, [currentUser]);

  const categories = [
    { key: "All", label: "Tất cả", img: "/Images/Hambur.jpg" },
    { key: "Sushi", label: "Sushi", img: "/Images/Sushi.jpg" },
    { key: "Burger", label: "Burger", img: "/Images/Hambur.jpg" },
    { key: "BBQ Hàn", label: "BBQ Hàn", img: "/Images/thit.jpeg" },
    { key: "Tacos", label: "Tacos", img: "/Images/tacos.jpg" },
    { key: "Đồ Uống ", label: "Đồ uống", img: "/Images/latte.jpg" },
    { key: "Pasta", label: "Pasta", img: "/Images/mi.jpg" },
    { key: "Lẩu", label: "Lẩu", img: "/Images/tomyum.jpg" },
  ];

  const handleLogout = async () => {
    if (logout) {
      await logout();
      navigate("/login");
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchValue.trim() !== "") {
      navigate(`/menu/All?search=${encodeURIComponent(searchValue)}`);
      setSearchValue("");
    }
  };

  return (
    <header className="grab-header">
      <div className="grab-header-left">
        <Link to="/">
          <img src="/Images/Logo.png" alt="MEOWCHICK Logo" className="grab-logo" />
        </Link>
      </div>

      <div className="grab-header-center">
        <form className="grab-search-form" onSubmit={handleSearch}>
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

      <div className="grab-header-right">
        <button className="grab-nav-btn" onClick={() => navigate("/")}>Trang chủ</button>

        <div className="grab-menu-wrapper">
          <button className="grab-nav-btn">Thực đơn</button>
          <div className="grab-menu-dropdown">
            {categories.map((c) => (
              <Link key={c.key} to={`/menu/${c.key}`} className="grab-menu-item">
                <img src={c.img} alt={c.label} />
                <span>{c.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <button className="grab-nav-btn" onClick={() => navigate("/restaurant")}>
          Nhà hàng
        </button>

        <Link to="/Cart" className="grab-cart-btn">
          Giỏ hàng ({cartCount > 0 ? cartCount : 0})
        </Link>

        <div className="grab-user-section">
          {currentUser ? (
            <div className="grab-user-menu">
              <div className="grab-user-trigger">
                <FaUserCircle size={22} />
                <span>{currentUser.firstname} {currentUser.lastname}</span>
              </div>

              <div className="grab-user-dropdown">
                <button onClick={() => navigate("/order-history")}>Lịch sử đơn hàng</button>
                <button onClick={handleLogout}>Đăng xuất</button>
              </div>
            </div>
          ) : (
            <Link to="/login" className="grab-login-btn">
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
