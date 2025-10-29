import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AdminLayout.css";

export default function AdminLayout() {
    const location = useLocation();
    const { currentUser } = useAuth();

    // 🔒 Nếu chưa đăng nhập hoặc không phải admin → chặn truy cập
    if (!currentUser || currentUser.role !== "admin") {
       return <Navigate to="/login" replace />;
   }

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <h2>MeowChick Pro</h2>
                <nav>
                    <Link to="/admin/dasboards" className={location.pathname === "/admin" ? "active" : ""}>
                        Dashboard
                    </Link>
                    <Link to="/admin/orders" className={location.pathname.includes("/admin/orders") ? "active" : ""}>
                        Orders
                    </Link>
                    <Link to="/admin/products" className={location.pathname.includes("/admin/products") ? "active" : ""}>
                        Products
                    </Link>
                    <Link to="/admin/users" className={location.pathname.includes("/admin/users") ? "active" : ""}>
                        Users
                    </Link>
                </nav>
            </aside>

            <div className="admin-content">
                <main>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
