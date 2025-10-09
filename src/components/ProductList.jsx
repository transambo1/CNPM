import React, { useEffect, useState } from "react";
import Product from "./Product";
import Banner from "./Banner";

function ProductList({ onAdd, defaultCategory = "All" }) {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
    const [currentPage, setCurrentPage] = useState(1);
    const productsPerPage = 4;

    const bannerImages = ["/Images/1.png", "/Images/Banner2.png", "/Images/Banner3.png"];

    useEffect(() => {
        fetch("http://localhost:5002/products")
            .then((res) => res.json())
            .then((data) => setProducts(data))
            .catch((err) => console.error("Lỗi khi fetch API:", err));
    }, []);

    // Reset category khi defaultCategory thay đổi
    useEffect(() => {
        setSelectedCategory(defaultCategory);
    }, [defaultCategory]);

    // Categories
    const categories = ["All", ...new Set(products.map((p) => p.category))];

    // 🔎 Lọc sản phẩm
    const filteredProducts = products.filter((p) => {
        const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (searchTerm.trim() !== "") {
            // Nếu có search term → bỏ qua category, chỉ tìm theo tên
            return matchSearch;
        } else {
            // Nếu không có search term → lọc theo category
            return selectedCategory === "All" || p.category === selectedCategory;
        }
    });

    // 📌 Phân trang
    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

    return (
        <div className="main-home">
            <Banner images={bannerImages} />

            <div className="main-title">
                <h1> Hôm nay ăn gì?</h1>
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
                    <h3> Danh mục</h3>
                    <div className="menu">
                        {categories.map((c) => (
                            <div key={c}>
                                <button
                                    className={selectedCategory === c ? "active" : ""}
                                    onClick={() => {
                                        setSelectedCategory(c);
                                        setSearchTerm(""); // reset search khi chọn category
                                        setCurrentPage(1);
                                    }}
                                >
                                    <span> {c === "All" ? "Tất cả" : c} </span>
                                </button>
                            </div>
                        ))}
                    </div>
                </aside>

                <div className="product-show">
                    {/* Product grid */}
                    <div className="product-grid">
                        {currentProducts.length > 0 ? (
                            currentProducts.map((p) => (
                                <Product key={p.id} product={p} onAdd={onAdd} />
                            ))
                        ) : (
                            <p>Không tìm thấy sản phẩm nào</p>
                        )}

                    </div>
                    {/* ✅ Chỉ hiển thị phân trang khi nhiều hơn 1 trang */}
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
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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
