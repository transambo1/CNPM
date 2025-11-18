import React, { useEffect, useState } from "react";
import Product from "./Product";
import Banner from "../../components/layout/Banner";
import { useParams } from "react-router-dom";

function ProductList({ onAdd }) {
    const { category } = useParams(); // ✅ Lấy category từ URL (vd: /menu/Bảo hiểm Y tế)
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const productsPerPage = 4;
    const bannerImages = ["/Images/nhantho1.jpg", "/Images/nhantho.jpg", "/Images/image.png"]

    // ✅ Lấy dữ liệu từ server (db.json)
    useEffect(() => {
        fetch("http://localhost:5005/products")
            .then((res) => res.json())
            .then((data) => setProducts(data))
            .catch((err) => console.error("Lỗi khi fetch API:", err));
    }, []);

    // ✅ Cập nhật category khi thay đổi URL
    useEffect(() => {
        if (category) {
            setSelectedCategory(decodeURIComponent(category));
        } else {
            setSelectedCategory("All");
        }
        setCurrentPage(1);
    }, [category]);

    // ✅ Lấy danh sách thể loại (loại bỏ khoảng trắng dư thừa)
    const categories = ["All", ...new Set(products.map((p) => p.category.trim()))];

    // ✅ Lọc sản phẩm theo tìm kiếm & thể loại
    const filteredProducts = products.filter((p) => {
        const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategory =
            selectedCategory === "All" ||
            p.category.trim().toLowerCase() === selectedCategory.trim().toLowerCase();
        return searchTerm.trim() !== "" ? matchSearch : matchCategory;
    });

    // ✅ Phân trang
    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

    return (
        <div className="main-home">
            <Banner images={bannerImages} />
            <div className="main-title">
                <h1>Hôm nay mua gì cho tương lai của mình?</h1>
            </div>

            <div className="content-wrapper">
                {/* Sidebar */}
                <aside className="sidebar">
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Tìm sản phẩm..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                    <h3>Danh mục bảo hiểm</h3>
                    <div className="menu">
                        {categories.map((c) => (
                            <button
                                key={c}
                                className={selectedCategory === c ? "active" : ""}
                                onClick={() => {
                                    setSelectedCategory(c);
                                    setSearchTerm("");
                                    setCurrentPage(1);
                                }}
                            >
                                {c === "All" ? "Tất cả các loại" : c}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Danh sách sản phẩm */}
                <div className="product-show">
                    <div className="product-grid">
                        {currentProducts.length > 0 ? (
                            currentProducts.map((p) => (
                                <Product key={p.id} product={p} onAdd={onAdd} />
                            ))
                        ) : (
                            <p>Không tìm thấy loại bảo hiểm bạn cần</p>
                        )}
                    </div>

                    {/* Phân trang */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                ⬅ Prev
                            </button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={currentPage === i + 1 ? "active" : ""}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                onClick={() =>
                                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                                }
                                disabled={currentPage === totalPages}
                            >
                                Next ➡
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProductList;
