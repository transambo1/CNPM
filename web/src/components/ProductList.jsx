// src/components/ProductList.jsx
import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
// 1. Import các hàm Firestore cần thiết và instance 'db'
import { collection, getDocs, query, where, orderBy, limit, startAfter } from "firebase/firestore"; 
import { db } from '../firebase'; 
import Product from "./Product";
import Banner from "./Banner";
import "./ProductList.css";

function ProductList({ onAdd, defaultCategory = "All" }) {
    const { categoryKey } = useParams();
    const location = useLocation();
    const initialSearch = new URLSearchParams(location.search).get("search") || "";

    // State
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [selectedCategory, setSelectedCategory] = useState(categoryKey || defaultCategory);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortOption, setSortOption] = useState("default");
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState(200000); // Sẽ cập nhật từ Firestore
    const [priceRange, setPriceRange] = useState({ min: 0, max: 200000 }); // Sẽ cập nhật
    const [loadingProducts, setLoadingProducts] = useState(true); // Thêm state loading

    const productsPerPage = 4;
    const bannerImages = ["/Images/1.png", "/Images/Banner2.png", "/Images/Banner3.png"];

    // 2. Fetch sản phẩm từ Firestore (chỉ chạy 1 lần khi component mount)
    useEffect(() => {
        const fetchProducts = async () => {
            setLoadingProducts(true);
            try {
                // Tham chiếu đến collection "products" trong Firestore
                const productsCollectionRef = collection(db, "products"); 
                
                // Lấy tất cả documents từ collection
                const dataSnapshot = await getDocs(productsCollectionRef); 
                
                // Chuyển đổi dữ liệu sang dạng mảng [{ id: ..., ...data }]
                const fetchedProducts = dataSnapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...doc.data() 
                }));
                
                setProducts(fetchedProducts);

                // Cập nhật khoảng giá min/max dựa trên dữ liệu thực tế
                if (fetchedProducts && fetchedProducts.length > 0) {
                    const prices = fetchedProducts.map((p) => Number(p.price ?? 0));
                    const min = Math.min(0, ...prices); // Đảm bảo min không lớn hơn 0
                    const max = Math.max(200000, ...prices); // Đảm bảo max ít nhất là 200k
                    setPriceRange({ min, max });
                    setMinPrice(min);
                    setMaxPrice(max);
                } else {
                    // Giữ giá default nếu không có sản phẩm
                    setPriceRange({ min: 0, max: 200000 });
                    setMinPrice(0);
                    setMaxPrice(200000);
                }

            } catch (err) {
                console.error("Lỗi khi fetch sản phẩm từ Firestore:", err);
                setProducts([]); // Set mảng rỗng nếu có lỗi
            } finally {
                setLoadingProducts(false); // Kết thúc loading dù thành công hay lỗi
            }
        };

        fetchProducts();
    }, []); // Mảng dependency rỗng [] để chỉ fetch 1 lần
    // Khi query string thay đổi (ví dụ user search từ Header) => cập nhật searchTerm
    useEffect(() => {
        const q = new URLSearchParams(location.search).get("search") || "";
        setSearchTerm(q);
        setCurrentPage(1);
    }, [location.search]);

    // Khi category route thay đổi (vd: /menu/Burger)
    useEffect(() => {
        if (categoryKey) {
            setSelectedCategory(categoryKey);

            // Nếu URL hiện không có query 'search' thì reset searchTerm,
            // còn nếu có query 'search' (vd: /menu/All?search=...), thì giữ nguyên searchTerm.
            const q = new URLSearchParams(location.search).get("search");
            if (!q) {
                setSearchTerm("");
            }
            setCurrentPage(1);
        } else {
            // Nếu không có categoryKey (về trang gốc), đặt về default
            setSelectedCategory(defaultCategory);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoryKey]); // intentionally not including location to avoid double-handling

    // Danh mục từ dữ liệu
    const categories = ["All", ...new Set(products.map((p) => p.category))];

    // Lọc sản phẩm theo search / category / price
    let filteredProducts = products.filter((p) => {
        const name = (p.name || "").toString().toLowerCase();
        const matchSearch = name.includes((searchTerm || "").toLowerCase());
        const matchCategory = selectedCategory === "All" || p.category === selectedCategory;
        const priceNum = Number(p.price ?? 0);
        const matchPrice = priceNum >= Number(minPrice) && priceNum <= Number(maxPrice);

        if (searchTerm && searchTerm.trim() !== "") {
            // Nếu có từ khóa tìm kiếm → ưu tiên tìm theo tên + price
            return matchSearch && matchPrice;
        }
        // Nếu không có search → lọc theo category + price
        return matchCategory && matchPrice;
    });

    // Sắp xếp
    filteredProducts.sort((a, b) => {
        switch (sortOption) {
            case "price-asc":
                return Number(a.price) - Number(b.price);
            case "price-desc":
                return Number(b.price) - Number(a.price);
            case "name-asc":
                return (a.name || "").localeCompare(b.name || "");
            case "name-desc":
                return (b.name || "").localeCompare(a.name || "");
            default:
                return 0;
        }
    });

    // Phân trang
    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

    // Helper: reset all filters
    const resetFilters = () => {
        setSelectedCategory("All");
        setSortOption("default");
        const { min, max } = priceRange;
        setMinPrice(min);
        setMaxPrice(max);
        setSearchTerm("");
        setCurrentPage(1);
    };

    return (
        <div className="main-home">
            <Banner images={bannerImages} />

            <div className="main-title">
                <h1>Hôm nay ăn gì?</h1>
            </div>

            <div className="content-wrapper">
                {/* Sidebar */}
                <aside className="sidebar">
                    {/* 🔎 Tìm kiếm (nếu muốn vẫn dùng sidebar search) */}
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

                    {/* Nút reset nhanh */}
                    <div style={{ marginTop: 12 }}>
                        <button
                            className="reset-filters"
                            onClick={resetFilters}
                            type="button"
                        >
                            Xóa bộ lọc
                        </button>
                    </div>

                    {/* 🧩 Danh mục */}
                    <h3>Danh mục</h3>
                    <div className="menu">
                        {categories.map((c) => (
                            <div key={c}>
                                <button
                                    className={selectedCategory === c ? "active" : ""}
                                    onClick={() => {
                                        setSelectedCategory(c);
                                        // Nếu user nhấn category, xóa search trong sidebar (nếu URL không có search)
                                        const q = new URLSearchParams(location.search).get("search");
                                        if (!q) setSearchTerm("");
                                        setCurrentPage(1);
                                    }}
                                >
                                    <span>{c === "All" ? "Tất cả" : c}</span>
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* 💰 Bộ lọc giá */}
                    <h3>Lọc theo giá</h3>
                    <div className="price-filter">
                        <label>Từ:</label>
                        <input
                            type="number"
                            value={minPrice}
                            min={priceRange.min}
                            max={maxPrice}
                            onChange={(e) => setMinPrice(Number(e.target.value))}
                        />
                        <label>Đến:</label>
                        <input
                            type="number"
                            value={maxPrice}
                            min={minPrice}
                            max={priceRange.max}
                            onChange={(e) => setMaxPrice(Number(e.target.value))}
                        />

                        <div className="range-slider">
                            <input
                                type="range"
                                min={priceRange.min}
                                max={priceRange.max}
                                value={minPrice}
                                onChange={(e) => setMinPrice(Number(e.target.value))}
                            />
                            <input
                                type="range"
                                min={priceRange.min}
                                max={priceRange.max}
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(Number(e.target.value))}
                            />
                        </div>

                        <p>
                            Khoảng giá:{" "}
                            <strong>
                                {Number(minPrice).toLocaleString()}₫ - {Number(maxPrice).toLocaleString()}₫
                            </strong>
                        </p>
                    </div>

                    {/* 🧭 Bộ sắp xếp */}
                    <h3>Sắp xếp</h3>
                    <div className="sort-filter">
                        <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                            <option value="default">Mặc định</option>
                            <option value="price-asc">Giá tăng dần</option>
                            <option value="price-desc">Giá giảm dần</option>
                            <option value="name-asc">Tên A → Z</option>
                            <option value="name-desc">Tên Z → A</option>
                        </select>
                    </div>
                </aside>

                {/* Danh sách sản phẩm */}
                <div className="product-show">
                    <div className="product-grid">
                        {currentProducts.length > 0 ? (
                            currentProducts.map((p) => <Product key={p.id} product={p} onAdd={onAdd} />)
                        ) : (
                            <p>Không tìm thấy sản phẩm nào</p>
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
