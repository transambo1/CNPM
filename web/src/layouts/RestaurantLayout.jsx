import { Link, Outlet, useLocation, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./RestaurantLayout.css";

export default function RestaurantLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  console.log("RestaurantLayout currentUser:", currentUser);

  // ✅ Chặn nếu không phải restaurant
  if (!currentUser || currentUser.role !== "restaurant") {
    return <Navigate to="/login" replace />;
  }

  // ✅ Handle Logout
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="restaurant-layout">
      {/* ==== SIDEBAR ==== */}
      <aside className="restaurant-sidebar">
        <h2 className="restaurant-logo"> {currentUser.Name || "Restaurant Dashboards"}</h2>
        <p className="restaurant-id"> {currentUser.restaurantName}</p>

        <nav className="restaurant-nav">
          <Link
            to="/restaurantadmin"
            className={`restaurant-link ${
              location.pathname === "/restaurantadmin" ? "active" : ""
            }`}
          >
            📊 Tổng quan
          </Link>

          <Link
            to="/restaurantadmin/orders"
            className={`restaurant-link ${
              location.pathname.includes("/orders") ? "active" : ""
            }`}
          >
            🧾 Đơn hàng
          </Link>

          <Link
            to="/restaurantadmin/products"
            className={`restaurant-link ${
              location.pathname.includes("/products") ? "active" : ""
            }`}
          >
            🍔 Sản phẩm
          </Link>

          <Link
            to="/restaurantadmin/drones"
            className={`restaurant-link ${
              location.pathname.includes("/drones") ? "active" : ""
            }`}
          >
            🚁 Quản lý Drones
          </Link>

          <button className="logout-btn" onClick={handleLogout}>
            🔒 Đăng xuất
          </button>
        </nav>
      </aside>

      {/* ==== CONTENT ==== */}
      <main className="restaurant-content">
        <Outlet />
      </main>
    </div>
  );
}
