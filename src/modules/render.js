import { renderMarkdown } from "./markdown.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function splitSpeakerList(value) {
  return String(value)
    .split(/[;,|]\s*/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function splitList(value) {
  return String(value)
    .split(/[;\n|]\s*/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildQrCodeUrl(value) {
  if (!value) return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}`;
}

function renderTitleSlide(slide) {
  const details = [
    slide.date ? { label: "Date", value: slide.date } : null,
    slide.location ? { label: "Location", value: slide.location } : null,
    slide.speakers ? { label: "Speakers", value: slide.speakers } : null,
  ].filter(Boolean);
  const speakerList = splitSpeakerList(slide.speakers);

  const detailHtml = details.length
    ? `<dl class="title-slide__meta">${details
        .map((detail) => {
          const valueHtml =
            detail.label === "Speakers" && speakerList.length > 1
              ? `<ul class="title-slide__speakers">${speakerList.map((speaker) => `<li>${escapeHtml(speaker)}</li>`).join("")}</ul>`
              : `<p>${escapeHtml(detail.value)}</p>`;
          return `<div><dt>${detail.label}</dt><dd>${valueHtml}</dd></div>`;
        })
        .join("")}</dl>`
    : "";
  const qrCodeUrl = buildQrCodeUrl(slide.qrUrl);

  return {
    ...slide,
    html: `
      <div class="title-slide${qrCodeUrl ? " title-slide--closing" : ""}">
        <div class="title-slide__primary">
          <header class="title-slide__header">
            <h1>${escapeHtml(slide.title)}</h1>
            ${slide.subtitle ? `<p class="title-slide__subtitle">${escapeHtml(slide.subtitle)}</p>` : ""}
          </header>
          ${detailHtml}
        </div>
        ${
          qrCodeUrl
            ? `<aside class="title-slide__qr">
                <img src="${qrCodeUrl}" alt="QR code linking to the published presentation" />
                <p>Scan to open the published slides.</p>
              </aside>`
            : ""
        }
      </div>
    `,
    headings: [{ level: 1, text: slide.title }],
    stepCount: 0,
    notesHtml: "",
  };
}

function renderContactValue(value, href) {
  if (!value) return "";
  const safeValue = escapeHtml(value);
  const safeHref = escapeHtml(href || value);
  return `<a href="${safeHref}">${safeValue}</a>`;
}

function renderClosingSlide(slide) {
  const socialLinks = splitList(slide.socialLinks);
  const details = [
    slide.contactEmail
      ? {
          label: "Email",
          html: renderContactValue(slide.contactEmail, `mailto:${slide.contactEmail}`),
        }
      : null,
    slide.contactUrl
      ? {
          label: "Website",
          html: renderContactValue(slide.contactUrl, slide.contactUrl),
        }
      : null,
    socialLinks.length
      ? {
          label: "Social",
          html: `<ul class="title-slide__speakers">${socialLinks.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul>`,
        }
      : null,
    slide.presentationUrl
      ? {
          label: "Slides",
          html: renderContactValue(slide.presentationUrl, slide.presentationUrl),
        }
      : null,
  ].filter(Boolean);

  const detailHtml = details.length
    ? `<dl class="title-slide__meta">${details
        .map((detail) => `<div><dt>${detail.label}</dt><dd>${detail.html}</dd></div>`)
        .join("")}</dl>`
    : "";
  const qrCodeUrl = buildQrCodeUrl(slide.presentationUrl);

  return {
    ...slide,
    html: `
      <div class="title-slide title-slide--closing">
        <div class="title-slide__primary">
          <header class="title-slide__header">
            <h1>${escapeHtml(slide.title)}</h1>
            ${slide.prompt ? `<p class="title-slide__subtitle">${escapeHtml(slide.prompt)}</p>` : ""}
          </header>
          ${detailHtml}
        </div>
        ${
          qrCodeUrl
            ? `<aside class="title-slide__qr">
                <img src="${qrCodeUrl}" alt="QR code linking to the published presentation" />
                <p>Scan to view the published slides.</p>
              </aside>`
            : ""
        }
      </div>
    `,
    headings: [{ level: 1, text: slide.title }],
    stepCount: 0,
    notesHtml: "",
  };
}

export function renderDeck(deck) {
  const renderedSlides = deck.slides.map((slide) => {
    if (slide.kind === "title") {
      return renderTitleSlide(slide);
    }
    if (slide.kind === "closing") {
      return renderClosingSlide(slide);
    }
    const rendered = renderMarkdown(slide.body);
    const noteRender = slide.notes ? renderMarkdown(slide.notes) : null;
    const resourcesRender = slide.resources ? renderMarkdown(slide.resources) : null;
    const scriptRender = slide.script ? renderMarkdown(slide.script) : null;
    return {
      ...slide,
      html: rendered.html,
      headings: rendered.headings,
      stepCount: rendered.stepCount,
      notesHtml: noteRender?.html || "",
      resourcesHtml: resourcesRender?.html || "",
      scriptHtml: scriptRender?.html || "",
    };
  });

  return {
    ...deck,
    renderedSlides,
  };
}
