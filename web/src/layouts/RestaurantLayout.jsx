// src/layouts/RestaurantLayout.jsx
import { Link, Outlet, useLocation } from "react-router-dom";
import "./RestaurantLayout.css";

export default function RestaurantLayout() {
    const location = useLocation();

    return (
        <div className="restaurant-layout">
            <aside className="restaurant-sidebar">
                <h2 className="restaurant-logo"> Restaurant Dashboard</h2>
                <nav className="restaurant-nav">
                    <Link
                        to="/restaurantadmin"
                        className={`restaurant-link ${location.pathname === "/restaurantadmin" ? "active" : ""
                            }`}
                    >
                        📊 Tổng quan
                    </Link>
                    <Link
                        to="/restaurantadmin/orders"
                        className={`restaurant-link ${location.pathname.includes("/orders") ? "active" : ""
                            }`}
                    >
                        🧾 Đơn hàng
                    </Link>
                    <Link
                        to="/restaurantadmin/products"
                        className={`restaurant-link ${location.pathname.includes("/products") ? "active" : ""
                            }`}
                    >
                        🍔 Sản phẩm
                    </Link>
                    <Link
                        to="/restaurant/profile"
                        className={`restaurant-link ${location.pathname.includes("/profile") ? "active" : ""
                            }`}
                    >
                        🏪 Hồ sơ cửa hàng
                    </Link>
                </nav>
            </aside>

            <main className="restaurant-content">
                <Outlet />
            </main>
        </div>
    );
}
