// Persistência simples via localStorage (chave -> JSON)

const STORAGE_KEYS = {
  CLIENTES: "crm_clientes",
  TOKEN: "crm_token",
  USERNAME: "crm_username",
};

// Clientes iniciais (seed) — usados só na primeira execução.
// Cada cliente recebe seu PRÓPRIO objeto de status (bug original: os 3
// clientes apontavam para o mesmo objeto `statusPadrao`, então mudar o
// status de um mudava o de todos).
function clientesSeed() {
  return [
    { id: 1, nome: "Ana Souza",  plano: "Pro",        status: { valor: "ativo", atualizadoEm: null } },
    { id: 2, nome: "Bruno Lima", plano: "Básico",     status: { valor: "ativo", atualizadoEm: null } },
    { id: 3, nome: "Carla Dias", plano: "Enterprise", status: { valor: "ativo", atualizadoEm: null } },
  ];
}

function getClientes() {
  const raw = localStorage.getItem(STORAGE_KEYS.CLIENTES);
  if (!raw) {
    const seed = clientesSeed();
    saveClientes(seed);
    return seed;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return clientesSeed();
  }
}

function saveClientes(clientes) {
  localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(clientes));
}

function proximoId(clientes) {
  return clientes.reduce((max, c) => Math.max(max, c.id), 0) + 1;
}

function addCliente(clientes, { nome, plano }) {
  const novo = {
    id: proximoId(clientes),
    nome,
    plano,
    status: { valor: "ativo", atualizadoEm: new Date().toLocaleString("pt-BR") },
  };
  const atualizados = [...clientes, novo];
  saveClientes(atualizados);
  return atualizados;
}

function deleteCliente(clientes, id) {
  const atualizados = clientes.filter((c) => c.id !== id);
  saveClientes(atualizados);
  return atualizados;
}

function updateStatusCliente(clientes, id, novoValor) {
  const atualizados = clientes.map((c) =>
    c.id === id
      ? { ...c, status: { valor: novoValor, atualizadoEm: new Date().toLocaleString("pt-BR") } }
      : c
  );
  saveClientes(atualizados);
  return atualizados;
}

// --- Sessão (login) ---

function setSessao(token, username) {
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.USERNAME, username);
}

function getToken() {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

function getUsername() {
  return localStorage.getItem(STORAGE_KEYS.USERNAME);
}

function limparSessao() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USERNAME);
}
