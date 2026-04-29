const state = getSiteData();

async function ensureAdminSession() {
  try {
    const response = await fetch("/api/admin/session", { credentials: "same-origin" });
    if (!response.ok) {
      window.location.replace("/admin-login.html");
      return false;
    }
    const data = await response.json();
    if (!data.authenticated) {
      window.location.replace("/admin-login.html");
      return false;
    }
    return true;
  } catch (_) {
    window.location.replace("/admin-login.html");
    return false;
  }
}

function field(label, value, key, multiline = false) {
  if (multiline) {
    return `<label>${label}<textarea data-key="${key}">${value ?? ""}</textarea></label>`;
  }
  return `<label>${label}<input data-key="${key}" value="${value ?? ""}" /></label>`;
}

function renderMenus() {
  const root = document.getElementById("menuEditor");
  root.innerHTML = ["he", "en"]
    .map(
      (lang) => `
      <div class="item">
        <h3>${lang.toUpperCase()}</h3>
        ${state.menu[lang]
          .map(
            (item, i) => `
            <div class="grid-2">
              ${field("Label", item.label, `menu.${lang}.${i}.label`)}
              ${field("Href", item.href, `menu.${lang}.${i}.href`)}
            </div>
          `
          )
          .join("")}
      </div>`
    )
    .join("");
}

function renderPages() {
  const root = document.getElementById("pagesEditor");
  root.innerHTML = ["he", "en"]
    .map((lang) => {
      const fields = Object.entries(state.pages[lang])
        .map(([key, val]) => field(key, val, `pages.${lang}.${key}`, String(val).length > 50))
        .join("");
      return `<div class="item"><h3>${lang.toUpperCase()}</h3><div class="grid-2">${fields}</div></div>`;
    })
    .join("");
}

function renderProducts() {
  const root = document.getElementById("productsEditor");
  root.innerHTML = state.products
    .map(
      (p, i) => `
      <article class="item">
        <div class="grid-3">
          ${field("ID", p.id, `products.${i}.id`)}
          ${field("Category", p.category, `products.${i}.category`)}
          ${field("Price", p.price, `products.${i}.price`)}
        </div>
        <div class="grid-2">
          ${field("Name HE", p.name.he, `products.${i}.name.he`)}
          ${field("Name EN", p.name.en, `products.${i}.name.en`)}
        </div>
        <div class="grid-2">
          ${field("Description HE", p.description.he, `products.${i}.description.he`, true)}
          ${field("Description EN", p.description.en, `products.${i}.description.en`, true)}
        </div>
        ${field("Image URL", p.image, `products.${i}.image`)}
      </article>
    `
    )
    .join("");
}

function setByPath(obj, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  let ref = obj;
  keys.forEach((k) => {
    ref = ref[k];
  });
  if (last === "price") {
    ref[last] = Number(value || 0);
  } else {
    ref[last] = value;
  }
}

function wireInputs() {
  document.querySelectorAll("[data-key]").forEach((input) => {
    input.addEventListener("input", () => {
      setByPath(state, input.dataset.key, input.value);
    });
  });
}

function mount() {
  renderMenus();
  renderPages();
  renderProducts();
  wireInputs();
}

async function initAdmin() {
  const authenticated = await ensureAdminSession();
  if (!authenticated) return;

  mount();

  document.getElementById("addProduct").addEventListener("click", () => {
    const next = state.products.length + 1;
    state.products.push({
      id: `p${next}`,
      category: "rings",
      price: 0,
      image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80",
      name: { he: "מוצר חדש", en: "New Product" },
      description: { he: "תיאור", en: "Description" }
    });
    mount();
  });

  document.getElementById("saveAll").addEventListener("click", () => {
    saveSiteData(state);
    alert("Saved. Changes are now live on the storefront.");
  });

  document.getElementById("exportJson").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "collier-site-data.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("adminLogout")?.addEventListener("click", async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "same-origin"
      });
    } finally {
      window.location.replace("/admin-login.html");
    }
  });
}

initAdmin();
