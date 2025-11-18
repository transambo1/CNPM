import React from "react";
import { Link } from "react-router-dom";
import "./ProductCard.css";   // nhớ import file css mới

export default function ProductCard({ product }) {
    const { id, name, price, img, description, claim } = product;

    return (
        <div className="pcard">
            <div className="pcard-img-wrapper">
                <img src={img} alt={name} className="pcard-img" />
            </div>

            <div className="pcard-body">
                <h3 className="pcard-title">{name}</h3>

                <p className="pcard-desc">{description}</p>

                <div className="pcard-claim">
                    Đền bù lên đến: <span>{claim.toLocaleString()} VND</span>
                </div>

                <div className="pcard-price">
                    {price.toLocaleString()} VND
                </div>
            </div>

            <Link to={`/Product-Detail/${id}`} className="pcard-btn">
                Xem chi tiết
            </Link>
        </div>
    );
}
