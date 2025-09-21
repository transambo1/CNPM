// src/components/Header.jsx
import React from "react";

function Footer({ cartCount, onToggleCart, showCart }) {
    return (
        <>
            <footer className="footer">
                <div className="footer-container">

                    <div className="footer-column1">
                        <h3 className="footer-title">TEXAS CHICKEN VIETNAM</h3>
                        <p>📍 202 Lý Chính Thắng, Phường 09, Quận 3, TP. Hồ Chí Minh</p>
                        <p>📞 (028) 393 11 039</p>
                        <p>📧 info.texaschicken@fb.mesa.vn</p>
                        <p>🌐 www.texaschickenvn.com</p>
                        <button className="map-button">Xem bản đồ</button>
                    </div>


                    <div className="footer-column2">
                        <h3 className="footer-title">Thông Tin</h3>
                        <p>Về Texas Chicken</p>
                        <p>Thực đơn</p>
                        <p>Tin tức</p>
                        <p>Nhà hàng</p>
                    </div>


                    <div className="footer-column3">
                        <h3 className="footer-title">Kết Nối Với Texas Chicken</h3>
                        <div className="social-icons">
                            <span>📘</span>
                            <span>▶️</span>
                            <span>📷</span>
                        </div>
                        <h3 className="footer-title">Đăng ký nhận thông tin ưu đãi</h3>
                        <div className="subscribe">
                            <input type="email" placeholder="Email của bạn" />
                            <button>Gửi</button>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>Chính sách quy định | Chính sách bảo mật | Copyright © 2025 Fast Food Vietnam</p>
                </div>
            </footer >
        </>
    );
}

export default Footer;
