import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCompanies } from "../api";

export default function CompanySpaListPage() {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCompanies() {
    setLoading(true);
    setError("");

    try {
      const data = await fetchCompanies();

      if (Array.isArray(data)) {
        setCompanies(data);
      } else if (Array.isArray(data?.results)) {
        setCompanies(data.results);
      } else {
        setCompanies([]);
      }
    } catch (err) {
      setError(err.message || "Şirket listesi alınamadı.");
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  if (loading) {
    return <div style={{ padding: 20 }}>Yükleniyor...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ color: "red", marginBottom: 12 }}>{error}</div>
        <button onClick={loadCompanies}>Tekrar dene</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Şirketler</h1>

      {companies.length === 0 ? (
        <div>Kayıt bulunamadı.</div>
      ) : (
        <table border="1" cellPadding="8" cellSpacing="0" width="100%">
          <thead>
            <tr>
              <th>ID</th>
              <th>Şirket</th>
              <th>Sektör</th>
              <th>Şehir</th>
              <th>İhracatçı</th>
              <th>Uyum Skoru</th>
              <th>Risk</th>
              <th>Toplam</th>
              <th>Tamamlanan</th>
              <th>Todo</th>
              <th>İşlem</th>
            </tr>
          </thead>

          <tbody>
            {companies.map((company) => (
              <tr
                key={company.id}
                onClick={() => navigate(`/companies-spa/${company.id}/`)}
                style={{ cursor: "pointer" }}
              >
                <td>{company.id}</td>
                <td>{company.name || "-"}</td>
                <td>{company.sector || "-"}</td>
                <td>{company.location_city || "-"}</td>
                <td>{company.is_exporter ? "Evet" : "Hayır"}</td>
                <td>{company.uyum_skoru ?? "-"}</td>
                <td>{company.risky ? "Riskli" : "Normal"}</td>
                <td>{company.total_obligations ?? 0}</td>
                <td>{company.completed_obligations ?? 0}</td>
                <td>{company.todo_obligations ?? 0}</td>
                <td>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/api/companies/${company.id}/dashboard-page/`;
                      }}
                    >
                      HTML Paneli
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}