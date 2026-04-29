async function checkSession() {
  try {
    const response = await fetch("/api/admin/session", { credentials: "same-origin" });
    if (!response.ok) return;
    const data = await response.json();
    if (data.authenticated) {
      window.location.replace("/admin.html");
    }
  } catch (_) {
    // Keep the login form visible if the request fails.
  }
}

function initLogin() {
  const form = document.getElementById("adminLoginForm");
  const message = document.getElementById("adminLoginMessage");
  if (!form || !message) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const username = String(formData.get("username") || "").trim();
    const password = String(formData.get("password") || "");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        message.textContent = "Invalid username or password.";
        message.classList.add("error");
        return;
      }

      message.textContent = "Login successful. Redirecting...";
      message.classList.remove("error");
      window.location.replace("/admin.html");
    } catch (_) {
      message.textContent = "Unable to login right now. Please try again.";
      message.classList.add("error");
    }
  });
}

checkSession();
initLogin();