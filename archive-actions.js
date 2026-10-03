/* Moja Doza — ARHIVA dugmad za Decap CMS
 *
 * Funkcije:
 * 1. ARHIVIRAJ kopira sadržaj u content/arhiva/
 * 2. Tek nakon uspješnog arhiviranja uklanja to polje iz originalnog .md fajla
 * 3. Ako brisanje originala ne uspije, arhivirana kopija ostaje sačuvana
 */

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

  /* ---------------------------------------------------------
     NETLIFY IDENTITY / TOKEN
  --------------------------------------------------------- */

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

  /* ---------------------------------------------------------
     GIT GATEWAY
  --------------------------------------------------------- */

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

    const response = await fetch(
      gatewayUrl(path),
      options
    );

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
        data.message ||
        ("Git Gateway greška " + response.status)
      );
    }

    return data;
  }

  /* ---------------------------------------------------------
     BASE64 UTF-8
  --------------------------------------------------------- */

  function base64Utf8(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";

    bytes.forEach(function (byte) {
      binary += String.fromCharCode(byte);
    });

    return btoa(binary);
  }

  function decodeBase64Utf8(base64) {
    const binary = atob(
      String(base64 || "").replace(/\s/g, "")
    );

    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return new TextDecoder("utf-8").decode(bytes);
  }

  /* ---------------------------------------------------------
     BACK OFFICE RUTA
  --------------------------------------------------------- */

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

  /* ---------------------------------------------------------
     SOURCE FOLDERS
  --------------------------------------------------------- */

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

  /* ---------------------------------------------------------
     SIGURNO IME ZA ARHIVU
  --------------------------------------------------------- */

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

  function makeArchivePath(
    collection,
    slug,
    field
  ) {
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

  /* ---------------------------------------------------------
     YAML FRONTMATTER ZA ARHIVU
  --------------------------------------------------------- */

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
      'title: "' +
        escapeYaml(title) +
        '"',
      'source: "' +
        escapeYaml(collection) +
        '"',
      'field: "' +
        escapeYaml(field) +
        '"',
      'original_file: "' +
        escapeYaml(originalFile) +
        '"',
      'archived_at: "' +
        new Date().toISOString() +
        '"',
      "---",
      ""
    ].join("\n");
  }

  /* ---------------------------------------------------------
     NORMALIZACIJA
  --------------------------------------------------------- */

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  /* ---------------------------------------------------------
     PREPOZNAVANJE POLJA
  --------------------------------------------------------- */

  function fieldNameFromElement(element) {
    const name = normalize(
      element.getAttribute("name") ||
      element.getAttribute("data-field") ||
      ""
    );

    const id = normalize(
      element.id || ""
    );

    const direct = {
      ovan: "ovan",
      bik: "bik",
      blizanci: "blizanci",
      rak: "rak",
      lav: "lav",
      devica: "devica",
      vaga: "vaga",
      skorpija: "skorpija",
      "škorpija": "skorpija",
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
      "škorpija": "skorpija",
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

  /* ---------------------------------------------------------
     PRONALAŽENJE POLJA U CMS-U
  --------------------------------------------------------- */

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
    const textarea =
      root.querySelector("textarea");

    if (textarea) {
      return textarea.value;
    }

    const editable =
      root.querySelector(
        "[contenteditable='true']"
      );

    if (editable) {
      return (
        editable.innerText ||
        editable.textContent ||
        ""
      );
    }

    const input =
      root.querySelector(
        "input[type='text'], input:not([type])"
      );

    if (input) {
      return input.value;
    }

    return "";
  }

  /* ---------------------------------------------------------
     ČITANJE ORIGINALNOG GITHUB FAJLA
  --------------------------------------------------------- */

  async function getGithubFile(path) {
    return await gateway(
      "GET",
      path
    );
  }

  /* ---------------------------------------------------------
     UKLANJANJE POLJA IZ MARKDOWN FAJLA
     
     Podržava:
       ovan: |
         tekst...

       title: "Naslov"

       body: |
         tekst...
  --------------------------------------------------------- */

  function removeYamlField(
    markdown,
    fieldName
  ) {
    const lines =
      String(markdown || "").split("\n");

    if (
      lines.length < 3 ||
      lines[0].trim() !== "---"
    ) {
      throw new Error(
        "Originalni fajl nema ispravan YAML frontmatter."
      );
    }

    let frontmatterEnd = -1;

    for (
      let i = 1;
      i < lines.length;
      i++
    ) {
      if (
        lines[i].trim() === "---"
      ) {
        frontmatterEnd = i;
        break;
      }
    }

    if (frontmatterEnd === -1) {
      throw new Error(
        "Nije pronađen kraj YAML frontmattera."
      );
    }

    const wanted =
      String(fieldName || "")
        .trim()
        .toLowerCase();

    const output = [];

    let removed = false;
    let i = 0;

    while (i <= frontmatterEnd) {
      const line = lines[i];

      if (
        i > 0 &&
        i < frontmatterEnd
      ) {
        const match =
          line.match(
            /^([A-Za-z0-9_-]+)\s*:(.*)$/
          );

        if (
          match &&
          match[1].toLowerCase() === wanted
        ) {
          removed = true;

          i++;

          /*
           * Preskoči sve nastavne YAML linije
           * dok ne naiđemo na sljedeći top-level
           * field ili kraj frontmattera.
           */
          while (
            i < frontmatterEnd
          ) {
            const nextLine =
              lines[i];

            const nextField =
              nextLine.match(
                /^([A-Za-z0-9_-]+)\s*:/
              );

            if (nextField) {
              break;
            }

            i++;
          }

          continue;
        }
      }

      output.push(line);
      i++;
    }

    if (!removed) {
      throw new Error(
        'Polje "' +
        fieldName +
        '" nije pronađeno u originalnom fajlu.'
      );
    }

    return output.join("\n");
  }

  /* ---------------------------------------------------------
     AŽURIRANJE ORIGINALNOG GITHUB FAJLA
  --------------------------------------------------------- */

  async function removeFieldFromOriginal(
    originalFile,
    fieldName
  ) {
    const file =
      await getGithubFile(
        originalFile
      );

    if (
      !file ||
      !file.content ||
      !file.sha
    ) {
      throw new Error(
        "GitHub nije vratio sadržaj ili SHA originalnog fajla."
      );
    }

    const originalMarkdown =
      decodeBase64Utf8(
        file.content
      );

    const updatedMarkdown =
      removeYamlField(
        originalMarkdown,
        fieldName
      );

    await gateway(
      "PUT",
      originalFile,
      {
        message:
          "Ukloni arhivirani sadržaj: " +
          originalFile +
          " [" +
          fieldName +
          "]",

        content:
          base64Utf8(
            updatedMarkdown
          ),

        sha:
          file.sha,

        branch:
          BRANCH
      }
    );
  }

  /* ---------------------------------------------------------
     GLAVNA FUNKCIJA ARHIVIRANJA
  --------------------------------------------------------- */

  async function archiveField(
    fieldName,
    currentValue,
    button
  ) {
    const info =
      routeInfo();

    if (!info) {
      alert(
        "Otvori konkretan tekst u Back Office-u pa klikni ARHIVIRAJ."
      );
      return;
    }

    const folder =
      sourceFolder(
        info.collection
      );

    if (!folder) {
      alert(
        "Ova sekcija još nije povezana sa Arhivom."
      );
      return;
    }

    const value =
      String(
        currentValue || ""
      ).trim();

    if (!value) {
      alert(
        "Ovo polje je prazno."
      );
      return;
    }

    const confirmed =
      confirm(
        "Arhivirati ovaj tekst?\n\n" +
        "Sekcija: " +
        info.collection +
        "\n" +
        "Polje: " +
        fieldName +
        "\n\n" +
        "Tekst će prvo biti sačuvan u ARHIVU, " +
        "a zatim uklonjen iz aktivnog sadržaja."
      );

    if (!confirmed) {
      return;
    }

    button.disabled = true;
    button.textContent =
      "ARHIVIRAM...";

    try {
      /* ---------------------------------------------
         1. ODREDI ORIGINALNI FAJL
      --------------------------------------------- */

      const originalFile =
        guessFile(
          info.collection,
          info.slug
        );

      if (!originalFile) {
        throw new Error(
          "Ne mogu odrediti originalni fajl."
        );
      }

      /* ---------------------------------------------
         2. KREIRAJ PUTANJU ARHIVE
      --------------------------------------------- */

      const archivePath =
        makeArchivePath(
          info.collection,
          info.slug,
          fieldName
        );

      const title =
        info.slug.replace(
          /-/g,
          " "
        ) +
        " — " +
        fieldName;

      const archiveContent =
        frontmatter(
          title,
          info.collection,
          fieldName,
          originalFile
        ) +
        value +
        "\n";

      /* ---------------------------------------------
         3. PRVO SAČUVAJ U ARHIVU
      --------------------------------------------- */

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

          content:
            base64Utf8(
              archiveContent
            ),

          branch:
            BRANCH
        }
      );

      /* ---------------------------------------------
         4. TEK SADA UKLONI IZ ORIGINALA
      --------------------------------------------- */

      button.textContent =
        "UKLANJAM IZ AKTIVNOG...";

      try {
        await removeFieldFromOriginal(
          originalFile,
          fieldName
        );
      } catch (removeError) {
        console.error(
          "Arhiva je uspješna, ali uklanjanje originala nije:",
          removeError
        );

        alert(
          "Tekst je uspješno spremljen u ARHIVU.\n\n" +
          "Ali originalni tekst NIJE uklonjen iz aktivnog sadržaja.\n\n" +
          "Razlog:\n" +
          removeError.message +
          "\n\n" +
          "Arhivirana kopija je sačuvana."
        );

        button.textContent =
          "✓ U ARHIVI";

        button.style.background =
          "#2e7d32";

        return;
      }

      /* ---------------------------------------------
         5. SVE USPJEŠNO
      --------------------------------------------- */

      button.textContent =
        "✓ ARHIVIRANO";

      button.style.background =
        "#2e7d32";

      alert(
        "Uspješno!\n\n" +
        "1. Tekst je spremljen u content/arhiva.\n" +
        "2. Tekst je uklonjen iz aktivnog sadržaja.\n\n" +
        "Arhiva sada čuva originalnu kopiju."
      );

    } catch (error) {
      console.error(
        "ARHIVIRANJE GREŠKA:",
        error
      );

      alert(
        "Arhiviranje nije uspjelo:\n\n" +
        error.message
      );

      button.textContent =
        "ARHIVIRAJ";

    } finally {
      button.disabled =
        false;
    }
  }

  /* ---------------------------------------------------------
     DODAVANJE DUGMETA
  --------------------------------------------------------- */

  function addButtonForControl(
    control,
    fieldName
  ) {
    const root =
      findFieldRoot(
        control
      );

    if (!root) {
      return;
    }

    if (
      root.dataset.moArhiva === "1"
    ) {
      return;
    }

    root.dataset.moArhiva =
      "1";

    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

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
      "Sačuvaj ovaj tekst u Arhivu i ukloni ga iz aktivnog sadržaja";

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
      root.querySelector(
        "label"
      ) ||
      Array.from(
        root.querySelectorAll("*")
      ).find(
        function (element) {
          const text =
            normalize(
              element.textContent
            );

          return (
            text &&
            fieldNameFromText(
              text
            ) === fieldName &&
            element.children.length === 0
          );
        }
      );

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

  /* ---------------------------------------------------------
     PRONAĐI SVA POLJA
  --------------------------------------------------------- */

  function addButtons() {
    const info =
      routeInfo();

    if (
      !info ||
      !sourceFolder(
        info.collection
      )
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
          FIELD_NAMES.has(
            fieldName
          )
        ) {
          addButtonForControl(
            control,
            fieldName
          );
        }
      }
    );

    document
      .querySelectorAll(
        "label"
      )
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
            findFieldRoot(
              label
            );

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

  /* ---------------------------------------------------------
     POKRETANJE
  --------------------------------------------------------- */

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
