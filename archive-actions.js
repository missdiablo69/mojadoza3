/* =========================================================
   MOJA DOZA — SISTEM ARHIVE ZA DECAP CMS

   FUNKCIJE:

   1. ARHIVIRAJ
      - napravi kopiju teksta u content/arhiva/
      - sačuva podatke o originalnom fajlu
      - sačuva podatak o originalnom polju
      - nakon uspješnog arhiviranja uklanja polje iz originala

   2. VRATI IZ ARHIVE
      - pročita original_file iz arhive
      - pročita field iz arhive
      - pročita arhivirani tekst
      - vrati tekst u originalni fajl
      - vrati ga u originalno polje
      - arhivska kopija ostaje sačuvana

   GitHub:
      owner = missdiablo69
      repo  = mojadoza3
      branch = main
========================================================= */

(function () {
  "use strict";


  /* =======================================================
     GITHUB POSTAVKE
  ======================================================= */

  const OWNER = "missdiablo69";
  const REPO = "mojadoza3";
  const BRANCH = "main";


  /* =======================================================
     POLJA KOJA MOGU BITI ARHIVIRANA
  ======================================================= */

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


  /* =======================================================
     NETLIFY IDENTITY TOKEN
  ======================================================= */

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


  /* =======================================================
     GIT GATEWAY URL
  ======================================================= */

  function gatewayUrl(path) {
    return (
      "/.netlify/git/github/contents/" +
      path.replace(/^\/+/, "")
    );
  }


  /* =======================================================
     GIT GATEWAY REQUEST
  ======================================================= */

  async function gateway(method, path, body) {

    const t = token();

    if (!t) {
      throw new Error(
        "Niste prijavljeni u Back Office."
      );
    }

    const options = {
      method: method,

      headers: {
        "Authorization": "Bearer " + t,
        "Content-Type": "application/json"
      }
    };

    if (body) {
      options.body =
        JSON.stringify(body);
    }

    const response =
      await fetch(
        gatewayUrl(path),
        options
      );

    const responseText =
      await response.text();

    let data;

    try {
      data =
        JSON.parse(
          responseText
        );
    } catch (e) {

      data = {
        message: responseText
      };

    }

    if (!response.ok) {

      throw new Error(
        data.message ||
        (
          "Git Gateway greška " +
          response.status
        )
      );

    }

    return data;
  }


  /* =======================================================
     BASE64 UTF-8
  ======================================================= */

  function base64Utf8(text) {

    const bytes =
      new TextEncoder().encode(
        text
      );

    let binary = "";

    bytes.forEach(
      function (byte) {
        binary +=
          String.fromCharCode(
            byte
          );
      }
    );

    return btoa(binary);
  }


  /* =======================================================
     DECODE BASE64 UTF-8
  ======================================================= */

  function decodeBase64Utf8(base64) {

    const binary =
      atob(
        String(base64 || "")
          .replace(/\s/g, "")
      );

    const bytes =
      new Uint8Array(
        binary.length
      );

    for (
      let i = 0;
      i < binary.length;
      i++
    ) {

      bytes[i] =
        binary.charCodeAt(i);

    }

    return new TextDecoder(
      "utf-8"
    ).decode(bytes);
  }


  /* =======================================================
     BACK OFFICE RUTA
  ======================================================= */

  function routeInfo() {

    const hash =
      location.hash || "";

    const match =
      hash.match(
        /collections\/([^/]+)\/entries\/([^/?#]+)/i
      );

    if (!match) {
      return null;
    }

    return {

      collection:
        decodeURIComponent(
          match[1]
        ),

      slug:
        decodeURIComponent(
          match[2]
        )

    };
  }


  /* =======================================================
     SOURCE FOLDERI
  ======================================================= */

  function sourceFolder(
    collection
  ) {

    const folders = {

      horoskop:
        "content/horoskop",

      analize:
        "content/analize",

      zanimljivosti:
        "content/zanimljivosti",

      blog:
        "content/blog",

      arhiva:
        "content/arhiva"
    };

    return (
      folders[collection] ||
      null
    );
  }


  /* =======================================================
     ORIGINALNI FAJL
  ======================================================= */

  function guessFile(
    collection,
    slug
  ) {

    const folder =
      sourceFolder(
        collection
      );

    if (!folder) {
      return null;
    }

    return (
      folder +
      "/" +
      slug +
      ".md"
    );
  }


  /* =======================================================
     SIGURNO IME
  ======================================================= */

  function safeName(text) {

    return String(text)

      .toLowerCase()

      .replace(/š/g, "s")
      .replace(/č/g, "c")
      .replace(/ć/g, "c")
      .replace(/ž/g, "z")
      .replace(/đ/g, "d")

      .replace(
        /[^a-z0-9_-]+/g,
        "-"
      )

      .replace(
        /^-+|-+$/g,
        ""
      );
  }


  /* =======================================================
     PUTANJA ARHIVE
  ======================================================= */

  function makeArchivePath(
    collection,
    slug,
    field
  ) {

    const stamp =
      new Date()
        .toISOString()
        .replace(
          /[-:.TZ]/g,
          ""
        )
        .slice(
          0,
          14
        );

    return (
      "content/arhiva/" +

      safeName(
        collection
      ) +

      "--" +

      safeName(
        slug
      ) +

      "--" +

      safeName(
        field
      ) +

      "--" +

      stamp +

      ".md"
    );
  }


  /* =======================================================
     ARHIVSKI FRONTMATTER
  ======================================================= */

  function frontmatter(
    title,
    collection,
    field,
    originalFile
  ) {

    function escapeYaml(
      value
    ) {

      return String(
        value || ""
      )

        .replace(
          /\\/g,
          "\\\\"
        )

        .replace(
          /"/g,
          '\\"'
        )

        .replace(
          /\n/g,
          " "
        );
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


  /* =======================================================
     NORMALIZACIJA
  ======================================================= */

  function normalize(text) {

    return String(
      text || ""
    )

      .toLowerCase()

      .replace(
        /\s+/g,
        " "
      )

      .trim();
  }


  /* =======================================================
     PREPOZNAVANJE POLJA PO ELEMENTU
  ======================================================= */

  function fieldNameFromElement(
    element
  ) {

    const name =
      normalize(
        element.getAttribute(
          "name"
        ) ||
        element.getAttribute(
          "data-field"
        ) ||
        ""
      );

    const id =
      normalize(
        element.id || ""
      );

    const direct = {

      ovan:
        "ovan",

      bik:
        "bik",

      blizanci:
        "blizanci",

      rak:
        "rak",

      lav:
        "lav",

      devica:
        "devica",

      vaga:
        "vaga",

      skorpija:
        "skorpija",

      "škorpija":
        "skorpija",

      strelac:
        "strelac",

      jarac:
        "jarac",

      vodolija:
        "vodolija",

      ribe:
        "ribe",

      description:
        "description",

      body:
        "body",

      title:
        "title"
    };


    if (direct[name]) {

      return direct[name];

    }


    for (
      const key of
      Object.keys(direct)
    ) {

      if (
        name.includes(key) ||
        id.includes(key)
      ) {

        return direct[key];

      }

    }


    return null;
  }


  /* =======================================================
     PREPOZNAVANJE POLJA PO NAZIVU
  ======================================================= */

  function fieldNameFromText(
    text
  ) {

    const value =
      normalize(text);

    const map = {

      ovan:
        "ovan",

      bik:
        "bik",

      blizanci:
        "blizanci",

      rak:
        "rak",

      lav:
        "lav",

      devica:
        "devica",

      vaga:
        "vaga",

      "škorpija":
        "skorpija",

      skorpija:
        "skorpija",

      strelac:
        "strelac",

      jarac:
        "jarac",

      vodolija:
        "vodolija",

      ribe:
        "ribe",

      "kratak opis":
        "description",

      "sadržaj teksta":
        "body",

      "sadržaj bloga":
        "body",

      "naslov teksta":
        "title",

      "naslov bloga":
        "title",

      naslov:
        "title"
    };


    for (
      const key of
      Object.keys(map)
    ) {

      if (
        value === key ||
        value.includes(key)
      ) {

        return map[key];

      }

    }


    return null;
  }


  /* =======================================================
     PRONAĐI ROOT POLJA
  ======================================================= */

  function findFieldRoot(
    control
  ) {

    let node =
      control;

    for (
      let i = 0;
      i < 10 && node;
      i++,
      node =
        node.parentElement
    ) {

      if (
        node.querySelector(
          "textarea, input[type='text'], input:not([type]), [contenteditable='true']"
        )
      ) {

        return node;

      }

    }


    return (
      control.parentElement ||
      control
    );
  }


  /* =======================================================
     PROČITAJ VRIJEDNOST POLJA
  ======================================================= */

  function fieldValue(
    root
  ) {

    const textarea =
      root.querySelector(
        "textarea"
      );

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


  /* =======================================================
     ČITANJE GITHUB FAJLA
  ======================================================= */

  async function getGithubFile(
    path
  ) {

    return await gateway(
      "GET",
      path
    );
  }


  /* =======================================================
     UKLONI POLJE IZ ORIGINALNOG MARKDOWNA
  ======================================================= */

  function removeYamlField(
    markdown,
    fieldName
  ) {

    const lines =
      String(markdown || "")
        .split("\n");

    if (
      lines.length < 3 ||
      lines[0].trim() !== "---"
    ) {

      throw new Error(
        "Originalni fajl nema ispravan YAML frontmatter."
      );

    }


    let frontmatterEnd =
      -1;


    for (
      let i = 1;
      i < lines.length;
      i++
    ) {

      if (
        lines[i].trim() === "---"
      ) {

        frontmatterEnd =
          i;

        break;
      }

    }


    if (
      frontmatterEnd === -1
    ) {

      throw new Error(
        "Nije pronađen kraj YAML frontmattera."
      );

    }


    const wanted =
      String(
        fieldName || ""
      )
        .trim()
        .toLowerCase();


    const output = [];

    let removed =
      false;

    let i = 0;


    while (
      i <= frontmatterEnd
    ) {

      const line =
        lines[i];


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
          match[1].toLowerCase() ===
            wanted
        ) {

          removed =
            true;

          i++;


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


      output.push(
        line
      );

      i++;
    }


    if (!removed) {

      throw new Error(
        'Polje "' +
        fieldName +
        '" nije pronađeno u originalnom fajlu.'
      );

    }


    return output.join(
      "\n"
    );
  }


  /* =======================================================
     UKLONI POLJE IZ ORIGINALNOG FAJLA
  ======================================================= */

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


  /* =======================================================
     ARHIVIRAJ TEKST
  ======================================================= */

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


    if (
      !folder ||
      info.collection ===
        "arhiva"
    ) {

      alert(
        "Ova sekcija nije aktivan sadržaj za arhiviranje."
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


    button.disabled =
      true;

    button.textContent =
      "ARHIVIRAM...";


    try {

      /* ---------------------------------------------
         ORIGINALNI FAJL
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
         ARHIVSKI FAJL
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
         1. PRVO ARHIVA
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
         2. UKLANJANJE IZ AKTIVNOG SADRŽAJA
      --------------------------------------------- */

      button.textContent =
        "UKLANJAM IZ AKTIVNOG...";


      try {

        await removeFieldFromOriginal(
          originalFile,
          fieldName
        );

      } catch (
        removeError
      ) {

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
         3. USPJEH
      --------------------------------------------- */

      button.textContent =
        "✓ ARHIVIRANO";


      button.style.background =
        "#2e7d32";


      alert(

        "Uspješno!\n\n" +

        "1. Tekst je spremljen u content/arhiva.\n" +

        "2. Tekst je uklonjen iz aktivnog sadržaja.\n\n" +

        "Arhivirana kopija je sačuvana."

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


  /* =======================================================
     PARSIRAJ ARHIVSKI MARKDOWN
  ======================================================= */

  function parseArchiveMarkdown(
    markdown
  ) {

    const lines =
      String(
        markdown || ""
      ).split("\n");


    if (
      lines.length < 3 ||
      lines[0].trim() !== "---"
    ) {

      throw new Error(
        "Arhivski fajl nema ispravan YAML frontmatter."
      );

    }


    let end =
      -1;


    for (
      let i = 1;
      i < lines.length;
      i++
    ) {

      if (
        lines[i].trim() === "---"
      ) {

        end =
          i;

        break;
      }

    }


    if (end === -1) {

      throw new Error(
        "Nije pronađen kraj arhivskog frontmattera."
      );

    }


    const meta = {};


    for (
      let i = 1;
      i < end;
      i++
    ) {

      const line =
        lines[i];


      const match =
        line.match(
          /^([A-Za-z0-9_-]+):\s*"?([^"]*)"?$/
        );


      if (match) {

        meta[
          match[1]
        ] =
          match[2];

      }
    }


    const content =
      lines

        .slice(
          end + 1
        )

        .join("\n")

        .replace(
          /^\n+|\n+$/g,
          ""
        );


    return {

      originalFile:
        meta.original_file,

      field:
        meta.field,

      content:
        content

    };
  }


  /* =======================================================
     YAML POLJE ZA VRAĆANJE
  ======================================================= */

  function yamlBlockField(
    field,
    value
  ) {

    const clean =
      String(
        value || ""
      ).replace(
        /\r/g,
        ""
      );


    const body =
      clean
        .split("\n")
        .map(
          function (line) {
            return (
              "  " +
              line
            );
          }
        )
        .join("\n");


    return (
      field +
      ": |\n" +
      body
    );
  }


  /* =======================================================
     UBACI POLJE NAZAD U ORIGINAL

     VAŽNO:
     Ako polje već postoji, sada se PREPISUJE arhiviranom
     vrijednošću.

     Ovo rješava problem sa title poljem:
     "Polje title već postoji u originalnom fajlu.
      Tekst nije prepisan."

     Decap često već ima title u originalnom fajlu,
     pa staro ponašanje nije moglo vratiti title.
  ======================================================= */

  function insertRestoredField(
    markdown,
    field,
    value
  ) {

    const lines =
      String(
        markdown || ""
      ).split("\n");


    if (
      lines.length < 3 ||
      lines[0].trim() !== "---"
    ) {

      throw new Error(
        "Originalni fajl nema ispravan YAML frontmatter."
      );

    }


    let end =
      -1;


    for (
      let i = 1;
      i < lines.length;
      i++
    ) {

      if (
        lines[i].trim() === "---"
      ) {

        end =
          i;

        break;
      }

    }


    if (end === -1) {

      throw new Error(
        "Nije pronađen kraj originalnog frontmattera."
      );

    }


    const wanted =
      String(
        field || ""
      )
        .trim()
        .toLowerCase();


    /* ---------------------------------------------
       PROVJERI DA LI POLJE VEĆ POSTOJI

       Ako postoji:
       - pronađi cijeli YAML blok tog polja
       - ukloni ga
       - ubaci arhiviranu vrijednost na isto mjesto

       Ako ne postoji:
       - ubaci novo polje prije završnog ---
    --------------------------------------------- */

    for (
      let i = 1;
      i < end;
      i++
    ) {

      const match =
        lines[i].match(
          /^([A-Za-z0-9_-]+)\s*:/
        );


      if (
        match &&
        match[1].toLowerCase() ===
          wanted
      ) {

        /*
         * POLJE VEĆ POSTOJI.
         *
         * Umjesto greške, zamjenjujemo
         * postojeće polje arhiviranom
         * vrijednošću.
         */

        const fieldStart =
          i;

        let fieldEnd =
          i + 1;


        /*
         * Pronađi početak sljedećeg
         * YAML polja.
         *
         * Ovo omogućava zamjenu i kod
         * višerednih YAML vrijednosti.
         */

        while (
          fieldEnd < end
        ) {

          const nextField =
            lines[fieldEnd].match(
              /^([A-Za-z0-9_-]+)\s*:/
            );


          if (nextField) {
            break;
          }


          fieldEnd++;
        }


        /*
         * Zamijeni cijeli postojeći
         * YAML blok arhiviranom
         * vrijednošću.
         */

        lines.splice(
          fieldStart,
          fieldEnd - fieldStart,
          yamlBlockField(
            field,
            value
          )
        );


        return lines.join(
          "\n"
        );

      }
    }


    /* ---------------------------------------------
       POLJE NE POSTOJI
       UBACI GA PRIJE ZAVRŠNOG ---
    --------------------------------------------- */

    lines.splice(
      end,
      0,
      yamlBlockField(
        field,
        value
      )
    );


    return lines.join(
      "\n"
    );
  }


  /* =======================================================
     PUTANJA ARHIVSKOG FAJLA
  ======================================================= */

  function archiveFilePath(
    info
  ) {

    if (
      !info ||
      info.collection !==
        "arhiva"
    ) {

      return null;
    }


    return (
      "content/arhiva/" +
      info.slug +
      ".md"
    );
  }


  /* =======================================================
     VRATI IZ ARHIVE
  ======================================================= */

  async function restoreArchive(
    button
  ) {

    const info =
      routeInfo();


    if (
      !info ||
      info.collection !==
        "arhiva"
    ) {

      alert(

        "Otvori konkretan zapis iz Arhive pa klikni VRATI IZ ARHIVE."

      );

      return;
    }


    const archivePath =
      archiveFilePath(
        info
      );


    if (!archivePath) {

      alert(
        "Ne mogu odrediti arhivski fajl."
      );

      return;
    }


    const confirmed =
      confirm(

        "Vratiti ovaj tekst iz Arhive?\n\n" +

        "Tekst će biti vraćen u originalni fajl i originalno polje.\n\n" +

        "Arhivska kopija će ostati sačuvana."

      );


    if (!confirmed) {
      return;
    }


    button.disabled =
      true;

    button.textContent =
      "VRAĆAM...";


    try {

      /* ---------------------------------------------
         1. UČITAJ ARHIVU
      --------------------------------------------- */

      const archiveFile =
        await gateway(
          "GET",
          archivePath
        );


      if (
        !archiveFile ||
        !archiveFile.content ||
        !archiveFile.sha
      ) {

        throw new Error(

          "GitHub nije vratio arhivski fajl ili njegov SHA."

        );

      }


      const archiveMarkdown =
        decodeBase64Utf8(
          archiveFile.content
        );


      /* ---------------------------------------------
         2. PROČITAJ PODATKE IZ ARHIVE
      --------------------------------------------- */

      const archiveInfo =
        parseArchiveMarkdown(
          archiveMarkdown
        );


      if (
        !archiveInfo.originalFile ||
        !archiveInfo.field
      ) {

        throw new Error(

          "Arhiva nema podatke o originalnom fajlu i polju."

        );

      }


      /* ---------------------------------------------
         3. UČITAJ ORIGINALNI FAJL
      --------------------------------------------- */

      const originalFile =
        await gateway(
          "GET",
          archiveInfo.originalFile
        );


      if (
        !originalFile ||
        !originalFile.content ||
        !originalFile.sha
      ) {

        throw new Error(

          "Originalni fajl nije pronađen na GitHubu."

        );

      }


      const originalMarkdown =
        decodeBase64Utf8(
          originalFile.content
        );


      /* ---------------------------------------------
         4. VRATI SADRŽAJ
      --------------------------------------------- */

      const restoredMarkdown =
        insertRestoredField(
          originalMarkdown,
          archiveInfo.field,
          archiveInfo.content
        );


      /* ---------------------------------------------
         5. SAČUVAJ ORIGINALNI FAJL
      --------------------------------------------- */

      await gateway(
        "PUT",
        archiveInfo.originalFile,
        {

          message:
            "Vrati iz arhive: " +
            archiveInfo.originalFile +
            " [" +
            archiveInfo.field +
            "]",

          content:
            base64Utf8(
              restoredMarkdown
            ),

          sha:
            originalFile.sha,

          branch:
            BRANCH

        }
      );


      /* ---------------------------------------------
         6. USPJEŠNO
      --------------------------------------------- */

      button.textContent =
        "✓ VRAĆENO";


      button.style.background =
        "#2e7d32";


      alert(

        "Tekst je uspješno vraćen.\n\n" +

        "Originalni fajl:\n" +

        archiveInfo.originalFile +

        "\n\n" +

        "Originalno polje:\n" +

        archiveInfo.field +

        "\n\n" +

        "Arhivska kopija je ostala sačuvana."

      );


    } catch (error) {

      console.error(
        "VRAĆANJE IZ ARHIVE GREŠKA:",
        error
      );


      alert(

        "Vraćanje iz Arhive nije uspjelo:\n\n" +

        error.message

      );


      button.textContent =
        "VRATI IZ ARHIVE";

    } finally {

      button.disabled =
        false;

    }
  }


  /* =======================================================
     DODAJ ARHIVIRAJ DUGME
  ======================================================= */

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
      root.dataset.moArhiva ===
      "1"
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

          fieldValue(
            root
          ),

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


  /* =======================================================
     DODAJ VRATI IZ ARHIVE DUGME
  ======================================================= */

  function addRestoreButton() {

    const info =
      routeInfo();


    if (
      !info ||
      info.collection !==
        "arhiva"
    ) {

      return;
    }


    /* ---------------------------------------------
       SPRIJEČI DUPLO DUGME
    --------------------------------------------- */

    if (
      document.querySelector(
        "[data-mo-restore-button='1']"
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


    if (
      !controls.length
    ) {

      return;
    }


    const control =
      controls[0];


    const root =
      findFieldRoot(
        control
      );


    if (!root) {
      return;
    }


    const button =
      document.createElement(
        "button"
      );


    button.type =
      "button";


    button.dataset.moRestoreButton =
      "1";


    button.textContent =
      "VRATI IZ ARHIVE";


    button.title =
      "Vrati ovaj tekst u originalni fajl i originalno polje";


    button.style.cssText =

      "display:inline-block;" +

      "margin:8px 0 10px;" +

      "padding:9px 16px;" +

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


    button.addEventListener(
      "click",
      function (event) {

        event.preventDefault();

        event.stopPropagation();


        restoreArchive(
          button
        );

      }
    );


    root.insertBefore(
      button,
      root.firstChild
    );
  }


  /* =======================================================
     GLAVNA FUNKCIJA DUGMADI
  ======================================================= */

  function addButtons() {

    const info =
      routeInfo();


    if (!info) {
      return;
    }


    /* ---------------------------------------------
       AKO SMO U ARHIVI
    --------------------------------------------- */

    if (
      info.collection ===
      "arhiva"
    ) {

      addRestoreButton();

      return;
    }


    /* ---------------------------------------------
       AKO SMO U AKTIVNOM SADRŽAJU
    --------------------------------------------- */

    if (
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


    /* ---------------------------------------------
       DODATNO PREPOZNAVANJE PREKO LABELA
    --------------------------------------------- */

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


  /* =======================================================
     START
  ======================================================= */

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
        childList:
          true,

        subtree:
          true
      }
    );


    setInterval(
      addButtons,
      1500
    );
  }


  /* =======================================================
     POKRETANJE
  ======================================================= */

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
