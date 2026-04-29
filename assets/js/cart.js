const CART_STORAGE_KEY = "collier-cart";

function getCartIds() {
  const raw = localStorage.getItem(CART_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function setCartIds(ids) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(ids));
}

function groupCart(ids, products) {
  const countById = new Map();
  ids.forEach((id) => {
    countById.set(id, (countById.get(id) || 0) + 1);
  });

  return [...countById.entries()]
    .map(([id, qty]) => {
      const product = products.find((p) => p.id === id);
      if (!product) return null;
      return {
        id,
        qty,
        product,
        lineTotal: product.price * qty
      };
    })
    .filter(Boolean);
}

function formatILS(value, lang) {
  return formatPrice(value, lang);
}

function writeCart(ids, itemId, qty) {
  const remaining = ids.filter((id) => id !== itemId);
  for (let i = 0; i < qty; i += 1) remaining.push(itemId);
  return remaining;
}

function renderCart() {
  const lang = getLang();
  const site = getSiteData();
  const products = site.products || [];
  const ids = getCartIds();
  const rows = groupCart(ids, products);

  const body = document.getElementById("cartItemsBody");
  const empty = document.getElementById("cartEmptyState");
  const table = document.querySelector(".cart-table");
  const subtotalNode = document.getElementById("summarySubtotal");
  const shippingNode = document.getElementById("summaryShipping");
  const totalNode = document.getElementById("summaryTotal");

  if (!body || !empty || !table || !subtotalNode || !shippingNode || !totalNode) return;

  if (!rows.length) {
    body.innerHTML = "";
    table.hidden = true;
    empty.hidden = false;
    subtotalNode.textContent = formatILS(0, lang);
    shippingNode.textContent = formatILS(0, lang);
    totalNode.textContent = formatILS(0, lang);
    return;
  }

  table.hidden = false;
  empty.hidden = true;

  body.innerHTML = rows
    .map(({ id, qty, product, lineTotal }) => {
      const name = product.name?.[lang] || product.name?.he || product.id;
      return `
        <tr>
          <td>
            <div class="cart-product-cell">
              <img src="${product.image}" alt="${name}" loading="lazy" />
              <div>
                <a href="product.html?id=${product.id}" class="cart-product-name">${name}</a>
                <small>${categoryLabel(product.category, lang)}</small>
              </div>
            </div>
          </td>
          <td>${formatILS(product.price, lang)}</td>
          <td>
            <div class="qty-control" data-id="${id}">
              <button type="button" data-action="inc" aria-label="increase quantity">+</button>
              <span>${qty}</span>
              <button type="button" data-action="dec" aria-label="decrease quantity">-</button>
            </div>
          </td>
          <td>${formatILS(lineTotal, lang)}</td>
          <td>
            <button type="button" class="cart-remove-btn" data-remove="${id}" aria-label="remove item">✕</button>
          </td>
        </tr>
      `;
    })
    .join("");

  const subtotal = rows.reduce((sum, row) => sum + row.lineTotal, 0);
  const shipping = 0;
  const total = subtotal + shipping;

  subtotalNode.textContent = formatILS(subtotal, lang);
  shippingNode.textContent = formatILS(shipping, lang);
  totalNode.textContent = formatILS(total, lang);

  body.querySelectorAll(".qty-control button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const wrapper = btn.closest(".qty-control");
      if (!wrapper) return;
      const id = wrapper.dataset.id;
      const action = btn.dataset.action;
      const current = rows.find((row) => row.id === id);
      if (!current) return;
      const nextQty = action === "inc" ? current.qty + 1 : Math.max(1, current.qty - 1);
      const nextIds = writeCart(ids, id, nextQty);
      setCartIds(nextIds);
      renderCart();
      if (typeof updateCart === "function") updateCart();
    });
  });

  body.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-remove");
      const nextIds = ids.filter((itemId) => itemId !== id);
      setCartIds(nextIds);
      renderCart();
      if (typeof updateCart === "function") updateCart();
    });
  });
}

function wireCartPageActions() {
  const clearButton = document.getElementById("clearCartButton");
  if (clearButton) {
    clearButton.addEventListener("click", () => {
      setCartIds([]);
      renderCart();
      if (typeof updateCart === "function") updateCart();
    });
  }

  const checkoutButton = document.getElementById("checkoutButton");
  if (checkoutButton) {
    checkoutButton.addEventListener("click", () => {
      alert("המשך לתשלום יתווסף בשלב הבא.");
    });
  }
}

renderCart();
wireCartPageActions();
