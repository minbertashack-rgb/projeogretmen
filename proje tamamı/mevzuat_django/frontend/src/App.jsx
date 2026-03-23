import React, { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import CompanySpaListPage from "./pages/CompanySpaListPage";
import CompanySpaDetailPage from "./pages/CompanySpaDetailPage";

/**
 * Küçük yardımcı bileşen:
 * Sayfa değişince en üste kaydırır.
 */
function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return null;
}

/**
 * Basit üst menü
 */
function AppHeader() {
  const linkStyle = ({ isActive }) => ({
    padding: "10px 14px",
    borderRadius: 8,
    textDecoration: "none",
    color: isActive ? "#fff" : "#111",
    background: isActive ? "#111" : "#f3f3f3",
    border: "1px solid #ddd",
    fontSize: 14,
    fontWeight: 600,
  });

  return (
    <header
      style={{
        borderBottom: "1px solid #e5e5e5",
        background: "#fff",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Link
          to="/"
          style={{
            textDecoration: "none",
            color: "#111",
            fontWeight: 800,
            fontSize: 20,
          }}
        >
          Akıllı Mevzuat Asistanı
        </Link>

        <nav
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <NavLink to="/" style={linkStyle}>
            Ana Sayfa
          </NavLink>

          <NavLink to="/companies-spa" style={linkStyle}>
            Şirketler SPA
          </NavLink>

          <NavLink to="/yardim" style={linkStyle}>
            Yardım
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

/**
 * Alt bilgi
 */
function AppFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid #e5e5e5",
        marginTop: 40,
        background: "#fff",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "20px",
          color: "#666",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        <div style={{ marginBottom: 6, fontWeight: 700, color: "#111" }}>
          RegTech / Mevzuat Yönetimi
        </div>

        <div>
          Bu arayüz şirketlerin uyum durumu, risk görünümü ve yükümlülük
          takibini SPA yapısında görüntülemek için hazırlanmıştır.
        </div>
      </div>
    </footer>
  );
}

/**
 * Genel sayfa kabuğu
 */
function PageShell({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fafafa",
        color: "#111",
      }}
    >
      <AppHeader />
      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "24px 20px 40px",
        }}
      >
        {children}
      </main>
      <AppFooter />
    </div>
  );
}

/**
 * Ana sayfa
 */
function HomePage() {
  const cardStyle = {
    border: "1px solid #ddd",
    borderRadius: 16,
    background: "#fff",
    padding: 20,
  };

  return (
    <PageShell>
      <section
        style={{
          display: "grid",
          gap: 20,
        }}
      >
        <div
          style={{
            ...cardStyle,
            padding: 28,
          }}
        >
          <h1 style={{ marginTop: 0, marginBottom: 12 }}>
            Akıllı Mevzuat Asistanı
          </h1>

          <p style={{ marginTop: 0, lineHeight: 1.7 }}>
            Bu panel üzerinden şirket bazlı uyum durumlarını görüntüleyebilir,
            riskli kayıtları inceleyebilir, yükümlülük listelerine girip
            tamamlanma durumlarını güncelleyebilirsin.
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 18,
            }}
          >
            <Link
              to="/companies-spa"
              style={{
                textDecoration: "none",
                background: "#111",
                color: "#fff",
                padding: "12px 16px",
                borderRadius: 10,
                fontWeight: 700,
              }}
            >
              Şirket Listesine Git
            </Link>

            <Link
              to="/yardim"
              style={{
                textDecoration: "none",
                background: "#f3f3f3",
                color: "#111",
                padding: "12px 16px",
                borderRadius: 10,
                fontWeight: 700,
                border: "1px solid #ddd",
              }}
            >
              Yardım Sayfası
            </Link>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>SPA Liste</h3>
            <p style={{ marginBottom: 0, lineHeight: 1.6 }}>
              Şirketlerin tablo halinde listelendiği, satıra tıklayınca detay
              sayfasına geçilen görünüm.
            </p>
          </div>

          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Detay Sayfası</h3>
            <p style={{ marginBottom: 0, lineHeight: 1.6 }}>
              Seçilen şirkete ait sektör, şehir, uyum skoru, risk ve obligation
              listesi burada gösterilir.
            </p>
          </div>

          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Durum Güncelleme</h3>
            <p style={{ marginBottom: 0, lineHeight: 1.6 }}>
              Yükümlülük satırlarında “Tamamla / Geri al” butonları ile PATCH
              isteği atılıp anlık veri yenilenebilir.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

/**
 * Yardım sayfası
 */
function HelpPage() {
  const itemStyle = {
    border: "1px solid #ddd",
    borderRadius: 14,
    background: "#fff",
    padding: 18,
  };

  return (
    <PageShell>
      <h1 style={{ marginTop: 0 }}>Yardım</h1>

      <div
        style={{
          display: "grid",
          gap: 14,
        }}
      >
        <div style={itemStyle}>
          <h3 style={{ marginTop: 0 }}>1. Şirket listesi</h3>
          <p style={{ marginBottom: 0, lineHeight: 1.6 }}>
            <strong>/companies-spa</strong> adresinden şirketlerin tablo
            görünümüne ulaşırsın. Satıra tıklayınca detay açılır.
          </p>
        </div>

        <div style={itemStyle}>
          <h3 style={{ marginTop: 0 }}>2. Şirket detayı</h3>
          <p style={{ marginBottom: 0, lineHeight: 1.6 }}>
            <strong>/companies-spa/:id</strong> yolunda seçilen şirkete ait
            yükümlülükler ve genel bilgiler gösterilir.
          </p>
        </div>

        <div style={itemStyle}>
          <h3 style={{ marginTop: 0 }}>3. HTML paneli</h3>
          <p style={{ marginBottom: 0, lineHeight: 1.6 }}>
            Liste sayfasındaki “HTML Paneli” butonu klasik dashboard ekranına
            tam sayfa yönlendirme yapar.
          </p>
        </div>

        <div style={itemStyle}>
          <h3 style={{ marginTop: 0 }}>4. PATCH sorunu olursa</h3>
          <p style={{ marginBottom: 0, lineHeight: 1.6 }}>
            Önce backend serializer’ın hangi alanı beklediğini kontrol et:
            <code style={{ marginLeft: 6 }}>is_compliant</code>,
            <code style={{ marginLeft: 6 }}>is_completed</code> veya
            <code style={{ marginLeft: 6 }}>completed</code>.
          </p>
        </div>
      </div>
    </PageShell>
  );
}

/**
 * Eğer kullanıcı /companies/:id/dashboard-page/ yoluna SPA içinde gelirse,
 * burada tam sayfa reload yaptırıyoruz ki backend'in klasik HTML paneli açılabilsin.
 */
function DashboardPageRedirect() {
  const { id } = useParams();

  useEffect(() => {
    window.location.href = `/api/companies/${id}/dashboard-page/`;
  }, [id]);

  return (
    <PageShell>
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 14,
          background: "#fff",
          padding: 20,
        }}
      >
        <h1 style={{ marginTop: 0 }}>HTML Paneline yönlendiriliyor...</h1>
        <p style={{ marginBottom: 0 }}>
          Eğer otomatik geçiş olmazsa aşağıdaki linke tıkla:
        </p>

        <div style={{ marginTop: 12 }}>
          <a href={`/api/companies/${id}/dashboard-page/`}>
            /api/companies/{id}/dashboard-page/
          </a>
        </div>
      </div>
    </PageShell>
  );
}

/**
 * Eski bir yol gelirse şirket listesine at
 */
function LegacyRedirect() {
  return <Navigate to="/companies-spa" replace />;
}

/**
 * 404 sayfası
 */
function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <PageShell>
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 16,
          background: "#fff",
          padding: 24,
        }}
      >
        <h1 style={{ marginTop: 0 }}>404</h1>
        <p style={{ lineHeight: 1.7 }}>
          Aradığın sayfa bulunamadı. Route yanlış olabilir ya da bu yol henüz
          tanımlanmamış olabilir.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 16,
          }}
        >
          <button
            onClick={() => navigate("/")}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              border: "1px solid #ccc",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Ana sayfaya dön
          </button>

          <button
            onClick={() => navigate("/companies-spa")}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              border: "1px solid #ccc",
              background: "#fff",
              color: "#111",
              cursor: "pointer",
            }}
          >
            Şirket listesine git
          </button>
        </div>
      </div>
    </PageShell>
  );
}

/**
 * Ana uygulama
 */
export default function App() {
  return (
    <>
      <ScrollToTop />

      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route path="/yardim" element={<HelpPage />} />

        <Route
          path="/companies-spa"
          element={
            <PageShell>
              <CompanySpaListPage />
            </PageShell>
          }
        />

        <Route
          path="/companies-spa/:id"
          element={
            <PageShell>
              <CompanySpaDetailPage />
            </PageShell>
          }
        />

        <Route
          path="/companies/:id/dashboard-page/"
          element={<DashboardPageRedirect />}
        />

        <Route path="/companies" element={<LegacyRedirect />} />
        <Route path="/companies-spa-list" element={<LegacyRedirect />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}