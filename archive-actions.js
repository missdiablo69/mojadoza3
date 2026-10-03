/* Moja Doza — ARHIVA dugmad za Decap CMS
   Koristi Netlify Git Gateway, pa nije potreban dodatni GitHub token u browseru.
*/
(function () {
  "use strict";

  const OWNER = "missdiablo69";
  const REPO = "mojadoza3";
  const BRANCH = "main";

  const FIELD_NAMES = new Set([
    "ovan","bik","blizanci","rak","lav","devica","vaga","skorpija",
    "strelac","jarac","vodolija","ribe","description","body","title"
  ]);

  function esc(v) {
    return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function token() {
    try {
      return window.netlifyIdentity &&
        window.netlifyIdentity.currentUser() &&
        window.netlifyIdentity.currentUser().token &&
        window.netlifyIdentity.currentUser().token.access_token;
    } catch(e) { return null; }
  }

  function gatewayUrl(path) {
    return "/.netlify/git/github/repos/" + OWNER + "/" + REPO +
      "/contents/" + path.replace(/^\/+/,"");
  }

  async function gateway(method, path, body) {
    const t = token();
    if (!t) throw new Error("Niste prijavljeni u Back Office.");
    const opts = {
      method,
      headers: {
        "Authorization": "Bearer " + t,
        "Content-Type": "application/json"
      }
    };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(gatewayUrl(path), opts);
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch(_) { data = { message: text }; }
    if (!r.ok) throw new Error(data.message || ("Git Gateway greška " + r.status));
    return data;
  }

  function base64Utf8(s) {
    const bytes = new TextEncoder().encode(s);
    let bin = "";
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin);
  }

  function decodeUtf8(b64) {
    const bin = atob(b64.replace(/\n/g,""));
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function routeInfo() {
    const hash = location.hash || "";
    const m = hash.match(/collections\/([^/]+)\/entries\/([^/?#]+)/i);
    if (!m) return null;
    return { collection: decodeURIComponent(m[1]), slug: decodeURIComponent(m[2]) };
  }

  function sourceFolder(collection) {
    return {
      horoskop: "content/horoskop",
      analize: "content/analize",
      zanimljivosti: "content/zanimljivosti",
      blog: "content/blog"
    }[collection] || null;
  }

  function guessFile(collection, slug) {
    const folder = sourceFolder(collection);
    return folder ? folder + "/" + slug + ".md" : null;
  }

  function makeArchivePath(collection, slug, field) {
    const safe = (s) => String(s).toLowerCase().replace(/[^a-z0-9_-]+/gi,"-").replace(/^-+|-+$/g,"");
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g,"").slice(0,14);
    return "content/arhiva/" + safe(collection) + "--" + safe(slug) +
      "--" + safe(field) + "--" + stamp + ".md";
  }

  function frontmatter(title, collection, field, originalFile) {
    const escYaml = s => String(s ?? "").replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g," ");
    return [
      "---",
      'title: "' + escYaml(title) + '"',
      'source: "' + escYaml(collection) + '"',
      'field: "' + escYaml(field) + '"',
      'original_file: "' + escYaml(originalFile) + '"',
      'archived_at: "' + new Date().toISOString() + '"',
      "---",
      ""
    ].join("\n");
  }

  async function archiveField(fieldName, currentValue, btn) {
    const info = routeInfo();
    if (!info) {
      alert("Otvori konkretan tekst u Back Office-u pa klikni ARHIVIRAJ.");
      return;
    }
    const folder = sourceFolder(info.collection);
    if (!folder) {
      alert("Ova sekcija još nije povezana sa Arhivom.");
      return;
    }

    const value = String(currentValue || "").trim();
    if (!value) {
      alert("Ovo polje je prazno.");
      return;
    }

    const ok = confirm(
      "Arhivirati ovaj tekst?\n\n" +
      "Sekcija: " + info.collection + "\n" +
      "Polje: " + fieldName +
      "\n\nTekst će biti sačuvan u ARHIVU."
    );
    if (!ok) return;

    btn.disabled = true;
    btn.textContent = "Arhiviram…";

    try {
      const originalFile = guessFile(info.collection, info.slug);
      if (!originalFile) throw new Error("Ne mogu odrediti originalni fajl.");

      const archivePath = makeArchivePath(info.collection, info.slug, fieldName);
      const title = info.slug.replace(/-/g," ") + " — " + fieldName;
      const content = frontmatter(title, info.collection, fieldName, originalFile) + value + "\n";

      await gateway("PUT", archivePath, {
        message: "Arhiviraj: " + info.collection + "/" + info.slug + " [" + fieldName + "]",
        content: base64Utf8(content),
        branch: BRANCH
      });

      // Očisti polje samo u CMS editoru. Korisnik zatim klikne Save.
      const input = document.getElementById(
        Array.from(document.querySelectorAll("[id]"))
          .map(x => x.id).find(id => id.toLowerCase().includes(fieldName.toLowerCase())) || ""
      );
      if (input) {
        input.value = "";
        input.dispatchEvent(new Event("input", {bubbles:true}));
        input.dispatchEvent(new Event("change", {bubbles:true}));
      }

      btn.textContent = "✓ Arhivirano";
      btn.style.background = "#2e7d32";
      alert("Tekst je sačuvan u ARHIVU.\n\nSada klikni SAVE da ga ukloniš i iz aktivnog teksta.");
    } catch (e) {
      console.error(e);
      alert("Arhiviranje nije uspjelo:\n\n" + e.message);
      btn.textContent = "ARHIVIRAJ";
    } finally {
      btn.disabled = false;
    }
  }

  function fieldValue(fieldRoot) {
    const textarea = fieldRoot.querySelector("textarea");
    if (textarea) return textarea.value;
    const input = fieldRoot.querySelector("input[type='text'], input:not([type])");
    if (input) return input.value;
    return "";
  }

  function fieldName(fieldRoot) {
    const label = fieldRoot.querySelector("label");
    const txt = label ? label.textContent.trim().toLowerCase() : "";
    const map = {
      "ovan":"ovan","bik":"bik","blizanci":"blizanci","rak":"rak","lav":"lav",
      "devica":"devica","vaga":"vaga","škorpija":"skorpija","skorpija":"skorpija",
      "strelac":"strelac","jarac":"jarac","vodolija":"vodolija","ribe":"ribe",
      "kratak opis":"description","sadržaj teksta":"body","sadržaj bloga":"body",
      "naslov teksta":"title","naslov bloga":"title","naslov":"title"
    };
    for (const k of Object.keys(map)) if (txt.includes(k)) return map[k];
    return null;
  }

  function addButtons() {
    const info = routeInfo();
    if (!info || !sourceFolder(info.collection)) return;

    const roots = Array.from(document.querySelectorAll("label"))
      .map(l => l.closest("[class*='Field'], [class*='field'], [data-field]"))
      .filter(Boolean);

    roots.forEach(root => {
      if (root.dataset.moArhiva === "1") return;
      const name = fieldName(root);
      if (!name || !FIELD_NAMES.has(name)) return;
      root.dataset.moArhiva = "1";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "ARHIVIRAJ";
      btn.style.cssText =
        "margin:8px 0 4px;padding:7px 13px;border:1px solid #d4af37;" +
        "border-radius:6px;background:#1a1530;color:#d4af37;font-weight:700;" +
        "cursor:pointer;font-size:12px;letter-spacing:.5px;";
      btn.title = "Sačuvaj ovaj tekst u Arhivu";
      btn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        archiveField(name, fieldValue(root), btn);
      });

      const label = root.querySelector("label");
      if (label && label.parentNode) label.parentNode.appendChild(btn);
      else root.insertBefore(btn, root.firstChild);
    });
  }

  // Decap dinamički mijenja ekran, zato provjeravamo kratko nakon otvaranja polja.
  function start() {
    setInterval(addButtons, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else start();
})();
