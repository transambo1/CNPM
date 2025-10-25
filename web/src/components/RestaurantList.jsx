import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RestaurantList.css";

function RestaurantList({ restaurants }) {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const perPage = 8;

    const start = (page - 1) * perPage;
    const currentRestaurants = restaurants.slice(start, start + perPage);
    const totalPages = Math.ceil(restaurants.length / perPage);

    return (
        <div className="restaurant-list">
            <h2>Danh sách nhà hàng</h2>
            <div className="restaurant-grid">
                {currentRestaurants.map((res) => (
                    <div
                        key={res.id}
                        className="restaurant-card"
                        onClick={() => navigate(`/restaurant/${res.id}`)}
                    >
                        <img src={res.image} alt={res.name} />
                        <h3>{res.name}</h3>
                        <p>{res.address}</p>
                        <p className="desc">{res.description}</p>
                    </div>
                ))}
            </div>

            {/* Nút chuyển trang */}
            <div className="pagination">
                <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                >
                    ◀
                </button>
                <span> {page}/{totalPages}</span>
                <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                >
                    ▶
                </button>
            </div>
        </div>
    );
}

export default RestaurantList;
