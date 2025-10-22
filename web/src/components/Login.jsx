// src/components/Login.jsx
import React, { useState, } from "react";
import { useNavigate, useLocation, Link, } from "react-router-dom";

import './Login.css';

function Login({ setCurrentUser }) {
    const [phonenumber, setPhonenumber] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const location = useLocation(); // để lấy state.from

    // Hàm gộp giỏ hàng guest + user
    const mergeCarts = (userCart, guestCart) => {
        const merged = [...userCart];
        guestCart.forEach((item) => {
            const existing = merged.find((i) => i.id === item.id);
            if (existing) {
                existing.quantity += item.quantity; // cộng dồn số lượng
            } else {
                merged.push(item);
            }
        });
        return merged;
    };

    const handleLogin = async (e) => {
        e.preventDefault(); // Ngăn form reload
        setError(""); // Reset lỗi
        if (!phonenumber || !password) {
            alert("Vui lòng nhập đầy đủ thông tin");
            return;
        }

        try {
            // ✅ Kiểm tra user theo số điện thoại và mật khẩu
            const res = await fetch(`http://localhost:5002/users?phonenumber=${encodeURIComponent(phonenumber)}&password=${encodeURIComponent(password)}`);
            const data = await res.json();

            if (data.length === 0) {
                setError("Sai số điện thoại hoặc mật khẩu.");
                return;
            }

            const user = data[0];

            // --- Merge cart logic ---
            const guestCartRaw = localStorage.getItem("my_cart");
            const guestCart = guestCartRaw ? JSON.parse(guestCartRaw) : [];

            const userKey = `cart_${user.phonenumber}`;
            const userCartRaw = localStorage.getItem(userKey);
            const userCart = userCartRaw ? JSON.parse(userCartRaw) : [];

            const mergedCart = mergeCarts(userCart, guestCart);

            // Lưu lại giỏ mới cho user
            localStorage.setItem(userKey, JSON.stringify(mergedCart));
            // Xóa giỏ guest
            localStorage.removeItem("my_cart");

            // --- Lưu user hiện tại ---
            setCurrentUser(user);
            localStorage.setItem("currentUser", JSON.stringify(user));

            const redirectTo = location.state?.from || "/";
            navigate(redirectTo);
        } catch (err) {
            setError("Đã có lỗi xảy ra. Vui lòng thử lại.");
            console.error(err);
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
