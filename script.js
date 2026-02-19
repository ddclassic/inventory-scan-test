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
  let backend = document.getElementById("backendUrl").value.trim();
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

  const backend = document.getElementById("backendUrl").value.trim();
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

  // Build multipart request so we can include optional photo
  const fd = new FormData();
  fd.append("json", new Blob([JSON.stringify(payload)], { type: "application/json" }));

    const photo = document.getElementById("photo").files?.[0];

  // If no photo selected, send JSON (most reliable on phones)
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
  const fd = new FormData();
  fd.append("json", new Blob([JSON.stringify(payload)], { type: "application/json" }));
  fd.append("photo", photo, photo.name);

  setMsg(submitMsg, "Submitting (Photo)...", true);

  const res = await fetch(`${backend}/submit`, { method: "POST", body: fd });
}

document.getElementById("loadBtn").addEventListener("click", loadConfig);
document.getElementById("scanForm").addEventListener("submit", submitForm);

// Auto-fill task if URL has ?task=...
const t = qs("task");
if (t) document.getElementById("taskId").value = t;



