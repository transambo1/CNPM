// src/components/OrderHistory.jsx
import React, { useEffect, useState } from "react";
// 1. Import các hàm Firestore cần thiết và instance 'db'
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"; 
import { db } from '../firebase'; // Đảm bảo đường dẫn này đúng
// 2. Import hook useAuth để lấy thông tin user hiện tại
import { useAuth } from "../context/AuthContext"; 
import './OrderHistory.css'; // Import CSS

function OrderHistory() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true); // State theo dõi tải dữ liệu
    // 3. Lấy currentUser từ context, không cần đọc từ localStorage nữa
    const { currentUser } = useAuth(); 

    useEffect(() => {
        const fetchOrders = async () => {
            // 4. Chỉ fetch khi currentUser đã được xác định và có uid
            if (currentUser && currentUser.uid) { 
                setLoading(true); // Bắt đầu tải
                try {
                    // 5. Tham chiếu đến collection "orders"
                    const ordersCollectionRef = collection(db, "orders");
                    
                    // 6. Tạo query: lấy orders có userId bằng currentUser.uid, sắp xếp theo ngày tạo (createdAt) mới nhất
                    const q = query(
                        ordersCollectionRef, 
                        where("userId", "==", currentUser.uid), // Lọc theo ID người dùng
                        orderBy("createdAt", "desc") // Sắp xếp mới nhất lên đầu (cần có field createdAt là Timestamp)
                    );
                    
                    // 7. Thực thi query
                    const querySnapshot = await getDocs(q);
                    
                    // 8. Xử lý kết quả, chuyển đổi timestamp sang Date object
                    const userOrders = querySnapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id, // Lấy ID của document
                            ...data,    // Lấy tất cả các field khác
                            // Chuyển đổi Firestore Timestamp thành Javascript Date object nếu tồn tại
                            date: data.createdAt?.toDate() 
                        };
                    });
                    setOrders(userOrders);
                } catch (err) {
                    console.error("Lỗi khi fetch lịch sử đơn hàng từ Firestore:", err);
                    setOrders([]); // Set mảng rỗng nếu có lỗi
                } finally {
                    setLoading(false); // Kết thúc tải
                }
            } else {
                // Nếu chưa đăng nhập, không fetch và set loading = false
                setLoading(false); 
                setOrders([]);
            }
        };

        fetchOrders();
    }, [currentUser]); // Chạy lại useEffect khi currentUser thay đổi (đăng nhập/đăng xuất)

    // Hiển thị loading
    if (loading) {
        return <p className="loading-message">Đang tải lịch sử đơn hàng...</p>;
    }

    // JSX return (đã cập nhật cách hiển thị date và rút gọn ID)
    return (
        <div className="order-history-page">
            <h2>Lịch sử đơn hàng</h2>

            {orders.length === 0 ? (
                <p className="no-orders-message">Bạn chưa có đơn hàng nào.</p>
            ) : (
                <ul className="orders-list">
                    {orders.map((order) => (
                        <li key={order.id} className="order-card">
                            <div className="order-header">
                                {/* Rút gọn ID cho dễ nhìn */}
                                <h3>Đơn hàng #{order.id.substring(0, 6)}...</h3> 
                                {/* 9. Hiển thị ngày tháng từ Date object */}
                                <span>{order.date ? order.date.toLocaleDateString('vi-VN') : 'N/A'}</span> 
                            </div>

                            <div className="order-body">
                                <ul className="order-items-list">
                                    {order.items && order.items.map((item, index) => (
                                        <li key={`${order.id}-${item.id}-${index}`} className="order-item"> {/* Key unique hơn */}
                                            <span>{item.quantity}x {item.name}</span>
                                            <span>{(item.price * item.quantity).toLocaleString()}₫</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="order-footer">
                                <div className="order-total">
                                    <strong>Tổng tiền: {order.total.toLocaleString()}₫</strong>
                                </div>
                                <div className="order-status">
                                    Trạng thái:{" "}
                                    <span className={`status-tag ${order.status?.replace(/\s+/g, '-')
                                        .toLowerCase()}`}>
                                        {order.status || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default OrderHistory;