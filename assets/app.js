(function () {
  "use strict";

  var DATA = JSON.parse(document.getElementById("ads-data").textContent);
  var ADS = DATA.ads;
  var CAMPAIGNS = {};
  DATA.campaigns.forEach(function (c) { CAMPAIGNS[c.id] = c; });
  var byId = new Map(ADS.map(function (a) { return [a.id, a]; }));
  var LIST_KEY = "slt-creative-review:my-list";

  function $(id) { return document.getElementById(id); }
  var els = {
    q: $("q"), campaign: $("f-campaign"), category: $("f-category"), awareness: $("f-awareness"),
    mylist: $("f-mylist"), mylistCount: $("mylist-count"), copyMylist: $("copy-mylist"),
    count: $("count"), clear: $("clear"), grid: $("grid"), empty: $("empty"), emptyClear: $("empty-clear"),
    viewer: $("viewer"), vImg: $("v-img"), vId: $("v-id"), vLabel: $("v-label"), vDownload: $("v-download"),
    vCopyId: $("v-copy-id"), vCopyLink: $("v-copy-link"), vMylist: $("v-mylist"), vDetails: $("v-details"),
    vPrev: $("v-prev"), vNext: $("v-next"), vPos: $("v-pos"), vClose: $("v-close"), toast: $("toast")
  };

  /* ---------- helpers ---------- */
  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .replace(/[‐-―\-_·|\/]+/g, " ").replace(/[’'"“”.,!?:;()]/g, "")
      .replace(/\s+/g, " ").trim();
  }
  function fmtSize(bytes) {
    return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + " MB" : Math.round(bytes / 1024) + " KB";
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svgIcon(path) {
    var ns = "http://www.w3.org/2000/svg";
    var s = document.createElementNS(ns, "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("aria-hidden", "true");
    var p = document.createElementNS(ns, "path");
    p.setAttribute("d", path);
    s.appendChild(p);
    return s;
  }
  function pageBase() { return location.href.split(/[?#]/)[0]; }
  function safeHistory(method, state, url) {
    try { history[method](state, "", url); } catch (e) { /* local file or sandboxed preview */ }
  }

  /* ---------- my list (this browser only) ---------- */
  function loadList() {
    try {
      var v = JSON.parse(localStorage.getItem(LIST_KEY) || "[]");
      return new Set(Array.isArray(v) ? v.filter(function (id) { return byId.has(id); }) : []);
    } catch (e) { return new Set(); }
  }
  function saveList() {
    try { localStorage.setItem(LIST_KEY, JSON.stringify(Array.from(myList))); } catch (e) { /* storage blocked */ }
  }
  var myList = loadList();

  /* ---------- toast and clipboard ---------- */
  var toastTimer;
  function toast(msg) {
    var host = els.viewer.open ? els.viewer : document.body;
    if (els.toast.parentNode !== host) host.appendChild(els.toast);
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove("show"); }, 2200);
  }
  function copyText(text, msg) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      (els.viewer.open ? els.viewer : document.body).appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      ta.remove();
      toast(ok ? msg : "Could not copy. " + text);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(msg); }, fallback);
    } else {
      fallback();
    }
  }

  /* ---------- filters ---------- */
  function countBy(key) {
    var m = new Map();
    ADS.forEach(function (a) { m.set(a[key], (m.get(a[key]) || 0) + 1); });
    return m;
  }
  function addOptions(select, entries) {
    entries.forEach(function (e) {
      var o = document.createElement("option");
      o.value = e[0];
      o.textContent = e[1] + " (" + e[2] + ")";
      select.appendChild(o);
    });
  }
  var campCounts = countBy("campaign");
  addOptions(els.campaign, DATA.campaigns.filter(function (c) { return campCounts.get(c.id); })
    .map(function (c) { return [c.id, c.label, campCounts.get(c.id)]; }));
  var catCounts = countBy("category");
  addOptions(els.category, Array.from(catCounts.keys()).sort(function (a, b) { return a.localeCompare(b); })
    .map(function (c) { return [c, c, catCounts.get(c)]; }));
  var awCounts = countBy("awareness");
  addOptions(els.awareness, DATA.awareness.filter(function (a) { return awCounts.get(a); })
    .map(function (a) { return [a, a, awCounts.get(a)]; }));

  /* ---------- grid ---------- */
  var items = [];
  var hay = [];
  var frag = document.createDocumentFragment();
  ADS.forEach(function (a) {
    var li = el("li");
    var link = el("a", "card");
    link.href = "#" + a.id;
    link.dataset.id = a.id;
    var art = el("div", "card-art");
    var img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.width = 540;
    img.height = 675;
    img.alt = (a.artwork && a.artwork.headline) ? "Artwork: " + a.artwork.headline : "Ad artwork";
    img.addEventListener("load", function () { img.classList.add("is-loaded"); });
    img.addEventListener("error", function () { img.classList.add("is-loaded"); });
    img.src = a.thumb;
    art.appendChild(img);
    var mark = el("span", "mark");
    mark.appendChild(svgIcon("M6 3h12v18l-6-4-6 4z"));
    mark.appendChild(el("span", "visually-hidden", "In my list"));
    art.appendChild(mark);
    var meta = el("span", "card-meta");
    meta.appendChild(el("span", "card-id", a.id));
    meta.appendChild(el("span", "card-label", a.product + " · " + CAMPAIGNS[a.campaign].short));
    link.appendChild(art);
    link.appendChild(meta);
    li.appendChild(link);
    if (myList.has(a.id)) li.classList.add("in-list");
    frag.appendChild(li);
    items.push(li);
    hay.push(norm([a.id, a.product, a.artwork && a.artwork.headline, a.meta && a.meta.headline].join(" ")));
  });
  els.grid.appendChild(frag);

  var visible = ADS.slice();
  function onlyMyList() { return els.mylist.getAttribute("aria-pressed") === "true"; }

  function apply() {
    var tokens = norm(els.q.value).split(" ").filter(Boolean);
    var c = els.campaign.value, cat = els.category.value, aw = els.awareness.value, mine = onlyMyList();
    visible = [];
    ADS.forEach(function (a, i) {
      var ok = (!c || a.campaign === c) && (!cat || a.category === cat) && (!aw || a.awareness === aw) &&
        (!mine || myList.has(a.id)) && tokens.every(function (t) { return hay[i].indexOf(t) !== -1; });
      items[i].hidden = !ok;
      if (ok) visible.push(a);
    });
    els.count.textContent = visible.length === ADS.length
      ? ADS.length + " ads"
      : "Showing " + visible.length + " of " + ADS.length + " ads";
    els.clear.hidden = !(tokens.length || c || cat || aw || mine);
    els.empty.hidden = visible.length > 0;
    syncQuery();
  }

  function syncQuery() {
    var p = new URLSearchParams();
    if (els.q.value.trim()) p.set("q", els.q.value.trim());
    if (els.campaign.value) p.set("campaign", els.campaign.value);
    if (els.category.value) p.set("category", els.category.value);
    if (els.awareness.value) p.set("awareness", els.awareness.value);
    var qs = p.toString();
    safeHistory("replaceState", history.state, pageBase() + (qs ? "?" + qs : "") + location.hash);
  }
  function readQuery() {
    var p = new URLSearchParams(location.search);
    els.q.value = p.get("q") || "";
    [["campaign", els.campaign], ["category", els.category], ["awareness", els.awareness]].forEach(function (pair) {
      var v = p.get(pair[0]);
      if (v && Array.prototype.some.call(pair[1].options, function (o) { return o.value === v; })) pair[1].value = v;
    });
  }
  function clearFilters() {
    els.q.value = "";
    els.campaign.value = els.category.value = els.awareness.value = "";
    els.mylist.setAttribute("aria-pressed", "false");
    apply();
  }

  els.q.addEventListener("input", apply);
  [els.campaign, els.category, els.awareness].forEach(function (s) { s.addEventListener("change", apply); });
  els.clear.addEventListener("click", clearFilters);
  els.emptyClear.addEventListener("click", clearFilters);
  els.mylist.addEventListener("click", function () {
    els.mylist.setAttribute("aria-pressed", onlyMyList() ? "false" : "true");
    apply();
  });

  function refreshListUi() {
    els.mylistCount.textContent = myList.size;
    els.copyMylist.hidden = myList.size === 0;
    ADS.forEach(function (a, i) { items[i].classList.toggle("in-list", myList.has(a.id)); });
  }
  els.copyMylist.addEventListener("click", function () {
    var ids = ADS.filter(function (a) { return myList.has(a.id); }).map(function (a) { return a.id; });
    copyText(ids.join("\n"), "Copied " + ids.length + " ad ID" + (ids.length === 1 ? "" : "s"));
  });

  /* ---------- viewer ---------- */
  // skipHistoryOnClose: the viewer is closing because the browser went Back, so leave history alone.
  // ignoreNextPop: we called history.back() ourselves to drop the entry the viewer pushed.
  var navList = ADS, current = -1, lastCard = null, skipHistoryOnClose = false, ignoreNextPop = false;

  function section(title) {
    var s = el("section", "block");
    s.appendChild(el("h3", null, title));
    return s;
  }
  function defList(rows) {
    var dl = el("dl");
    rows.forEach(function (r) {
      if (r[1] == null || r[1] === "" || (Array.isArray(r[1]) && !r[1].length)) return;
      dl.appendChild(el("dt", null, r[0]));
      var dd = el("dd");
      if (Array.isArray(r[1])) {
        var ul = el("ul", "plain-list");
        r[1].forEach(function (x) { ul.appendChild(el("li", null, x)); });
        dd.appendChild(ul);
      } else {
        dd.textContent = r[1];
      }
      dl.appendChild(dd);
    });
    return dl.children.length ? dl : null;
  }
  function details(a) {
    var out = [];
    var art = a.artwork || {};
    var s1 = section("On the artwork");
    if (art.headline) s1.appendChild(el("p", "headline-quote", art.headline));
    var d1 = defList([["Support line", art.support], ["Features", art.features], ["Call to action", art.cta],
      ["Offer", art.offer], ["Offer scope", art.offerScope]]);
    if (d1) s1.appendChild(d1);
    if (s1.children.length > 1) out.push(s1);

    var m = a.meta || {};
    var d2 = defList([["Primary text", m.primaryText], ["Headline", m.headline], ["Description", m.description]]);
    if (d2) { var s2 = section("Meta ad copy"); s2.appendChild(d2); out.push(s2); }

    if (a.leadForm) {
      var s3 = section("Lead form wording");
      s3.appendChild(el("p", "lead-q", a.leadForm.question));
      if (a.leadForm.options && a.leadForm.options.length) {
        var ul = el("ul", "plain-list");
        a.leadForm.options.forEach(function (o) { ul.appendChild(el("li", null, o)); });
        s3.appendChild(ul);
      }
      out.push(s3);
    }

    var s4 = section("About this ad");
    s4.appendChild(defList([["Campaign", CAMPAIGNS[a.campaign].label], ["Category", a.category],
      ["Product", a.product], ["Awareness", a.awareness], ["File", a.file + " · " + fmtSize(a.bytes)]]));
    out.push(s4);
    return out;
  }

  function updateListButton(id) {
    var inList = myList.has(id);
    els.vMylist.setAttribute("aria-pressed", inList ? "true" : "false");
    els.vMylist.textContent = inList ? "Remove from my list" : "Add to my list";
  }

  function render(a) {
    els.vId.textContent = a.id;
    els.vLabel.textContent = a.product + " · " + CAMPAIGNS[a.campaign].label;
    els.vImg.alt = "Ad " + a.id + " artwork" + (a.artwork && a.artwork.headline ? ": " + a.artwork.headline : "");
    els.vImg.src = a.thumb;
    var full = new Image();
    full.onload = function () {
      if (navList[current] && navList[current].id === a.id) els.vImg.src = a.img;
    };
    full.src = a.img;
    els.vDownload.href = a.img;
    els.vDownload.setAttribute("download", a.file);
    els.vDownload.textContent = "Download PNG (" + fmtSize(a.bytes) + ")";
    updateListButton(a.id);
    els.vDetails.replaceChildren.apply(els.vDetails, details(a));
    els.vPos.textContent = (current + 1) + " of " + navList.length;
    els.vPrev.disabled = current <= 0;
    els.vNext.disabled = current >= navList.length - 1;
    [navList[current - 1], navList[current + 1]].forEach(function (n) { if (n) new Image().src = n.thumb; });
    var side = els.viewer.querySelector(".viewer-side");
    if (side) side.scrollTop = 0;
  }

  function openAd(id, how) {
    var a = byId.get(id);
    if (!a) return;
    navList = visible.some(function (v) { return v.id === id; }) ? visible : ADS;
    current = navList.indexOf(a);
    render(a);
    var url = pageBase() + location.search + "#" + id;
    if (!els.viewer.open) {
      if (how === "click") safeHistory("pushState", { viewer: true }, url);
      else if (how !== "history") safeHistory("replaceState", null, url);
      els.viewer.showModal();
      els.vClose.focus();
    } else if (how !== "history") {
      safeHistory("replaceState", history.state, url);
    }
  }
  function step(delta) {
    var next = navList[current + delta];
    if (next) openAd(next.id, "step");
  }

  els.grid.addEventListener("click", function (e) {
    var link = e.target.closest("a.card");
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    lastCard = link;
    openAd(link.dataset.id, "click");
  });
  els.vPrev.addEventListener("click", function () { step(-1); });
  els.vNext.addEventListener("click", function () { step(1); });
  els.vClose.addEventListener("click", function () { els.viewer.close(); });
  els.viewer.addEventListener("click", function (e) { if (e.target === els.viewer) els.viewer.close(); });
  els.viewer.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
  });
  els.viewer.addEventListener("close", function () {
    var a = navList[current];
    if (skipHistoryOnClose) {
      skipHistoryOnClose = false;
    } else if (history.state && history.state.viewer) {
      ignoreNextPop = true;
      try { history.back(); } catch (e) { ignoreNextPop = false; }
    } else {
      safeHistory("replaceState", null, pageBase() + location.search);
    }
    var card = a && els.grid.querySelector('a.card[data-id="' + a.id + '"]');
    var target = (card && !card.closest("li").hidden) ? card : lastCard;
    if (target) {
      target.scrollIntoView({ block: "nearest" });
      target.focus({ preventScroll: true });
    }
  });
  window.addEventListener("popstate", function () {
    if (ignoreNextPop) { ignoreNextPop = false; return; }
    var id = decodeURIComponent(location.hash.slice(1));
    if (byId.has(id)) { openAd(id, "history"); }
    else if (els.viewer.open) { skipHistoryOnClose = true; els.viewer.close(); }
  });

  els.vCopyId.addEventListener("click", function () {
    var a = navList[current];
    if (a) copyText(a.id, "Copied " + a.id);
  });
  els.vCopyLink.addEventListener("click", function () {
    var a = navList[current];
    if (a) copyText(pageBase() + "#" + a.id, "Copied the link to " + a.id);
  });
  els.vMylist.addEventListener("click", function () {
    var a = navList[current];
    if (!a) return;
    if (myList.has(a.id)) myList.delete(a.id); else myList.add(a.id);
    saveList();
    updateListButton(a.id);
    refreshListUi();
    toast(myList.has(a.id) ? a.id + " added to your list (this browser only)" : a.id + " removed from your list");
    if (onlyMyList()) apply();
  });

  /* ---------- start ---------- */
  readQuery();
  refreshListUi();
  apply();
  var startId = decodeURIComponent(location.hash.slice(1));
  if (byId.has(startId)) openAd(startId, "load");
})();
