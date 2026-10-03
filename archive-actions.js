/* Moja Doza — ARHIVA dugmad za Decap CMS */
(function () {
  "use strict";

  const FIELD_MAP = {
    "Ovan":"ovan",
    "Bik":"bik",
    "Blizanci":"blizanci",
    "Rak":"rak",
    "Lav":"lav",
    "Devica":"devica",
    "Vaga":"vaga",
    "Škorpija":"skorpija",
    "Skorpija":"skorpija",
    "Strelac":"strelac",
    "Jarac":"jarac",
    "Vodolija":"vodolija",
    "Ribe":"ribe",
    "Kratak Opis":"description",
    "Kratak opis":"description",
    "Sadržaj Teksta":"body",
    "Sadržaj Bloga":"body",
    "Naslov Teksta":"title",
    "Naslov Bloga":"title"
  };

  const FOLDERS = {
    horoskop:"content/horoskop",
    analize:"content/analize",
    zanimljivosti:"content/zanimljivosti",
    blog:"content/blog"
  };

  function route() {
    const m = (location.hash || "").match(
      /collections\/([^/]+)\/entries\/([^/?#]+)/i
    );

    return m ? {
      collection: decodeURIComponent(m[1]),
      slug: decodeURIComponent(m[2])
    } : null;
  }

  function token() {
    try {
      return window.netlifyIdentity
        .currentUser()
        .token
        .access_token;
    } catch(e) {
      return null;
    }
  }

  async function saveArchive(path, markdown, message) {
    const t = token();

    if (!t) {
      throw new Error("Niste prijavljeni u Back Office.");
    }

    const bytes = new TextEncoder().encode(markdown);
    let binary = "";

    bytes.forEach(b => {
      binary += String.fromCharCode(b);
    });

    const response = await fetch(
      "/.netlify/git/github/contents/" + path,
      {
        method: "PUT",
        headers: {
          "Authorization": "Bearer " + t,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: message,
          content: btoa(binary),
          branch: "main"
        })
      }
    );

    const result = await response.text();

    if (!response.ok) {
      throw new Error(
        result || ("Git Gateway greška " + response.status)
      );
    }
  }

  function getValue(root) {
    const textarea = root.querySelector("textarea");

    if (textarea) {
      return textarea.value;
    }

    const editable = root.querySelector(
      "[contenteditable='true']"
    );

    if (editable) {
      return editable.innerText ||
             editable.textContent ||
             "";
    }

    const input = root.querySelector("input");

    if (input) {
      return input.value;
    }

    return "";
  }

  function safeName(text) {
    return String(text)
      .toLowerCase()
      .replace(/š/g,"s")
      .replace(/č/g,"c")
      .replace(/ć/g,"c")
      .replace(/ž/g,"z")
      .replace(/đ/g,"d")
      .replace(/[^a-z0-9_-]+/g,"-")
      .replace(/^-+|-+$/g,"");
  }

  function findFieldRoot(label) {
    let node = label;

    for (
      let i = 0;
      i < 12 && node;
      i++,
      node = node.parentElement
    ) {
      if (
        node.querySelector(
          "textarea,[contenteditable='true'],input"
        )
      ) {
        return node;
      }
    }

    return null;
  }

  function addArchiveButton(label, fieldName) {
    const root = findFieldRoot(label);

    if (!root) return;

    if (root.dataset.moArhivaButton) return;

    root.dataset.moArhivaButton = "1";

    const button = document.createElement("button");

    button.type = "button";
    button.textContent = "ARHIVIRAJ";

    button.style.cssText =
      "display:block;" +
      "margin:8px 0;" +
      "padding:7px 14px;" +
      "border:1px solid #c9a227;" +
      "border-radius:6px;" +
      "background:#21183b;" +
      "color:#c9a227;" +
      "font-weight:700;" +
      "cursor:pointer;" +
      "font-size:12px;" +
      "z-index:9999;" +
      "position:relative;";

    button.addEventListener("click", async function(event) {

      event.preventDefault();
      event.stopPropagation();

      const currentRoute = route();

      if (
        !currentRoute ||
        !FOLDERS[currentRoute.collection]
      ) {
        alert(
          "Otvori konkretan tekst iz Horoskopa, Analiza, Zanimljivosti ili Bloga."
        );
        return;
      }

      const text = getValue(root).trim();

      if (!text) {
        alert("Ovo polje je prazno.");
        return;
      }

      const confirmed = confirm(
        "Arhivirati ovaj tekst?\n\n" +
        label.textContent.trim()
      );

      if (!confirmed) return;

      button.disabled = true;
      button.textContent = "ARHIVIRAM...";

      try {

        const originalFile =
          FOLDERS[currentRoute.collection] +
          "/" +
          currentRoute.slug +
          ".md";

        const stamp =
          new Date()
            .toISOString()
            .replace(/[-:.TZ]/g,"")
            .slice(0,14);

        const archiveFile =
          "content/arhiva/" +
          safeName(currentRoute.collection) +
          "--" +
          safeName(currentRoute.slug) +
          "--" +
          safeName(fieldName) +
          "--" +
          stamp +
          ".md";

        const title =
          currentRoute.slug.replace(/-/g," ") +
          " — " +
          fieldName;

        const yaml = [
          "---",
          'title: "' +
            title.replace(/"/g,'\\"') +
            '"',
          'source: "' +
            currentRoute.collection +
            '"',
          'field: "' +
            fieldName +
            '"',
          'original_file: "' +
            originalFile +
            '"',
          'archived_at: "' +
            new Date().toISOString() +
            '"',
          "---",
          ""
        ].join("\n");

        await saveArchive(
          archiveFile,
          yaml + text + "\n",
          "Arhiviraj: " +
          currentRoute.collection +
          "/" +
          currentRoute.slug +
          " [" +
          fieldName +
          "]"
        );

        button.textContent = "✓ ARHIVIRANO";
        button.style.background = "#2e7d32";

        alert(
          "Tekst je sačuvan u Arhivi.\n\n" +
          "Sada klikni SAVE u Back Office-u da se ukloni iz aktivnog teksta."
        );

      } catch(error) {

        console.error(error);

        alert(
          "Arhiviranje nije uspjelo:\n\n" +
          error.message
        );

        button.textContent = "ARHIVIRAJ";

      } finally {

        button.disabled = false;

      }
    });

    label.parentElement.appendChild(button);
  }

  function scanFields() {

    const currentRoute = route();

    if (
      !currentRoute ||
      !FOLDERS[currentRoute.collection]
    ) {
      return;
    }

    document.querySelectorAll("label").forEach(label => {

      const text =
        (label.textContent || "").trim();

      const field =
        FIELD_MAP[text] ||
        Object.keys(FIELD_MAP).find(
          key =>
            text.toLowerCase() ===
            key.toLowerCase()
        );

      if (field) {
        addArchiveButton(
          label,
          field
        );
      }

    });
  }

  function start() {

    scanFields();

    const observer =
      new MutationObserver(
        scanFields
      );

    observer.observe(
      document.body,
      {
        childList:true,
        subtree:true
      }
    );

    setInterval(
      scanFields,
      2000
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      start
    );

  } else {

    start();

  }

})();
