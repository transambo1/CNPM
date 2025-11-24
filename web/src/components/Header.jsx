import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUserCircle, FaMotorcycle } from "react-icons/fa";
import { IoLocationSharp } from "react-icons/io5";
import { useAuth } from "../context/AuthContext";
import "./Header.css";

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
      <div className="grab-header__bar">
        <div className="grab-location">
          <IoLocationSharp size={18} />
          <div>
            <p className="grab-location__label">Giao đến</p>
            <span className="grab-location__value">Hồ Chí Minh • Nhanh trong 30 phút</span>
          </div>
        </div>
        <div className="grab-cta" onClick={() => navigate("/restaurant")}> 
          <FaMotorcycle size={16} />
          <span>Khám phá quán gần bạn</span>
        </div>
      </div>

      <div className="grab-header__main">
        <div className="grab-header-left">
          <Link to="/">
            <img src="/Images/Logo.png" alt="MEOWCHICK Logo" className="grab-logo" />
          </Link>
        </div>

        <div className="grab-header-center">
          <form className="grab-search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Tìm món ăn, nhà hàng..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <button type="submit">Tìm</button>
          </form>
          <div className="grab-quick-links">
            <button onClick={() => navigate("/menu/All")}>Ưu đãi</button>
            <button onClick={() => navigate("/restaurant")}>Gần tôi</button>
            <button onClick={() => navigate("/menu/Đồ Uống ")}>Thức uống</button>
          </div>
        </div>

        <div className="grab-header-right">
          <div className="grab-menu-wrapper">
            <button className="grab-nav-btn">Danh mục</button>
            <div className="grab-menu-dropdown">
              {categories.map((c) => (
                <Link key={c.key} to={`/menu/${c.key}`} className="grab-menu-item">
                  <img src={c.img} alt={c.label} />
                  <span>{c.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <button className="grab-nav-btn" onClick={() => navigate("/restaurant")}>Nhà hàng</button>

          <Link to="/Cart" className="grab-cart-btn">
            <span className="grab-cart-count">{cartCount > 0 ? cartCount : 0}</span>
            Giỏ hàng
          </Link>

          <div className="grab-user-section">
            {currentUser ? (
              <div className="grab-user-menu">
                <div className="grab-user-trigger">
                  <FaUserCircle size={24} />
                  <div className="grab-user-meta">
                    <span className="grab-user-name">{currentUser.firstname} {currentUser.lastname}</span>
                    <small>Thành viên Grab</small>
                  </div>
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
      </div>
    </header>
  );
}

export default Header;
