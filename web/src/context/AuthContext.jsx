// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem("currentUser")) || null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("🔥 Firebase Auth State:", user);

      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const snap = await getDoc(userRef);

          let dbUser = {};
          if (snap.exists()) {
            dbUser = snap.data();
          } else {
            console.warn("⚠️ Không tìm thấy user trong Firestore, dùng default role");
          }

          // ✅ Gộp dữ liệu Firebase Auth + Firestore
          const formattedUser = {
            uid: user.uid,
            email: user.email,
            name: dbUser.name || user.displayName || "Người dùng",
            role: dbUser.role || "customer", // 🔥 Mặc định customer
            restaurantId: dbUser.restaurantId || null, // 🔥 Nếu là nhà hàng
            phone: dbUser.phone || dbUser.phonenumber || "",
            ...dbUser, // merge thêm nếu có extra fields
          };

          setCurrentUser(formattedUser);
          localStorage.setItem("currentUser", JSON.stringify(formattedUser));
        } catch (err) {
          console.error("🔥 Error fetching user data:", err);
        }

        setLoading(false);
        return;
      }

      // ❗ Khi user = null (logout hoặc reload)
      const stored = localStorage.getItem("currentUser");

      if (stored) {
        console.warn("⚠️ Firebase auth null — dùng dữ liệu localStorage");
        setCurrentUser(JSON.parse(stored));
      } else {
        setCurrentUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("⚠️ signOut error (ignored):", e);
    }
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
  };

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
