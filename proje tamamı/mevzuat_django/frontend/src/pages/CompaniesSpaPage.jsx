import { useEffect, useState } from "react";
import { fetchCompanies } from "../lib/api";

function orderingToSortDir(ordering) {
  if (!ordering) {
    return { sort: "created_at", dir: "desc" };
  }

  if (ordering.startsWith("-")) {
    return {
      sort: ordering.slice(1),
      dir: "desc",
    };
  }

  return {
    sort: ordering,
    dir: "asc",
  };
}

export default function CompaniesSpaPage() {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    q: "",
    sector: "",
    risky: "",
    ordering: "-created_at",
  });

  async function loadCompanies(customFilters = filters) {
    setLoading(true);
    setError("");

    try {
      const { sort, dir } = orderingToSortDir(customFilters.ordering);

      const data = await fetchCompanies({
        q: customFilters.q,
        sector: customFilters.sector,
        risky:
          customFilters.risky === ""
            ? undefined
            : customFilters.risky === "true",
        sort,
        dir,
      });

      setItems(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      setError(err.message || "Liste alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await loadCompanies(filters);
  }

  function handleReset() {
    const resetFilters = {
      q: "",
      sector: "",
      risky: "",
      ordering: "-created_at",
    };
    setFilters(resetFilters);
    loadCompanies(resetFilters);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Şirketler</h1>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: 12,
          marginBottom: 20,
          maxWidth: 500,
        }}
      >
        <input
          name="q"
          placeholder="Ara: şirket, şehir, sektör"
          value={filters.q}
          onChange={handleChange}
        />

        <select
          name="sector"
          value={filters.sector}
          onChange={handleChange}
        >
          <option value="">Tüm sektörler</option>
          <option value="yazilim">Yazılım</option>
          <option value="imalat">İmalat</option>
          <option value="perakende">Perakende</option>
          <option value="lojistik">Lojistik</option>
        </select>

        <select
          name="risky"
          value={filters.risky}
          onChange={handleChange}
        >
          <option value="">Hepsi</option>
          <option value="true">Sadece riskli</option>
          <option value="false">Sadece risksiz</option>
        </select>

        <select
          name="ordering"
          value={filters.ordering}
          onChange={handleChange}
        >
          <option value="-created_at">En yeni</option>
          <option value="created_at">En eski</option>
          <option value="-uyum_skoru">Skor yüksekten düşüğe</option>
          <option value="uyum_skoru">Skor düşükten yükseğe</option>
          <option value="name">Ada göre A-Z</option>
          <option value="-name">Ada göre Z-A</option>
        </select>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit">Filtrele</button>
          <button type="button" onClick={handleReset}>
            Temizle
          </button>
        </div>
      </form>

      {loading && <p>Yükleniyor...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <>
          <p>Toplam: {count}</p>

          <table border="1" cellPadding="8" cellSpacing="0" width="100%">
            <thead>
              <tr>
                <th>ID</th>
                <th>Şirket</th>
                <th>Sektör</th>
                <th>Şehir</th>
                <th>Skor</th>
                <th>Todo</th>
                <th>Risk</th>
                <th>Detay</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center" }}>
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                items.map((company) => (
                  <tr key={company.id}>
                    <td>{company.id}</td>
                    <td>{company.name}</td>
                    <td>{company.sector}</td>
                    <td>{company.location_city}</td>
                    <td>{company.uyum_skoru}</td>
                    <td>{company.todo_obligations}</td>
                    <td>{company.risky ? "Riskli" : "Normal"}</td>
                    <td>
                      <a href={`/companies-spa/${company.id}`}>Aç</a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}