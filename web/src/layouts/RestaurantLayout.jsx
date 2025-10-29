import { Link, Outlet, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./RestaurantLayout.css";

export default function RestaurantLayout() {
    const location = useLocation();
    const { currentUser } = useAuth();
console.log("RestaurantLayout currentUser:", currentUser);
    // 🔒 Nếu chưa đăng nhập hoặc không phải restaurant → chặn truy cập
    if (!currentUser || currentUser.role !== "restaurant") {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="restaurant-layout">
            <aside className="restaurant-sidebar">
                <h2 className="restaurant-logo">Restaurant Dashboard</h2>
                <nav className="restaurant-nav">
                    <Link
                        to="/restaurantadmin"
                        className={`restaurant-link ${location.pathname === "/restaurantadmin" ? "active" : ""}`}
                    >
                        📊 Tổng quan
                    </Link>
                    <Link
                        to="/restaurantadmin/orders"
                        className={`restaurant-link ${location.pathname.includes("/orders") ? "active" : ""}`}
                    >
                        🧾 Đơn hàng
                    </Link>
                    <Link
                        to="/restaurantadmin/products"
                        className={`restaurant-link ${location.pathname.includes("/products") ? "active" : ""}`}
                    >
                        🍔 Sản phẩm
                    </Link>
                    <Link
                        to="/restaurantadmin/drones"
                        className={`restaurant-link ${location.pathname.includes("/profile") ? "active" : ""}`}
                    >
                       Quản lí Drones
                    </Link>
                </nav>
            </aside>

            <main className="restaurant-content">
                <Outlet />
            </main>
        </div>
    );
}
