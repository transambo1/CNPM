// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Import Firestore nếu bạn dùng Database
import { getAuth } from "firebase/auth";       // Import Auth nếu bạn dùng Đăng nhập/Đăng ký

// DÁN MÃ CẤU HÌNH BẠN ĐÃ COPY TỪ FIREBASE CONSOLE VÀO ĐÂY
const firebaseConfig = {
  apiKey: "AIzaSyB8A18L-TC1L-d85dN0Ge2LZ1Hcx_h6h2w", // Ví dụ key của bạn
  authDomain: "cnpm-6896a.firebaseapp.com",
  projectId: "cnpm-6896a",
  storageBucket: "cnpm-6896a.appspot.com",
  messagingSenderId: "116295716489",
  appId: "1:116295716489:web:80d51992691c2b17c18058",
  measurementId: "G-L7CFX3S5DJ" 
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export các instance để sử dụng trong các component khác
export const db = getFirestore(app); // Để dùng Firestore Database
export const auth = getAuth(app);    // Để dùng Firebase Authentication (Đăng nhập/ký)