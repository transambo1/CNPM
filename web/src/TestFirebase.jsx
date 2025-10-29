
import { useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

function TestFirebase() {
  useEffect(() => {
    async function checkFirestore() {
      try {
        const snapshot = await getDocs(collection(db, "restaurants"));
        console.log("🔥 Firestore connected! Found", snapshot.size, "orders");
      } catch (err) {
        console.error("❌ Firestore error:", err);
      }
    }
    checkFirestore();
  }, []);

  return <p>Kiểm tra kết nối Firebase trên console...</p>;
}

export default TestFirebase;
