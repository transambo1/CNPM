// src/components/Checkout.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Checkout.css";

export default function Checkout({ cart, currentUser, setCart }) {
    const navigate = useNavigate();
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const restaurantName = cart.length > 0 ? cart[0].restaurantName : "Chưa chọn nhà hàng";
    const restaurantId = cart.length > 0 ? cart[0].restaurantId : null;

    const [form, setForm] = useState({
        lastName: "",
        firstName: "",
        phone: "",
        email: "",
        address: ""
    });

    useEffect(() => {
        if (currentUser) {
            const savedUser = JSON.parse(localStorage.getItem("currentUser")) || {};
            setForm({
                lastName: currentUser.lastname || savedUser.lastname || "",
                firstName: currentUser.firstname || savedUser.firstname || "",
                phone: currentUser.phonenumber || savedUser.phonenumber || "",
                email: currentUser.email || savedUser.email || "",
                address: currentUser.address || savedUser.address || "45 Nguyễn Trãi, Quận 5, TP.HCM"
            });
        }
    }, [currentUser]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    };

    // Hàm tạo ID 4 chữ số, không trùng với các order hiện tại
    const generateOrderId = async () => {
        const res = await fetch("http://localhost:5002/orders");
        const orders = await res.json();
        let id;
        do {
            id = Math.floor(1000 + Math.random() * 9000); // 4 chữ số ngẫu nhiên
        } while (orders.some(order => Number(order.id) === id));
        return id;
    };

    const handleCheckout = async () => {
        if (!currentUser) {
            alert("⚠️ Bạn cần đăng nhập để thanh toán!");
            navigate("/login");
            return;
        }

        if (cart.length === 0) {
            alert("🛒 Giỏ hàng của bạn đang trống!");
            navigate("/cart");
            return;
        }

        try {
            const newOrderId = await generateOrderId();
            const newOrder = {
                id: newOrderId,
                userId: currentUser.id,
                restaurantId,
                restaurantName,
                customer: {
                    name: `${form.lastName} ${form.firstName}`.trim(),
                    phone: form.phone,
                    email: form.email,
                    address: form.address
                },
                items: cart,
                total,
                status: "Đang xử lý",
                date: new Date().toLocaleString(),
                droneId: drone.id = 1
            };

            // Gửi đơn lên server
            await fetch("http://localhost:5002/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newOrder)
            });

            // Đảm bảo dữ liệu đã lưu trước khi navigate
            setCart([]);
            localStorage.removeItem(`cart_${currentUser.username}`);
            navigate(`/waiting/${newOrder.id}`);
            alert(`✅ Đặt đơn hàng thành công!\nNhà hàng: ${restaurantName}`);
        } catch (error) {
            console.error("❌ Lỗi khi lưu order:", error);
            alert("Có lỗi xảy ra khi đặt hàng, vui lòng thử lại!");
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        handleCheckout();
    };

    return (
        <div className="checkout-page">
            <div className="checkout-header">
                <Link to="/cart">
                    <button className="back-btn">⬅ Quay lại giỏ hàng</button>
                </Link>
                <h2>🔒 THÔNG TIN ĐẶT HÀNG</h2>
            </div>

            <div className="checkout-container">
                {/* --- Cột trái --- */}
                <div className="checkout-info">
                    <div className="info-block">
                        <h3>ĐƯỢC GIAO TỪ:</h3>
                        <p className="store-name">{restaurantName}</p>
                        <p className="store-address">123 Đường ABC, Quận 1, TP.HCM</p>
                    </div>

                    <div className="info-block">
                        <h3>GIAO ĐẾN:</h3>
                        <input
                            type="text"
                            name="address"
                            value={form.address}
                            onChange={handleChange}
                            placeholder="Nhập địa chỉ giao hàng..."
                            className="address-input"
                        />
                        <iframe
                            title="map"
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(form.address)}&z=15&output=embed`}
                            width="100%"
                            height="300"
                            style={{ border: 0, margin: "20px 0px", borderRadius: "10px" }}
                        ></iframe>
                    </div>

                    <div className="info-block">
                        <h2>THÔNG TIN KHÁCH HÀNG:</h2>
                        <form onSubmit={handleSubmit}>
                            <div>
                                <label>Họ</label>
                                <input type="text" name="lastName" value={form.lastName} onChange={handleChange} />
                            </div>
                            <div>
                                <label>Tên</label>
                                <input type="text" name="firstName" value={form.firstName} onChange={handleChange} required />
                            </div>
                            <div>
                                <label>Số điện thoại</label>
                                <input type="tel" name="phone" value={form.phone} onChange={handleChange} required />
                            </div>
                            <div>
                                <label>Email</label>
                                <input type="email" name="email" value={form.email} onChange={handleChange} required />
                            </div>

                            <div className="payment-section">
                                <h2>PHƯƠNG THỨC THANH TOÁN:</h2>
                                <label>
                                    <input type="radio" name="payment" value="cod" defaultChecked /> Thanh toán khi nhận hàng (COD)
                                </label>
                                <label>
                                    <input type="radio" name="payment" value="bank" /> Chuyển khoản ngân hàng
                                </label>
                                <button type="submit" className="btn-primary">
                                    Xác nhận đặt hàng
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* --- Cột phải --- */}
                <aside className="checkout-summary">
                    <div className="summary-card">
                        <h3>TÓM TẮT ĐƠN HÀNG:</h3>
                        <ul>
                            {cart.map((item) => (
                                <li key={item.id}>
                                    <span>{item.quantity} x {item.name}</span>
                                    <span>{(item.price * item.quantity).toLocaleString()}₫</span>
                                </li>
                            ))}
                        </ul>
                        <div className="line">
                            <span>Tổng đơn hàng</span>
                            <strong>{total.toLocaleString()}₫</strong>
                        </div>
                        <div className="line total">
                            <span>Tổng thanh toán</span>
                            <strong>{total.toLocaleString()}₫</strong>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
