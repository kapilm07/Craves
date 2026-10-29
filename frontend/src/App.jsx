import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const money = (amount) => `₹${Number(amount || 0).toFixed(2)}`;
const foodEmoji = (name = "") => {
  const value = name.toLowerCase();
  if (value.includes("pizza")) return "🍕";
  if (value.includes("burger")) return "🍔";
  if (value.includes("biryani") || value.includes("indian") || value.includes("paneer")) return "🍛";
  if (value.includes("coffee") || value.includes("drink")) return "🥤";
  if (value.includes("brownie") || value.includes("dessert") || value.includes("cake")) return "🍰";
  return "🍽️";
};

function App() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("foodorder_session") || "null");
    } catch {
      return null;
    }
  });
  const [categories, setCategories] = useState([]);
  const [foods, setFoods] = useState([]);
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState("menu");
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [selectedFood, setSelectedFood] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loadingFoods, setLoadingFoods] = useState(true);
  const [busy, setBusy] = useState(false);

  const notify = useCallback((message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  }, []);

  const loadFoods = useCallback(async () => {
    setLoadingFoods(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryId) params.set("categoryId", categoryId);
      const suffix = params.toString() ? `?${params}` : "";
      setFoods(await api(`/foods${suffix}`));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingFoods(false);
    }
  }, [categoryId, search]);

  const loadCart = useCallback(async (token = session?.token) => {
    if (!token) {
      setCart({ items: [], total: 0 });
      return;
    }
    try {
      setCart(await api("/cart", { token }));
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [session?.token]);

  const loadOrders = useCallback(async (token = session?.token) => {
    if (!token) return;
    try {
      setOrders(await api("/orders", { token }));
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [session?.token]);

  useEffect(() => {
    api("/categories")
      .then(setCategories)
      .catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    loadFoods();
  }, [loadFoods]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  useEffect(() => {
    if (page === "orders") loadOrders();
  }, [page, loadOrders]);

  const itemCount = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.quantity, 0),
    [cart.items],
  );

  const saveSession = (result) => {
    localStorage.setItem("foodorder_session", JSON.stringify(result));
    setSession(result);
    setAuthOpen(false);
    setError("");
    notify(`Welcome, ${result.user.name.split(" ")[0]}!`);
  };

  const handleAuth = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") || "").trim(),
      password: String(form.get("password") || ""),
    };
    if (authMode === "register") payload.name = String(form.get("name") || "").trim();
    try {
      if (authMode === "register") {
        await api("/auth/register", { method: "POST", body: JSON.stringify(payload) });
      }
      const result = await api("/auth/login", { method: "POST", body: JSON.stringify({
        email: payload.email,
        password: payload.password,
      }) });
      saveSession(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem("foodorder_session");
    setSession(null);
    setCart({ items: [], total: 0 });
    setOrders([]);
    setPage("menu");
    notify("You have been signed out.");
  };

  const addToCart = async (food) => {
    if (!session) {
      setAuthMode("login");
      setAuthOpen(true);
      notify("Log in to add items to your cart.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/cart/items", {
        method: "POST",
        token: session.token,
        body: JSON.stringify({ food_id: food.id, quantity: 1 }),
      });
      await loadCart();
      setSelectedFood(null);
      notify(`${food.name} added to your cart`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const updateQuantity = async (id, quantity) => {
    setError("");
    try {
      await api(`/cart/items/${id}`, {
        method: "PATCH",
        token: session.token,
        body: JSON.stringify({ quantity }),
      });
      await loadCart();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const removeItem = async (id) => {
    setError("");
    try {
      await api(`/cart/items/${id}`, { method: "DELETE", token: session.token });
      await loadCart();
      notify("Item removed from your cart.");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const placeOrder = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const address = String(new FormData(event.currentTarget).get("address") || "").trim();
    try {
      const order = await api("/orders", {
        method: "POST",
        token: session.token,
        body: JSON.stringify({ address }),
      });
      setCart({ items: [], total: 0 });
      setSelectedOrder(order);
      await loadOrders();
      setPage("orders");
      notify("Order placed — great choice!");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const openOrder = async (order) => {
    setError("");
    try {
      setSelectedOrder(await api(`/orders/${order.id}`, { token: session.token }));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => { setPage("menu"); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="Crave home">
          <span className="brand-mark">c.</span>
          <span>crave<span className="brand-dot">.</span></span>
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={page === "menu" ? "nav-link active" : "nav-link"} onClick={() => setPage("menu")}>Menu</button>
          {session && <button className={page === "orders" ? "nav-link active" : "nav-link"} onClick={() => setPage("orders")}>My orders</button>}
        </nav>
        <div className="top-actions">
          {session ? (
            <div className="user-area">
              <span className="user-greeting">Hi, {session.user.name.split(" ")[0]}</span>
              <button className="avatar" onClick={signOut} title="Sign out">{session.user.name.charAt(0).toUpperCase()}</button>
            </div>
          ) : (
            <button className="login-link" onClick={() => { setAuthMode("login"); setAuthOpen(true); }}>Log in</button>
          )}
          <button className="cart-button" onClick={() => setPage("cart")} aria-label={`Open cart, ${itemCount} items`}>
            <span className="cart-icon">♧</span><span className="cart-label">Cart</span>
            {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
          </button>
        </div>
      </header>

      <main>
        {page === "menu" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <div className="eyebrow"><span className="eyebrow-line" /> GOOD FOOD, GOOD MOOD</div>
                <h1>Big cravings.<br /><span>Happy moments.</span></h1>
                <p>Your favorite comfort food, made fresh and delivered with a little extra love.</p>
                <a className="hero-cta" href="#menu">Explore the menu <span>↓</span></a>
                <div className="hero-social">
                  <div className="avatar-stack"><span>👩🏽</span><span>👨🏻</span><span>👩🏼</span></div>
                  <div><strong>4.9/5</strong><small>loved by foodies everywhere</small></div>
                </div>
              </div>
              <div className="hero-art" aria-label="A delicious meal">
                <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
                <div className="hero-image">
                  <div className="hero-food">🍕</div>
                  <div className="hero-image-caption"><span className="caption-dot" /> FRESH FROM OUR KITCHEN</div>
                </div>
                <div className="floating-note note-top"><span>✦</span><div><strong>Made with love</strong><small>always fresh, always tasty</small></div></div>
                <div className="floating-note note-bottom"><span className="note-star">★</span><strong>Top rated<br />near you</strong></div>
              </div>
              <div className="hero-bottom-note">A LITTLE JOY, DELIVERED <span>✳</span></div>
            </section>

            <section className="menu-section section-wrap" id="menu">
              <div className="section-heading">
                <div><div className="eyebrow"><span className="eyebrow-line" /> FIND YOUR FAVORITE</div><h2>What sounds <span>good?</span></h2></div>
                <form className="search-form" onSubmit={submitSearch}>
                  <span className="search-icon">⌕</span>
                  <input aria-label="Search menu" placeholder="Search something delicious..." value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
                  {searchInput && <button className="clear-search" type="button" onClick={() => { setSearchInput(""); setSearch(""); }}>×</button>}
                  <button className="search-submit" type="submit" aria-label="Search">→</button>
                </form>
              </div>
              <div className="category-row">
                <button className={categoryId === "" ? "category-chip selected" : "category-chip"} onClick={() => setCategoryId("")}>✨ <span>Everything</span></button>
                {categories.map((category) => (
                  <button key={category.id} className={String(category.id) === categoryId ? "category-chip selected" : "category-chip"} onClick={() => setCategoryId(String(category.id))}>
                    <span className="category-emoji">{foodEmoji(category.name)}</span><span>{category.name}</span>
                  </button>
                ))}
              </div>
              {error && <div className="inline-error" role="alert">{error}<button onClick={() => setError("")}>×</button></div>}
              <div className="food-grid">
                {loadingFoods ? <div className="empty-state">Finding something delicious…</div> : foods.length ? foods.map((food, index) => (
                  <article className="food-card" key={food.id}>
                    <button className={`food-visual food-color-${index % 5}`} onClick={() => setSelectedFood(food)} aria-label={`View ${food.name}`}>
                      {food.image_url ? <img src={food.image_url} alt={food.name} /> : <span>{foodEmoji(food.name)}</span>}
                      <span className="food-tag">{food.category_name || "Made fresh"}</span>
                      <span className="food-quick-view">View details ↗</span>
                    </button>
                    <div className="food-info">
                      <div><h3>{food.name}</h3><p>{food.description || "A delicious Crave favorite, made fresh for you."}</p></div>
                      <div className="food-buy-row"><strong>{money(food.price)}</strong><button className="add-button" onClick={() => addToCart(food)} disabled={busy} aria-label={`Add ${food.name} to cart`}>+</button></div>
                    </div>
                  </article>
                )) : <div className="empty-state"><span>🥣</span><h3>No bites found</h3><p>Try a different search or category.</p><button className="text-button" onClick={() => { setSearch(""); setSearchInput(""); setCategoryId(""); }}>Clear filters</button></div>}
              </div>
            </section>
          </>
        )}

        {page === "cart" && (
          <section className="page-section section-wrap">
            <div className="eyebrow"><span className="eyebrow-line" /> YOUR ORDER</div>
            <h1 className="page-title">Your <span>cart.</span></h1>
            {!session ? (
              <div className="empty-state cart-empty"><span>🛍️</span><h3>Your next favorite is waiting</h3><p>Log in to see your cart and get ordering.</p><button className="primary-button" onClick={() => { setAuthMode("login"); setAuthOpen(true); }}>Log in to continue</button></div>
            ) : cart.items.length === 0 ? (
              <div className="empty-state cart-empty"><span>🛍️</span><h3>Your cart is taking a little break</h3><p>Let's find something delicious to bring it back.</p><button className="primary-button" onClick={() => setPage("menu")}>Explore the menu</button></div>
            ) : (
              <div className="cart-layout">
                <div className="cart-list">
                  {cart.items.map((item) => (
                    <article className="cart-item" key={item.id}>
                      <div className="cart-food-icon">{foodEmoji(item.name)}</div>
                      <div className="cart-item-copy"><h3>{item.name}</h3><p>{money(item.price)} each</p></div>
                      <div className="quantity-control">
                        <button aria-label="Decrease quantity" disabled={item.quantity <= 1} onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                        <span>{item.quantity}</span>
                        <button aria-label="Increase quantity" disabled={item.quantity >= 99} onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                      </div>
                      <strong className="cart-subtotal">{money(item.subtotal)}</strong>
                      <button className="remove-button" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`}>×</button>
                    </article>
                  ))}
                </div>
                <aside className="checkout-card">
                  <h2>Delivery details</h2><p className="checkout-muted">Almost there — where should we bring it?</p>
                  <form onSubmit={placeOrder}>
                    <label htmlFor="address">Delivery address</label>
                    <textarea id="address" name="address" rows="3" maxLength="500" required placeholder="House / flat, street, city..." />
                    <div className="summary-line"><span>Subtotal</span><strong>{money(cart.total)}</strong></div>
                    <div className="summary-line delivery-line"><span>Delivery</span><strong>On us today ✨</strong></div>
                    <div className="summary-total"><span>Total</span><strong>{money(cart.total)}</strong></div>
                    <button className="primary-button checkout-button" disabled={busy}>{busy ? "Placing your order…" : "Place order"} <span>→</span></button>
                  </form>
                </aside>
              </div>
            )}
          </section>
        )}

        {page === "orders" && (
          <section className="page-section section-wrap">
            <div className="eyebrow"><span className="eyebrow-line" /> A LITTLE FOOD HISTORY</div>
            <h1 className="page-title">Your <span>orders.</span></h1>
            {!orders.length ? (
              <div className="empty-state cart-empty"><span>🧾</span><h3>No orders just yet</h3><p>Your next delicious moment is only a few clicks away.</p><button className="primary-button" onClick={() => setPage("menu")}>Explore the menu</button></div>
            ) : (
              <div className="orders-list">
                {orders.map((order) => (
                  <button className="order-card" key={order.id} onClick={() => openOrder(order)}>
                    <span className="order-number">#{order.id}</span>
                    <span className="order-description"><strong>Order #{order.id}</strong><small>{new Date(`${order.created_at}Z`).toLocaleString()} · {order.address}</small></span>
                    <span className={`status-pill status-${order.status}`}>{order.status}</span>
                    <strong>{money(order.total)}</strong><span className="order-arrow">↗</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="footer">
        <div className="footer-brand"><span className="brand-mark">c.</span><span>crave<span className="brand-dot">.</span></span></div>
        <p>Good food. Good mood. Always.</p>
        <span className="footer-copy">© {new Date().getFullYear()} Crave Kitchen</span>
      </footer>

      {notice && <div className="toast" role="status">{notice}</div>}
      {error && page !== "menu" && <div className="floating-error" role="alert"><span>{error}</span><button onClick={() => setError("")}>×</button></div>}

      {authOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false); }}>
          <section className="modal auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Close">×</button>
            <div className="auth-stamp">c.</div>
            <div className="eyebrow"><span className="eyebrow-line" /> GOOD TO HAVE YOU</div>
            <h2 id="auth-title">{authMode === "login" ? "Welcome back." : "Join the table."}</h2>
            <p className="modal-intro">{authMode === "login" ? "Log in for all the good stuff." : "Create an account and let the good times roll."}</p>
            <form className="auth-form" onSubmit={handleAuth}>
              {authMode === "register" && <><label htmlFor="auth-name">Your name</label><input id="auth-name" name="name" autoComplete="name" required maxLength="100" placeholder="Asha Kumar" /></>}
              <label htmlFor="auth-email">Email address</label><input id="auth-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
              <label htmlFor="auth-password">Password</label><input id="auth-password" name="password" type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} minLength="8" required placeholder="At least 8 characters" />
              {error && <div className="form-error" role="alert">{error}</div>}
              <button className="primary-button" disabled={busy}>{busy ? "One moment…" : authMode === "login" ? "Log in" : "Create account"} <span>→</span></button>
            </form>
            <p className="auth-switch">{authMode === "login" ? "New to Crave?" : "Already have an account?"} <button onClick={() => { setError(""); setAuthMode(authMode === "login" ? "register" : "login"); }}>{authMode === "login" ? "Create an account" : "Log in"}</button></p>
          </section>
        </div>
      )}

      {selectedFood && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedFood(null); }}>
          <section className="modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="food-title">
            <button className="modal-close" onClick={() => setSelectedFood(null)} aria-label="Close">×</button>
            <div className="detail-visual">{selectedFood.image_url ? <img src={selectedFood.image_url} alt={selectedFood.name} /> : <span>{foodEmoji(selectedFood.name)}</span>}</div>
            <div className="eyebrow"><span className="eyebrow-line" /> {selectedFood.category_name || "CRAVE FAVORITE"}</div>
            <h2 id="food-title">{selectedFood.name}</h2>
            <p className="modal-intro">{selectedFood.description || "A delicious Crave favorite, made fresh for you."}</p>
            <div className="detail-buy"><strong>{money(selectedFood.price)}</strong><button className="primary-button" onClick={() => addToCart(selectedFood)} disabled={busy}>Add to cart <span>+</span></button></div>
          </section>
        </div>
      )}

      {selectedOrder && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedOrder(null); }}>
          <section className="modal order-modal" role="dialog" aria-modal="true" aria-labelledby="order-title">
            <button className="modal-close" onClick={() => setSelectedOrder(null)} aria-label="Close">×</button>
            <div className="eyebrow"><span className="eyebrow-line" /> ORDER DETAILS</div>
            <h2 id="order-title">Order #{selectedOrder.id}</h2>
            <p className="modal-intro">{selectedOrder.address}</p>
            <div className="order-detail-items">
              {(selectedOrder.items || []).map((item, index) => <div className="order-detail-row" key={`${item.food_name}-${index}`}><span>{item.quantity} × {item.food_name}</span><strong>{money(item.price * item.quantity)}</strong></div>)}
            </div>
            <div className="summary-total"><span>Total</span><strong>{money(selectedOrder.total)}</strong></div>
            <span className={`status-pill status-${selectedOrder.status}`}>{selectedOrder.status}</span>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
