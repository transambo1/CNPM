import { useState } from "react";
import "./App.css";
function Product({ name, price }) {
    const [quantity, setQuantity] = useState(0);

    return (
        <div>
            <h1>{name}</h1>
            <p> Gia: {price} /vnd </p>
            <p>Số lượng: {quantity}</p>
            <button onClick={() => setQuantity(quantity + 1)}>Thêm</button>
            <button onClick={() => setQuantity(Math.max(quantity - 1, 0))}>Bớt</button>
        </div>
    );
}
export default Product;