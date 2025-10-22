import { useEffect, useState } from "react";
import { Table, Input, Select, Slider, Modal } from "antd";
import "./Products.css";

export default function Products() {
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchText, setSearchText] = useState("");
    const [category, setCategory] = useState("Tất cả");
    const [priceRange, setPriceRange] = useState([0, 100000]);
    const [selectedProduct, setSelectedProduct] = useState(null);

    useEffect(() => {
        fetch("http://localhost:5002/products")
            .then((res) => res.json())
            .then((data) => {
                setData(data);
                setFilteredData(data);
            })
            .catch(() => console.error("Lỗi khi tải dữ liệu!"));
    }, []);

    // Danh sách danh mục tự động từ dữ liệu
    const categories = ["Tất cả", ...new Set(data.map((item) => item.category))];

    // Lọc tự động
    useEffect(() => {
        let filtered = data.filter((item) => {
            const matchName = item.name.toLowerCase().includes(searchText.toLowerCase());
            const matchCategory = category === "Tất cả" || item.category === category;
            const matchPrice = item.price >= priceRange[0] && item.price <= priceRange[1];
            return matchName && matchCategory && matchPrice;
        });
        setFilteredData(filtered);
    }, [searchText, category, priceRange, data]);

    const columns = [
        {
            title: "Hình ảnh",
            dataIndex: "img",
            key: "img",
            render: (img) => <img src={img} alt="product" className="product-thumb" />,
        },
        {
            title: "Tên sản phẩm",
            dataIndex: "name",
            key: "name",
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: "Danh mục",
            dataIndex: "category",
            key: "category",
        },
        {
            title: "Giá (VND)",
            dataIndex: "price",
            key: "price",
            render: (price) => price.toLocaleString(),
            sorter: (a, b) => a.price - b.price,
        },
        {
            title: "Mô tả",
            dataIndex: "description",
            key: "description",
            ellipsis: true,
        },
        {
            title: "Chi tiết",
            key: "action",
            render: (_, record) => (
                <button className="view-detail-btn" onClick={() => setSelectedProduct(record)}>
                    Xem chi tiết
                </button>
            ),
        },
    ];

    return (
        <div className="products-page">
            <h1 className="page-title">🍔 Quản lý sản phẩm</h1>

            {/* Bộ lọc */}
            <div className="filter-container">
                <div className="filter-item">
                    <label>Tìm kiếm:</label>
                    <Input
                        placeholder="Nhập tên sản phẩm..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                </div>

                <div className="filter-item">
                    <label>Danh mục:</label>
                    <Select
                        value={category}
                        onChange={(value) => setCategory(value)}
                        style={{ width: "100%" }}
                    >
                        {categories.map((cat, index) => (
                            <Select.Option key={index} value={cat}>
                                {cat}
                            </Select.Option>
                        ))}
                    </Select>
                </div>

                <div className="filter-item">
                    <label>Khoảng giá:</label>
                    <div className="price-range">
                        <Slider
                            range
                            min={0}
                            max={100000}
                            step={1000}
                            value={priceRange}
                            onChange={(value) => setPriceRange(value)}
                            tooltip={{ formatter: (v) => `${v.toLocaleString()} VND` }}
                        />
                        <div className="price-values">
                            <span>{priceRange[0].toLocaleString()} VND</span>
                            <span>{priceRange[1].toLocaleString()} VND</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bảng sản phẩm */}
            <Table
                columns={columns}
                dataSource={filteredData}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                className="product-table"
            />

            {/* Modal chi tiết sản phẩm */}
            <Modal
                title="Chi tiết sản phẩm"
                open={!!selectedProduct}
                onCancel={() => setSelectedProduct(null)}
                footer={null}
                centered
                className="product-detail-modal"
            >
                {selectedProduct && (
                    <div className="product-detail">
                        <div className="product-image">
                            <img src={selectedProduct.img} alt="product" />
                        </div>

                        <div className="product-info">
                            <h3 className="product-name">{selectedProduct.name}</h3>

                            <p><b>Danh mục:</b> {selectedProduct.category}</p>
                            <p><b>Giá:</b> {selectedProduct.price.toLocaleString()} VND</p>
                            <p><b>Mô tả:</b> {selectedProduct.description}</p>

                            <div className="product-ingredients">
                                <b>Thành phần:</b>
                                <ul>
                                    {selectedProduct.ingredients?.map((item, index) => (
                                        <li key={index}>{item}</li>
                                    ))}
                                </ul>
                            </div>

                            <p className="product-rating">
                                <b>Đánh giá:</b> <span>{selectedProduct.rating} ⭐</span>
                            </p>
                        </div>
                    </div>
                )}
            </Modal>

        </div>
    );
}
