import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";
import { useAuth } from "../context/AuthContext"; // ✅ import context
import "./Register.css";

function Register() {
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phonenumber, setPhonenumber] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth(); // ✅ lấy setCurrentUser để tự login

  const handleRegister = async () => {
    setError("");

    // 1️⃣ Trim input
    const fName = firstname.trim();
    const lName = lastname.trim();
    const mail = email.trim();
    const pwd = password.trim();
    const phone = phonenumber.trim();
    const addr = address.trim();

    if (!fName || !lName || !mail || !pwd || !phone || !addr) {
      setError("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    try {
      // 2️⃣ Kiểm tra trùng số điện thoại
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("phonenumber", "==", phone));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setError("Số điện thoại này đã được đăng ký!");
        return;
      }

      // 3️⃣ Tạo user trong Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, mail, pwd);
      const user = userCredential.user;

      // 4️⃣ Lưu thông tin bổ sung vào Firestore
      const userData = {
        uid: user.uid,
        email: user.email,
        firstname: fName,
        lastname: lName,
        phonenumber: phone,
        address: addr,
        role: "customer",
        createdAt: new Date(),
      };

      await setDoc(doc(db, "users", user.uid), userData);

  

      alert("Đăng ký thành công!");
      navigate("/login"); // redirect về trang home, header sẽ hiển thị user
    } catch (err) {
      console.error("Firebase Register Error:", err);
      switch (err.code) {
        case "auth/email-already-in-use":
          setError("Địa chỉ email này đã được đăng ký.");
          break;
        case "auth/weak-password":
          setError("Mật khẩu phải có ít nhất 6 ký tự.");
          break;
        case "auth/invalid-email":
          setError("Địa chỉ email không hợp lệ.");
          break;
        default:
          setError("Đã có lỗi xảy ra trong quá trình đăng ký.");
          break;
      }
    }
  };

  return (
    <div className="register-container-simple">
      <h2>Đăng ký tài khoản</h2>

      <input type="text" placeholder="Họ" value={firstname} onChange={e => setFirstname(e.target.value)} />
      <input type="text" placeholder="Tên" value={lastname} onChange={e => setLastname(e.target.value)} />
      <input type="email" placeholder="Email (*)" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="text" placeholder="Số điện thoại" value={phonenumber} onChange={e => setPhonenumber(e.target.value)} />
      <input type="password" placeholder="Mật khẩu (*)" value={password} onChange={e => setPassword(e.target.value)} />
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
