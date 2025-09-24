// src/components/Checkout.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useState } from "react";

function Checkout({ cart }) {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const [storeName, setStoreName] = useState("FastFood Store");
    const [storeAddress, setStoreAddress] = useState("123 Đường ABC, Quận 1, TP.HCM");
    const [customerAddress, setCustomerAddress] = useState("45 Nguyễn Trãi, Quận 5, TP.HCM, Việt Nam");
    const [form, setForm] = useState({
        lastName: "",
        firstName: "",
        phone: "",
        email: "",
    });
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({
            ...form,
            [name]: value,
        });
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Dữ liệu form:", form);
        alert("Đơn hàng đã được xác nhận!");
    };
    return (
        <div className="checkout-page">

            {/* Nút quay lại */}
            <div className="checkout-header">
                <Link to="/Cart">
                    <button className="back-btn">⬅ Quay lại của tôi</button>
                </Link>
                <h2>🔒 THÔNG TIN ĐẶT HÀNG</h2>
            </div>

            <div className="checkout-container">
                {/* Cột trái: Thông tin giao hàng */}
                <div className="checkout-info">
                    <div className="info-block">
                        <h3>THỜI GIAN GIAO HÀNG:</h3>
                        <p>Giao ngay</p>
                    </div>

                    <div className="info-block">
                        <h3>ĐƯỢC GIAO TỪ:</h3>
                        <input
                            type="text"
                            value={storeName}
                            style={{ fontWeight: "bold" }}
                        />
                        <p>123 Kat kat </p>
                    </div>

                    <div className="info-block">
                        <h3>GIAO ĐẾN:</h3>
                        <input
                            type="text"
                            value={customerAddress}
                            onChange={(e) => setCustomerAddress(e.target.value)}
                            style={{ width: "100%", height: "30px" }}
                        />
                        <iframe
                            title="map"
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(customerAddress)}&z=15&output=embed`}
                            width="100%"
                            height="300"
                            style={{ border: 0, margin: "20px 0px" }}
                        ></iframe>
                    </div>

                    <div className="info-block">
                        <h2 className="text-xl font-bold mb-4">THÊM THÔNG TIN CHI TIẾT:</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block font-semibold">Họ của bạn*</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={form.lastName}
                                    onChange={handleChange}
                                    className="w-full border p-2 rounded mt-1"
                                    placeholder="Xin nhập họ của bạn"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold">Tên của bạn*</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={form.firstName}
                                    onChange={handleChange}
                                    className="w-full border p-2 rounded mt-1"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold">Số điện thoại*</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    className="w-full border p-2 rounded mt-1"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold">Địa chỉ email*</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    className="w-full border p-2 rounded mt-1"
                                    required
                                />
                            </div>
                            <div>
                                <h2 style={{ color: "black" }}>PHƯƠNG THỨC THANH TOÁN:</h2>

                                <label>
                                    <input type="radio" name="payment" value="cod" defaultChecked /> Thanh toán khi nhận hàng (COD)
                                </label>
                                <label>
                                    <input type="radio" name="payment" value="bank" /> Chuyển khoản ngân hàng
                                </label>

                                <button
                                    type="submit"
                                    className="btn-primary "
                                >
                                    Thanh toán khi nhận hàng
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Cột phải: Tóm tắt đơn hàng */}
                <aside className="checkout-summary">
                    <div className="summary-card">
                        <h3>TÓM TẮT ĐƠN HÀNG:</h3>
                        <ul>
                            {cart.map((item) => (
                                <li key={item.id}>
                                    <span>
                                        {item.quantity}x {item.name}
                                    </span>
                                    <span>
                                        {(item.price * item.quantity).toLocaleString()}₫
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <div className="line">
                            <span>Tổng đơn hàng</span>
                            <strong>{total.toLocaleString()}₫</strong>
                        </div>
                        <div className="line">
                            <span>Phí vận chuyển</span>
                            <strong>0₫</strong>
                        </div>
                        <div className="line total">
                            <span>Tổng thanh toán</span>
                            <strong>{total.toLocaleString()}₫</strong>
                        </div>

                        <button className="btn-primary">Xác nhận đặt hàng</button>
                    </div>
                </aside>
            </div>
        </div>
    );
}

export default Checkout;
