const STORAGE_KEY = "expenseTrackerTransactions";

document.getElementById("scanBtn").onclick = async () => {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  const status = document.getElementById("status");

  if (!file) {
    status.textContent = "Please upload an image or PDF before scanning.";
    return;
  }

  try {
    status.textContent = "Extracting text from your file...";

    const text =
      file.type === "application/pdf"
        ? await extractTextFromPDF(file)
        : await extractTextFromImage(file);

    status.textContent = "Parsing transactions...";

    const transactions = detectAndParse(text).map(createTransactionRecord);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));

    status.textContent = `Parsed ${transactions.length} record(s). Opening expense tracker...`;
    window.location.href = "expense-tracker.html";
  } catch (error) {
    status.textContent = "Scanning failed. Please try a clearer file.";
    console.error(error);
  }
};

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

async function extractTextFromImage(file) {
  const res = await Tesseract.recognize(file, "eng");
  return res.data.text;
}

async function extractTextFromPDF(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(" ") + "\n";
  }

  return text;
}
