import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "./Login.css";
import { useAuth } from "../context/AuthContext";
import { message } from "antd";

function Login() {
  const [phonenumber, setPhonenumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentUser } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!phonenumber || !password) {
      setError("Vui lòng nhập đầy đủ số điện thoại và mật khẩu.");
      return;
    }

    try {
      // 🔎 Tìm user có phonenumber khớp
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("phonenumber", "==", phonenumber));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Số điện thoại không tồn tại.");
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      // 🔒 Kiểm tra mật khẩu
      if ((userData.password || "").trim() !== password.trim()) {
        setError("Sai mật khẩu");
        return;
      }

      // 🚫 Kiểm tra bị khóa
      if (userData.status === "banned") {
        message.error("🚫 Tài khoản của bạn đã bị chặn. Vui lòng liên hệ quản trị viên!", 3);
        setError("Tài khoản của bạn đã bị chặn!");
        return;
      }

      // ✅ Bổ sung uid và các thông tin cần thiết để AuthContext hoạt động
      const fullUserData = {
        ...userData,
        uid: userDoc.id, // 🔥 rất quan trọng: AuthContext cần uid để restore user
      };

      // ✅ Lưu vào localStorage và context
      localStorage.setItem("currentUser", JSON.stringify(fullUserData));
      setCurrentUser(fullUserData);

      // ✅ Merge cart guest → user cart
      try {
        const guestKey = "cart_guest";
        const userKey = `cart_${encodeURIComponent(
          fullUserData.uid || fullUserData.phonenumber
        )}`;

        const guestCart = JSON.parse(localStorage.getItem(guestKey) || "[]");
        const userCart = JSON.parse(localStorage.getItem(userKey) || "[]");

        if (guestCart.length > 0) {
          console.log("🧩 Merge guest cart vào user cart...");
          const merged = [...userCart];
          guestCart.forEach((g) => {
            const exist = merged.find((i) => i.id === g.id);
            if (exist) exist.quantity += g.quantity || 1;
            else merged.push(g);
          });

          localStorage.setItem(userKey, JSON.stringify(merged));
          localStorage.removeItem(guestKey); // Xóa cart guest
        }
      } catch (err) {
        console.error("⚠️ Lỗi merge cart:", err);
      }

      // ✅ Điều hướng theo vai trò
      switch (fullUserData.role) {
        case "admin":
          navigate("/admin");
          break;
        case "restaurant":
          navigate("/restaurantadmin");
          break;
        case "customer":
        default:
          navigate("/");
          break;
      }

      message.success(`Chào mừng, ${fullUserData.firstname || "người dùng"} 👋`, 2);
    } catch (err) {
      console.error("Login Error:", err);
      setError("Đã có lỗi xảy ra khi đăng nhập.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Đăng Nhập</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="phonenumber">Số điện thoại</label>
            <input
              id="phonenumber"
              type="text"
              placeholder="Nhập số điện thoại"
              value={phonenumber}
              onChange={(e) => setPhonenumber(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="login-btn">Đăng nhập</button>
        </form>

        <p className="register-link">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
