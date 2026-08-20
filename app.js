const API_URL = "http://127.0.0.1:5000/api";

const state = {
  dashboard: null,
  clientes: [],
  veiculos: [],
  ordens: [],
  view: "dashboard",
  status: "",
  busca: "",
};

const statusLabels = {
  recebida: "Recebida",
  em_servico: "Em serviço",
  aguardando_peca: "Aguardando peça",
  pronta: "Pronta",
  entregue: "Entregue",
};

const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "A definir";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.erro || `Erro ${response.status} ao acessar a API.`);
  return payload;
}

function setLoading(active) {
  $("#loading-overlay").hidden = !active;
}

function showToast(message, error = false) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.toggle("is-error", error);
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function setApiStatus(online) {
  const indicator = $("#api-indicator");
  indicator.classList.toggle("is-online", online);
  indicator.classList.toggle("is-offline", !online);
  $("span:last-child", indicator).textContent = online ? "API conectada" : "API desconectada";
}

async function loadData(showOverlay = true) {
  if (showOverlay) setLoading(true);
  try {
    const [health, dashboard, clientes, veiculos, ordens] = await Promise.all([
      api("/saude"),
      api("/dashboard"),
      api("/clientes"),
      api("/veiculos"),
      api("/ordens"),
    ]);
    setApiStatus(health.status === "online");
    Object.assign(state, { dashboard, clientes, veiculos, ordens });
    renderAll();
  } catch (error) {
    setApiStatus(false);
    showToast(`${error.message} Inicie a API Flask e atualize a página.`, true);
    renderAll();
  } finally {
    setLoading(false);
  }
}

function matchesSearch(...values) {
  if (!state.busca) return true;
  const text = values.join(" ").toLocaleLowerCase("pt-BR");
  return text.includes(state.busca.toLocaleLowerCase("pt-BR"));
}

function statusBadge(status) {
  return `<span class="status-badge" data-status="${escapeHtml(status)}">${escapeHtml(statusLabels[status] || status)}</span>`;
}

function renderDashboard() {
  const counts = state.dashboard?.contagens || {};
  const stats = [
    ["OS", "Em serviço", counts.em_servico || 0, "orange"],
    ["AP", "Aguardando peça", counts.aguardando_peca || 0, "yellow"],
    ["✓", "Prontas", counts.pronta || 0, "green"],
    ["R", "Recebidas", counts.recebida || 0, "blue"],
  ];
  $("#stats-grid").innerHTML = stats.map(([symbol, label, value, tone]) => `
    <article class="stat-card" data-tone="${tone}"><span class="stat-symbol" aria-hidden="true">${symbol}</span><div><small>${label}</small><strong>${value}</strong></div></article>
  `).join("");

  const recent = (state.dashboard?.ordens_recentes || []).filter(item => matchesSearch(item.id, item.cliente_nome, item.placa, item.servico));
  $("#recent-orders").innerHTML = recent.length ? recent.map(order => `
    <tr><td><span class="primary-cell">#${order.id} · ${escapeHtml(order.cliente_nome)}</span><span class="secondary-cell">${formatDate(order.criado_em)}</span></td><td>${escapeHtml(order.modelo)} · ${escapeHtml(order.placa)}</td><td>${escapeHtml(order.servico)}</td><td>${statusBadge(order.status)}</td></tr>
  `).join("") : `<tr><td colspan="4">Nenhum serviço recente.</td></tr>`;

  const total = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);
  $("#orders-total").textContent = `${total} ${total === 1 ? "ordem" : "ordens"}`;
  const flows = [
    ["Recebidas", counts.recebida || 0],
    ["Em serviço", counts.em_servico || 0],
    ["Finalizadas", (counts.pronta || 0) + (counts.entregue || 0)],
  ];
  $("#flow-list").innerHTML = flows.map(([label, value]) => {
    const percent = total ? Math.round((value / total) * 100) : 0;
    return `<div class="flow-item"><div class="flow-caption"><strong>${label}</strong><span>${value} / ${total}</span></div><div class="progress-track" role="progressbar" aria-label="${label}" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="${total}"><div class="progress-bar" style="width:${percent}%"></div></div></div>`;
  }).join("");
}

function renderOrders() {
  const orders = state.ordens.filter(order => (!state.status || order.status === state.status) && matchesSearch(order.id, order.cliente_nome, order.placa, order.marca, order.modelo, order.servico));
  $("#orders-table-body").innerHTML = orders.map(order => `
    <tr>
      <td><span class="primary-cell">#${order.id}</span><span class="secondary-cell">${formatCurrency(order.valor)}</span></td>
      <td>${escapeHtml(order.cliente_nome)}<span class="secondary-cell">${escapeHtml(order.cliente_telefone)}</span></td>
      <td>${escapeHtml(order.marca)} ${escapeHtml(order.modelo)}<span class="secondary-cell">${escapeHtml(order.placa)}</span></td>
      <td>${escapeHtml(order.farol)}<span class="secondary-cell">${escapeHtml(order.servico)}</span></td>
      <td>${formatDate(order.previsao)}</td>
      <td><label><span class="sr-only">Status da ordem #${order.id}</span><select class="status-select" data-order-status="${order.id}">${Object.entries(statusLabels).map(([value, label]) => `<option value="${value}" ${value === order.status ? "selected" : ""}>${label}</option>`).join("")}</select></label></td>
      <td><div class="row-actions"><button class="delete-button" type="button" data-delete-order="${order.id}" aria-label="Excluir ordem #${order.id}">×</button></div></td>
    </tr>
  `).join("");
  $("#orders-empty").hidden = orders.length > 0;
}

function renderClients() {
  const clients = state.clientes.filter(client => matchesSearch(client.nome, client.telefone, client.email));
  $("#clients-grid").innerHTML = clients.map(client => `
    <article class="entity-card">
      <div class="entity-heading"><span class="entity-avatar" aria-hidden="true">${escapeHtml(client.nome.slice(0, 1).toUpperCase())}</span><div><h2>${escapeHtml(client.nome)}</h2><p>Cliente #${client.id}</p></div></div>
      <div class="entity-details"><div class="entity-detail"><span aria-hidden="true">T</span><strong>${escapeHtml(client.telefone)}</strong></div><div class="entity-detail"><span aria-hidden="true">@</span>${escapeHtml(client.email || "E-mail não informado")}</div></div>
      <div class="entity-card-footer"><span class="entity-count">${client.total_veiculos} veículo(s) · ${client.total_ordens} ordem(ns)</span><button class="delete-button" type="button" data-delete-client="${client.id}" aria-label="Excluir cliente ${escapeHtml(client.nome)}">×</button></div>
    </article>
  `).join("");
  $("#clients-empty").hidden = clients.length > 0;
}

function renderVehicles() {
  const vehicles = state.veiculos.filter(vehicle => matchesSearch(vehicle.cliente_nome, vehicle.placa, vehicle.marca, vehicle.modelo, vehicle.cor));
  $("#vehicles-grid").innerHTML = vehicles.map(vehicle => `
    <article class="entity-card">
      <div class="entity-heading"><span class="entity-avatar" aria-hidden="true">V</span><div><h2>${escapeHtml(vehicle.marca)} ${escapeHtml(vehicle.modelo)}</h2><p>${escapeHtml(vehicle.placa)} · ${escapeHtml(vehicle.cor || "Cor não informada")}</p></div></div>
      <div class="entity-details"><div class="entity-detail"><span aria-hidden="true">C</span><strong>${escapeHtml(vehicle.cliente_nome)}</strong></div><div class="entity-detail"><span aria-hidden="true">A</span>${escapeHtml(vehicle.ano || "Ano não informado")}</div></div>
      <div class="entity-card-footer"><span class="entity-count">${vehicle.total_ordens} ordem(ns) de serviço</span><button class="delete-button" type="button" data-delete-vehicle="${vehicle.id}" aria-label="Excluir veículo ${escapeHtml(vehicle.placa)}">×</button></div>
    </article>
  `).join("");
  $("#vehicles-empty").hidden = vehicles.length > 0;
}

function updateSelects() {
  $("#vehicle-client-select").innerHTML = `<option value="">Selecione um cliente...</option>${state.clientes.map(client => `<option value="${client.id}">${escapeHtml(client.nome)} · ${escapeHtml(client.telefone)}</option>`).join("")}`;
  $("#order-vehicle-select").innerHTML = `<option value="">Selecione um veículo...</option>${state.veiculos.map(vehicle => `<option value="${vehicle.id}">${escapeHtml(vehicle.placa)} · ${escapeHtml(vehicle.marca)} ${escapeHtml(vehicle.modelo)} · ${escapeHtml(vehicle.cliente_nome)}</option>`).join("")}`;
}

function renderAll() {
  renderDashboard();
  renderOrders();
  renderClients();
  renderVehicles();
  updateSelects();
}

function changeView(view) {
  state.view = view;
  $$(".view").forEach(section => section.classList.toggle("is-active", section.id === `view-${view}`));
  $$(".nav-item").forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openDialog(id) {
  const dialog = document.getElementById(id);
  if (id === "veiculo-dialog" && !state.clientes.length) return showToast("Cadastre um cliente antes de adicionar um veículo.", true);
  if (id === "ordem-dialog" && !state.veiculos.length) return showToast("Cadastre um veículo antes de criar uma ordem.", true);
  dialog.showModal();
  $("input, select, textarea", dialog)?.focus();
}

function formDataAsObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function submitForm(form, path, successMessage, transform = value => value) {
  setLoading(true);
  try {
    await api(path, { method: "POST", body: JSON.stringify(transform(formDataAsObject(form))) });
    form.closest("dialog").close();
    form.reset();
    showToast(successMessage);
    await loadData(false);
  } catch (error) {
    showToast(error.message, true);
    setLoading(false);
  }
}

async function removeItem(path, message) {
  setLoading(true);
  try {
    await api(path, { method: "DELETE" });
    showToast(message);
    await loadData(false);
  } catch (error) {
    showToast(error.message, true);
    setLoading(false);
  }
}

document.addEventListener("click", event => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) changeView(viewButton.dataset.view);
  const openButton = event.target.closest("[data-open-dialog]");
  if (openButton) openDialog(openButton.dataset.openDialog);
  if (event.target.closest("[data-close-dialog]")) event.target.closest("dialog").close();

  const orderId = event.target.closest("[data-delete-order]")?.dataset.deleteOrder;
  if (orderId && window.confirm(`Excluir definitivamente a ordem #${orderId}?`)) removeItem(`/ordens/${orderId}`, "Ordem excluída.");
  const vehicleId = event.target.closest("[data-delete-vehicle]")?.dataset.deleteVehicle;
  if (vehicleId && window.confirm("Excluir este veículo?")) removeItem(`/veiculos/${vehicleId}`, "Veículo excluído.");
  const clientId = event.target.closest("[data-delete-client]")?.dataset.deleteClient;
  if (clientId && window.confirm("Excluir este cliente?")) removeItem(`/clientes/${clientId}`, "Cliente excluído.");
});

$("#global-search").addEventListener("input", event => {
  state.busca = event.target.value.trim();
  renderAll();
});

$("#order-filters").addEventListener("click", event => {
  const button = event.target.closest("[data-status]");
  if (!button) return;
  state.status = button.dataset.status;
  $$(".filter-chip").forEach(item => item.classList.toggle("is-active", item === button));
  renderOrders();
});

$("#orders-table-body").addEventListener("change", async event => {
  const select = event.target.closest("[data-order-status]");
  if (!select) return;
  const orderId = select.dataset.orderStatus;
  select.disabled = true;
  try {
    await api(`/ordens/${orderId}`, { method: "PATCH", body: JSON.stringify({ status: select.value }) });
    showToast(`Status da ordem #${orderId} atualizado.`);
    await loadData(false);
  } catch (error) {
    showToast(error.message, true);
    select.disabled = false;
  }
});

$("#cliente-form").addEventListener("submit", event => {
  event.preventDefault();
  submitForm(event.currentTarget, "/clientes", "Cliente cadastrado com sucesso.");
});

$("#veiculo-form").addEventListener("submit", event => {
  event.preventDefault();
  submitForm(event.currentTarget, "/veiculos", "Veículo cadastrado com sucesso.", data => ({ ...data, cliente_id: Number(data.cliente_id), ano: data.ano ? Number(data.ano) : null }));
});

$("#ordem-form").addEventListener("submit", event => {
  event.preventDefault();
  submitForm(event.currentTarget, "/ordens", "Ordem de serviço criada com sucesso.", data => ({ ...data, veiculo_id: Number(data.veiculo_id), valor: data.valor ? Number(data.valor) : 0 }));
});

$$(".app-dialog").forEach(dialog => dialog.addEventListener("click", event => {
  const bounds = dialog.getBoundingClientRect();
  const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  if (outside) dialog.close();
}));

loadData();
