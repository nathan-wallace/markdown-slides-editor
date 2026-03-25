import {
  buildDeckStyleAttribute,
  buildThemeLinkTag,
  BUILT_IN_THEME_IDS,
  DEFAULT_THEME_ID,
} from "./theme.js";

const textEncoder = new TextEncoder();
const ODP_MIMETYPE = "application/vnd.oasis.opendocument.presentation";

function escapeScriptText(value) {
  return value.replaceAll("</script>", "<\\/script>");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function downloadFile(filename, contents, type) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function openHtmlInNewWindow(contents) {
  const blob = new Blob([contents], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  return opened;
}

function encodeText(value) {
  return textEncoder.encode(value);
}

function encodeContents(value) {
  return value instanceof Uint8Array ? value : encodeText(value);
}

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let c = index;
    for (let bit = 0; bit < 8; bit += 1) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[index] = c >>> 0;
  }
  return table;
}

const crcTable = createCrcTable();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) {
  return Uint8Array.of(value & 0xff, (value >>> 8) & 0xff);
}

function u32(value) {
  return Uint8Array.of(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function concatUint8Arrays(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export function buildZipArchive(files) {
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;

  for (const file of files) {
    const filenameBytes = encodeText(file.name);
    const contentBytes = encodeContents(file.contents);
    const checksum = crc32(contentBytes);

    const localHeader = concatUint8Arrays([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(checksum),
      u32(contentBytes.length),
      u32(contentBytes.length),
      u16(filenameBytes.length),
      u16(0),
      filenameBytes,
      contentBytes,
    ]);
    localChunks.push(localHeader);

    const centralHeader = concatUint8Arrays([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(checksum),
      u32(contentBytes.length),
      u32(contentBytes.length),
      u16(filenameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      filenameBytes,
    ]);
    centralChunks.push(centralHeader);
    offset += localHeader.length;
  }

  const centralDirectory = concatUint8Arrays(centralChunks);
  const localSection = concatUint8Arrays(localChunks);
  const endOfCentralDirectory = concatUint8Arrays([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDirectory.length),
    u32(localSection.length),
    u16(0),
  ]);

  return concatUint8Arrays([localSection, centralDirectory, endOfCentralDirectory]);
}

function base64Encode(value) {
  const bytes = encodeText(value);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeHtmlEntities(value) {
  return String(value)
    .replaceAll("&nbsp;", " ")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function htmlToTextLines(value) {
  return decodeHtmlEntities(
    String(value)
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<(?:br|br\/)\s*>/gi, "\n")
      .replace(/<\/(?:p|div|section|article|blockquote|ul|ol|li|h1|h2|h3|h4|h5|h6)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getDeckPageSize(metadata = {}) {
  const width = Number(metadata.slideWidth) > 0 ? Number(metadata.slideWidth) : 1280;
  const height = Number(metadata.slideHeight) > 0 ? Number(metadata.slideHeight) : 720;
  const pageWidthCm = 28;
  const pageHeightCm = Number((pageWidthCm * (height / width)).toFixed(2));
  return {
    widthCm: pageWidthCm,
    heightCm: pageHeightCm,
  };
}

function buildOdpStylesXml(metadata = {}) {
  const { widthCm, heightCm } = getDeckPageSize(metadata);

  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"
  xmlns:number="urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0"
  xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
  xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
  office:version="1.2">
  <office:styles>
    <style:default-style style:family="graphic">
      <style:graphic-properties draw:stroke="none" draw:fill="none"/>
    </style:default-style>
    <style:default-style style:family="paragraph">
      <style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0.2cm"/>
      <style:text-properties fo:font-size="16pt"/>
    </style:default-style>
    <style:style style:name="dp1" style:family="drawing-page">
      <style:drawing-page-properties presentation:background-visible="true" presentation:background-objects-visible="true"/>
    </style:style>
  </office:styles>
  <office:automatic-styles>
    <style:page-layout style:name="PM1">
      <style:page-layout-properties fo:page-width="${widthCm}cm" fo:page-height="${heightCm}cm" style:print-orientation="landscape" presentation:display-header="false" presentation:display-footer="false" presentation:display-page-number="false" presentation:display-date-time="false"/>
    </style:page-layout>
    <style:presentation-page-layout style:name="AL1T0">
      <presentation:placeholder presentation:object="title" svg:x="1cm" svg:y="0.9cm" svg:width="${Number((widthCm - 2).toFixed(2))}cm" svg:height="2.8cm"/>
      <presentation:placeholder presentation:object="outline" svg:x="1cm" svg:y="4.2cm" svg:width="${Number((widthCm - 2).toFixed(2))}cm" svg:height="${Number((heightCm - 5.2).toFixed(2))}cm"/>
    </style:presentation-page-layout>
  </office:automatic-styles>
  <office:master-styles>
    <style:master-page style:name="Default" style:page-layout-name="PM1" draw:style-name="dp1" presentation:presentation-page-layout-name="AL1T0"/>
  </office:master-styles>
</office:document-styles>`;
}

function buildOdpContentXml({ title, renderedSlides, metadata = {} }) {
  const { widthCm, heightCm } = getDeckPageSize(metadata);
  const titleWidth = Number((widthCm - 2).toFixed(2));
  const bodyWidth = titleWidth;
  const bodyHeight = Number((heightCm - 5.2).toFixed(2));

  const pagesMarkup = renderedSlides
    .map((slide, index) => {
      const titleText = slide.headings?.find((heading) => heading.level === 1)?.text || `Slide ${index + 1}`;
      const bodyHtml = slide.html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, "");
      const bodyLines = htmlToTextLines(bodyHtml);
      const bodyParagraphs = bodyLines.length
        ? bodyLines.map((line) => `<text:p text:style-name="PBody">${escapeXml(line)}</text:p>`).join("")
        : '<text:p text:style-name="PBody"></text:p>';

      return `
    <draw:page draw:name="page${index + 1}" draw:style-name="dp1" draw:master-page-name="Default" presentation:presentation-page-layout-name="AL1T0">
      <draw:frame draw:style-name="gr-title" presentation:class="title" svg:x="1cm" svg:y="0.9cm" svg:width="${titleWidth}cm" svg:height="2.8cm">
        <draw:text-box>
          <text:p text:style-name="PTitle">${escapeXml(titleText)}</text:p>
        </draw:text-box>
      </draw:frame>
      <draw:frame draw:style-name="gr-body" presentation:class="outline" svg:x="1cm" svg:y="4.2cm" svg:width="${bodyWidth}cm" svg:height="${bodyHeight}cm">
        <draw:text-box>
          ${bodyParagraphs}
        </draw:text-box>
      </draw:frame>
    </draw:page>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"
  xmlns:number="urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0"
  xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
  xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
  office:version="1.2">
  <office:scripts/>
  <office:automatic-styles>
    <style:style style:name="gr-title" style:family="graphic">
      <style:graphic-properties draw:stroke="none" draw:fill="none" draw:auto-grow-height="true" draw:auto-grow-width="false"/>
    </style:style>
    <style:style style:name="gr-body" style:family="graphic">
      <style:graphic-properties draw:stroke="none" draw:fill="none" draw:auto-grow-height="true" draw:auto-grow-width="false"/>
    </style:style>
    <style:style style:name="PTitle" style:family="paragraph">
      <style:text-properties fo:font-size="24pt" fo:font-weight="bold"/>
    </style:style>
    <style:style style:name="PBody" style:family="paragraph">
      <style:paragraph-properties fo:margin-bottom="0.22cm"/>
      <style:text-properties fo:font-size="16pt"/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:presentation>
      <presentation:settings presentation:show="true" presentation:pause="PT0S"/>
      ${pagesMarkup}
    </office:presentation>
  </office:body>
</office:document-content>`;
}

function buildOdpMetaXml(title) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"
  office:version="1.2">
  <office:meta>
    <dc:title>${escapeXml(title)}</dc:title>
    <meta:generator>Markdown Slides Editor</meta:generator>
  </office:meta>
</office:document-meta>`;
}

function buildOdpSettingsXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-settings
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"
  office:version="1.2">
  <office:settings>
    <config:config-item-set config:name="ooo:view-settings"/>
  </office:settings>
</office:document-settings>`;
}

function buildOdpManifestXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest
  xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"
  manifest:version="1.2">
  <manifest:file-entry manifest:media-type="${ODP_MIMETYPE}" manifest:full-path="/"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="meta.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="settings.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="styles.xml"/>
</manifest:manifest>`;
}

export function buildOdpPresentation({ title, renderedSlides, metadata }) {
  return buildZipArchive([
    { name: "mimetype", contents: ODP_MIMETYPE },
    { name: "content.xml", contents: buildOdpContentXml({ title, renderedSlides, metadata }) },
    { name: "meta.xml", contents: buildOdpMetaXml(title) },
    { name: "settings.xml", contents: buildOdpSettingsXml() },
    { name: "styles.xml", contents: buildOdpStylesXml(metadata) },
    { name: "META-INF/manifest.xml", contents: buildOdpManifestXml() },
  ]);
}

export function buildMhtmlDocument({ title, html }) {
  const boundary = `----=_NextPart_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 10)}`;
  const encodedHtml = base64Encode(html);

  return [
    "From: <Saved by Markdown Slides Editor>",
    `Subject: ${title}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/related; type=\"text/html\"; boundary=\"${boundary}\"`,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=\"utf-8\"",
    "Content-Transfer-Encoding: base64",
    "Content-Location: file:///index.html",
    "",
    encodedHtml,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

export function buildExportBundle({ markdownSource, snapshotHtml, deckJson, odpBytes, onePageMhtml }) {
  return buildZipArchive([
    { name: "deck.md", contents: markdownSource },
    { name: "deck.json", contents: deckJson },
    { name: "presentation.html", contents: snapshotHtml },
    { name: "presentation.odp", contents: odpBytes },
    { name: "presentation-one-page.mhtml", contents: onePageMhtml },
  ]);
}

function getExportThemeId(metadata = {}) {
  return BUILT_IN_THEME_IDS.includes(metadata.theme) ? metadata.theme : DEFAULT_THEME_ID;
}

export function buildOnePageHtml({ title, cssText, renderedSlides, metadata }) {
  const slidesMarkup = renderedSlides
    .map(
      (slide, index) => `
        <section class="slide" data-slide-index="${index}" data-kind="${slide.kind || "content"}" aria-label="Slide ${index + 1}">
          <div class="slide__content">
            ${slide.html}
          </div>
        </section>`,
    )
    .join("");

  return `<!doctype html>
<html lang="${metadata.lang || "en"}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    ${buildThemeLinkTag(metadata)}
    <style>${cssText}</style>
    <style>
      .one-page-body .slide {
        display: grid !important;
        visibility: visible !important;
      }
    </style>
  </head>
  <body class="snapshot-body one-page-body" data-theme="${getExportThemeId(metadata)}" style="${buildDeckStyleAttribute(metadata)}">
    <main class="presentation-shell" aria-label="All slides">
      ${slidesMarkup}
    </main>
  </body>
</html>`;
}

export function buildSnapshotHtml({ title, cssText, renderedSlides, metadata, source }) {
  const slidesMarkup = renderedSlides
    .map(
      (slide, index) => `
        <section class="slide${index === 0 ? " is-active" : ""}" data-slide-index="${index}" data-step-count="${slide.stepCount || 0}" data-kind="${slide.kind || "content"}" aria-label="Slide ${index + 1}">
          <div class="slide__content">
            ${slide.html}
          </div>
        </section>`,
    )
    .join("");

  const payload = escapeScriptText(
    JSON.stringify({
      metadata,
      source,
      slideCount: renderedSlides.length,
    }),
  );

  return `<!doctype html>
<html lang="${metadata.lang || "en"}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    ${buildThemeLinkTag(metadata)}
    <style>${cssText}</style>
  </head>
  <body class="snapshot-body" data-theme="${getExportThemeId(metadata)}" style="${buildDeckStyleAttribute(metadata)}">
    <main class="presentation-shell" aria-live="polite">
      ${slidesMarkup}
      <nav class="snapshot-controls" aria-label="Presentation controls">
        <button type="button" data-action="prev">Previous</button>
        <span id="snapshot-status">1 / ${renderedSlides.length}</span>
        <button type="button" data-action="next">Next</button>
      </nav>
    </main>
    <script id="deck-source" type="application/json">${payload}</script>
    <script>
      const slides = [...document.querySelectorAll(".slide")];
      const status = document.querySelector("#snapshot-status");
      let activeIndex = 0;
      let revealStep = 0;

      function contentOverflows(content) {
        return content.scrollHeight > content.clientHeight + 1 || content.scrollWidth > content.clientWidth + 1;
      }

      function prepareSlide(slide) {
        const content = slide.querySelector(".slide__content");
        if (!content || slide.dataset.kind === "title" || slide.dataset.kind === "closing") return;
        let body = content.querySelector(":scope > .slide-card__body");
        if (!body) {
          body = document.createElement("div");
          body.className = "slide-card__body";
          const children = [...content.children].filter((node) => node.tagName !== "H1");
          const anchor = content.querySelector(":scope > h1");
          content.insertBefore(body, anchor ? anchor.nextSibling : content.firstChild);
          children.forEach((child) => body.append(child));
        }
        let scale = 1;
        body.style.setProperty("--slide-body-scale", scale);
        while (scale > 0.72 && contentOverflows(content)) {
          scale = Math.max(0.72, Number((scale - 0.04).toFixed(2)));
          body.style.setProperty("--slide-body-scale", scale);
        }
      }

      function applyRevealState(slide) {
        const items = [...slide.querySelectorAll("li.next")];
        items.forEach((item, index) => {
          const isVisible = index < revealStep;
          const isCurrent = index === revealStep - 1;
          item.hidden = !isVisible;
          item.classList.toggle("visited", index < revealStep - 1);
          item.classList.toggle("active", isCurrent);
        });
      }

      function render() {
        slides.forEach((slide, index) => {
          slide.classList.toggle("is-active", index === activeIndex);
          slide.hidden = index !== activeIndex;
          if (index === activeIndex) {
            prepareSlide(slide);
            applyRevealState(slide);
          }
        });
        status.textContent = \`\${activeIndex + 1} / \${slides.length} · \${revealStep} / \${Number(slides[activeIndex]?.dataset.stepCount || 0)} reveals\`;
      }

      function move(delta) {
        const stepCount = Number(slides[activeIndex]?.dataset.stepCount || 0);
        if (delta > 0 && revealStep < stepCount) {
          revealStep += 1;
        } else if (delta < 0 && revealStep > 0) {
          revealStep -= 1;
        } else {
          activeIndex = Math.max(0, Math.min(slides.length - 1, activeIndex + delta));
          revealStep = delta > 0 ? 0 : Number(slides[activeIndex]?.dataset.stepCount || 0);
        }
        render();
      }

      document.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") move(1);
        if (event.key === "ArrowLeft" || event.key === "PageUp") move(-1);
      });

      document.addEventListener("click", (event) => {
        const action = event.target.dataset.action;
        if (action === "prev") move(-1);
        if (action === "next") move(1);
      });

      window.addEventListener("resize", render);

      render();
    </script>
  </body>
</html>`;
}
