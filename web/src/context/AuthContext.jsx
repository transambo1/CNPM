import React, { createContext, useContext, useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { message } from "antd";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      console.log("🟡 [Auth] Bắt đầu kiểm tra user...");
      try {
        const stored = JSON.parse(localStorage.getItem("currentUser"));
        if (stored && stored.uid) {
          // ✅ Hiển thị tạm user local để tránh flicker
          setCurrentUser(stored);

          console.log("📦 [Auth] Có user trong local:", stored.email || stored.phoneNumber);

          const snap = await getDoc(doc(db, "users", stored.uid));
          if (snap.exists()) {
            const dbUser = snap.data();
            console.log("🔥 [Auth] Lấy user từ Firestore:", dbUser.role);
            if (dbUser.status === "banned") {
              message.error("🚫 Tài khoản bị chặn!");
              localStorage.removeItem("currentUser");
              setCurrentUser(null);
              setTimeout(() => (window.location.href = "/login"), 2000);
              return;
            }
            setCurrentUser({ ...stored, ...dbUser });
          } else {
            console.warn("⚠️ [Auth] Không tìm thấy user trong Firestore, giữ local user.");
            setCurrentUser(stored);
          }
        } else {
          console.log("⚪ [Auth] Không có user trong localStorage.");
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("🔥 [Auth] Lỗi kiểm tra user:", err);
      } finally {
        console.log("🟢 [Auth] Hoàn tất khởi tạo AuthContext");
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const logout = () => {
    console.log("🚪 [Auth] Đăng xuất");
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, logout, loading }}>
      {loading ? <p>⏳ Đang xác thực người dùng...</p> : children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
