import React from "react";
import { Link } from "react-router-dom";
import './Footer.css';

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-column">
                    <div className="footer-brand">
                        <img src="/Images/Logo.png" alt="MEOWCHICK" />
                        <div>
                            <h3>MEOWCHICK VIETNAM</h3>
                            <p>Giao đồ ăn chuẩn Grab, nhanh và an tâm.</p>
                        </div>
                    </div>
                    <p>📍 273 An Dương Vương, Quận 5, TP. Hồ Chí Minh</p>
                    <p>📞 (028) 393 11 039</p>
                    <a
                        href="https://maps.google.com/maps?q=$"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="map-button"
                    >
                        Xem bản đồ
                    </a>
                </div>

                <div className="footer-column">
                    <h3 className="footer-title">Dịch vụ Grab</h3>
                    <Link to="/">GrabFood</Link>
                    <Link to="/restaurant">GrabKitchen</Link>
                    <Link to="/menu/All">Ưu đãi hôm nay</Link>
                    <Link to="/order-history">Đơn hàng của bạn</Link>
                </div>

                <div className="footer-column">
                    <h3 className="footer-title">Hỗ trợ</h3>
                    <a href="mailto:support@meowchick.vn">support@meowchick.vn</a>
                    <a href="tel:+8402839311039">Hotline: 028 393 11039</a>
                    <p className="footer-sub">Giờ hoạt động: 7h00 - 23h00</p>
                </div>

                <div className="footer-column">
                    <h3 className="footer-title">Nhận thông báo</h3>
                    <p className="footer-sub">Ưu đãi mới, món ngon lạ, thông báo đơn hàng.</p>
                    <div className="subscribe">
                        <input type="email" placeholder="Email của bạn" />
                        <button>Gửi</button>
                    </div>
                    <div className="footer-policy">
                        <span>Chính sách quy định</span>
                        <span>•</span>
                        <span>Chính sách bảo mật</span>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p>Copyright © 2025 MEOWCHICK x Grab style</p>
            </div>
        </footer>
    );
}

export default Footer;
