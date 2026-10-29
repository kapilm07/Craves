# FoodOrder API

## Base URL

```text
http://localhost:5000
```

All endpoints are under `/api`. Requests with a JSON body should use
`Content-Type: application/json`. Authenticated endpoints require:

```http
Authorization: Bearer <token>
```

The token is returned by `POST /api/auth/login` and expires after one day.

## Endpoint summary

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Register a user |
| POST | `/api/auth/login` | No | Log in |
| GET | `/api/categories` | No | List food categories |
| GET | `/api/foods` | No | List available foods; optionally search/filter |
| GET | `/api/foods/:id` | No | Get an available food |
| GET | `/api/cart` | Yes | Get the current user's cart |
| POST | `/api/cart/items` | Yes | Add food to the cart |
| PATCH | `/api/cart/items/:id` | Yes | Set a cart item's quantity |
| DELETE | `/api/cart/items/:id` | Yes | Remove a cart item |
| POST | `/api/orders` | Yes | Place an order from the cart |
| GET | `/api/orders` | Yes | List the current user's orders |
| GET | `/api/orders/:id` | Yes | Get an order and its items |

## Endpoints

### Health check

`GET /api/health`

Request: no body.

**200 OK**

```json
{
  "status": "OK work aguthu"
}
```

### Register

`POST /api/auth/register`

**Request**

```json
{
  "name": "Asha Kumar",
  "email": "asha@example.com",
  "password": "securepass123"
}
```

The name must not be blank, the email must be valid, and the password must
contain at least 8 characters.

**201 Created**

```json
{
  "message": "Registration successful",
  "user": {
    "id": 1,
    "name": "Asha Kumar",
    "email": "asha@example.com"
  }
}
```

**Errors**

- `400 Bad Request`: `{ "message": "Enter a name, valid email and password of at least 8 characters" }`
- `409 Conflict`: `{ "message": "Email already registered" }`

### Log in

`POST /api/auth/login`

**Request**

```json
{
  "email": "asha@example.com",
  "password": "securepass123"
}
```

**200 OK**

```json
{
  "token": "<jwt-token>",
  "user": {
    "id": 1,
    "name": "Asha Kumar",
    "email": "asha@example.com"
  }
}
```

**Errors**

- `400 Bad Request`: `{ "message": "Email and password are required" }`
- `401 Unauthorized`: `{ "message": "Invalid email or password" }`

### List categories

`GET /api/categories`

Request: no body.

**200 OK** — an array of categories, ordered by name:

```json
[
  {
    "id": 2,
    "name": "Burgers"
  },
  {
    "id": 5,
    "name": "Desserts"
  }
]
```

### List available foods

`GET /api/foods`

Optional query parameters:

- `search`: matches food name or description.
- `categoryId`: filters by category ID; must contain digits only.

Example: `GET /api/foods?search=paneer&categoryId=3`

Request: no body.

**200 OK** — an array ordered by food name:

```json
[
  {
    "id": 3,
    "category_id": 3,
    "name": "Paneer Biryani",
    "description": "Aromatic paneer biryani",
    "price": 199,
    "image_url": null,
    "available": 1,
    "category_name": "Indian"
  }
]
```

**Errors**

- `400 Bad Request` for a non-numeric `categoryId`:
  `{ "message": "Invalid categoryId" }`

Only foods with `available` set to `1` are returned.

### Get a food

`GET /api/foods/:id`

Example: `GET /api/foods/3`

Request: no body.

**200 OK** — one food object with the same fields as an item in the food list.

**404 Not Found**

```json
{
  "message": "Food not found"
}
```

### Get cart

`GET /api/cart`

Requires authentication. Request: no body.

**200 OK**

```json
{
  "items": [
    {
      "id": 10,
      "food_id": 3,
      "name": "Paneer Biryani",
      "price": 199,
      "quantity": 2,
      "subtotal": 398
    }
  ],
  "total": 398
}
```

The total is the sum of item subtotals. Only available foods appear in the cart
response.

### Add an item to cart

`POST /api/cart/items`

Requires authentication.

**Request**

```json
{
  "food_id": 3,
  "quantity": 2
}
```

`quantity` is optional and defaults to `1`. It must be an integer from `1` to
`99`. Adding a food already in the cart increases its existing quantity.

**200 OK**

```json
{
  "message": "Cart updated"
}
```

**Errors**

- `400 Bad Request`: `{ "message": "Valid food_id and quantity (1-99) are required" }`
- `400 Bad Request`: `{ "message": "Maximum quantity is 99" }`
- `404 Not Found`: `{ "message": "Food not found" }`

### Update cart item quantity

`PATCH /api/cart/items/:id`

Requires authentication. `:id` is the cart item ID.

**Request**

```json
{
  "quantity": 3
}
```

The quantity must be an integer from `1` to `99`.

**200 OK**

```json
{
  "message": "Cart updated"
}
```

**Errors**

- `400 Bad Request`: `{ "message": "Quantity must be between 1 and 99" }`
- `404 Not Found`: `{ "message": "Cart item not found" }`

### Remove cart item

`DELETE /api/cart/items/:id`

Requires authentication. `:id` is the cart item ID. Request: no body.

**200 OK**

```json
{
  "message": "Item removed"
}
```

**404 Not Found**

```json
{
  "message": "Cart item not found"
}
```

### Place order

`POST /api/orders`

Requires authentication. Places an order using the current user's available
cart items, then clears the cart.

**Request**

```json
{
  "address": "42 Example Street, Chennai"
}
```

The address must not be blank and must be no longer than 500 characters.

**201 Created**

```json
{
  "id": 25,
  "total": 398,
  "address": "42 Example Street, Chennai",
  "status": "pending",
  "items": [
    {
      "name": "Paneer Biryani",
      "price": 199,
      "quantity": 2
    }
  ]
}
```

**Errors**

- `400 Bad Request`: `{ "message": "A valid delivery address is required" }`
- `400 Bad Request`: `{ "message": "Your cart is empty" }`

### List orders

`GET /api/orders`

Requires authentication. Request: no body.

**200 OK** — an array of the current user's orders, newest first:

```json
[
  {
    "id": 25,
    "user_id": 1,
    "total": 398,
    "address": "42 Example Street, Chennai",
    "status": "pending",
    "created_at": "2026-10-29 12:00:00"
  }
]
```

### Get order details

`GET /api/orders/:id`

Requires authentication. `:id` is the order ID. Request: no body.

**200 OK**

```json
{
  "id": 25,
  "user_id": 1,
  "total": 398,
  "address": "42 Example Street, Chennai",
  "status": "pending",
  "created_at": "2026-10-29 12:00:00",
  "items": [
    {
      "food_name": "Paneer Biryani",
      "price": 199,
      "quantity": 2
    }
  ]
}
```

**404 Not Found**

```json
{
  "message": "Order not found"
}
```

### Common responses

Authenticated routes return `401 Unauthorized` when the bearer token is missing,
invalid, or expired:

```json
{
  "message": "Please log in"
}
```

Unknown routes return `404 Not Found`:

```json
{
  "message": "Route not found"
}
```

Unexpected server errors return `500 Internal Server Error`:

```json
{
  "message": "Internal server error"
}
```
