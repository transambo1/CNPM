import Hello from "./components/Hello";
import Product from "./components/Product";
import { initialProducts } from "./data/products";
import "./App.css";

function App() {

  const [products, setProducts] = useState(initialProducts);
  return (
    <div>
      <h1>Mini Web Bán Hàng</h1>
      <div>
        {products.map((p) => (
          <Product key={p.id} name={p.name} price={p.price} />
        ))}
      </div>
    </div>

  );
}

export default App;
