import { useEffect, useState } from "react";
import { fetchCompanyDetail, patchCompanyObligation } from "../api";
import { useParams, Link } from "react-router-dom";

export default function CompanySpaDetailPage() {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  async function loadDetail() {
    setLoading(true);
    setError("");

    try {
      const data = await fetchCompanyDetail(id);
      setCompany(data);
    } catch (err) {
      setError(err.message || "Detay alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetail();
  }, [id]);

  async function toggleCompliance(obligation) {
    setBusyId(obligation.id);
    setError("");

    try {
      await patchObligationStatus(obligation.id, !obligation.is_compliant);
      await loadDetail();
    } catch (err) {
      setError(err.message || "Güncelleme başarısız.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Yükleniyor...</div>;
  if (error && !company) {
    return <div style={{ padding: 20, color: "red" }}>{error}</div>;
  }
  if (!company) return <div style={{ padding: 20 }}>Kayıt bulunamadı.</div>;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <Link to="/companies-spa/">← Şirket listesine dön</Link>
      </div>
  
      <h1>{company.name || `Şirket #${id}`}</h1>
  
      <p><strong>Sektör:</strong> {company.sector || "-"}</p>

      <p><strong>Şehir:</strong> {company.location_city || "-"}</p>
      <p><strong>İhracatçı:</strong> {company.is_exporter ? "Evet" : "Hayır"}</p>
      <p><strong>Uyum Skoru:</strong> {company.uyum_skoru ?? "-"}</p>
      <p><strong>Risk:</strong> {company.risky ? "Riskli" : "Normal"}</p>
      <p><strong>Toplam:</strong> {company.total_obligations ?? 0}</p>
      <p><strong>Tamamlanan:</strong> {company.completed_obligations ?? 0}</p>
      <p><strong>Todo:</strong> {company.todo_obligations ?? 0}</p>      
      {error ? (
        <div
          style={{
            margin: "16px 0",
            padding: 12,
            borderRadius: 8,
            background: "#fff3f3",
            color: "red",
            border: "1px solid #f1b5b5",
          }}
        >
          {error}
        </div>
      ) : null}
      <h2>Yükümlülükler</h2>

      <table border="1" cellPadding="8" cellSpacing="0" width="100%">
        <thead>
          <tr>
            <th>ID</th>
            <th>Düzenleme</th>
            <th>Kaynak</th>
            <th>Son Tarih</th>
            <th>Risk</th>
            <th>Durum</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {(company.obligations || []).map((ob) => (
            <tr key={ob.id}>
              <td>{ob.id}</td>
              <td>{ob.duzenleme?.title}</td>
              <td>{ob.duzenleme?.source}</td>
              <td>{ob.due_date || "-"}</td>
              <td>{ob.risk_level}</td>
              <td>{ob.is_compliant ? "Tamam" : "Bekliyor"}</td>
              <td>
                <button
                  onClick={() => toggleCompliance(ob)}
                  disabled={busyId === ob.id}
                >
                  {busyId === ob.id
                    ? "Kaydediliyor..."
                    : ob.is_compliant
                    ? "Geri al"
                    : "Tamamla"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}