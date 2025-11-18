import React from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import Banner from "../../components/layout/Banner";

export default function Home() {
    const navigate = useNavigate();

    const bannerImages = [
        "/Images/nhantho1.jpg",
        "/Images/nhantho.jpg",
        "/Images/image.png"
    ];

    const categories = [
        {
            name: "Bảo hiểm Cá nhân",
            img: "/Images/Logo.png",
            desc: "Giải pháp bảo vệ toàn diện cho bạn và gia đình."
        },
        {
            name: "Bảo hiểm Y tế",
            img: "/Images/Logo.png",
            desc: "Đảm bảo chi phí khám chữa bệnh khi rủi ro xảy ra."
        },
        {
            name: "Bảo hiểm Sức khỏe",
            img: "/Images/Logo.png",
            desc: "Giúp bạn an tâm chăm sóc sức khỏe dài lâu."
        },
        {
            name: "Bảo hiểm Công ty",
            img: "/Images/Logo.png",
            desc: "Bảo vệ nhân viên và tài sản doanh nghiệp."
        },
    ];

    return (
        <div className="home-container">

            {/* Banner slider */}
            <Banner images={bannerImages} />

            {/* Category section */}
            <section className="category-section">
                <h2 className="section-title">Danh mục bảo hiểm phổ biến</h2>

                <div className="category-grid">
                    {categories.map((category) => (
                        <div
                            key={category.name}
                            className="category-card shadow-soft"
                        >
                            <img src={category.img} alt={category.name} className="category-img" />

                            <div className="card-content">
                                <h3>{category.name}</h3>
                                <p>{category.desc}</p>

                                <button
                                    className="btn-detail"
                                    onClick={() =>
                                        navigate(
                                            `/menu/${encodeURIComponent(category.name)}`
                                        )}
                                >
                                    Xem chi tiết
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Why choose us */}
            <section className="why-choose">
                <h2>Vì sao chọn Bảo Hiểm An Tâm?</h2>
                <p>
                    Chúng tôi hợp tác cùng các công ty bảo hiểm uy tín, cung cấp sản phẩm minh bạch,
                    rõ ràng và đáng tin cậy. Hãy lựa chọn An Tâm để bảo vệ bạn và gia đình theo cách tốt nhất.
                </p>
            </section>
        </div>
    );
}
