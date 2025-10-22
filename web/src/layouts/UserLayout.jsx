import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function UserLayout({ cartCount, currentUser, setCurrentUser }) {
    return (
        <div className="user-layout">
            <Header
                cartCount={cartCount}  // ✅ Dùng props đã được truyền từ App.jsx
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
            />
            <main>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
