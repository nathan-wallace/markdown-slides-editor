function parseYamlValue(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  return trimmed;
}

function createTitleSlide(metadata) {
  if (!metadata.titleSlide) return null;

  return {
    id: "slide-title",
    index: 0,
    raw: "",
    body: "",
    notes: "",
    kind: "title",
    title: metadata.title?.trim() || "Untitled presentation",
    subtitle: metadata.subtitle?.trim() || "",
    date: metadata.date?.trim() || "",
    location: metadata.location?.trim() || "",
    speakers: metadata.speakers?.trim() || "",
    qrUrl:
      (metadata.titleSlideQr || metadata.titleSlideQrUrl)
        ? metadata.titleSlideQrUrl?.trim() ||
          metadata.presentationUrl?.trim() ||
          metadata.publishedUrl?.trim() ||
          ""
        : "",
  };
}

function createClosingSlide(metadata) {
  if (!metadata.closingSlide) return null;

  return {
    id: "slide-closing",
    index: 0,
    raw: "",
    body: "",
    notes: "",
    kind: "closing",
    title: metadata.closingTitle?.trim() || "Questions?",
    prompt: metadata.closingPrompt?.trim() || "",
    contactEmail: metadata.contactEmail?.trim() || "",
    contactUrl: metadata.contactUrl?.trim() || "",
    socialLinks: metadata.socialLinks?.trim() || "",
    presentationUrl:
      metadata.presentationUrl?.trim() || metadata.publishedUrl?.trim() || "",
  };
}

export function parseSource(source) {
  let content = source.trim();
  const metadata = {};

  if (content.startsWith("---\n")) {
    const end = content.indexOf("\n---\n", 4);
    if (end !== -1) {
      const frontMatter = content.slice(4, end);
      for (const line of frontMatter.split("\n")) {
        const separator = line.indexOf(":");
        if (separator === -1) continue;
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1);
        metadata[key] = parseYamlValue(value);
      }
      content = content.slice(end + 5);
    }
  }

  const rawSlides = content
    .split(/\n---\n/g)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const contentSlides = rawSlides.map((raw, index) => {
    const sections = {
      body: [],
      notes: [],
      resources: [],
      script: [],
    };
    let activeSection = "body";

    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (/^Note:\s*$/i.test(trimmed)) {
        activeSection = "notes";
        continue;
      }
      if (/^Resources:\s*$/i.test(trimmed)) {
        activeSection = "resources";
        continue;
      }
      if (/^Script:\s*$/i.test(trimmed)) {
        activeSection = "script";
        continue;
      }
      sections[activeSection].push(line);
    }

    return {
      id: `slide-${index + 1}`,
      index,
      raw,
      body: sections.body.join("\n").trim(),
      notes: sections.notes.join("\n").trim(),
      resources: sections.resources.join("\n").trim(),
      script: sections.script.join("\n").trim(),
    };
  });

  const slides = [];
  const titleSlide = createTitleSlide(metadata);
  if (titleSlide) slides.push(titleSlide);
  slides.push(...contentSlides.map((slide, index) => ({
    ...slide,
    index: slides.length + index,
  })));
  const closingSlide = createClosingSlide(metadata);
  if (closingSlide) {
    closingSlide.index = slides.length;
    slides.push(closingSlide);
  }

  return {
    metadata,
    slides,
  };
}
