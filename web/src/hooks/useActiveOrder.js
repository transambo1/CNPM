import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function useActiveOrder() {
  const { currentUser } = useAuth();
  const [activeOrder, setActiveOrder] = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) return;

    // Các trạng thái còn đang diễn ra
    const activeStatuses = ["Chờ xác nhận", "Đang giao"];

    const q = query(
      collection(db, "orders"),
      where("userId", "==", currentUser.uid),
      where("status", "in", activeStatuses)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const order = snapshot.docs[0];
        setActiveOrder({ id: order.id, ...order.data() });
      } else {
        setActiveOrder(null);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  return activeOrder;
}
