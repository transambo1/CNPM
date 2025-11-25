// src/components/Header.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

import "./Header.css";

function Header({ cartCount }) {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");

  const { currentUser, logout } = useAuth();
  if (currentUser === undefined) return null;

  // 🔥 State chứa danh mục động từ Firestore
  const [categories, setCategories] = useState([]);

  // 🧷 Load categories từ Firestore
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const snap = await getDocs(collection(db, "products"));
        const list = snap.docs.map((d) => d.data());

        const all = [...new Set(list.map((p) => p.category?.trim()))]
          .filter((c) => c && c !== "");

        setCategories(all);
      } catch (err) {
        console.error("🔥 Lỗi load category:", err);
      }
    };

    loadCategories();
  }, []);

  // 🟦 Debug user
  useEffect(() => {
    console.log("Header currentUser:", currentUser);
  }, [currentUser]);

  const handleLogout = async () => {
    if (logout) {
      await logout();
      navigate("/login");
    }
  };

  // 🔎 SEARCH FUNCTION
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchValue.trim() !== "") {
      const searchQuery = encodeURIComponent(searchValue.trim());
      navigate(`/menu/All?search=${searchQuery}`);
      setSearchValue("");
      window.scrollTo(0, 0);
    }
  };

  return (
    <header className="header">
      {/* LEFT - LOGO */}
      <div className="header-left">
        <Link to="/">
          <img src="/Images/Logo.png" alt="MEOWCHICK Logo" />
        </Link>
      </div>

      {/* CENTER - SEARCH BAR */}
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

      {/* RIGHT - NAVIGATION / ACCOUNT */}
      <div className="header-right">
        <button onClick={() => navigate("/")}>Trang chủ</button>

        {/* 🔥 MENU DROPDOWN — CATEGORIES FROM FIRESTORE */}
        <div className="menu-dropdown">
          <button onClick={() => navigate("/menu/All")}>Thực đơn</button>

          <div className="dropdown-content">

            {/* Luôn có "Tất cả" */}
            <Link to="/menu/All">
            
              <span>Tất cả</span>
            </Link>

            {/* Render category động */}
            {categories.map((c) => (
              <Link key={c} to={`/menu/${c}`}>
           
                <span>{c}</span>
              </Link>
            ))}
          </div>
        </div>

        <button onClick={() => navigate("/restaurant")}>Nhà hàng</button>

        {/* CART */}
        <Link to="/Cart" className="cart-button">
          Giỏ hàng ({cartCount > 0 ? cartCount : 0})
        </Link>

        {/* USER MENU */}
        <div className="user-actions">
          {currentUser ? (
            <div className="user-menu">
              <div className="user-menu-trigger">
                <FaUserCircle size={22} />
                <span>
                  {currentUser.firstname} {currentUser.lastname}
                </span>
              </div>

              {/* ACCOUNT DROPDOWN */}
              <div className="dropdown-menu">
                <button
                  className="dropdown-item"
                  onClick={() => navigate("/profile")}
                >
                  Tài khoản của tôi
                </button>

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
