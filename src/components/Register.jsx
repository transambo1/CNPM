import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Register() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const [showRegister, setShowRegister] = useState(true);
    const handleRegister = async () => {
        if (!username || !password) {
            alert("Vui lòng nhập đầy đủ thông tin");
            return;
        }

        // Kiểm tra username đã tồn tại chưa
        const resCheck = await fetch(`http://localhost:5002/users?username=${username}`);
        const dataCheck = await resCheck.json();
        if (dataCheck.length > 0) {
            alert("Username đã tồn tại");
            return;
        }

        // Tạo user mới
        const res = await fetch(`http://localhost:5002/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, role: "customer" })
        });
        const data = await res.json();
        alert("Đăng ký thành công!");
        setShowRegister(false);
        navigate("/Login");
    };

    return (
        <div>
            <h2>Đăng ký</h2>
            <input
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
            />
            <br />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
            />
            <br />
            <button onClick={handleRegister}>Đăng ký</button>
            <p>
                Đã có tài khoản?{" "}
                <span
                    style={{ color: "blue", cursor: "pointer" }}
                    onClick={() => setShowRegister(false)}
                >
                    Đăng nhập
                </span>
            </p>
        </div>
    );
}

export default Register;
