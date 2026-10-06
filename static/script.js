const CATEGORY_COLORS = [
  "#f4a8c0", // baby pink
  "#ee7a99", // rose pink
  "#e4607e", // light red / rose
  "#f7c6d9", // pale pink
  "#d1485f", // deeper red
  "#f08fa8", // soft pink
  "#c9304d", // brick red
  "#b9274a", // deep red (reserved for "Other")
];

const form = document.getElementById("transaction-form");
const idField = document.getElementById("transaction-id");
const dateField = document.getElementById("date");
const typeField = document.getElementById("type");
const categoryField = document.getElementById("category");
const amountField = document.getElementById("amount");
const noteField = document.getElementById("note");
const submitBtn = document.getElementById("submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit");
const monthFilter = document.getElementById("month-filter");
const clearFilterBtn = document.getElementById("clear-filter");
const tbody = document.getElementById("transactions-body");
const tableEmpty = document.getElementById("table-empty");
const chartEmpty = document.getElementById("chart-empty");

let chart = null;

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMoney(value) {
  return `$${value.toFixed(2)}`;
}

function apiUrl(path) {
  const month = monthFilter.value;
  return month ? `${path}?month=${month}` : path;
}

async function loadAll() {
  const [transactions, summary] = await Promise.all([
    fetch(apiUrl("/api/transactions")).then((r) => r.json()),
    fetch(apiUrl("/api/summary")).then((r) => r.json()),
  ]);
  renderTable(transactions);
  renderSummary(summary);
  renderChart(summary.by_category);
}

function renderTable(transactions) {
  tbody.innerHTML = "";
  tableEmpty.hidden = transactions.length > 0;
  for (const t of transactions) {
    const tr = document.createElement("tr");
    tr.className = t.type === "income" ? "row-income" : "row-expense";
    tr.innerHTML = `
      <td>${t.date}</td>
      <td>${t.type}</td>
      <td>${t.category}</td>
      <td>${t.note ?? ""}</td>
      <td class="amount">${t.type === "income" ? "+" : "-"}${formatMoney(t.amount)}</td>
      <td class="actions">
        <button type="button" data-action="edit" data-id="${t.id}">Edit</button>
        <button type="button" data-action="delete" data-id="${t.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

function renderSummary(summary) {
  document.getElementById("summary-income").textContent = formatMoney(summary.income);
  document.getElementById("summary-expenses").textContent = formatMoney(summary.expenses);
  document.getElementById("summary-balance").textContent = formatMoney(summary.balance);
}

function renderChart(byCategory) {
  const ctx = document.getElementById("category-chart");
  chartEmpty.hidden = byCategory.length > 0;
  ctx.style.display = byCategory.length > 0 ? "block" : "none";

  // Cap at the first 7 categorical slots; fold the rest into "Other" so the
  // palette's safe ordering is never exceeded.
  const MAX_SLICES = 7;
  let labels, data;
  if (byCategory.length > MAX_SLICES) {
    const top = byCategory.slice(0, MAX_SLICES);
    const rest = byCategory.slice(MAX_SLICES);
    const otherTotal = rest.reduce((sum, c) => sum + c.total, 0);
    labels = [...top.map((c) => c.category), "Other"];
    data = [...top.map((c) => c.total), otherTotal];
  } else {
    labels = byCategory.map((c) => c.category);
    data = byCategory.map((c) => c.total);
  }

  if (chart) {
    chart.destroy();
  }
  if (byCategory.length === 0) {
    return;
  }
  chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: CATEGORY_COLORS.slice(0, labels.length),
          borderColor: "#fff5f8",
          borderWidth: 2,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          position: "right",
          labels: { color: "#5b2a3e" },
        },
        tooltip: {
          callbacks: {
            label: (item) => ` ${item.label}: ${formatMoney(item.raw)}`,
          },
        },
      },
    },
  });
}

function resetForm() {
  form.reset();
  idField.value = "";
  dateField.value = new Date().toISOString().slice(0, 10);
  submitBtn.textContent = "Add Transaction";
  cancelEditBtn.hidden = true;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    date: dateField.value,
    type: typeField.value,
    category: categoryField.value.trim(),
    amount: parseFloat(amountField.value),
    note: noteField.value.trim() || null,
  };
  const id = idField.value;
  if (id) {
    await fetch(`/api/transactions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } else {
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }
  resetForm();
  loadAll();
});

cancelEditBtn.addEventListener("click", resetForm);

tbody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;

  if (btn.dataset.action === "delete") {
    if (!confirm("Delete this transaction?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    loadAll();
    return;
  }

  if (btn.dataset.action === "edit") {
    const res = await fetch("/api/transactions");
    const all = await res.json();
    const t = all.find((x) => String(x.id) === id);
    if (!t) return;
    idField.value = t.id;
    dateField.value = t.date;
    typeField.value = t.type;
    categoryField.value = t.category;
    amountField.value = t.amount;
    noteField.value = t.note ?? "";
    submitBtn.textContent = "Save Changes";
    cancelEditBtn.hidden = false;
  }
});

monthFilter.addEventListener("change", loadAll);
clearFilterBtn.addEventListener("click", () => {
  monthFilter.value = "";
  loadAll();
});

monthFilter.value = currentMonth();
resetForm();
loadAll();
