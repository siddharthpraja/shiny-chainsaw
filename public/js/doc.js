// ============================================================
// MyExcelDB Documentation Frontend
// ============================================================

// Same-origin - this app's own API, not a hardcoded external server.
const API_BASE = "";

// ============================================================
// STATE
// ============================================================

let sections = [];
let endpoints = [];
let currentEndpoint = null;

// Reuses the same session token the rest of the app stores after
// Google sign-in (see public/js/models/authModel.js).
let token = localStorage.getItem("authToken") || "";

// ============================================================
// DOM
// ============================================================

const sidebar = document.getElementById("sidebar");
const sidebarNav = document.getElementById("sidebarNav");
const content = document.getElementById("content");

const searchInput = document.getElementById("searchInput");
const reloadBtn = document.getElementById("reloadBtn");

const connectionStatus = document.getElementById("connectionStatus");

const breadcrumb = document.getElementById("breadcrumb");

// ============================================================
// AUTH HEADERS
// ============================================================

function getHeaders() {
  const headers = {
    "Content-Type": "application/json",
  };

  // No hardcoded admin bypass - use the signed-in user's own token,
  // same as the rest of the app. Docs data (DocSections/DocEndpoints)
  // is read from that user's own spreadsheet via /api/query.
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

// ============================================================
// API REQUEST
// ============================================================

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;

    try {
      const data = await response.json();

      if (data.message) {
        message = data.message;
      }

      if (data.error) {
        message = data.error;
      }
    } catch {}

    throw new Error(message);
  }

  return response.json();
}

// ============================================================
// GET DOC SECTIONS
// ============================================================

async function loadSections() {
  const result = await apiRequest(`${API_BASE}/api/query`, {
    method: "POST",
    body: JSON.stringify({
      table: "DocSections",
      columns: ["*"],
      orderBy: {
        column: "sort_order",
        direction: "ASC",
      },
    }),
  });

  return result.rows || [];
}

// ============================================================
// GET DOC ENDPOINTS
// ============================================================

async function loadEndpoints() {
  const result = await apiRequest(`${API_BASE}/api/query`, {
    method: "POST",
    body: JSON.stringify({
      table: "DocEndpoints",
      columns: ["*"],
      orderBy: {
        column: "sort_order",
        direction: "ASC",
      },
    }),
  });

  return result.rows || [];
}

// ============================================================
// LOAD DOCUMENTATION
// ============================================================

async function loadDocumentation() {
  setConnectionStatus("Loading...", "bg-yellow-100", "text-yellow-700");

  try {
    sections = await loadSections();

    endpoints = await loadEndpoints();

    renderSidebar();

    renderWelcome();

    setConnectionStatus("Connected", "bg-green-100", "text-green-700");
  } catch (error) {
    console.error(error);

    setConnectionStatus("Connection failed", "bg-red-100", "text-red-700");

    renderError(error);
  }
}

// ============================================================
// CONNECTION STATUS
// ============================================================

function setConnectionStatus(text, bg, color) {
  connectionStatus.textContent = text;

  connectionStatus.className = `text-xs px-3 py-1.5 rounded-full ${bg} ${color}`;
}

// ============================================================
// SIDEBAR
// ============================================================

function renderSidebar(filter = "") {
  const search = filter.toLowerCase().trim();

  const grouped = sections
    .map((section) => {
      const sectionEndpoints = endpoints.filter(
        (endpoint) => Number(endpoint.section_id) === Number(section.id),
      );

      const filteredEndpoints = sectionEndpoints.filter((endpoint) => {
        if (!search) {
          return true;
        }

        return (
          endpoint.title?.toLowerCase().includes(search) ||
          endpoint.endpoint?.toLowerCase().includes(search) ||
          endpoint.method?.toLowerCase().includes(search)
        );
      });

      return {
        ...section,
        endpoints: filteredEndpoints,
      };
    })
    .filter((section) => {
      if (!search) {
        return true;
      }

      return section.endpoints.length > 0;
    });

  if (!grouped.length) {
    sidebarNav.innerHTML = `
            <div class="text-sm text-slate-500 px-2 py-4">
                No documentation found.
            </div>
        `;

    return;
  }

  sidebarNav.innerHTML = grouped
    .map(
      (section) => `

        <div class="mb-6">

            <div
                class="
                    px-2
                    mb-2
                    text-xs
                    font-bold
                    uppercase
                    tracking-wider
                    text-slate-400
                "
            >
                ${escapeHtml(section.title)}
            </div>


            <div class="space-y-1">

                ${section.endpoints
                  .map(
                    (endpoint) => `

                    <button
                        class="
                            endpoint-nav
                            w-full
                            text-left
                            px-3
                            py-2
                            rounded-lg
                            text-sm
                            text-slate-600
                            hover:bg-slate-100
                            transition
                        "
                        data-endpoint-id="${endpoint.id}"
                    >

                        <div class="flex items-center gap-2">

                            <span
                                class="
                                    text-[10px]
                                    font-bold
                                    px-1.5
                                    py-0.5
                                    rounded
                                    method-${endpoint.method}
                                "
                            >
                                ${escapeHtml(endpoint.method)}
                            </span>

                            <span class="truncate">
                                ${escapeHtml(endpoint.title)}
                            </span>

                        </div>

                    </button>

                `,
                  )
                  .join("")}

            </div>

        </div>

    `,
    )
    .join("");

  document.querySelectorAll(".endpoint-nav").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.endpointId);

      showEndpoint(id);

      closeMobileSidebar();
    });
  });
}

// ============================================================
// WELCOME
// ============================================================

function renderWelcome() {
  const firstEndpoint = endpoints[0];

  content.innerHTML = `

        <section class="mb-16">

            <div
                class="
                    inline-flex
                    items-center
                    gap-2
                    bg-blue-50
                    text-blue-700
                    px-3
                    py-1.5
                    rounded-full
                    text-sm
                    font-medium
                "
            >
                <span>⚡</span>
                MyExcelDB API
            </div>


            <h1
                class="
                    mt-6
                    text-4xl
                    lg:text-5xl
                    font-bold
                    tracking-tight
                "
            >
                MyExcelDB Documentation
            </h1>


            <p
                class="
                    mt-5
                    text-lg
                    text-slate-600
                    max-w-3xl
                    leading-8
                "
            >
                A complete API reference for authentication,
                tables, columns, rows, queries, joins and exports.
            </p>


            <div
                class="
                    mt-8
                    bg-slate-900
                    rounded-xl
                    p-5
                    text-white
                "
            >

                <div
                    class="
                        text-xs
                        text-slate-400
                        mb-2
                    "
                >
                    Base URL
                </div>

                <code class="font-mono text-sm">
                    ${window.location.origin}
                </code>

            </div>

        </section>


        <section>

            <h2 class="text-2xl font-bold mb-6">
                API Overview
            </h2>


            <div
                class="
                    grid
                    sm:grid-cols-2
                    lg:grid-cols-3
                    gap-4
                "
            >

                ${sections
                  .map(
                    (section) => `

                    <button
                        onclick="showSection(${section.id})"
                        class="
                            text-left
                            bg-white
                            border
                            border-slate-200
                            rounded-xl
                            p-5
                            hover:border-blue-300
                            hover:shadow-sm
                            transition
                        "
                    >

                        <div class="font-semibold">
                            ${escapeHtml(section.title)}
                        </div>

                        <div
                            class="
                                text-sm
                                text-slate-500
                                mt-2
                            "
                        >
                            ${escapeHtml(section.description || "")}
                        </div>

                    </button>

                `,
                  )
                  .join("")}

            </div>

        </section>


        ${
          firstEndpoint
            ? `
                    <div class="mt-10">
                        <button
                            onclick="showEndpoint(${firstEndpoint.id})"
                            class="
                                px-5
                                py-3
                                bg-blue-600
                                text-white
                                rounded-lg
                                hover:bg-blue-700
                            "
                        >
                            Start with the API →
                        </button>
                    </div>
                `
            : ""
        }

    `;

  breadcrumb.textContent = "Overview";
}

// ============================================================
// SHOW SECTION
// ============================================================

function showSection(sectionId) {
  const section = sections.find(
    (item) => Number(item.id) === Number(sectionId),
  );

  if (!section) return;

  const sectionEndpoints = endpoints.filter(
    (endpoint) => Number(endpoint.section_id) === Number(sectionId),
  );

  breadcrumb.textContent = section.title;

  content.innerHTML = `

        <section>

            <div
                class="
                    text-sm
                    text-blue-600
                    font-medium
                "
            >
                API Reference
            </div>

            <h1
                class="
                    mt-2
                    text-4xl
                    font-bold
                "
            >
                ${escapeHtml(section.title)}
            </h1>

            <p
                class="
                    mt-4
                    text-slate-600
                    max-w-3xl
                "
            >
                ${escapeHtml(section.description || "")}
            </p>

        </section>


        <section class="mt-10 space-y-8">

            ${
              sectionEndpoints.length
                ? sectionEndpoints
                    .map((endpoint) => endpointCard(endpoint))
                    .join("")
                : `
                        <div
                            class="
                                bg-white
                                border
                                border-slate-200
                                rounded-xl
                                p-8
                                text-slate-500
                            "
                        >
                            No endpoints available.
                        </div>
                    `
            }

        </section>

    `;

  currentEndpoint = null;
}

// ============================================================
// SHOW ENDPOINT
// ============================================================

function showEndpoint(endpointId) {
  const endpoint = endpoints.find(
    (item) => Number(item.id) === Number(endpointId),
  );

  if (!endpoint) return;

  currentEndpoint = endpoint;

  const section = sections.find(
    (item) => Number(item.id) === Number(endpoint.section_id),
  );

  breadcrumb.textContent = `${section?.title || "API"} / ${endpoint.title}`;

  content.innerHTML = endpointCard(endpoint, true);

  document.querySelectorAll(".endpoint-nav").forEach((button) => {
    button.classList.remove("active-nav");

    if (Number(button.dataset.endpointId) === Number(endpointId)) {
      button.classList.add("active-nav");
    }
  });
}

// ============================================================
// ENDPOINT CARD
// ============================================================

function endpointCard(endpoint, fullPage = false) {
  const request = parseJson(endpoint.request_json);

  const response = parseJson(endpoint.response_json);

  const method = endpoint.method || "GET";

  const methodClass = `method-${method}`;

  return `

        <article
            id="endpoint-${endpoint.id}"
            class="
                endpoint-card
                bg-white
                border
                border-slate-200
                rounded-2xl
                overflow-hidden
                shadow-sm
            "
        >

            <!-- Header -->

            <div
                class="
                    p-6
                    border-b
                    border-slate-200
                "
            >

                <div
                    class="
                        flex
                        flex-wrap
                        items-center
                        gap-3
                    "
                >

                    <span
                        class="
                            px-2.5
                            py-1
                            rounded-md
                            text-xs
                            font-bold
                            ${methodClass}
                        "
                    >
                        ${escapeHtml(method)}
                    </span>


                    <code
                        class="
                            text-sm
                            font-mono
                            text-slate-700
                            break-all
                        "
                    >
                        ${escapeHtml(endpoint.endpoint)}
                    </code>


                    ${
                      endpoint.auth === "true"
                        ? `
                                <span
                                    class="
                                        px-2.5
                                        py-1
                                        rounded-full
                                        text-xs
                                        bg-purple-100
                                        text-purple-700
                                    "
                                >
                                    🔐 Auth required
                                </span>
                            `
                        : `
                                <span
                                    class="
                                        px-2.5
                                        py-1
                                        rounded-full
                                        text-xs
                                        bg-green-100
                                        text-green-700
                                    "
                                >
                                    Public
                                </span>
                            `
                    }

                </div>


                <h2
                    class="
                        mt-4
                        text-2xl
                        font-bold
                    "
                >
                    ${escapeHtml(endpoint.title)}
                </h2>


                ${
                  endpoint.description
                    ? `
                            <p
                                class="
                                    mt-2
                                    text-slate-600
                                    leading-7
                                "
                            >
                                ${escapeHtml(endpoint.description)}
                            </p>
                        `
                    : ""
                }

            </div>


            <!-- Content -->

            <div class="p-6 space-y-8">


                ${request ? codeBlock("Request", request) : ""}


                ${
                  response
                    ? codeBlock("Response", response)
                    : `
                            <div>
                                <h3
                                    class="
                                        text-sm
                                        font-semibold
                                        mb-3
                                    "
                                >
                                    Response
                                </h3>

                                <div
                                    class="
                                        bg-slate-900
                                        text-slate-300
                                        rounded-xl
                                        p-5
                                        font-mono
                                        text-sm
                                    "
                                >
                                    ${escapeHtml(endpoint.response_json || "")}
                                </div>
                            </div>
                        `
                }


                ${
                  endpoint.sql_example
                    ? `
                            <div>

                                <h3
                                    class="
                                        text-sm
                                        font-semibold
                                        mb-3
                                    "
                                >
                                    Equivalent SQL
                                </h3>

                                <div
                                    class="
                                        bg-slate-950
                                        rounded-xl
                                        overflow-hidden
                                    "
                                >

                                    <div
                                        class="
                                            flex
                                            items-center
                                            justify-between
                                            px-4
                                            py-2
                                            border-b
                                            border-slate-800
                                        "
                                    >

                                        <span
                                            class="
                                                text-xs
                                                text-slate-400
                                            "
                                        >
                                            SQL
                                        </span>

                                        <button
                                            onclick="copyText(this)"
                                            data-copy="${escapeAttribute(
                                              endpoint.sql_example,
                                            )}"
                                            class="
                                                text-xs
                                                text-slate-400
                                                hover:text-white
                                            "
                                        >
                                            Copy
                                        </button>

                                    </div>

                                    <pre
                                        class="
                                            p-5
                                            text-sm
                                            text-green-400
                                            font-mono
                                        "
                                    >${escapeHtml(endpoint.sql_example)}</pre>

                                </div>

                            </div>
                        `
                    : ""
                }


                ${
                  !fullPage
                    ? `
                            <button
                                onclick="showEndpoint(${endpoint.id})"
                                class="
                                    text-sm
                                    font-medium
                                    text-blue-600
                                    hover:text-blue-700
                                "
                            >
                                View details →
                            </button>
                        `
                    : ""
                }

            </div>

        </article>

    `;
}

// ============================================================
// CODE BLOCK
// ============================================================

function codeBlock(title, data) {
  const json = typeof data === "string" ? data : JSON.stringify(data, null, 2);

  return `

        <div>

            <div
                class="
                    flex
                    items-center
                    justify-between
                    mb-3
                "
            >

                <h3 class="text-sm font-semibold">
                    ${title}
                </h3>


                <button
                    onclick="copyText(this)"
                    data-copy="${escapeAttribute(json)}"
                    class="
                        text-xs
                        text-blue-600
                        hover:text-blue-700
                    "
                >
                    Copy
                </button>

            </div>


            <div
                class="
                    bg-slate-950
                    rounded-xl
                    overflow-hidden
                "
            >

                <pre
                    class="
                        p-5
                        text-sm
                        text-slate-200
                        font-mono
                        overflow-x-auto
                    "
                >${escapeHtml(json)}</pre>

            </div>

        </div>

    `;
}

// ============================================================
// PARSE JSON
// ============================================================

function parseJson(value) {
  if (!value) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// ============================================================
// SEARCH
// ============================================================

searchInput.addEventListener("input", (event) => {
  const value = event.target.value;

  renderSidebar(value);
});

// ============================================================
// MOBILE SIDEBAR
// ============================================================

document
  .getElementById("mobileMenuBtn")
  .addEventListener("click", openMobileSidebar);

document
  .getElementById("sidebarOverlay")
  .addEventListener("click", closeMobileSidebar);

function openMobileSidebar() {
  sidebar.classList.remove("-translate-x-full");

  document.getElementById("sidebarOverlay").classList.remove("hidden");
}

function closeMobileSidebar() {
  sidebar.classList.add("-translate-x-full");

  document.getElementById("sidebarOverlay").classList.add("hidden");
}

// ============================================================
// RELOAD
// ============================================================

reloadBtn.addEventListener("click", () => {
  loadDocumentation();
});

// ============================================================
// COPY
// ============================================================

async function copyText(button) {
  const text = button.dataset.copy;

  try {
    await navigator.clipboard.writeText(text);

    const original = button.textContent;

    button.textContent = "Copied!";

    setTimeout(() => {
      button.textContent = original;
    }, 1500);
  } catch (error) {
    console.error(error);
  }
}

// ============================================================
// ERROR
// ============================================================

function renderError(error) {
  content.innerHTML = `

        <div
            class="
                max-w-xl
                mx-auto
                py-20
                text-center
            "
        >

            <div class="text-5xl">
                ⚠️
            </div>

            <h1
                class="
                    mt-5
                    text-2xl
                    font-bold
                "
            >
                Unable to load documentation
            </h1>

            <p
                class="
                    mt-3
                    text-slate-500
                "
            >
                ${escapeHtml(error.message)}
            </p>


            <div
                class="
                    mt-6
                    bg-slate-900
                    text-left
                    rounded-xl
                    p-5
                    text-sm
                    font-mono
                    text-green-400
                "
            >
                Check that MyExcelDB is running and your
                JWT token is valid.
            </div>


            <button
                onclick="openTokenModal()"
                class="
                    mt-6
                    px-5
                    py-2.5
                    bg-blue-600
                    text-white
                    rounded-lg
                "
            >
                Set Token
            </button>

        </div>

    `;
}

// ============================================================
// HTML ESCAPING
// ============================================================

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/\n/g, "&#10;");
}

// ============================================================
// INITIAL LOAD
// ============================================================

loadDocumentation();
