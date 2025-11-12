import React, { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

import Product from "./Product";
import Banner from "./Banner";
import useActiveOrder from "../hooks/useActiveOrder";
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
    const [maxPrice, setMaxPrice] = useState(200000);
    const [priceRange, setPriceRange] = useState({ min: 0, max: 200000 });
    const [loadingProducts, setLoadingProducts] = useState(true);

    const productsPerPage = 6;
    const bannerImages = ["/Images/1.png", "/Images/Banner2.png", "/Images/Banner3.png"];

    useEffect(() => {
        const fetchProducts = async () => {
            setLoadingProducts(true);
            try {
                const productsCollectionRef = collection(db, "products");
                const dataSnapshot = await getDocs(productsCollectionRef);
                const fetchedProducts = dataSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setProducts(fetchedProducts);

                if (fetchedProducts.length > 0) {
                    const prices = fetchedProducts.map((p) => Number(p.price ?? 0));
                    const min = Math.min(0, ...prices);
                    const max = Math.max(200000, ...prices);
                    setPriceRange({ min, max });
                    setMinPrice(min);
                    setMaxPrice(max);
                } else {
                    setPriceRange({ min: 0, max: 200000 });
                    setMinPrice(0);
                    setMaxPrice(200000);
                }
            } catch (err) {
                console.error("Lỗi khi fetch sản phẩm từ Firestore:", err);
                setProducts([]);
            } finally {
                setLoadingProducts(false);
            }
        };

        fetchProducts();
    }, []);

    useEffect(() => {
        const q = new URLSearchParams(location.search).get("search") || "";
        setSearchTerm(q);
        setCurrentPage(1);
    }, [location.search]);

    useEffect(() => {
        if (categoryKey) {
            setSelectedCategory(categoryKey);
            const q = new URLSearchParams(location.search).get("search");
            if (!q) setSearchTerm("");
            setCurrentPage(1);
        } else {
            setSelectedCategory(defaultCategory);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoryKey]);

    const categories = ["All", ...new Set(products.map((p) => p.category))];

    let filteredProducts = products.filter((p) => {
        const name = (p.name || "").toString().toLowerCase();
        const matchSearch = name.includes((searchTerm || "").toLowerCase());
        const matchCategory =
            selectedCategory.trim().toLowerCase() === "all" ||
            (p.category || "").trim().toLowerCase() === selectedCategory.trim().toLowerCase();

        const priceNum = Number(p.price ?? 0);
        const matchPrice = priceNum >= Number(minPrice) && priceNum <= Number(maxPrice);

        if (searchTerm.trim() !== "") {
            return matchSearch && matchPrice;
        }
        return matchCategory && matchPrice;
    });

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

    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

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

                    <div style={{ marginTop: 12 }}>
                        <button className="reset-filters" onClick={resetFilters} type="button">
                            Xóa bộ lọc
                        </button>
                    </div>

                    <h3>Danh mục</h3>
                    <div className="menu">
                        {categories.map((c) => (
                            <div key={c}>
                                <button
                                    className={selectedCategory === c ? "active" : ""}
                                    onClick={() => {
                                        setSelectedCategory(c);
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

                <div className="product-show">
                    <div className="product-grid">
                        {currentProducts.length > 0 ? (
                            currentProducts.map((p) => <Product key={p.id} product={p} onAdd={onAdd} />)
                        ) : (
                            <p>Không tìm thấy sản phẩm nào</p>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                Prev
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
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProductList;
