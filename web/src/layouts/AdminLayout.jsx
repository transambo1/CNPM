import { Outlet, Link, useLocation } from "react-router-dom";
import "./AdminLayout.css";


export default function AdminLayout() {
    const location = useLocation();

    return (
        <div className="admin-layout">
            <aside className="sidebar">
                <h2>Admin Panel</h2>
                <nav>
                    <Link
                        to="/admin"
                        className={location.pathname === "/admin" ? "active" : ""}
                    >
                        Dashboard
                    </Link>
                    <Link
                        to="/admin/orders"
                        className={location.pathname.includes("/admin/orders") ? "active" : ""}
                    >
                        Orders
                    </Link>
                    <Link
                        to="/admin/products"
                        className={location.pathname.includes("/admin/products") ? "active" : ""}
                    >
                        Products
                    </Link>
                    <Link
                        to="/admin/users"
                        className={location.pathname.includes("/admin/users") ? "active" : ""}
                    >
                        Users
                    </Link>
                </nav>
            </aside>

            <div className="content">

                <main>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
