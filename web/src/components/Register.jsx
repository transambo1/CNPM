import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { db } from "../firebase";
import { doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import "./Register.css";

function Register() {
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [password, setPassword] = useState("");
  const [phonenumber, setPhonenumber] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();

  const handleRegister = async () => {
    setError("");

    const fName = firstname.trim();
    const lName = lastname.trim();
    const pwd = password.trim();
    const phone = phonenumber.trim();
    const addr = address.trim();

    if (!fName || !lName || !pwd || !phone || !addr) {
      setError("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    try {
      // 1️⃣ Kiểm tra trùng số điện thoại
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("phonenumber", "==", phone));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setError("Số điện thoại này đã được đăng ký!");
        return;
      }

      // 2️⃣ Tạo ID ngẫu nhiên (thay vì UID Firebase)
      const userId = Math.random().toString(36).substring(2, 10);

      // 3️⃣ Lưu user vào Firestore
      const userData = {
        id: userId,
        firstname: fName,
        lastname: lName,
        phonenumber: phone,
        password: pwd, // 🔥 tự lưu mật khẩu (nếu muốn có thể hash sau)
        address: addr,
        role: "customer",
        status: "active",
        createdAt: new Date(),
      };

      await setDoc(doc(db, "users", userId), userData);

      alert("🎉 Đăng ký thành công!");
      navigate("/login");
    } catch (err) {
      console.error("Register Error:", err);
      setError("❌ Đã có lỗi xảy ra khi đăng ký.");
    }
  };

  return (
    <div className="register-container-simple">
      <h2>Đăng ký tài khoản</h2>

      <input type="text" placeholder="Họ" value={firstname} onChange={e => setFirstname(e.target.value)} />
      <input type="text" placeholder="Tên" value={lastname} onChange={e => setLastname(e.target.value)} />
      <input type="text" placeholder="Số điện thoại" value={phonenumber} onChange={e => setPhonenumber(e.target.value)} />
      <input type="password" placeholder="Mật khẩu" value={password} onChange={e => setPassword(e.target.value)} />
      <input type="text" placeholder="Địa chỉ" value={address} onChange={e => setAddress(e.target.value)} />

      {error && <p className="error-message">{error}</p>}

      <button onClick={handleRegister}>Đăng ký</button>

      <p>
        Đã có tài khoản?{" "}
        <Link to="/login" style={{ textDecoration: "none", color: "#d2191a" }}>
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}

export default Register;
