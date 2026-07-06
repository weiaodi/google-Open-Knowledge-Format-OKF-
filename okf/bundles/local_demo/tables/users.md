---
type: SQLite Table
resource: sqlite:////Users/weiaodi/Desktop/knowledge-catalog/okf/demo.db/users
title: Users
description: One row per registered user account in the demo database, containing
  profile and demographic information.
tags: users, accounts, profiles, customer-data, demo
timestamp: '2026-07-05T14:21:12+00:00'
---

The `users` table stores the registered user accounts for the Demo application. Each row represents one user, identified by a unique `user_id`. The table includes basic profile fields (username, email) alongside demographic attributes (country, age) and the account creation timestamp. With only 3 rows in this demo dataset, it serves as a lightweight reference for joining against other domain tables such as [orders](orders.md), [order_items](order_items.md), and [events](events.md).

The dataset spans account creation dates from January to March 2024. Country codes use ISO 3166-1 alpha-2 format (e.g. `CN`, `US`). This is a sample/development dataset and does not reflect production scale.

# Schema

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | Integer | Primary key, unique per user |
| `username` | Text | Not null, display name |
| `email` | Text | Not null, user's email address |
| `created_at` | Text (date) | Account creation date (`YYYY-MM-DD`) |
| `country` | Text | ISO 3166-1 alpha-2 country code, nullable |
| `age` | Integer | User's age in years, nullable |

# Common query patterns

**Count users per country:**

```sql
SELECT country, COUNT(*) AS user_count
FROM users
GROUP BY country
ORDER BY user_count DESC;
```

**Find recently registered users:**

```sql
SELECT username, email, created_at
FROM users
WHERE created_at >= '2024-02-01'
ORDER BY created_at DESC;
```

**Join users with their orders:**

```sql
SELECT u.username, o.order_id, o.total_amount
FROM users u
JOIN orders o ON u.user_id = o.user_id
ORDER BY o.order_date DESC;
```

# Citations

[1] [Users table (SQLite)](sqlite:////Users/weiaodi/Desktop/knowledge-catalog/okf/demo.db/users)
[2] [Demo database](../datasets/demo.md)
