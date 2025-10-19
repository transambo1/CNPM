import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Register.css";

function Register() {
    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [password, setPassword] = useState("");
    const [phonenumber, setPhonenumber] = useState("");
    const [address, setAddress] = useState("");

    const navigate = useNavigate();
    const [showRegister, setShowRegister] = useState(true);

    const handleRegister = async () => {
        if (!firstname || !lastname || !password || !phonenumber || !address) {
            alert("Vui lòng nhập đầy đủ thông tin!");
            return;
        }

        try {
            // Kiểm tra số điện thoại đã tồn tại chưa (đảm bảo so sánh chuỗi)
            const resCheck = await fetch(`http://localhost:5002/users?phonenumber=${encodeURIComponent(phonenumber)}`);
            const dataCheck = await resCheck.json();

            if (dataCheck.some(u => String(u.phonenumber) === String(phonenumber))) {
                alert("Số điện thoại này đã được đăng ký!");
                return;
            }

            // Gửi request tạo user mới
            const res = await fetch("http://localhost:5002/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstname,
                    lastname,
                    password,
                    phonenumber,
                    address,
                    role: "customer",
                }),
            });

            if (res.ok) {
                alert("Đăng ký thành công!");
                navigate("/login");
            } else {
                alert("Đã xảy ra lỗi khi đăng ký!");
            }
        } catch (err) {
            console.error("Lỗi đăng ký:", err);
            alert("Lỗi kết nối server!");
        }
    };


    return (
        <div className="register-container-simple">
            <h2>Đăng ký tài khoản</h2>

            <input
                type="text"
                placeholder="Họ"
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
            />
            <input
                type="text"
                placeholder="Tên"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
            />
            <input
                type="text"
                placeholder="Số điện thoại"
                value={phonenumber}
                onChange={(e) => setPhonenumber(e.target.value)}
            />
            <input
                type="password"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <input
                type="text"
                placeholder="Địa chỉ"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
            />

            <button onClick={handleRegister}>Đăng ký</button>

            <p>
                Đã có tài khoản?{" "}
                <span>
                    <Link to="/login" style={{ textDecoration: "none", color: "#d2191a" }}>
                        Đăng nhập
                    </Link>
                </span>
            </p>
        </div>
    );
}

export default Register;
