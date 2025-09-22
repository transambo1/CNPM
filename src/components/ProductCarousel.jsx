import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import Product from "./Product";
// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

export default function ProductCarousel() {

    const [products, setProducts] = useState([]);

    // Gọi API lấy dữ liệu sản phẩm
    useEffect(() => {
        fetch("http://localhost:5002/products") // 👉 đổi URL API thật của bạn
            .then((res) => res.json())
            .then((data) => setProducts(data))
            .catch((err) => console.error("Lỗi khi load sản phẩm:", err));
    }, []);

    return (
        <div className="w-[90%] mx-auto py-6">
            <Swiper
                modules={[Navigation, Pagination]}
                spaceBetween={20}
                navigation
                pagination={{ clickable: true }}
                breakpoints={{
                    320: { slidesPerView: 1 },   // mobile: 1 sp
                    640: { slidesPerView: 2 },   // tablet: 2 sp
                    1024: { slidesPerView: 3 },  // desktop: 3 sp
                    1440: { slidesPerView: 4 },  // màn lớn: 4 sp
                }}
            >
                <div className="product-list">
                    {products.map((p) => (
                        <Product key={p.id} product={p} />
                    ))}
                </div>
            </Swiper>
        </div>
    );
}
