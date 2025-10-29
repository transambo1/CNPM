// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // 🔹 Lấy dữ liệu user từ Firestore
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          const userData = userSnap.exists() ? userSnap.data() : {};

          setCurrentUser({
            uid: user.uid,
            email: user.email,
            role: userData.role || "customer",
            firstname: userData.firstname || "",
            lastname: userData.lastname || "",
            ...userData,
          });
        } catch (err) {
          console.error("🔥 Error fetching user data:", err);
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            role: "custiomer",
          });
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 🔹 Logout
  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
  };

  // 🔹 Lưu currentUser vào localStorage để reload trang vẫn nhớ
 useEffect(() => {
  const storedUser = localStorage.getItem("currentUser");
  if (storedUser && !currentUser) {
    setCurrentUser(JSON.parse(storedUser));
  }
}, []);

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
