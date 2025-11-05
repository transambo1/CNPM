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
          const snap = await getDoc(doc(db, "users", user.uid));
          const dbUser = snap.exists() ? snap.data() : {};

          const formattedUser = {
            uid: user.uid,
            email: user.email,
            ...dbUser,
          };

          setCurrentUser(formattedUser);

          // ✅ Chỉ save khi có user
          localStorage.setItem("currentUser", JSON.stringify(formattedUser));
        } catch (err) {
          console.error("🔥 Error fetching user data:", err);
        }
      }

      // ❌ Không remove localStorage khi user null — tránh mất user khi F5
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    localStorage.removeItem("currentUser"); // ✔ chỉ xóa khi thật sự logout
  };

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
