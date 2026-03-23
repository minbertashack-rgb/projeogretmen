import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE, fetchCompanyDashboard, patchObligationStatus } from "../api";

function oidOf(x) {
  return x?.obligation_id ?? x?.id;
}
function trRisk(r) {
  const s = String(r ?? "").toLowerCase();
  if (s === "high") return "Yüksek";
  if (s === "medium") return "Orta";
  if (s === "low") return "Düşük";
  return r ?? "-";
}


export default function CompanyDetail() {
  const nav = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const savingRef = useRef(new Set()); // ✅ anlık kilit


  function load(signal) {
    setLoading(true);
    setErr("");
    fetchCompanyDashboard(id, signal)
      .then((d) => setData(d))
      .catch((e) => {
        if (e?.name === "AbortError") return;          // ✅ abort ise hata sayma
        if (String(e).toLowerCase().includes("aborted")) return; // ekstra garanti
        setErr(String(e?.message ?? e));
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const ac = new AbortController();
  
    setLoading(true);
    setErr("");
  
    fetchCompanyDashboard(id, ac.signal)   // ✅ doğru kullanım
      .then((d) => setData(d))             // ✅ setDash yok, setData var
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setErr(String(e?.message ?? e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
  
    return () => ac.abort();
  }, [id]);



  async function setCompliance(obligationId, isCompliant) {
    // ✅ aynı satıra ikinci kez tıklanırsa direkt kes
    if (savingRef.current.has(obligationId)) return;
  
    savingRef.current.add(obligationId);
    setSavingId(obligationId);
  
    try {
      setErr("");
      const d = await patchObligationStatus(obligationId, isCompliant);
      setData(d);
    } catch (e) {
      setErr(String(e?.message ?? e));
    } finally {
      savingRef.current.delete(obligationId);
      setSavingId(null);
    }
  }




  const sirket = data?.sirket;
  const stats = data?.stats || {};
  const todo = Array.isArray(data?.todo) ? data.todo : [];
  const completed = Array.isArray(data?.completed) ? data.completed : [];
  const score = data?.uyum_skoru ??data?.compliance_score ??data?.score ??null;

  return (
    <div style={{ padding: 20, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => nav(-1)}>← Listeye dön</button>

        <button
          onClick={() => window.open(`${API_BASE}/api/companies/${id}/dashboard-page/`, "_blank")}
        >
          HTML Panelini aç
        </button>
      </div>

      {err && <div style={{ marginTop: 10, color: "crimson" }}>Hata: {err}</div>}
      {loading && <div style={{ marginTop: 10 }}>Yükleniyor…</div>}

      {!loading && !err && data && (
        <>
          <h2 style={{ marginTop: 10 }}>
            {sirket?.name ?? `Şirket #${id}`}
          </h2>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
            <div style={{ border: "1px solid #444", padding: 12, borderRadius: 8, minWidth: 180 }}>
              <div style={{ opacity: 0.8 }}>Uyum Skoru</div>
              <div style={{ fontSize: 28, marginTop: 6 }}>{score ?? "-"}</div>
            </div>

            <div style={{ border: "1px solid #444", padding: 12, borderRadius: 8, minWidth: 220 }}>
              <div style={{ opacity: 0.8 }}>İstatistik</div>
              <div style={{ marginTop: 6 }}>Toplam: {stats.total_obligations ?? "-"}</div>
              <div>Açık: {stats.open_obligations ?? "-"}</div>
              <div>Gecikmiş: {stats.overdue_obligations ?? "-"}</div>
            </div>
          </div>

          <h3 style={{ marginTop: 22 }}>Yapılacaklar (Açık)</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }} cellPadding={8}>
            <thead>
              <tr>
                <th align="left">Düzenleme</th>
                <th align="left">Son Tarih</th>
                <th align="left">Risk</th>
                <th align="left">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {todo.length === 0 ? (
                <tr><td colSpan={4} style={{ paddingTop: 10, opacity: 0.8 }}>Açık yükümlülük yok</td></tr>
              ) : (
                todo.map((x) => (
                  <tr key={oidOf(x)}>
                    <td
                      style={{
                        maxWidth: 520,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={x.regulation_title ?? ""}
                    >
                      {x.regulation_title ?? "-"}
                    </td>
                    <td>{x.due_date ?? "-"}</td>
                    <td>{trRisk(x.risk_level ?? x.risk)}</td>
                    <td>
                      <button
                        disabled={savingId === oidOf(x)}
                        onClick={() => setCompliance(oidOf(x), true)}
                      >
                        {savingId === oidOf(x) ? "İşleniyor…" : "Tamamlandı"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <h3 style={{ marginTop: 22 }}>Tamamlananlar</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }} cellPadding={8}>
            <thead>
              <tr>
                <th align="left">Düzenleme</th>
                <th align="left">Son Tarih</th>
                <th align="left">Risk</th>
                <th align="left">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {completed.length === 0 ? (
                <tr><td colSpan={4} style={{ paddingTop: 10, opacity: 0.8 }}>Tamamlanan yok</td></tr>
              ) : (
                completed.map((x) => (
                  <tr key={oidOf(x)}>
                    <td
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={x.regulation_title ?? ""}
                    >
                      {x.regulation_title ?? "-"}
                    </td>
                    <td>{x.due_date ?? "-"}</td>
                    <td>{trRisk(x.risk_level ?? x.risk)}</td>
                    <td>
                      <button
                        disabled={savingId === oidOf(x)}
                        onClick={() => setCompliance(oidOf(x), false)}
                      >
                        {savingId === oidOf(x) ? "İşleniyor…" : "Geri al"}
                      </button>
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
