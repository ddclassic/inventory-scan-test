// === DEFAULTS (set once) ===
const DEFAULT_BACKEND = "http://192.168.1.10:8080";   // <-- your gateway
const HIDE_BACKEND_FIELD = true;
const HIDE_TASK_FIELD = true;

function normalizeBackend(raw) {
  let b = (raw || "").trim();
  b = b.replace(/\/+$/, "").replace(/\/(config|submit)$/i, "");
  if (b && !/^https?:\/\//i.test(b)) b = "http://" + b;
  return b;
}

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function setMsg(el, text, ok=true) {
  el.textContent = text;
  el.className = ok ? "hint ok" : "hint bad";
}

function fillSelect(sel, items, placeholder) {
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

async function loadConfig() {
  const backend = normalizeBackend(
  document.getElementById("backendUrl").value || DEFAULT_BACKEND
);
  const msg = document.getElementById("loadMsg");

  if (!backend) { setMsg(msg, "Enter Backend URL first.", false); return; }

  // sanitize: remove trailing slashes + remove accidental /config
  backend = backend.replace(/\/+$/, "");
  backend = backend.replace(/\/config$/i, "");

  try {
    const res = await fetch(`${backend}/config`, { method: "GET" });

    const text = await res.text();
    if (!res.ok) {
      setMsg(msg, `Config load failed: HTTP ${res.status} — ${text}`, false);
      return;
    }

    const cfg = JSON.parse(text);

    fillSelect(document.getElementById("status"), cfg.statusOptions, "— Status —");
    fillSelect(document.getElementById("building"), cfg.buildingOptions, "— Building —");
    fillSelect(document.getElementById("shelf"), cfg.shelfOptions, "— Shelf —");
    fillSelect(document.getElementById("toteBox"), cfg.toteBoxOptions, "— Tote/Box —");
    fillSelect(document.getElementById("checkedOutBy"), cfg.checkedOutByOptions, "— Employee —");
    fillSelect(document.getElementById("condition"), cfg.conditionOptions, "— Condition —");

    setMsg(msg, "Dropdown options loaded.", true);
  } catch (err) {
    // This is what you'll see if HTTPS→HTTP is blocked (mixed content)
    setMsg(msg, `Fetch failed: ${err.message}. If you're on GitHub (https), you likely need an https tunnel.`, false);
  }
}

async function submitForm(ev) {
  ev.preventDefault();

  const backend = normalizeBackend(
  document.getElementById("backendUrl").value || DEFAULT_BACKEND
);

  const submitMsg = document.getElementById("submitMsg");
  if (!backend) { setMsg(submitMsg, "Enter Backend URL first.", false); return; }

  const taskIdFromQuery = qs("task");
  const taskId = (document.getElementById("taskId").value.trim() || taskIdFromQuery || "");
  if (!taskId) { setMsg(submitMsg, "Missing Task ID. Put it in the box or use ?task=xxxx in the URL.", false); return; }

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

  // If no photo selected, send JSON (best for testing)
  if (!photo) {
    setMsg(submitMsg, "Submitting (JSON)...", true);

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

  // If photo selected, send multipart
  setMsg(submitMsg, "Submitting (Photo)...", true);

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

document.getElementById("loadBtn").addEventListener("click", loadConfig);
document.getElementById("scanForm").addEventListener("submit", submitForm);

// Auto-fill backend + task from QR (?task=)
document.addEventListener("DOMContentLoaded", async () => {
  const backendEl = document.getElementById("backendUrl");
  const taskEl = document.getElementById("taskId");

  // Auto-fill backend
  backendEl.value = DEFAULT_BACKEND;

  // Auto-fill task
  const t = qs("task");
  if (t) taskEl.value = t;

  // Hide fields (optional)
  if (HIDE_BACKEND_FIELD) {
    const row = backendEl.closest(".row") || backendEl.parentElement;
    if (row) row.style.display = "none";
  }
  if (HIDE_TASK_FIELD) {
    const row = taskEl.closest(".row") || taskEl.parentElement;
    if (row) row.style.display = "none";
  }

  // Auto-load dropdowns
  try { await loadConfig(); } catch {}
});






