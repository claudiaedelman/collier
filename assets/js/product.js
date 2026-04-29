const data = getSiteData();
let lang = getLang();
const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const product = data.products.find((p) => p.id === id) || data.products[0];

function renderAttributes() {
  if (!Array.isArray(product.attributes) || !product.attributes.length) return "";
  const items = product.attributes
    .map((attr) => {
      const name = attr?.name?.[lang] || attr?.name?.he || "";
      const value = attr?.value?.[lang] || attr?.value?.he || "";
      if (!name || !value) return "";
      return `<li><strong>${name}:</strong> ${value}</li>`;
    })
    .filter(Boolean)
    .join("");
  if (!items) return "";
  return `<ul class="product-attributes-list">${items}</ul>`;
}

function renderPage() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  localStorage.setItem(`view-${product.id}`, String(Number(localStorage.getItem(`view-${product.id}`) || "0") + 1));

  const cartLabel = data.pages[lang].addToCart;
  const favLabel = data.pages[lang].favorite;
  const backLabel = lang === "he" ? "חזרה" : "Back";
  const cartIcon =
    '<svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8h10l-1 11a1 1 0 0 1-1 .9H9a1 1 0 0 1-1-.9L7 8z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/></svg>';
  const heartIcon =
    '<svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3l-1.45-1.3C5.4 14.4 2 11.3 2 7.5 2 4.6 4.3 2.3 7.2 2.3c1.7 0 3.4.8 4.5 2.1 1.1-1.3 2.8-2.1 4.5-2.1 2.9 0 5.2 2.3 5.2 5.2 0 3.8-3.4 6.9-8.55 11.5L12 20.3z"/></svg>';
  const backIcon =
    '<svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/><path d="M9 12h10"/></svg>';
  const productEl = document.getElementById("productPage");
  productEl.className = "product-page";
  productEl.innerHTML = `
    <img src="${product.image}" alt="${product.name[lang]}" />
    <div>
      <h1>${product.name[lang]}</h1>
      <p>${categoryLabel(product.category, lang)}</p>
      <p><strong>${formatPrice(product.price, lang)}</strong></p>
      <p>${product.description[lang]}</p>
      ${renderAttributes()}
      <div class="product-actions">
        <button id="addToCartBtn">${cartIcon}${cartLabel}</button>
        <button id="addToFavBtn">${heartIcon}${favLabel}</button>
        <a href="index.html">${backIcon}${backLabel}</a>
      </div>
    </div>
  `;

  document.getElementById("addToCartBtn").addEventListener("click", () => {
    const list = JSON.parse(localStorage.getItem("collier-cart") || "[]");
    list.push(product.id);
    localStorage.setItem("collier-cart", JSON.stringify(list));
  });

  document.getElementById("addToFavBtn").addEventListener("click", () => {
    const list = JSON.parse(localStorage.getItem("collier-wishlist") || "[]");
    if (!list.includes(product.id)) list.push(product.id);
    localStorage.setItem("collier-wishlist", JSON.stringify(list));
  });
}

document.querySelectorAll(".lang-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    lang = btn.dataset.lang;
    setLang(lang);
    renderPage();
  });
});

renderPage();
