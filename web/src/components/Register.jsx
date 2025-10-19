import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import './Register.css';

function Register() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [phonenumber, setPhonenumber] = useState("");
    const [address, setAddress] = useState("");

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
            body: JSON.stringify({ username, password, phonenumber, address, role: "customer" })
        });
        const data = await res.json();
        alert("Đăng ký thành công!");
        setShowRegister(false);
        navigate("/Login");
    };

    return (
        <div className="register-container-simple">
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
            <input
                placeholder="Số điện thoại"
                value={phonenumber}
                onChange={e => setPhonenumber(e.target.value)}
            />
            <br />
            <input

                placeholder="Địa chỉ của bạn"
                value={address}
                onChange={e => setAddress(e.target.value)}
            />
            <button onClick={handleRegister}>Đăng ký</button>
            <p>
                Đã có tài khoản?{" "}
                <span
                    style={{ color: "blue", cursor: "pointer" }}
                    onClick={() => setShowRegister(false)}
                >
                    <Link to="/login">Đăng nhập </Link>
                </span>
            </p>
        </div>
    );
}

export default Register;
