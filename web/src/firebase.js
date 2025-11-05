// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence 
} from "firebase/auth";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyB8A18L-TC1L-d85dN0Ge2LZ1Hcx_h6h2w",
  authDomain: "cnpm-6896a.firebaseapp.com",
  projectId: "cnpm-6896a",
  storageBucket: "cnpm-6896a.appspot.com",
  messagingSenderId: "116295716489",
  appId: "1:116295716489:web:80d51992691c2b17c18058",
  measurementId: "G-L7CFX3S5DJ" 
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firestore
export const db = getFirestore(app);

// ✅ Authentication với Local Persistence (Web sẽ không mất user khi F5)
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

export default app;
