const STORAGE_KEY = "expenseTrackerTransactions";
const OPTIONS_STORAGE_KEY = "expenseTrackerOptions";
const DATE_INPUT_PATTERN = /^\d{2}[\/-]\d{2}[\/-]\d{2,4}$/;
const FIELD_CONFIG = [
  { key: "date", type: "text" },
  { key: "description", type: "text" },
  { key: "debit", type: "number" },
  { key: "credit", type: "number" },
  { key: "category", type: "select", optionType: "category" },
  { key: "subCategory", type: "select", optionType: "subCategory" },
  { key: "group", type: "select", optionType: "group" }
];
const OPTION_CONFIG = {
  category: {
    inputId: "categoryInput",
    listId: "categoryList",
    errorId: "categoryError",
    emptyMessage: "No categories created yet.",
    panelName: "categories"
  },
  subCategory: {
    inputId: "subCategoryInput",
    listId: "subCategoryList",
    errorId: "subCategoryError",
    emptyMessage: "No sub categories created yet.",
    panelName: "subCategories"
  },
  group: {
    inputId: "groupInput",
    listId: "groupList",
    errorId: "groupError",
    emptyMessage: "No groups created yet.",
    panelName: "groups"
  }
};
const NEW_OPTION_VALUE = "__new__";

let transactions = loadTransactions();
let options = loadOptions();

document.getElementById("addRowBtn").onclick = addRow;
document.getElementById("csvBtn").onclick = downloadCsv;
document.getElementById("excelBtn").onclick = downloadExcel;
document.getElementById("pdfBtn").onclick = downloadPdf;
document.getElementById("clearBtn").onclick = clearAll;

bindTabs();
bindOptionManagers();
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

function loadOptions() {
  const fallback = {
    category: [],
    subCategory: [],
    group: []
  };
  const raw = localStorage.getItem(OPTIONS_STORAGE_KEY);

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);

    return {
      category: sanitizeOptions(parsed.category),
      subCategory: sanitizeOptions(parsed.subCategory),
      group: sanitizeOptions(parsed.group)
    };
  } catch (error) {
    console.error("Failed to load options", error);
    return fallback;
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
    group: transaction.group || "",
    sourceFile: transaction.sourceFile || "",
    importedAt: transaction.importedAt || ""
  };
}

function render() {
  const tbody = document.querySelector("#table tbody");
  const trackerStatus = document.getElementById("trackerStatus");
  const validationSummary = document.getElementById("validationSummary");
  const issues = collectValidationIssues();

  tbody.innerHTML = "";

  if (!transactions.length) {
    trackerStatus.textContent = "No records loaded yet. Scan a statement or add a row manually.";
  } else {
    trackerStatus.textContent =
      `${transactions.length} total record(s) ready to review. ` +
      "Previously scanned records stay here until you clear them.";
  }

  validationSummary.textContent = issues.length
    ? `${issues.length} validation issue(s) found. Complete the highlighted fields before exporting.`
    : "All records look valid for export.";
  validationSummary.className = issues.length ? "validation-summary invalid" : "validation-summary valid";

  transactions.forEach((transaction, index) => {
    const row = document.createElement("tr");
    const rowIssues = validateTransaction(transaction);

    FIELD_CONFIG.forEach(field => {
      const cell = document.createElement("td");
      let control;

      if (field.type === "select") {
        control = createSelect(field.optionType, transaction[field.key], value => {
          if (value === NEW_OPTION_VALUE) {
            createOptionFromPrompt(field.optionType, index, field.key, transaction[field.key]);
            return;
          }

          update(index, field.key, value);
        });
      } else {
        control = document.createElement("input");
        control.value = transaction[field.key];
        control.type = field.type === "number" ? "text" : "text";
        control.setAttribute("aria-label", field.key);

        if (field.key === "date") {
          control.placeholder = "DD/MM/YY";
        }

        if (field.key === "debit" || field.key === "credit") {
          control.placeholder = "0.00";
        }

        control.addEventListener("input", event => {
          update(index, field.key, event.target.value);
        });
      }

      if (rowIssues[field.key]) {
        control.classList.add("field-error");
        control.title = rowIssues[field.key];
      }

      cell.appendChild(control);
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

  renderOptionManagers();
}

function bindTabs() {
  document.querySelectorAll(".tab-button").forEach(button => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });
}

function setActiveTab(tabName) {
  document.querySelectorAll(".tab-button").forEach(button => {
    const active = button.dataset.tab === tabName;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });

  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.dataset.panel === tabName);
  });
}

function update(index, key, value) {
  transactions[index][key] = value;
  saveTransactions();
  render();
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

function saveOptions() {
  localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(options));
}

function downloadCsv() {
  if (!ensureValidForExport()) {
    return;
  }

  const csv = Papa.unparse(transactions);
  downloadFile(csv, "transactions.csv", "text/csv");
}

function downloadExcel() {
  if (!ensureValidForExport()) {
    return;
  }

  const ws = XLSX.utils.json_to_sheet(transactions);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  XLSX.writeFile(wb, "transactions.xlsx");
}

function downloadPdf() {
  if (!ensureValidForExport()) {
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });
  const rows = transactions.map(transaction => [
    transaction.date,
    transaction.description,
    transaction.debit,
    transaction.credit,
    transaction.category,
    transaction.subCategory,
    transaction.group
  ]);

  doc.setFontSize(16);
  doc.text("Expense Tracker Export", 14, 16);
  doc.autoTable({
    startY: 24,
    head: [["Date", "Description", "Debit", "Credit", "Category", "Sub Category", "Group"]],
    body: rows,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [31, 107, 82] },
    columnStyles: { 1: { cellWidth: 70 } }
  });
  doc.save("transactions.pdf");
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

function bindOptionManagers() {
  document.querySelectorAll("[data-add-option]").forEach(button => {
    button.addEventListener("click", () => {
      addOption(button.dataset.addOption);
    });
  });
}

function renderOptionManagers() {
  Object.keys(OPTION_CONFIG).forEach(type => {
    const { listId, emptyMessage, errorId } = OPTION_CONFIG[type];
    const container = document.getElementById(listId);
    const error = document.getElementById(errorId);

    error.textContent = "";

    if (!options[type].length) {
      container.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
      return;
    }

    container.innerHTML = options[type]
      .map(
        option => `
          <div class="option-row">
            <input
              type="text"
              value="${escapeHtml(option)}"
              data-option-type="${type}"
              data-option-value="${escapeHtml(option)}"
            >
            <button class="secondary" data-save-option="${type}" data-previous-value="${escapeHtml(option)}">Save</button>
            <button class="danger" data-delete-option="${type}" data-option-value="${escapeHtml(option)}">Delete</button>
          </div>
        `
      )
      .join("");
  });

  bindOptionRowActions();
}

function bindOptionRowActions() {
  document.querySelectorAll("[data-save-option]").forEach(button => {
    button.onclick = () => {
      const type = button.dataset.saveOption;
      const previousValue = button.dataset.previousValue;
      const input = button.parentElement.querySelector("input");
      renameOption(type, previousValue, input.value);
    };
  });

  document.querySelectorAll("[data-delete-option]").forEach(button => {
    button.onclick = () => {
      deleteOption(button.dataset.deleteOption, button.dataset.optionValue);
    };
  });
}

function createSelect(type, selectedValue, onChange) {
  const select = document.createElement("select");
  const placeholder = document.createElement("option");

  placeholder.value = "";
  placeholder.textContent = `Select ${type}`;
  select.appendChild(placeholder);

  options[type].forEach(option => {
    const optionElement = document.createElement("option");

    optionElement.value = option;
    optionElement.textContent = option;
    select.appendChild(optionElement);
  });

  const newOptionElement = document.createElement("option");
  newOptionElement.value = NEW_OPTION_VALUE;
  newOptionElement.textContent = "Add new...";
  select.appendChild(newOptionElement);

  select.value = options[type].includes(selectedValue) ? selectedValue : "";
  select.addEventListener("change", event => onChange(event.target.value));
  select.setAttribute("aria-label", type);

  return select;
}

function createOptionFromPrompt(type, rowIndex, fieldKey, currentValue) {
  const label = readableType(type);
  const value = window.prompt(`Create a new ${label.toLowerCase()}:`, currentValue || "");

  if (value === null) {
    render();
    return;
  }

  const result = addOption(type, value, false);

  if (!result.ok) {
    showOptionError(type, result.message);
    render();
    return;
  }

  update(rowIndex, fieldKey, result.value);
  setActiveTab("records");
}

function addOption(type, explicitValue, switchTab = true) {
  const config = OPTION_CONFIG[type];
  const input = document.getElementById(config.inputId);
  const rawValue = explicitValue !== undefined ? explicitValue : input.value;
  const value = sanitizeOption(rawValue);

  if (!value) {
    showOptionError(type, `Enter a ${readableType(type).toLowerCase()} name before saving.`);
    return { ok: false, message: "Missing option value." };
  }

  if (options[type].some(option => option.toLowerCase() === value.toLowerCase())) {
    showOptionError(type, `${readableType(type)} already exists.`);
    return { ok: false, message: "Duplicate option value." };
  }

  options[type].push(value);
  options[type].sort((a, b) => a.localeCompare(b));
  saveOptions();
  render();

  if (explicitValue === undefined) {
    input.value = "";
  }

  if (switchTab) {
    setActiveTab(OPTION_CONFIG[type].panelName);
  }

  return { ok: true, value };
}

function renameOption(type, previousValue, nextValue) {
  const cleaned = sanitizeOption(nextValue);

  if (!cleaned) {
    showOptionError(type, `${readableType(type)} cannot be empty.`);
    render();
    return;
  }

  if (
    cleaned.toLowerCase() !== previousValue.toLowerCase() &&
    options[type].some(option => option.toLowerCase() === cleaned.toLowerCase())
  ) {
    showOptionError(type, `${readableType(type)} already exists.`);
    render();
    return;
  }

  options[type] = options[type].map(option => (option === previousValue ? cleaned : option));
  transactions = transactions.map(transaction => {
    if (transaction[type] === previousValue) {
      return { ...transaction, [type]: cleaned };
    }

    return transaction;
  });

  saveOptions();
  saveTransactions();
  render();
}

function deleteOption(type, value) {
  options[type] = options[type].filter(option => option !== value);
  transactions = transactions.map(transaction => {
    if (transaction[type] === value) {
      return { ...transaction, [type]: "" };
    }

    return transaction;
  });

  saveOptions();
  saveTransactions();
  render();
}

function sanitizeOptions(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.map(sanitizeOption).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function sanitizeOption(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function showOptionError(type, message) {
  document.getElementById(OPTION_CONFIG[type].errorId).textContent = message;
}

function collectValidationIssues() {
  return transactions.flatMap((transaction, index) => {
    const issues = validateTransaction(transaction);

    return Object.values(issues).map(message => `Row ${index + 1}: ${message}`);
  });
}

function validateTransaction(transaction) {
  const issues = {};
  const hasDebit = Boolean(String(transaction.debit).trim());
  const hasCredit = Boolean(String(transaction.credit).trim());

  if (!DATE_INPUT_PATTERN.test(String(transaction.date).trim())) {
    issues.date = "Use a valid date like DD/MM/YY or DD-MM-YYYY.";
  }

  if (!String(transaction.description).trim()) {
    issues.description = "Description is required.";
  }

  if (hasDebit && !isValidAmount(transaction.debit)) {
    issues.debit = "Debit must be a valid amount.";
  }

  if (hasCredit && !isValidAmount(transaction.credit)) {
    issues.credit = "Credit must be a valid amount.";
  }

  if (!hasDebit && !hasCredit) {
    issues.debit = "Enter either a debit or a credit amount.";
    issues.credit = "Enter either a debit or a credit amount.";
  }

  if (hasDebit && hasCredit) {
    issues.debit = "Use only one of debit or credit per row.";
    issues.credit = "Use only one of debit or credit per row.";
  }

  if (transaction.category && !options.category.includes(transaction.category)) {
    issues.category = "Choose a valid category.";
  }

  if (transaction.subCategory && !options.subCategory.includes(transaction.subCategory)) {
    issues.subCategory = "Choose a valid sub category.";
  }

  if (transaction.group && !options.group.includes(transaction.group)) {
    issues.group = "Choose a valid group.";
  }

  return issues;
}

function ensureValidForExport() {
  const issues = collectValidationIssues();

  if (!transactions.length) {
    window.alert("There are no records to export yet.");
    return false;
  }

  if (issues.length) {
    setActiveTab("records");
    window.alert("Please fix the highlighted validation issues before exporting.");
    render();
    return false;
  }

  return true;
}

function isValidAmount(value) {
  return /^\d+(?:\.\d{1,2})?$/.test(String(value).replace(/,/g, "").trim());
}

function readableType(type) {
  if (type === "subCategory") {
    return "Sub Category";
  }

  return type.charAt(0).toUpperCase() + type.slice(1);
}
