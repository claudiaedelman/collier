(function () {
  const MIN_AMOUNT = 400;

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

  function updateCartCount() {
    const node = document.getElementById("cartCount");
    if (!node) return;
    node.textContent = String(getList("collier-cart").length);
  }

  function wireGiftcardForm() {
    const form = document.getElementById("giftcardForm");
    if (!form) return;

    const amount = document.getElementById("giftAmount");
    const date = document.getElementById("giftDate");
    const recipientName = document.getElementById("recipientName");
    const recipientEmail = document.getElementById("recipientEmail");
    const senderName = document.getElementById("senderName");
    const message = document.getElementById("giftMessage");
    const addBtn = document.getElementById("giftAddBtn");
    const status = document.getElementById("giftStatus");

    const previewFrom = document.getElementById("previewFrom");
    const previewTo = document.getElementById("previewTo");
    const previewAmount = document.getElementById("previewAmount");

    function isEmailValid(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function syncState() {
      const amountValue = Number(amount.value || 0);
      const canSubmit =
        amountValue >= MIN_AMOUNT &&
        recipientName.value.trim().length > 0 &&
        isEmailValid(recipientEmail.value.trim()) &&
        senderName.value.trim().length > 0;

      addBtn.disabled = !canSubmit;
      previewFrom.textContent = senderName.value.trim() || "-";
      previewTo.textContent = recipientName.value.trim() || "-";
      previewAmount.textContent = amountValue >= MIN_AMOUNT ? `${amountValue} ₪` : "-";
    }

    [amount, date, recipientName, recipientEmail, senderName, message].forEach((field) => {
      field.addEventListener("input", syncState);
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const amountValue = Number(amount.value || 0);
      if (amountValue < MIN_AMOUNT) return;

      const cart = getList("collier-cart");
      cart.push(`giftcard-${Date.now()}-${amountValue}`);
      setList("collier-cart", cart);
      updateCartCount();

      status.textContent = "הגיפטקארד נוסף לסל בהצלחה";
      status.classList.add("ok");
    });

    syncState();
  }

  function wireShareButtons() {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent("גיפטקארד של Collier");
    document.querySelectorAll("[data-share]").forEach((button) => {
      button.addEventListener("click", () => {
        const channel = button.getAttribute("data-share");
        const links = {
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
          whatsapp: `https://wa.me/?text=${title}%20${url}`,
          instagram: `https://www.instagram.com/`
        };
        window.open(links[channel], "_blank", "noopener,noreferrer");
      });
    });
  }

  wireGiftcardForm();
  wireShareButtons();
  updateCartCount();
})();
