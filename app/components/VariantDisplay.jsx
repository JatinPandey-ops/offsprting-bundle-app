import React, { useEffect, useState } from "react";
import { useFetcher } from "@remix-run/react";

export default function VariantDisplay({ productId }) {
  const fetcher = useFetcher();
  const [variants, setVariants] = useState([]);

  useEffect(() => {
    if (productId) {
      fetcher.load(`/api/productVariants?productId=${productId}`);
    }
  }, [productId, fetcher]);

  useEffect(() => {
    if (fetcher.data) {
      setVariants(fetcher.data.variants.edges);
    }
  }, [fetcher.data]);

  return (
    <div>
      <h2>Product Variants</h2>
      <ul>
        {variants.map((variant) => (
          <li key={variant.node.id}>
            {variant.node.title} - ${variant.node.price}{" "}
            {variant.node.availableForSale ? "(Available)" : "(Out of Stock)"}
          </li>
        ))}
      </ul>
    </div>
  );
}
