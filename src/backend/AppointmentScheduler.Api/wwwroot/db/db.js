let page = 1;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const catName = (c) => typeof c === "number" ? ["Medical","Beauty","Fitness"][c] : c;
const stName = (s) => typeof s === "number" ? ["Scheduled","Cancelled","Completed"][s] : s;

async function loadHealth() {
  try {
    const h = await (await fetch("/api/dbhealth")).json();
    const pill = $("connPill");
    if (h.status === "ok") pill.innerHTML = '<span class="pill ok">connected - mongodb</span>';
    else if (h.status === "not-configured") pill.innerHTML = '<span class="pill warn">in-memory (MongoDB not configured)</span>';
    else pill.innerHTML = '<span class="pill bad">unhealthy - mongodb</span>';
    const rows = ["status","store","server","database","configSource","latencyMs","hint","error"]
      .filter((k) => h[k] !== undefined && h[k] !== null)
      .map((k) => `<dt>${esc(k)}</dt><dd><code>${esc(typeof h[k] === "object" ? JSON.stringify(h[k]) : h[k])}${k === "latencyMs" ? " ms" : ""}</code></dd>`).join("");
    $("connKv").innerHTML = rows + (h.collections ? `<dt>collections</dt><dd>${h.collections.map((c) => `<code>${esc(c)}</code>`).join(" ")}</dd>` : "");
    $("counts").innerHTML = h.counts ? Object.entries(h.counts).map(([k,v]) =>
      `<div class="stat"><b>${v < 0 ? "n/a" : esc(v)}</b><span>${esc(k)}</span></div>`).join("") : '<p class="sub">No counts.</p>';
    $("connErr").innerHTML = h.status === "ok" ? "" : `<p class="err">${esc(h.hint || h.error || "MongoDB not reachable.")}</p>`;
  } catch (e) { $("connPill").innerHTML = '<span class="pill bad">backend unreachable</span>'; }
}

async function loadAppointments() {
  const q = new URLSearchParams({ page: String(page), pageSize: $("fSize").value });
  if ($("fCat").value) q.set("category", $("fCat").value);
  if ($("fStatus").value) q.set("status", $("fStatus").value);
  try {
    const r = await fetch("/api/appointments?" + q);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const data = await r.json();
    const items = data.items || [];
    $("apptSub").textContent = `Page ${data.page} - ${items.length} of ${data.total} entries.`;
    const byCat = { Medical: 0, Beauty: 0, Fitness: 0 };
    items.forEach((a) => { const k = catName(a.category); if (byCat[k] !== undefined) byCat[k]++; });
    $("cats").innerHTML = Object.entries(byCat).map(([k,v]) => `<div class="stat"><b>${v}</b><span>${k} (page)</span></div>`).join("");
    $("rows").innerHTML = items.length ? items.map((a) =>
      `<tr><td>${esc(new Date(a.startDateTime).toISOString().replace("T"," ").slice(0,16))}</td>` +
      `<td><b>${esc(a.title)}</b><br><span style="color:#687894">${esc(a.notes || "")}</span></td>` +
      `<td>${esc(catName(a.category))}</td><td>${esc(stName(a.status))}</td>` +
      `<td>${esc(a.providerName || a.providerId || "-")}</td><td>${esc(a.location || "-")}</td>` +
      `<td><code>${esc(String(a.id).slice(0,8))}..</code></td></tr>`).join("")
      : '<tr><td colspan="7" class="empty">No entries match these filters.</td></tr>';
    $("apptErr").innerHTML = "";
    $("fPrev").disabled = page <= 1;
    $("fNext").disabled = (page * Number($("fSize").value)) >= (data.total || 0);
  } catch (e) { $("apptErr").innerHTML = `<p class="err">Could not load appointments: ${esc(e.message)}.</p>`; }
}

$("fGo").onclick = () => { page = 1; loadAppointments(); };
$("fPrev").onclick = () => { if (page > 1) { page--; loadAppointments(); } };
$("fNext").onclick = () => { page++; loadAppointments(); };
$("stamp").textContent = new Date().toISOString();
loadHealth(); loadAppointments();
setInterval(loadHealth, 15000);
