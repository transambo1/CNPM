// src/App.jsx
import React, { useEffect, useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ProductList from "./components/ProductList";
import Cart from "./components/Cart";
import "./App.css";

function App() {
  const [cart, setCart] = useState(() => {
    // load từ localStorage nếu có
    try {
      const raw = localStorage.getItem("my_cart");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [showCart, setShowCart] = useState(false);

  // sync cart -> localStorage
  useEffect(() => {
    localStorage.setItem("my_cart", JSON.stringify(cart));
  }, [cart]);

  // thêm product: nếu đã có thì tăng quantity
  function handleAdd(product) {
    setCart((prev) => {
      const idx = prev.findIndex((p) => p.id === product.id);
      if (idx === -1) {
        return [...prev, { ...product, quantity: 1 }];
      } else {
        return prev.map((p) =>
          p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
    });
  }

  function handleRemove(productId) {
    setCart((prev) => prev.filter((p) => p.id !== productId));
  }

  function handleChangeQuantity(productId, qty) {
    if (qty <= 0) {
      // remove nếu qty <= 0
      setCart((prev) => prev.filter((p) => p.id !== productId));
    } else {
      setCart((prev) => prev.map((p) => (p.id === productId ? { ...p, quantity: qty } : p)));
    }
  }

  return (
    <div className="app">
      <Header
        cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
        onToggleCart={() => setShowCart((s) => !s)}
        showCart={showCart}
      />

      <main>
        <ProductList onAdd={handleAdd} />

        {showCart && (
          <aside className="cart-aside">
            <Cart cart={cart} onRemove={handleRemove} onChangeQuantity={handleChangeQuantity} />
          </aside>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;




/* function App() {

  
  return (
    <div>
      <h1>Mini Web Bán Hàng</h1>
      <div className="Show">
        <ProductList />
      </div>
    </div>

  );
}

export default App;
*/