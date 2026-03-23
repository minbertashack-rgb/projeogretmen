const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

function getCsrfToken() {
  const m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

async function safeFetchJson(url, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  const r = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });

  const txt = await r.text();

  let data = null;
  try {
    data = txt ? JSON.parse(txt) : null;
  } catch {
    data = txt;
  }

  if (!r.ok) {
    const msg =
      (data && typeof data === "object" && (data.detail || data.error || data.message)) ||
      `${r.status} ${r.statusText}`;
    throw new Error(msg);
  }

  return data;
}

function apiUrl(path) {
  if (path.startsWith("http")) return path;
  if (!API_BASE) return path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * sort + dir -> backend ordering paramına çevrilir
 * örnek:
 * sort="uyum_skoru", dir="desc" => ordering=-uyum_skoru
 * sort="name", dir="asc" => ordering=name
 */
function buildOrdering(sort, dir) {
  if (!sort) return "";

  const isDesc = String(dir || "").toLowerCase() === "desc";
  return isDesc ? `-${sort}` : sort;
}

export function fetchCompanies({
  q,
  sector,
  risky,
  threshold,
  sort,
  dir,
  min_score,
  max_score,
  page,
  page_size,
  signal,
} = {}) {
  const p = new URLSearchParams();

  if (q) p.set("q", q);
  if (sector && sector !== "all") p.set("sector", sector);

  if (risky === true || risky === "true") {
    p.set("risky", "true");
  } else if (risky === false || risky === "false") {
    p.set("risky", "false");
  }

  if (threshold !== undefined && threshold !== null && threshold !== "") {
    p.set("threshold", String(threshold));
  }

  if (min_score !== undefined && min_score !== null && min_score !== "") {
    p.set("min_score", String(min_score));
  }

  if (max_score !== undefined && max_score !== null && max_score !== "") {
    p.set("max_score", String(max_score));
  }

  if (page) p.set("page", String(page));
  if (page_size) p.set("page_size", String(page_size));

  const ordering = buildOrdering(sort, dir);
  if (ordering) p.set("ordering", ordering);

  return safeFetchJson(apiUrl(`/api/companies-spa/?${p.toString()}`), { signal });
}

/**
 * Şirket detail endpointi
 * obligations da burada geliyor
 */
export function fetchCompanyDetail(companyId, signalOrOpts) {
  const signal = signalOrOpts?.signal ?? signalOrOpts;
  return safeFetchJson(apiUrl(`/api/companies-spa/${companyId}/`), { signal });
}

/**
 * Mevcut dashboard payload kullanacaksan
 * backend endpoint: /api/companies/<id>/dashboard/
 */
export function fetchCompanyDashboard(companyId, signalOrOpts) {
  const signal = signalOrOpts?.signal ?? signalOrOpts;
  return safeFetchJson(apiUrl(`/api/companies/${companyId}/dashboard/`), { signal });
}

/**
 * PATCH status endpointi
 * backend endpoint: /api/obligations/<id>/status/
 */
/**
 * İstersen direkt obligation patch endpointini de kullanabilirsin
 * backend endpoint: /api/company-obligations/<id>/
 */
export function patchObligationStatus(obligationId, is_compliant, signal) {
  const csrf = getCsrfToken();

  return safeFetchJson(apiUrl(`/api/company-obligations/${obligationId}/`), {
    method: "PATCH",
    signal,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrf ? { "X-CSRFToken": csrf } : {}),
    },
    body: JSON.stringify({ is_compliant }),
  });
}
export { API_BASE, getCsrfToken, safeFetchJson };