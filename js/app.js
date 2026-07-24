// ---------- Login / logout (troca de view, sem navegação de página) ----------
function mostrarLogin() {
  document.getElementById("view-app").hidden = true;
  document.getElementById("view-login").hidden = false;
}

function mostrarApp() {
  document.getElementById("view-login").hidden = true;
  document.getElementById("view-app").hidden = false;
  document.getElementById("usuario-logado").textContent = getUsername() || "usuário";
  renderClientes();
  carregarLog();
  mostrarAba("tab-dashboard");
}

document.getElementById("btn-sair").addEventListener("click", () => {
  limparSessao();
  mostrarLogin();
});

const formLogin = document.getElementById("form-login");
const erroEl = document.getElementById("erro");
const btnEntrar = document.getElementById("btn-entrar");

formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  erroEl.textContent = "";
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  btnEntrar.disabled = true;
  btnEntrar.textContent = "Entrando...";
  try {
    const { token } = await apiLogin(username, password);
    setSessao(token, username);
    mostrarApp();
  } catch (err) {
    console.error("Falha no login:", err);
    erroEl.textContent = err.message || "Falha no login";
  } finally {
    btnEntrar.disabled = false;
    btnEntrar.textContent = "Entrar";
  }
});

const STATUS = ["ativo", "pendente", "inadimplente"];
const ROTULO_STATUS = { ativo: "Ativo", pendente: "Pendente", inadimplente: "Inadimplente" };

let clientes = getClientes();
let produtosCache = null; // preenchido sob demanda, reaproveitado por catálogo e dashboard

// ---------- Navegação por abas ----------
const links = document.querySelectorAll("nav.tabs a[data-target]");
function mostrarAba(idAlvo) {
  document.querySelectorAll("section[id^='tab-']").forEach((s) => (s.hidden = s.id !== idAlvo));
  links.forEach((l) => l.classList.toggle("ativa", l.dataset.target === idAlvo));
  if (idAlvo === "tab-catalogo") renderCatalogo();
  if (idAlvo === "tab-dashboard") renderDashboard();
}
links.forEach((l) => {
  l.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarAba(l.dataset.target);
  });
});

// ---------- Clientes (CRM) ----------
function clientesFiltrados() {
  const nomeFiltro = document.getElementById("filtro-nome").value.trim().toLowerCase();
  const statusFiltro = document.getElementById("filtro-status").value;

  return clientes.filter((c) => {
    const bateNome = !nomeFiltro || c.nome.toLowerCase().includes(nomeFiltro);
    const bateStatus = !statusFiltro || c.status.valor === statusFiltro;
    return bateNome && bateStatus;
  });
}

function renderClientes() {
  const tbody = document.getElementById("tbody-clientes");
  tbody.innerHTML = "";

  const listaVisivel = clientesFiltrados();

  if (listaVisivel.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="vazio-estado">Nenhum cliente encontrado.</td></tr>`;
    return;
  }

  for (const c of listaVisivel) {
    const tr = document.createElement("tr");
    const icone = c.status.valor === "inadimplente" ? "⚠ " : "";
    const options = STATUS.map(
      (s) => `<option value="${s}" ${s === c.status.valor ? "selected" : ""}>${ROTULO_STATUS[s]}</option>`
    ).join("");

    tr.innerHTML = `
      <td><span class="nome">${escapeHtml(c.nome)}</span></td>
      <td>${escapeHtml(c.plano)}</td>
      <td><span class="badge ${c.status.valor}">${icone}${ROTULO_STATUS[c.status.valor]}</span></td>
      <td><select data-id="${c.id}" class="select-status">${options}</select></td>
      <td><button class="perigo secundario" data-del="${c.id}">Excluir</button></td>
    `;
    tbody.appendChild(tr);
  }
}

const ICONE_LOG = { add: "+", del: "✕", status: "↻", alerta: "!" };

function renderLogItem(entrada) {
  const item = document.createElement("div");
  item.className = `log-item ${entrada.tipo}`;
  item.innerHTML = `
    <span class="icone">${ICONE_LOG[entrada.tipo] || "•"}</span>
    <span class="conteudo">
      <span class="msg">${escapeHtml(entrada.mensagem)}</span>
      <span class="meta">${escapeHtml(entrada.usuario || "usuário")} · ${entrada.quando}</span>
    </span>
  `;
  return item;
}

function registrarLog(tipo, mensagem, quando) {
  const entrada = {
    tipo,
    mensagem,
    quando: quando || new Date().toLocaleTimeString("pt-BR"),
    usuario: getUsername() || "usuário",
  };
  addLogEntrada(entrada);

  const lista = document.getElementById("log");
  const vazio = lista.querySelector(".log-vazio");
  if (vazio) vazio.remove();
  lista.prepend(renderLogItem(entrada));
}

function carregarLog() {
  const lista = document.getElementById("log");
  const entradas = getLogEntradas();
  if (entradas.length === 0) {
    lista.innerHTML = '<div class="log-vazio">Nenhuma ação ainda.</div>';
    return;
  }
  lista.innerHTML = "";
  entradas.forEach((entrada) => lista.appendChild(renderLogItem(entrada)));
}

document.getElementById("tbody-clientes").addEventListener("change", (e) => {
  if (!e.target.matches("select.select-status")) return;
  const id = Number(e.target.dataset.id);
  const novoValor = e.target.value;
  clientes = updateStatusCliente(clientes, id, novoValor);
  const cliente = clientes.find((c) => c.id === id);
  if (novoValor === "inadimplente") {
    registrarLog("alerta", `Ação disparada: ${cliente.nome} ficou INADIMPLENTE`, cliente.status.atualizadoEm);
  } else {
    registrarLog("status", `${cliente.nome} → ${ROTULO_STATUS[novoValor]}`, cliente.status.atualizadoEm);
  }
  renderClientes();
});

document.getElementById("tbody-clientes").addEventListener("click", (e) => {
  if (!e.target.matches("button[data-del]")) return;
  const id = Number(e.target.dataset.del);
  const cliente = clientes.find((c) => c.id === id);
  if (!cliente) return;
  if (!confirm(`Excluir o cliente "${cliente.nome}"?`)) return;
  clientes = deleteCliente(clientes, id);
  registrarLog("del", `Cliente removido: ${cliente.nome}`);
  renderClientes();
});

document.getElementById("form-add-cliente").addEventListener("submit", (e) => {
  e.preventDefault();
  const nomeInput = document.getElementById("input-nome");
  const nome = nomeInput.value.trim();
  const plano = document.getElementById("input-plano").value;
  if (!nome) return;
  clientes = addCliente(clientes, { nome, plano });
  registrarLog("add", `Cliente adicionado: ${nome} (${plano})`);
  nomeInput.value = "";
  renderClientes();
});

document.getElementById("filtro-nome").addEventListener("input", renderClientes);
document.getElementById("filtro-status").addEventListener("change", renderClientes);

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Catálogo (Fake Store API) ----------
async function getProdutos() {
  if (!produtosCache) {
    produtosCache = await apiGetProducts();
  }
  return produtosCache;
}

async function renderCatalogo() {
  const grid = document.getElementById("catalogo-grid");
  const select = document.getElementById("filtro-categoria");

  try {
    const produtos = await getProdutos();

    if (select.options.length === 1) {
      const categorias = [...new Set(produtos.map((p) => p.category))];
      categorias.forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
      });
    }

    const filtro = select.value;
    const filtrados = filtro ? produtos.filter((p) => p.category === filtro) : produtos;

    grid.innerHTML = filtrados
      .map(
        (p) => `
      <div class="produto">
        <img src="${p.image}" alt="${escapeHtml(p.title)}" loading="lazy" />
        <div class="titulo">${escapeHtml(p.title)}</div>
        <div class="categoria">${escapeHtml(p.category)}</div>
        <div class="preco">US$ ${p.price.toFixed(2)}</div>
      </div>`
      )
      .join("");
  } catch (err) {
    grid.innerHTML = `<div class="vazio-estado">Falha ao carregar produtos: ${err.message}</div>`;
  }
}

document.getElementById("filtro-categoria").addEventListener("change", renderCatalogo);

// ---------- Dashboard ----------
function statCard(valor, rotulo, modificador = "") {
  return `<div class="stat-card ${modificador}"><div class="valor">${valor}</div><div class="rotulo">${rotulo}</div></div>`;
}

function barraStatus(rotulo, qtd, total, cor) {
  const pct = total ? Math.round((qtd / total) * 100) : 0;
  return `
    <div class="barra-grupo">
      <div class="topo"><span>${rotulo}</span><span>${qtd} (${pct}%)</span></div>
      <div class="barra-trilho"><div class="barra-preenchimento" style="width:${pct}%; background:${cor}"></div></div>
    </div>`;
}

async function renderDashboard() {
  const total = clientes.length;
  const porStatus = { ativo: 0, pendente: 0, inadimplente: 0 };
  clientes.forEach((c) => porStatus[c.status.valor]++);

  document.getElementById("stat-grid").innerHTML =
    statCard(total, "Clientes") +
    statCard(porStatus.ativo, "Ativos", "ativos") +
    statCard(porStatus.pendente, "Pendentes", "pendentes") +
    statCard(porStatus.inadimplente, "Inadimplentes", "inadimplentes");

  document.getElementById("barras-status").innerHTML =
    barraStatus("Ativo", porStatus.ativo, total, "#157347") +
    barraStatus("Pendente", porStatus.pendente, total, "#b45309") +
    barraStatus("Inadimplente", porStatus.inadimplente, total, "#c02626");

  const box = document.getElementById("barras-categoria");
  try {
    const produtos = await getProdutos();
    const porCategoria = {};
    produtos.forEach((p) => (porCategoria[p.category] = (porCategoria[p.category] || 0) + 1));
    const totalProdutos = produtos.length;
    box.innerHTML = Object.entries(porCategoria)
      .map(([cat, qtd]) => barraStatus(cat, qtd, totalProdutos, "#0d9488"))
      .join("");
  } catch (err) {
    box.innerHTML = `<div class="vazio-estado">Falha ao carregar produtos: ${err.message}</div>`;
  }
}

// ---------- Início ----------
if (getToken()) {
  mostrarApp();
} else {
  mostrarLogin();
}
