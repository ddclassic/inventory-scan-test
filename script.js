function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function setMsg(el, text, ok = true) {
  if (!el) return;
  el.textContent = text;
  el.className = ok ? "hint ok" : "hint bad";
}

function fillSelect(sel, items, placeholder) {
  if (!sel) return;
  sel.innerHTML = "";
  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = placeholder || "— Select —";
  sel.appendChild(ph);

  for (const it of (items || [])) {
    const opt = document.createElement("option");
    opt.value = it.id;       // ClickUp option ID
    opt.textContent = it.name;
    sel.appendChild(opt);
  }
}

// ====== SET THESE ======
const DEFAULT_BACKEND = "http://192.168.1.10:8080"; // <-- change if your PC IP changes
const AUTO_LOAD_DROPDOWNS = true;
const HIDE_BACKEND_FIELD = true;
const HIDE_TASK_FIELD = true;
const HIDE_LOAD_BUTTON = true;

// Normalizes common typos and ensures http:// is present
function normalizeBackend(raw) {
  let b = (raw || "").trim();

  // Fix common typo: "http//" -> "http://"
  b = b.replace(/^http\/\//i, "http://");

  // Remove trailing slashes
  b = b.replace(/\/+$/, "");

  // Remove accidental endpoint suffix
  b = b.replace(/\/(config|submit)$/i, "");

  // Add scheme if missing (e.g. 192.168.1.10:8080)
  if (b && !/^https?:\/\//i.test(b)) {
    b = "http://" + b;
  }

  return b;
}

async function loadConfig() {
  const msg = document.getElementById("loadMsg");

  const backend = normalizeBackend(
    document.getElementById("backendUrl")?.value || DEFAULT_BACKEND
  );

  if (!backend) {
    setMsg(msg, "Backend URL missing.", false);
    return;
  }

  const url = `${backend}/config`;

  try {
    const res = await fetch(url, { method: "GET" });
    const text = await res.text();

    if (!res.ok) {
      setMsg(msg, `Config load failed: ${url} — HTTP ${res.status}`, false);
      return;
    }

    const cfg = JSON.parse(text);

    fillSelect(document.getElementById("status"), cfg.statusOptions, "— Status —");
    fillSelect(document.getElementById("building"), cfg.buildingOptions, "— Building —");
    fillSelect(document.getElementById("shelf"), cfg.shelfOptions, "— Shelf —");
    fillSelect(document.getElementById("toteBox"), cfg.toteBoxOptions, "— Tote/Box —");
    fillSelect(document.getElementById("checkedOutBy"), cfg.checkedOutByOptions, "— Employee —");
    fillSelect(document.getElementById("condition"), cfg.conditionOptions, "— Condition —");

    setMsg(msg, "Dropdowns loaded.", true);
  } catch (err) {
    setMsg(msg, `Fetch failed: ${url} — ${err.message}`, false);
  }
}

async function submitForm(ev) {
  ev.preventDefault();

  const submitMsg = document.getElementById("submitMsg");
  const backend = normalizeBackend(
    document.getElementById("backendUrl")?.value || DEFAULT_BACKEND
  );

  if (!backend) { setMsg(submitMsg, "Backend URL missing.", false); return; }

  const taskIdFromQuery = qs("task");
  const taskId = (document.getElementById("taskId")?.value.trim() || taskIdFromQuery || "");
  if (!taskId) { setMsg(submitMsg, "Missing Task ID. Use ?task=xxxx in the QR URL.", false); return; }

  const payload = {
    taskId,
    action: document.getElementById("action").value,
    statusOptionId: document.getElementById("status").value || null,
    buildingOptionId: document.getElementById("building").value || null,
    shelfOptionId: document.getElementById("shelf").value || null,
    toteBoxOptionId: document.getElementById("toteBox").value || null,
    checkedOutByOptionId: document.getElementById("checkedOutBy").value || null,
    conditionOptionId: document.getElementById("condition").value || null,
    reason: document.getElementById("reason").value || ""
  };

  const photo = document.getElementById("photo").files?.[0];

  setMsg(submitMsg, "Submitting...", true);

  // Prefer JSON when no photo (more reliable)
  if (!photo) {
    const res = await fetch(`${backend}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    if (!res.ok) {
      setMsg(submitMsg, `Submit failed: HTTP ${res.status} — ${text}`, false);
      return;
    }
    setMsg(submitMsg, `Success: ${text}`, true);
    return;
  }

  // Multipart only when photo is present
  const fd = new FormData();
  fd.append("json", new Blob([JSON.stringify(payload)], { type: "application/json" }));
  fd.append("photo", photo, photo.name);

  const res = await fetch(`${backend}/submit`, { method: "POST", body: fd });
  const text = await res.text();

  if (!res.ok) {
    setMsg(submitMsg, `Submit failed: HTTP ${res.status} — ${text}`, false);
    return;
  }
  setMsg(submitMsg, `Success: ${text}`, true);
}

// Keep button click support (harmless)
document.getElementById("loadBtn")?.addEventListener("click", loadConfig);
document.getElementById("scanForm")?.addEventListener("submit", submitForm);

// ===== Auto-fill + Auto-load + Hide UI =====
document.addEventListener("DOMContentLoaded", async () => {
  const backendEl = document.getElementById("backendUrl");
  const taskEl = document.getElementById("taskId");
  const loadBtn = document.getElementById("loadBtn");

  // Auto-fill backend
  if (backendEl) backendEl.value = DEFAULT_BACKEND;

  // Auto-fill task from QR
  const t = qs("task");
  if (t && taskEl) taskEl.value = t;

  // Hide fields/buttons so employees only see what matters
  if (HIDE_LOAD_BUTTON && loadBtn) loadBtn.style.display = "none";

  if (HIDE_BACKEND_FIELD && backendEl) {
    const row = backendEl.closest(".row") || backendEl.parentElement;
    if (row) row.style.display = "none";
  }

  if (HIDE_TASK_FIELD && taskEl) {
    const row = taskEl.closest(".row") || taskEl.parentElement;
    if (row) row.style.display = "none";
  }

  // Auto-load dropdowns
  if (AUTO_LOAD_DROPDOWNS) {
    await loadConfig();
  }
});
