const data = getSiteData();
let currentLang = getLang();
let selectedCategory = "all";
const CART_KEY = "collier-cart";
const WISHLIST_KEY = "collier-wishlist";

function getList(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (_) {
    return [];
  }
}

function setList(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getBehaviorScore(product) {
  const cart = getList(CART_KEY);
  const wishlist = getList(WISHLIST_KEY);
  let score = 0;
  if (cart.includes(product.id)) score += 4;
  if (wishlist.includes(product.id)) score += 3;
  const viewed = Number(localStorage.getItem(`view-${product.id}`) || "0");
  score += Math.min(5, viewed);
  return score;
}

function renderNav() {
  const markup = data.menu[currentLang]
    .map(
      (item) =>
        `<li><a class="menu-link" href="${item.href}" data-bs-dismiss="offcanvas">${item.label}</a></li>`
    )
    .join("");

  const mobileNav = document.getElementById("mainNavMobile");
  if (mobileNav) {
    mobileNav.innerHTML = markup;
  }

  const desktopNav = document.getElementById("mainNavDesktop");
  if (desktopNav) {
    desktopNav.innerHTML = data.menu[currentLang]
      .map((item) => `<li><a class="desktop-menu-link" href="${item.href}">${item.label}</a></li>`)
      .join("");
  }
}

function renderI18n() {
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === "he" ? "rtl" : "ltr";
  const text = data.pages[currentLang];
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (text[key]) node.textContent = text[key];
  });
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
  });
}

function renderProductAttributeChips(product) {
  if (!Array.isArray(product.attributes) || !product.attributes.length) return "";
  const chips = product.attributes
    .slice(0, 2)
    .map((attr) => {
      const attrName = attr?.name?.[currentLang] || attr?.name?.he || "";
      const attrValue = attr?.value?.[currentLang] || attr?.value?.he || "";
      if (!attrName || !attrValue) return "";
      return `<span class="product-attr-chip">${attrName}: ${attrValue}</span>`;
    })
    .filter(Boolean)
    .join("");
  if (!chips) return "";
  return `<div class="product-attrs-row">${chips}</div>`;
}

function renderProducts() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;
  const products = data.products
    .filter((p) => selectedCategory === "all" || p.category === selectedCategory)
    .sort((a, b) => {
      const byUploadDate = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (byUploadDate !== 0) return byUploadDate;
      return getBehaviorScore(b) - getBehaviorScore(a);
    })
    .slice(0, 8);

  const heartIcon =
    '<svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3l-1.45-1.3C5.4 14.4 2 11.3 2 7.5 2 4.6 4.3 2.3 7.2 2.3c1.7 0 3.4.8 4.5 2.1 1.1-1.3 2.8-2.1 4.5-2.1 2.9 0 5.2 2.3 5.2 5.2 0 3.8-3.4 6.9-8.55 11.5L12 20.3z"/></svg>';

  grid.innerHTML = products
    .map(
      (p) => `
      <article class="product-card product-card-arrival">
        <button class="product-wishlist-btn" type="button" aria-label="${data.pages[currentLang].favorite}" title="${data.pages[currentLang].favorite}" data-like="${p.id}">${heartIcon}</button>
        <a class="product-card-link" href="product.html?id=${p.id}">
          <img src="${p.image}" alt="${p.name[currentLang]}" loading="lazy" />
        </a>
        <div class="product-content">
          <a class="product-title product-title-link" href="product.html?id=${p.id}">${p.name[currentLang]}</a>
          ${renderProductAttributeChips(p)}
          <div class="product-price">${formatPrice(p.price, currentLang)}</div>
        </div>
      </article>
    `
    )
    .join("");

  grid.querySelectorAll("[data-like]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.like;
      const wishlist = getList(WISHLIST_KEY);
      if (!wishlist.includes(id)) wishlist.push(id);
      setList(WISHLIST_KEY, wishlist);
      renderProducts();
    });
  });

  wireProductsSlider();
}

function wireProductsSlider() {
  const track = document.querySelector("[data-slider-track], .products-slider-track");
  const prevButton = document.querySelector("[data-slider-prev]");
  const nextButton = document.querySelector("[data-slider-next]");
  if (!track || !prevButton || !nextButton) return;

  const cards = [...track.querySelectorAll(".product-card")];
  if (!cards.length) return;

  const getVisibleCount = () => {
    const measuredCard = cards.find((card) => card.getBoundingClientRect().width > 1);
    if (!measuredCard) return 1;
    return Math.max(1, Math.round(track.clientWidth / measuredCard.getBoundingClientRect().width));
  };

  const getMaxIndex = () => Math.max(0, cards.length - getVisibleCount());

  const scrollToIndex = (index) => {
    const boundedIndex = Math.max(0, Math.min(index, getMaxIndex()));
    track.dataset.sliderIndex = String(boundedIndex);
    cards[boundedIndex]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    updateSliderState();
  };

  const updateSliderState = () => {
    const currentIndex = Number(track.dataset.sliderIndex || "0");
    prevButton.disabled = currentIndex <= 0;
    nextButton.disabled = currentIndex >= getMaxIndex();
  };

  if (!track.dataset.sliderBound) {
    prevButton.addEventListener("click", () => {
      const step = getVisibleCount();
      scrollToIndex(Number(track.dataset.sliderIndex || "0") - step);
    });

    nextButton.addEventListener("click", () => {
      const step = getVisibleCount();
      scrollToIndex(Number(track.dataset.sliderIndex || "0") + step);
    });

    window.addEventListener("resize", () => {
      scrollToIndex(Number(track.dataset.sliderIndex || "0"));
    });
    track.dataset.sliderBound = "true";
  }

  if (!track.dataset.sliderIndex) {
    track.dataset.sliderIndex = "0";
  }

  updateSliderState();
}

function updateCart() {
  const cartNode = document.getElementById("cartCount");
  if (cartNode) cartNode.textContent = String(getList(CART_KEY).length);
}

function wireCartButton() {
  const cartButton = document.getElementById("cartButton");
  if (!cartButton) return;
  cartButton.addEventListener("click", () => {
    window.location.href = "cart.html";
  });
}

function wireCatalogs() {
  document.querySelectorAll("[data-catalog]").forEach((card) => {
    card.addEventListener("click", () => {
      selectedCategory = card.dataset.catalog || "all";
      renderProducts();
    });
  });
}

function getApiBaseUrl() {
  if (window.location.protocol === "file:") {
    return "http://localhost:3000";
  }
  return "";
}

async function submitJoinClub(payload) {
  const response = await fetch(`${getApiBaseUrl()}/api/join-club`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || "Request failed");
  }

  return response.json();
}

async function submitContact(payload) {
  const response = await fetch(`${getApiBaseUrl()}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || "Request failed");
  }

  return response.json();
}

function wireJoinClub() {
  const form = document.getElementById("joinClubForm");
  const message = document.getElementById("joinClubMessage");
  if (!form || !message) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const birthDate = String(formData.get("birthDate") || "").trim();

    if (!name || !email || !phone || !birthDate) {
      message.textContent = currentLang === "he" ? "אנא מלאו את כל השדות" : "Please fill all fields";
      message.classList.add("error");
      return;
    }

    try {
      await submitJoinClub({
        name,
        email,
        phone,
        birthDate,
        lang: currentLang,
        source: window.location.pathname || "homepage"
      });
      message.textContent =
        currentLang === "he" ? "נרשמתם בהצלחה למועדון שלנו" : "You have successfully joined our club";
      message.classList.remove("error");
      form.reset();
    } catch (_) {
      message.textContent =
        currentLang === "he"
          ? "השרת לא זמין כרגע. נסו שוב בעוד מספר דקות"
          : "Server is currently unavailable. Please try again shortly";
      message.classList.add("error");
    }
  });
}

function wireContactForm() {
  const form = document.getElementById("contactForm");
  const message = document.getElementById("contactFormMessage");
  if (!form || !message) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);

    const name = String(formData.get("name") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const contactMessage = String(formData.get("message") || "").trim();

    if (!name || !email || !contactMessage) {
      message.textContent =
        currentLang === "he"
          ? "אנא מלאו שם, אימייל והודעה לפני שליחה"
          : "Please provide name, email and message before sending";
      message.classList.add("error");
      return;
    }

    try {
      await submitContact({
        name,
        phone,
        email,
        message: contactMessage,
        lang: currentLang,
        source: window.location.pathname || "contact.html"
      });

      message.textContent =
        currentLang === "he"
          ? "ההודעה נשלחה בהצלחה, נחזור אליכם בהקדם"
          : "Your message has been sent successfully. We will get back to you shortly";
      message.classList.remove("error");
      form.reset();
    } catch (_) {
      message.textContent =
        currentLang === "he"
          ? "לא הצלחנו לשלוח כרגע. נסו שוב בעוד כמה דקות"
          : "We could not send your message right now. Please try again shortly";
      message.classList.add("error");
    }
  });
}

function wireEvents() {
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentLang = btn.dataset.lang;
      setLang(currentLang);
      renderI18n();
      renderNav();
      renderProducts();
    });
  });
}

renderI18n();
renderNav();
renderProducts();
updateCart();
wireCatalogs();
wireJoinClub();
wireContactForm();
wireEvents();
wireCartButton();
