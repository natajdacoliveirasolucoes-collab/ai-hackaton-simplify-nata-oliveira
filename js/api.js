// Integração com a Fake Store API (https://fakestoreapi.com)

const API_BASE = "https://fakestoreapi.com";

async function apiLogin(username, password) {
  const resp = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!resp.ok) {
    throw new Error("Usuário ou senha inválidos");
  }
  return resp.json(); // { token }
}

async function apiGetProducts() {
  const resp = await fetch(`${API_BASE}/products`);
  if (!resp.ok) throw new Error("Falha ao buscar produtos");
  return resp.json();
}

async function apiGetCategories() {
  const resp = await fetch(`${API_BASE}/products/categories`);
  if (!resp.ok) throw new Error("Falha ao buscar categorias");
  return resp.json();
}
