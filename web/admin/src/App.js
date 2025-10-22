import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import OrdersDetail from "./components/OrdersDetail";
import Dashboard from "../../src/pages/pages/Dashboard";
import Products from "../../src/pages/pages/Products";
import Orders from "../../src/pages/pages/Orders";
import Customers from "../../src/pages/pages/Customers";
import Stats from "../../src/pages/pages/Stats";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrdersDetail />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/stats" element={<Stats />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
