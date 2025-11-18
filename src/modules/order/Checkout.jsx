import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

function Checkout({ cart, currentUser, setCart }) {
    const navigate = useNavigate();

    const [checkoutCart, setCheckoutCart] = useState(cart || []);

    useEffect(() => {
        if (!checkoutCart || checkoutCart.length === 0) {
            const tempCart = JSON.parse(localStorage.getItem("checkoutCart")) || [];
            // Chuyển claim sang number nếu cần
            const parsedCart = tempCart.map(item => ({
                ...item,
                claim: Number(item.claim) || 0
            }));
            setCheckoutCart(parsedCart);
        }
    }, [checkoutCart]);

    const total = checkoutCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalClaim = checkoutCart.reduce((sum, item) => sum + (item.claim || 0), 0);

    const [storeName] = useState("Bảo hiểm Tương Nai");
    const [storeAddress] = useState("123 Đường ABC, Quận 1, TP.HCM");
    const [customerAddress, setCustomerAddress] = useState("45 Nguyễn Trãi, Quận 5, TP.HCM, Việt Nam");
    const [form, setForm] = useState({ lastName: "", firstName: "", phone: "", email: "" });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    };

    const handleCheckout = async () => {
        if (!currentUser) {
            alert("Bạn cần đăng nhập để thanh toán!");
            navigate("/login");
            return;
        }

        if (!checkoutCart || checkoutCart.length === 0) {
            alert("Không có sản phẩm để thanh toán!");
            return;
        }

        // Chuyển claim sang number lần nữa trước khi gửi
        const updatedItems = checkoutCart.map(item => ({
            ...item,
            claim: Number(item.claim) || 0
        }));

        const newOrder = {
            userId: currentUser.id,
            customer: {
                name: `${form.lastName} ${form.firstName}`,
                phone: form.phone,
                email: form.email,
                address: customerAddress,
            },
            items: updatedItems,
            total: total,
            totalClaim: totalClaim, // tổng claim của toàn bộ đơn hàng
            status: "Đang xử lý",
            date: new Date().toISOString().split("T")[0]
        };

        try {
            await fetch("http://localhost:5005/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newOrder)
            });

            alert("Đặt đơn hàng thành công!");

            setCart([]);
            localStorage.removeItem(`cart_${currentUser.username}`);
            localStorage.removeItem("checkoutCart");

            navigate("/order-history");
        } catch (error) {
            console.error("Lỗi khi lưu order:", error);
            alert("Có lỗi xảy ra khi đặt hàng!");
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        handleCheckout();
    };

    return (
        <div className="checkout-page">
            <div className="checkout-header">
                <Link to="/">
                    <button className="back-btn">⬅ Quay lại</button>
                </Link>
                <h2>🔒 THÔNG TIN ĐẶT HÀNG</h2>
            </div>

            <div className="checkout-container">
                {/* Thông tin giao hàng */}
                <div className="checkout-info">
                    <div className="info-block">
                        <h3>Bên A:</h3>
                        <input type="text" value={storeName} readOnly style={{ fontWeight: "bold" }} />
                        <p>{storeAddress}</p>
                    </div>

                    <div className="info-block">
                        <h2 className="text-xl font-bold mb-4">THÔNG TIN KHÁCH HÀNG:</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label>Họ*</label>
                                <input type="text" name="lastName" value={form.lastName} onChange={handleChange} required />
                            </div>
                            <div>
                                <label>Tên*</label>
                                <input type="text" name="firstName" value={form.firstName} onChange={handleChange} required />
                            </div>
                            <div>
                                <label>Điện thoại*</label>
                                <input type="tel" name="phone" value={form.phone} onChange={handleChange} required />
                            </div>
                            <div>
                                <label>Email*</label>
                                <input type="email" name="email" value={form.email} onChange={handleChange} required />
                            </div>
                            <div className="info-block">
                                <h3>Địa chỉ cư trú hiện tại:</h3>
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

                            <div>
                                <h3>Phương thức thanh toán:</h3>
                                <label>
                                    <input type="radio" name="payment" value="cod" defaultChecked /> Thanh toán trực tiếp
                                </label>
                                <label>
                                    <input type="radio" name="payment" value="bank" /> Chuyển khoản ngân hàng
                                </label>


                            </div>
                        </form>
                    </div>
                </div>

                {/* Tóm tắt đơn hàng */}
                <aside className="checkout-summary">
                    <div className="summary-card">
                        <h3>TÓM TẮT BẢO HIỂM:</h3>
                        <ul>
                            {checkoutCart.map(item => (
                                <li key={item.id}>
                                    <span>{item.name}</span>

                                    <span>{(item.price * item.quantity).toLocaleString()}₫</span>
                                </li>
                            ))}
                        </ul>

                        <div className="line">
                            <span>Tổng tiền</span>
                            <strong>{total.toLocaleString()}₫</strong>
                        </div>
                        <button onClick={handleCheckout} className="btn-primary">Thanh toán khi nhận hàng</button>
                    </div>
                </aside>
            </div>
        </div>
    );
}

export default Checkout;
