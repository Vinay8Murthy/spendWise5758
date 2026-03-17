const STORAGE_KEY = "expenseTrackerTransactions";
const FIELD_CONFIG = [
  { key: "date", listId: "" },
  { key: "description", listId: "" },
  { key: "debit", listId: "" },
  { key: "credit", listId: "" },
  { key: "category", listId: "categoryOptions" },
  { key: "subCategory", listId: "subCategoryOptions" },
  { key: "group", listId: "groupOptions" }
];

let transactions = loadTransactions();

document.getElementById("addRowBtn").onclick = addRow;
document.getElementById("csvBtn").onclick = downloadCsv;
document.getElementById("excelBtn").onclick = downloadExcel;
document.getElementById("clearBtn").onclick = clearAll;

render();

function loadTransactions() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw).map(createTransactionRecord);
  } catch (error) {
    console.error("Failed to load transactions", error);
    return [];
  }
}

function createTransactionRecord(transaction = {}) {
  return {
    date: transaction.date || "",
    description: transaction.description || "",
    debit: transaction.debit || "",
    credit: transaction.credit || "",
    category: transaction.category || "",
    subCategory: transaction.subCategory || "",
    group: transaction.group || ""
  };
}

function render() {
  const tbody = document.querySelector("#table tbody");
  const trackerStatus = document.getElementById("trackerStatus");

  tbody.innerHTML = "";

  if (!transactions.length) {
    trackerStatus.textContent = "No records loaded yet. Scan a statement or add a row manually.";
  } else {
    trackerStatus.textContent = `${transactions.length} record(s) ready to review.`;
  }

  transactions.forEach((transaction, index) => {
    const row = document.createElement("tr");

    FIELD_CONFIG.forEach(field => {
      const cell = document.createElement("td");
      const input = document.createElement("input");

      input.value = transaction[field.key];
      input.setAttribute("aria-label", field.key);

      if (field.listId) {
        input.setAttribute("list", field.listId);
      }

      input.addEventListener("input", event => {
        update(index, field.key, event.target.value);
      });

      cell.appendChild(input);
      row.appendChild(cell);
    });

    const actionCell = document.createElement("td");
    const removeButton = document.createElement("button");

    removeButton.textContent = "Delete";
    removeButton.className = "danger";
    removeButton.onclick = () => removeRow(index);
    actionCell.appendChild(removeButton);
    row.appendChild(actionCell);

    tbody.appendChild(row);
  });

  renderSuggestions();
}

function renderSuggestions() {
  renderDatalist("categoryOptions", "category");
  renderDatalist("subCategoryOptions", "subCategory");
  renderDatalist("groupOptions", "group");
}

function renderDatalist(listId, key) {
  const datalist = document.getElementById(listId);
  const values = [...new Set(transactions.map(item => item[key]).filter(Boolean))].sort();

  datalist.innerHTML = values.map(value => `<option value="${escapeHtml(value)}"></option>`).join("");
}

function update(index, key, value) {
  transactions[index][key] = value;
  saveTransactions();

  if (key === "category" || key === "subCategory" || key === "group") {
    renderSuggestions();
  }
}

function removeRow(index) {
  transactions.splice(index, 1);
  saveTransactions();
  render();
}

function addRow() {
  transactions.push(createTransactionRecord());
  saveTransactions();
  render();
}

function clearAll() {
  transactions = [];
  saveTransactions();
  render();
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function downloadCsv() {
  const csv = Papa.unparse(transactions);
  downloadFile(csv, "transactions.csv", "text/csv");
}

function downloadExcel() {
  const ws = XLSX.utils.json_to_sheet(transactions);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  XLSX.writeFile(wb, "transactions.xlsx");
}

function downloadFile(content, name, type) {
  const blob = new Blob([content], { type });
  const anchor = document.createElement("a");

  anchor.href = URL.createObjectURL(blob);
  anchor.download = name;
  anchor.click();

  URL.revokeObjectURL(anchor.href);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
