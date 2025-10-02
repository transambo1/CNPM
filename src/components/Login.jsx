// src/components/Login.jsx
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";

function Login({ setCurrentUser }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
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

    const handleLogin = async () => {
        if (!username || !password) {
            alert("Vui lòng nhập đầy đủ thông tin");
            return;
        }

        const res = await fetch(
            `http://localhost:5002/users?username=${username}&password=${password}`
        );
        const data = await res.json();

        if (data.length === 0) {
            alert("Sai username hoặc password");
            return;
        }

        const user = data[0];

        // --- Merge cart logic ---
        const guestCartRaw = localStorage.getItem("my_cart");
        const guestCart = guestCartRaw ? JSON.parse(guestCartRaw) : [];

        const userKey = `cart_${user.username}`;
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

        alert("Đăng nhập thành công!");

        // Lấy đường dẫn trước đó (nếu có), ví dụ "/cart" hoặc "/checkout"
        const redirectTo = location.state?.from || "/";
        navigate(redirectTo);
    };

    return (
        <div>
            <h2>Đăng nhập</h2>
            <input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
            <br />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <br />
            <button onClick={handleLogin}>Đăng nhập</button>
            <p>
                Chưa có tài khoản?{" "}
                <Link to="/register" style={{ color: "blue" }}>
                    Đăng kí
                </Link>
            </p>
        </div>
    );
}

export default Login;
