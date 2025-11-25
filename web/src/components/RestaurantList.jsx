import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase"; 
import "./RestaurantList.css";

function RestaurantList() {
    const navigate = useNavigate();
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const perPage = 8;

    useEffect(() => {
        const fetchRestaurants = async () => {
            try {
                // ⛔ Trước đây: getDocs(collection(db, "restaurants"))
                // ✅ Bây giờ: chỉ lấy nhà hàng active
                const q = query(
                    collection(db, "restaurants"),
                    where("status", "==", "active")
                );

                const querySnapshot = await getDocs(q);
                const data = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setRestaurants(data);
            } catch (error) {
                console.error("Lỗi khi lấy danh sách nhà hàng:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRestaurants();
    }, []);

    if (loading) return <p>Đang tải danh sách nhà hàng...</p>;

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

            <div className="pagination">
                <button disabled={page === 1} onClick={() => setPage(page - 1)}>◀</button>
                <span>{page}/{totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>▶</button>
            </div>
        </div>
    );
}

export default RestaurantList;
