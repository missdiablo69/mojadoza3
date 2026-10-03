/* Moja Doza — ARHIVA dugmad za Decap CMS */
(function () {
  "use strict";

  const OWNER = "missdiablo69";
  const REPO = "mojadoza3";
  const BRANCH = "main";

  const FIELD_NAMES = new Set([
    "ovan",
    "bik",
    "blizanci",
    "rak",
    "lav",
    "devica",
    "vaga",
    "skorpija",
    "strelac",
    "jarac",
    "vodolija",
    "ribe",
    "description",
    "body",
    "title"
  ]);

  function token() {
    try {
      return (
        window.netlifyIdentity &&
        window.netlifyIdentity.currentUser() &&
        window.netlifyIdentity.currentUser().token &&
        window.netlifyIdentity.currentUser().token.access_token
      );
    } catch (e) {
      return null;
    }
  }

 function gatewayUrl(path) {
    return (
      "/.netlify/git/github/contents/" +
      path.replace(/^\/+/, "")
    );
}

  async function gateway(method, path, body) {
    const t = token();

    if (!t) {
      throw new Error("Niste prijavljeni u Back Office.");
    }

    const options = {
      method: method,
      headers: {
        "Authorization": "Bearer " + t,
        "Content-Type": "application/json"
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(gatewayUrl(path), options);
    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = {
        message: responseText
      };
    }

    if (!response.ok) {
      throw new Error(
        data.message || ("Git Gateway greška " + response.status)
      );
    }

    return data;
  }

  function base64Utf8(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";

    bytes.forEach(function (byte) {
      binary += String.fromCharCode(byte);
    });

    return btoa(binary);
  }

  function routeInfo() {
    const hash = location.hash || "";

    const match = hash.match(
      /collections\/([^/]+)\/entries\/([^/?#]+)/i
    );

    if (!match) {
      return null;
    }

    return {
      collection: decodeURIComponent(match[1]),
      slug: decodeURIComponent(match[2])
    };
  }

  function sourceFolder(collection) {
    const folders = {
      horoskop: "content/horoskop",
      analize: "content/analize",
      zanimljivosti: "content/zanimljivosti",
      blog: "content/blog"
    };

    return folders[collection] || null;
  }

  function guessFile(collection, slug) {
    const folder = sourceFolder(collection);

    if (!folder) {
      return null;
    }

    return folder + "/" + slug + ".md";
  }

  function safeName(text) {
    return String(text)
      .toLowerCase()
      .replace(/š/g, "s")
      .replace(/č/g, "c")
      .replace(/ć/g, "c")
      .replace(/ž/g, "z")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function makeArchivePath(collection, slug, field) {
    const stamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, "")
      .slice(0, 14);

    return (
      "content/arhiva/" +
      safeName(collection) +
      "--" +
      safeName(slug) +
      "--" +
      safeName(field) +
      "--" +
      stamp +
      ".md"
    );
  }

  function frontmatter(
    title,
    collection,
    field,
    originalFile
  ) {
    function escapeYaml(value) {
      return String(value || "")
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, " ");
    }

    return [
      "---",
      'title: "' + escapeYaml(title) + '"',
      'source: "' + escapeYaml(collection) + '"',
      'field: "' + escapeYaml(field) + '"',
      'original_file: "' + escapeYaml(originalFile) + '"',
      'archived_at: "' + new Date().toISOString() + '"',
      "---",
      ""
    ].join("\n");
  }

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function fieldNameFromElement(element) {
    const name = normalize(
      element.getAttribute("name") ||
      element.getAttribute("data-field") ||
      ""
    );

    const id = normalize(element.id || "");

    const direct = {
      ovan: "ovan",
      bik: "bik",
      blizanci: "blizanci",
      rak: "rak",
      lav: "lav",
      devica: "devica",
      vaga: "vaga",
      skorpija: "skorpija",
      škorpija: "skorpija",
      strelac: "strelac",
      jarac: "jarac",
      vodolija: "vodolija",
      ribe: "ribe",
      description: "description",
      body: "body",
      title: "title"
    };

    if (direct[name]) {
      return direct[name];
    }

    for (const key of Object.keys(direct)) {
      if (
        name.includes(key) ||
        id.includes(key)
      ) {
        return direct[key];
      }
    }

    return null;
  }

  function fieldNameFromText(text) {
    const value = normalize(text);

    const map = {
      ovan: "ovan",
      bik: "bik",
      blizanci: "blizanci",
      rak: "rak",
      lav: "lav",
      devica: "devica",
      vaga: "vaga",
      škorpija: "skorpija",
      skorpija: "skorpija",
      strelac: "strelac",
      jarac: "jarac",
      vodolija: "vodolija",
      ribe: "ribe",

      "kratak opis": "description",
      "sadržaj teksta": "body",
      "sadržaj bloga": "body",
      "naslov teksta": "title",
      "naslov bloga": "title",
      naslov: "title"
    };

    for (const key of Object.keys(map)) {
      if (
        value === key ||
        value.includes(key)
      ) {
        return map[key];
      }
    }

    return null;
  }

  function findFieldRoot(control) {
    let node = control;

    for (
      let i = 0;
      i < 10 && node;
      i++,
      node = node.parentElement
    ) {
      if (
        node.querySelector(
          "textarea, input[type='text'], input:not([type]), [contenteditable='true']"
        )
      ) {
        return node;
      }
    }

    return control.parentElement || control;
  }

  function fieldValue(root) {
    const textarea = root.querySelector("textarea");

    if (textarea) {
      return textarea.value;
    }

    const editable = root.querySelector(
      "[contenteditable='true']"
    );

    if (editable) {
      return (
        editable.innerText ||
        editable.textContent ||
        ""
      );
    }

    const input = root.querySelector(
      "input[type='text'], input:not([type])"
    );

    if (input) {
      return input.value;
    }

    return "";
  }

  async function archiveField(
    fieldName,
    currentValue,
    button
  ) {
    const info = routeInfo();

    if (!info) {
      alert(
        "Otvori konkretan tekst u Back Office-u pa klikni ARHIVIRAJ."
      );
      return;
    }

    const folder = sourceFolder(info.collection);

    if (!folder) {
      alert(
        "Ova sekcija još nije povezana sa Arhivom."
      );
      return;
    }

    const value = String(currentValue || "").trim();

    if (!value) {
      alert("Ovo polje je prazno.");
      return;
    }

    const confirmed = confirm(
      "Arhivirati ovaj tekst?\n\n" +
      "Sekcija: " +
      info.collection +
      "\n" +
      "Polje: " +
      fieldName +
      "\n\n" +
      "Tekst će biti sačuvan u ARHIVU."
    );

    if (!confirmed) {
      return;
    }

    button.disabled = true;
    button.textContent = "ARHIVIRAM...";

    try {
      const originalFile = guessFile(
        info.collection,
        info.slug
      );

      if (!originalFile) {
        throw new Error(
          "Ne mogu odrediti originalni fajl."
        );
      }

      const archivePath = makeArchivePath(
        info.collection,
        info.slug,
        fieldName
      );

      const title =
        info.slug.replace(/-/g, " ") +
        " — " +
        fieldName;

      const content =
        frontmatter(
          title,
          info.collection,
          fieldName,
          originalFile
        ) +
        value +
        "\n";

      await gateway(
        "PUT",
        archivePath,
        {
          message:
            "Arhiviraj: " +
            info.collection +
            "/" +
            info.slug +
            " [" +
            fieldName +
            "]",

          content: base64Utf8(content),

          branch: BRANCH
        }
      );

      button.textContent = "✓ ARHIVIRANO";
      button.style.background = "#2e7d32";

      alert(
        "Tekst je uspješno sačuvan u ARHIVU.\n\n" +
        "Arhivirana kopija je sada spremljena u content/arhiva."
      );

    } catch (error) {
      console.error(error);

      alert(
        "Arhiviranje nije uspjelo:\n\n" +
        error.message
      );

      button.textContent = "ARHIVIRAJ";

    } finally {
      button.disabled = false;
    }
  }

  function addButtonForControl(
    control,
    fieldName
  ) {
    const root = findFieldRoot(control);

    if (!root) {
      return;
    }

    if (
      root.dataset.moArhiva === "1"
    ) {
      return;
    }

    root.dataset.moArhiva = "1";

    const button =
      document.createElement("button");

    button.type = "button";

    button.textContent =
      "ARHIVIRAJ";

    button.style.cssText =
      "display:inline-block;" +
      "margin:8px 0 10px;" +
      "padding:8px 15px;" +
      "border:1px solid #d4af37;" +
      "border-radius:6px;" +
      "background:#1a1530;" +
      "color:#d4af37;" +
      "font-weight:700;" +
      "cursor:pointer;" +
      "font-size:12px;" +
      "letter-spacing:.5px;" +
      "position:relative;" +
      "z-index:9999;";

    button.title =
      "Sačuvaj ovaj tekst u Arhivu";

    button.addEventListener(
      "click",
      function (event) {

        event.preventDefault();
        event.stopPropagation();

        archiveField(
          fieldName,
          fieldValue(root),
          button
        );
      }
    );

    const label =
      root.querySelector("label") ||
      Array.from(
        root.querySelectorAll("*")
      ).find(function (element) {

        const text =
          normalize(
            element.textContent
          );

        return (
          text &&
          fieldNameFromText(text) ===
            fieldName &&
          element.children.length === 0
        );
      });

    if (
      label &&
      label.parentElement
    ) {
      label.parentElement.appendChild(
        button
      );

    } else if (
      control.parentElement
    ) {
      control.parentElement.insertBefore(
        button,
        control
      );

    } else {
      root.insertBefore(
        button,
        root.firstChild
      );
    }
  }

  function addButtons() {
    const info = routeInfo();

    if (
      !info ||
      !sourceFolder(info.collection)
    ) {
      return;
    }

    const controls =
      document.querySelectorAll(
        "textarea, " +
        "input[type='text'], " +
        "input:not([type]), " +
        "[contenteditable='true']"
      );

    controls.forEach(
      function (control) {

        const fieldName =
          fieldNameFromElement(
            control
          );

        if (
          fieldName &&
          FIELD_NAMES.has(fieldName)
        ) {
          addButtonForControl(
            control,
            fieldName
          );
        }
      }
    );

    document
      .querySelectorAll("label")
      .forEach(
        function (label) {

          const fieldName =
            fieldNameFromText(
              label.textContent
            );

          if (
            !fieldName ||
            !FIELD_NAMES.has(
              fieldName
            )
          ) {
            return;
          }

          const root =
            findFieldRoot(label);

          const control =
            root.querySelector(
              "textarea, " +
              "input[type='text'], " +
              "input:not([type]), " +
              "[contenteditable='true']"
            );

          if (control) {
            addButtonForControl(
              control,
              fieldName
            );
          }
        }
      );
  }

  function start() {
    addButtons();

    const observer =
      new MutationObserver(
        function () {
          addButtons();
        }
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );

    setInterval(
      addButtons,
      1500
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
