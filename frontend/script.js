"use strict";

// The frontend server proxies /api/<function> to the faasd gateway.
// Request fields and result keys follow backend/*/function/handler.py.
const SHAPES = {
  persegi: {
    title: "Luas persegi",
    endpoint: "/api/luas-persegi",
    resultKey: "luas",
    dimension: "2D",
    formula: "L = s × s",
    inputs: [{ key: "sisi", label: "Panjang sisi", symbol: "s", example: 5 }],
    caption: "Area berwarna menunjukkan luas persegi.",
    dependencies: [],
  },
  kubus: {
    title: "Luas permukaan kubus",
    endpoint: "/api/luas-kubus",
    resultKey: "luas_permukaan",
    dimension: "3D",
    formula: "L = 6 × s²",
    inputs: [{ key: "sisi", label: "Panjang sisi", symbol: "s", example: 5 }],
    caption: "Ketiga sisi di belakang juga termasuk dalam luas permukaan.",
    dependencies: ["luas-persegi"],
  },
  lingkaran: {
    title: "Luas lingkaran",
    endpoint: "/api/luas-lingkaran",
    resultKey: "luas",
    dimension: "2D",
    formula: "L = π × r²",
    inputs: [{ key: "jari_jari", label: "Jari-jari", symbol: "r", example: 7 }],
    caption: "Garis r menghubungkan titik pusat dengan tepi lingkaran.",
    dependencies: [],
  },
  tabung: {
    title: "Luas selimut tabung",
    endpoint: "/api/luas-tabung",
    resultKey: "luas_selimut",
    dimension: "3D",
    formula: "L = 2 × π × r × t",
    inputs: [
      { key: "jari_jari", label: "Jari-jari alas", symbol: "r", example: 7 },
      { key: "tinggi", label: "Tinggi tabung", symbol: "t", example: 10 },
    ],
    caption: "Yang dihitung hanya selimut; alas dan tutup tidak termasuk.",
    dependencies: ["luas-lingkaran", "luas-persegi"],
  },
};

const REQUEST_TIMEOUT_MS = 30_000;
const UNITS = new Set(["cm", "m", "mm"]);
const numberFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 6,
});
const scientificFormatter = new Intl.NumberFormat("id-ID", {
  notation: "scientific",
  maximumFractionDigits: 6,
});

const elements = {
  shapeButtons: [...document.querySelectorAll("[data-shape]")],
  form: document.querySelector("#calculator"),
  fields: document.querySelector("#fields"),
  unit: document.querySelector("#measurement-unit"),
  calculate: document.querySelector("#calculate"),
  calculateLabel: document.querySelector("#calculate-label"),
  feedback: document.querySelector("#feedback"),
  title: document.querySelector("#shape-title"),
  badge: document.querySelector("#dimension-badge"),
  visualization: document.querySelector("#visualization"),
  caption: document.querySelector("#visual-caption"),
  scale: document.querySelector("#visual-scale"),
  formula: document.querySelector("#formula"),
  resultPanel: document.querySelector(".result-panel"),
  result: document.querySelector("#result"),
  resultUnit: document.querySelector("#result-unit"),
  resultStatus: document.querySelector("#result-status"),
  serviceFlow: document.querySelector("#service-flow"),
  serviceCalls: document.querySelector("#service-calls"),
  endpoint: document.querySelector("#endpoint"),
};

const state = {
  shape: "persegi",
  controller: null,
};

function formatNumber(value) {
  const magnitude = Math.abs(value);
  const formatter =
    magnitude !== 0 && (magnitude < 0.000001 || magnitude >= 1e12)
      ? scientificFormatter
      : numberFormatter;

  return formatter.format(value);
}

function getUnit() {
  return UNITS.has(elements.unit.value) ? elements.unit.value : "cm";
}

function setResultStatus(label, status = "idle") {
  elements.resultStatus.textContent = label;
  elements.resultStatus.dataset.state = status;
}

function setLoading(loading) {
  elements.calculate.disabled = loading;
  elements.calculateLabel.textContent = loading ? "Menghitung…" : "Hitung luas";
  elements.resultPanel.setAttribute("aria-busy", String(loading));
}

function cancelCalculation() {
  state.controller?.abort();
  state.controller = null;
  setLoading(false);
}

function clearResult(changed = false) {
  elements.result.textContent = "—";
  elements.resultUnit.textContent = `${getUnit()}²`;
  elements.feedback.textContent = "";
  setResultStatus(changed ? "Perlu dihitung ulang" : "Belum dihitung");
}

function getDimensions({ reportErrors = false } = {}) {
  const dimensions = {};

  for (const field of SHAPES[state.shape].inputs) {
    const input = document.getElementById(field.key);
    const value = input.valueAsNumber;
    const valid =
      input.value.trim() !== "" && Number.isFinite(value) && value > 0;

    if (!valid) {
      if (reportErrors) {
        input.setAttribute("aria-invalid", "true");
        elements.feedback.textContent = `${field.label} harus berupa angka lebih dari 0.`;
        input.focus();
      }

      return null;
    }

    dimensions[field.key] = value;
  }

  return dimensions;
}

function renderFields() {
  const config = SHAPES[state.shape];
  elements.fields.replaceChildren();

  for (const field of config.inputs) {
    const wrapper = document.createElement("div");
    const label = document.createElement("label");
    const numberField = document.createElement("div");
    const input = document.createElement("input");
    const unit = document.createElement("span");

    label.htmlFor = field.key;
    label.textContent = `${field.label} (${field.symbol})`;
    numberField.className = "number-field";
    input.id = field.key;
    input.name = field.key;
    input.type = "number";
    input.inputMode = "decimal";
    input.step = "any";
    input.min = "0";
    input.required = true;
    input.value = String(field.example);
    input.placeholder = `Contoh: ${field.example}`;
    input.setAttribute("aria-describedby", "feedback");
    unit.className = "field-unit";
    unit.textContent = getUnit();
    unit.setAttribute("aria-hidden", "true");

    numberField.append(input, unit);
    wrapper.append(label, numberField);
    elements.fields.append(wrapper);
  }

  elements.result.setAttribute(
    "for",
    config.inputs.map(({ key }) => key).join(" "),
  );
}

function selectShape(shape) {
  if (!Object.hasOwn(SHAPES, shape)) {
    return;
  }

  cancelCalculation();
  state.shape = shape;
  const config = SHAPES[shape];

  for (const button of elements.shapeButtons) {
    const active = button.dataset.shape === shape;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }

  elements.title.textContent = config.title;
  elements.badge.textContent = `BANGUN ${config.dimension}`;
  elements.formula.textContent = config.formula;
  elements.caption.textContent = config.caption;
  renderServiceFlow(config);
  elements.scale.textContent =
    config.dimension === "3D"
      ? "Ilustrasi perspektif"
      : "Ilustrasi proporsional";

  renderFields();
  clearResult();
  updatePreview();
}

function updatePreview() {
  const dimensions = getDimensions();

  // SVG illustrates dimensions; the final area always comes from the API.
  elements.visualization.innerHTML = renderDiagram(state.shape, dimensions);
}

function renderServiceFlow(config) {
  const service = config.endpoint.replace("/api/", "");
  const requestPath = ["Frontend", "faasd", service];
  elements.serviceFlow.replaceChildren();
  elements.serviceCalls.replaceChildren();

  for (const [index, name] of requestPath.entries()) {
    const item = document.createElement("li");
    const node = document.createElement("span");
    node.className = "service-node";
    node.textContent = name;

    if (index > 0) {
      const arrow = document.createElement("span");
      arrow.className = "service-arrow";
      arrow.textContent = "→";
      arrow.setAttribute("aria-hidden", "true");
      item.append(arrow);
    }

    item.append(node);
    elements.serviceFlow.append(item);
  }

  // Each dependent service returns to the caller before the next call starts.
  for (const dependency of config.dependencies) {
    const item = document.createElement("li");
    const caller = document.createElement("code");
    const arrow = document.createElement("span");
    const callee = document.createElement("code");
    caller.textContent = service;
    arrow.className = "service-arrow";
    arrow.textContent = "↔";
    arrow.setAttribute("role", "img");
    arrow.setAttribute("aria-label", "memanggil dan menerima respons dari");
    callee.textContent = dependency;
    item.append(caller, arrow, callee);
    elements.serviceCalls.append(item);
  }

  elements.serviceCalls.hidden = config.dependencies.length === 0;
  elements.endpoint.textContent = `POST ${config.endpoint}`;
}

function handleDimensionChange() {
  cancelCalculation();

  for (const input of elements.fields.querySelectorAll("input")) {
    input.removeAttribute("aria-invalid");
  }

  clearResult(true);
  updatePreview();
}

function dimensionLabel(symbol, value) {
  return value === undefined
    ? symbol
    : `${symbol} = ${formatNumber(value)} ${getUnit()}`;
}

function renderDiagram(shape, dimensions) {
  const d = dimensions ?? {};
  const sizeValue = d.sisi ?? d.jari_jari ?? 5;
  // Fit positive dimensions into the drawing without changing their labels.
  const size = Math.min(
    220,
    Math.max(125, 125 + Math.log10(sizeValue + 1) * 55),
  );
  let drawing;

  switch (shape) {
    case "kubus":
      drawing = `
        <path d="m238 115 82-52h160l-82 52Z" fill="#e0d2f5" stroke="#8a73cf" stroke-width="2" stroke-linejoin="round" />
        <path d="m398 115 82-52v155l-82 52Z" fill="#af8cdb" stroke="#8a73cf" stroke-width="2" stroke-linejoin="round" />
        <path class="diagram-area" d="M238 115h160v155H238Z" />
        <path class="diagram-dimension" stroke-dasharray="4 5" d="M238 285v25m160-25v25M225 115h-18m18 155h-18" />
        <path class="diagram-dimension" d="M238 298h160m-160-5v10m160-10v10" />
        <text class="diagram-symbol" x="318" y="203" text-anchor="middle">s²</text>
        <text class="diagram-label" x="318" y="324" text-anchor="middle">${dimensionLabel("s", d.sisi)}</text>
        <text class="diagram-label" x="485" y="262" text-anchor="middle">6 sisi sama luas</text>
      `;
      break;

    case "lingkaran": {
      const radius = size / 1.65;
      drawing = `
        <circle class="diagram-area" cx="320" cy="169" r="${radius}" />
        <circle cx="320" cy="169" r="${radius + 10}" fill="none" stroke="#ded4ee" stroke-dasharray="3 7" />
        <path d="M320 169h${radius}" fill="none" stroke="#7759b3" stroke-width="2" />
        <circle cx="320" cy="169" r="4" fill="#7759b3" />
        <text class="diagram-symbol" x="296" y="222" text-anchor="middle">πr²</text>
        <rect x="${320 + radius / 2 - 87}" y="128" width="174" height="28" rx="7" fill="#fff" fill-opacity="0.92" />
        <text class="diagram-label" x="${320 + radius / 2}" y="147" text-anchor="middle">${dimensionLabel("r", d.jari_jari)}</text>
      `;
      break;
    }

    case "tabung": {
      const ratio = (d.jari_jari ?? 7) / (d.tinggi ?? 10);
      const width = Math.min(215, Math.max(105, ratio * 250));
      const height = Math.min(190, Math.max(110, 120 / ratio));
      const left = 300 - width / 2;
      const right = 300 + width / 2;
      const top = 160 - height / 2;
      const bottom = 160 + height / 2;
      const dimensionX = right + 32;

      drawing = `
        <path class="diagram-area" d="M${left} ${top}a${width / 2} 27 0 0 0 ${width} 0v${height}a${width / 2} 27 0 0 1 -${width} 0Z" />
        <ellipse cx="300" cy="${top}" rx="${width / 2}" ry="27" fill="#f5f2fa" stroke="#8a73cf" stroke-width="2" />
        <path d="M${left} ${bottom}a${width / 2} 27 0 0 1 ${width} 0" fill="none" stroke="#9e87c5" stroke-dasharray="5 5" />
        <path class="diagram-dimension" d="M${dimensionX} ${top}v${height}m-5-${height}h10m-10 ${height}h10" />
        <path d="M300 ${top}h${width / 2}" stroke="#8a73cf" stroke-width="1.5" />
        <circle cx="300" cy="${top}" r="3" fill="#8a73cf" />
        <text class="diagram-label" x="${dimensionX + 10}" y="164">${dimensionLabel("t", d.tinggi)}</text>
        <text class="diagram-label" x="300" y="${top - 44}" text-anchor="middle">${dimensionLabel("r", d.jari_jari)}</text>
        <text class="diagram-symbol" x="300" y="185" text-anchor="middle">2πrt</text>
        <text class="diagram-label" x="300" y="${bottom + 59}" text-anchor="middle">Selimut tabung</text>
      `;
      break;
    }

    default: {
      const x = 320 - size / 2;
      const y = 156 - size / 2;

      drawing = `
        <rect class="diagram-area" x="${x}" y="${y}" width="${size}" height="${size}" rx="2" />
        <rect x="${x}" y="${y}" width="${size}" height="${size}" fill="url(#square-grid)" />
        <path class="diagram-dimension" d="M${x} ${y + size + 16}v21m${size}-21v21M${x} ${y + size + 29}h${size}" />
        <path d="M${x} ${y + size - 15}h15v15" fill="none" stroke="#8a73cf" stroke-width="1.5" />
        <text class="diagram-symbol" x="320" y="167" text-anchor="middle">s × s</text>
        <text class="diagram-label" x="320" y="${y + size + 56}" text-anchor="middle">${dimensionLabel("s", d.sisi)}</text>
      `;
    }
  }

  return `
    <svg viewBox="130 20 410 315" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="diagram-title diagram-description">
      <title id="diagram-title">${SHAPES[shape].title}</title>
      <desc id="diagram-description">${SHAPES[shape].caption} ${dimensions ? SHAPES[shape].inputs.map((field) => dimensionLabel(field.symbol, d[field.key])).join(", ") : "Masukkan dimensi untuk memperbarui ilustrasi."}</desc>
      <defs>
        <linearGradient id="area-fill" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="#e4d8f8" /><stop offset="1" stop-color="#c8adea" />
        </linearGradient>
        <pattern id="square-grid" width="${size / 5}" height="${size / 5}" patternUnits="userSpaceOnUse">
          <path d="M${size / 5} 0H0V${size / 5}" fill="none" stroke="#a38bc5" stroke-opacity="0.3" stroke-width="1" />
        </pattern>
      </defs>
      ${drawing}
    </svg>
  `;
}

async function readApiResponse(response, resultKey) {
  let data;

  try {
    data = JSON.parse(await response.text());
  } catch {
    throw new Error(
      response.ok
        ? "Layanan mengirim respons yang tidak dapat dibaca. Silakan coba lagi."
        : `Layanan sedang tidak tersedia (HTTP ${response.status}). Silakan coba lagi.`,
    );
  }

  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : `Perhitungan gagal (HTTP ${response.status}). Silakan coba lagi.`,
    );
  }

  const value = data?.[resultKey];

  // Rounded areas may be zero for very small positive dimensions.
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error("Hasil dari layanan belum valid. Silakan coba lagi.");
  }

  return value;
}

async function calculate(event) {
  event.preventDefault();
  const dimensions = getDimensions({ reportErrors: true });

  if (!dimensions) {
    return;
  }

  cancelCalculation();
  clearResult();
  const config = SHAPES[state.shape];
  const unit = getUnit();
  const controller = new AbortController();
  let timedOut = false;
  state.controller = controller;
  setLoading(true);
  setResultStatus("Sedang dihitung", "loading");

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(dimensions),
      signal: controller.signal,
    });
    const value = await readApiResponse(response, config.resultKey);

    // Ignore requests superseded by a shape, dimension, or unit change.
    if (state.controller !== controller) {
      return;
    }

    const formattedResult = formatNumber(value);
    elements.result.textContent = formattedResult;
    elements.resultUnit.textContent = `${unit}²`;
    setResultStatus("Berhasil dihitung", "success");
  } catch (error) {
    if (state.controller !== controller) {
      return;
    }

    elements.feedback.textContent = timedOut
      ? "Waktu tunggu habis. Silakan coba hitung lagi."
      : error instanceof TypeError
        ? "Layanan tidak dapat dihubungi. Periksa koneksi lalu coba lagi."
        : error.message;
    setResultStatus("Gagal menghitung", "error");
  } finally {
    clearTimeout(timeout);

    if (state.controller === controller) {
      state.controller = null;
      setLoading(false);
    }
  }
}

for (const button of elements.shapeButtons) {
  button.addEventListener("click", () => selectShape(button.dataset.shape));
}

elements.fields.addEventListener("input", handleDimensionChange);
elements.form.addEventListener("submit", calculate);
elements.unit.addEventListener("change", () => {
  for (const unit of elements.fields.querySelectorAll(".field-unit")) {
    unit.textContent = getUnit();
  }

  handleDimensionChange();
});

selectShape(state.shape);
