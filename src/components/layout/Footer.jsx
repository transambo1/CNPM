// src/components/layout/Footer.jsx
import React from "react";
import "./Footer.css";

export default function Footer() {
    return (
        <footer className="footer-container">
            <div className="footer-grid">
                <div>
                    <h3>MEOWCHICK VIETNAM</h3>
                    <p>📍 273 An Dương Vương, Quận 5, TP.HCM</p>
                    <p>📞 (028) 393 11 039</p>
                    <button className="map-btn">Xem bản đồ</button>
                </div>

                <div>
                    <h3>Thông Tin</h3>
                    <p>Về MeowChick</p>
                    <p>Bảo hiểm</p>
                    <p>Tin tức</p>
                    <p>Chi nhánh</p>
                </div>

                <div>
                    <h3>Nhận thông báo</h3>
                    <div className="subscribe">
                        <input type="email" placeholder="Email của bạn" />
                        <button>Gửi</button>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                © 2025 MeowChick — All rights reserved.
            </div>
        </footer>
    );
}
