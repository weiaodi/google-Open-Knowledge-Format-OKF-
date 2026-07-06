---
type: SQLite Table
resource: sqlite:////Users/weiaodi/Desktop/knowledge-catalog/okf/demo.db/products
title: Products
description: Catalog of products available for purchase, including pricing, stock
  levels, and categorization.
tags: products, catalog, inventory, pricing, ecommerce
timestamp: '2026-07-05T14:20:59+00:00'
---

The **products** table is a product catalog that lists every item available for sale in the e-commerce system. Each row represents a single product SKU, with details such as name, category, price, and current stock level. The table contains 5 products (a small sample catalog) and is referenced by the [order_items](order_items.md) table for line-item details in customer orders.

The grain is **one row per product**. There is no time dimension — this is a static reference catalog that changes only when new products are added or existing ones are updated.

## Schema

- **`product_id`** — Integer, primary key. Unique identifier for each product.
- **`name`** — Text, not null. Product display name (e.g., "Wireless Mouse").
- **`category`** — Text. Product grouping (e.g., "Electronics").
- **`price`** — Real, not null. Current unit price in dollars.
- **`stock`** — Integer. Quantity currently on hand; defaults to `0`.
- **`description`** — Text. Short human-readable product description.

## Common query patterns

**List all products with low stock:**

```sql
SELECT product_id, name, category, stock
FROM products
WHERE stock < 20
ORDER BY stock ASC;
```

**Product catalog by category:**

```sql
SELECT category, COUNT(*) AS product_count,
       ROUND(AVG(price), 2) AS avg_price
FROM products
GROUP BY category
ORDER BY product_count DESC;
```

**Find products in a price range:**

```sql
SELECT product_id, name, price, stock
FROM products
WHERE price BETWEEN 20 AND 50
ORDER BY price;
```

## Citations

[1] [Products table](sqlite:////Users/weiaodi/Desktop/knowledge-catalog/okf/demo.db/products)
