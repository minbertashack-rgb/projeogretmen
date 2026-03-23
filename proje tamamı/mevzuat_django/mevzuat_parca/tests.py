from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from rest_framework.test import APIClient

from .models import Sirket, Duzenleme, SirketObligation
from .services import hesapla_sirket_skoru


class RegTechBasicTests(TestCase):
    def setUp(self):
        self.api = APIClient()

    def _extract_results(self, response_json):
        """
        Pagination varsa results döner, yoksa listeyi direkt döner.
        """
        if isinstance(response_json, dict) and "results" in response_json:
            return response_json["results"]
        return response_json

    def test_duzenleme_save_auto_tags_sectors_impact(self):
        d = Duzenleme.objects.create(
            source="gib",
            title="Yeni KDV Tebliği",
            publish_date=timezone.localdate(),
            raw_text="KDV zorunludur. Yazılım şirketleri için yeni beyan şartı vardır.",
        )

        tags_lower = [str(x).lower() for x in (d.tags or [])]
        sectors_lower = [str(x).lower() for x in (d.sectors or [])]

        self.assertIn("kdv", tags_lower)
        self.assertIn("vergi", tags_lower)
        self.assertIn("yazilim", sectors_lower)
        self.assertEqual(d.impact_type, "zorunlu")

    def test_hesapla_sirket_skoru_no_obligation_100(self):
        s = Sirket.objects.create(
            name="Demo A.Ş.",
            sector="yazilim",
            employee_count=10,
            location_city="İstanbul",
            is_exporter=False,
        )

        result = hesapla_sirket_skoru(s)

        self.assertEqual(result["score"], 100)
        self.assertEqual(result["stats"]["total_obligations"], 0)
        self.assertEqual(len(result["todo"]), 0)
        self.assertEqual(len(result["completed"]), 0)

    def test_dashboard_api_returns_expected_keys(self):
        s = Sirket.objects.create(
            name="Test Ltd",
            sector="imalat",
            employee_count=50,
            location_city="Bursa",
            is_exporter=True,
        )

        r = Duzenleme.objects.create(
            source="resmi_gazete",
            title="Zorunlu Bildirim",
            publish_date=timezone.localdate(),
            raw_text="Bu bildirim zorunludur.",
            impact_type="zorunlu",
            tags=["vergi"],
            sectors=["imalat"],
        )

        SirketObligation.objects.create(
            sirket=s,
            duzenleme=r,
            is_applicable=True,
            is_compliant=False,
            due_date=timezone.localdate() - timedelta(days=1),
            risk_level="high",
        )

        url = reverse("companies_spa_detail", kwargs={"pk": s.pk})
        res = self.api.get(url)

        self.assertEqual(res.status_code, 200)

        data = res.json()
        self.assertIn("sirket", data)
        self.assertIn("uyum_skoru", data)
        self.assertIn("stats", data)
        self.assertIn("todo", data)
        self.assertIn("completed", data)

        self.assertIsInstance(data["todo"], list)
        self.assertIsInstance(data["completed"], list)

    def test_obligation_status_api_toggle_moves_between_lists(self):
        s = Sirket.objects.create(
            name="Toggle Co",
            sector="perakende",
            employee_count=5,
            location_city="Ankara",
            is_exporter=False,
        )

        r = Duzenleme.objects.create(
            source="gib",
            title="Yükümlülük X",
            publish_date=timezone.localdate(),
            raw_text="Bu yükümlülük zorunludur.",
            impact_type="zorunlu",
            tags=["vergi"],
            sectors=["perakende"],
        )

        obl = SirketObligation.objects.create(
            sirket=s,
            duzenleme=r,
            is_applicable=True,
            is_compliant=False,
            due_date=timezone.localdate() - timedelta(days=1),
            risk_level="high",
        )

        dash_url = reverse("companies_spa_detail", kwargs={"pk": s.pk})
        before = self.api.get(dash_url).json()
        self.assertEqual(len(before["todo"]), 1)
        self.assertEqual(len(before["completed"]), 0)

        patch_url = reverse("obligation-status-api", kwargs={"pk": obl.pk})

        res1 = self.api.patch(patch_url, {"is_compliant": True}, format="json")
        self.assertEqual(res1.status_code, 200)
        json1 = res1.json()

        self.assertIn("uyum_skoru", json1)
        self.assertIn("todo", json1)
        self.assertIn("completed", json1)

        self.assertEqual(len(json1["todo"]), 0)
        self.assertEqual(len(json1["completed"]), 1)
        self.assertEqual(json1["completed"][0]["obligation_id"], obl.pk)

        res2 = self.api.patch(patch_url, {"is_compliant": False}, format="json")
        self.assertEqual(res2.status_code, 200)
        json2 = res2.json()

        self.assertEqual(len(json2["todo"]), 1)
        self.assertEqual(len(json2["completed"]), 0)
        self.assertEqual(json2["todo"][0]["obligation_id"], obl.pk)

    def test_companies_spa_list_risky_filter_returns_only_low_scores(self):
        low = Sirket.objects.create(
            name="Riskli Şirket",
            sector="lojistik",
            employee_count=20,
            location_city="İzmir",
            is_exporter=False,
        )

        high = Sirket.objects.create(
            name="Sağlam Şirket",
            sector="lojistik",
            employee_count=20,
            location_city="İzmir",
            is_exporter=False,
        )

        r = Duzenleme.objects.create(
            source="resmi_gazete",
            title="Ceza Riski",
            publish_date=timezone.localdate(),
            raw_text="Bu yükümlülük zorunludur. İdari para cezası vardır.",
            impact_type="zorunlu",
            tags=["vergi"],
            sectors=["lojistik"],
        )

        SirketObligation.objects.create(
            sirket=low,
            duzenleme=r,
            is_applicable=True,
            is_compliant=False,
            due_date=timezone.localdate() - timedelta(days=1),
            risk_level="high",
        )

        url = reverse("companies-spa-list") + "?risky=true&threshold=80"
        res = self.api.get(url)
        self.assertEqual(res.status_code, 200)

        data = self._extract_results(res.json())
        ids = [item["id"] for item in data]

        self.assertIn(low.id, ids)
        self.assertNotIn(high.id, ids)

    def test_companies_spa_detail_page_has_data_company_id(self):
        s = Sirket.objects.create(
            name="SPA Co",
            sector="yazilim",
            employee_count=3,
            location_city="İstanbul",
            is_exporter=False,
        )

        url = reverse("companies-spa-detail-page", kwargs={"pk": s.pk})
        res = self.client.get(url)

        self.assertEqual(res.status_code, 200)
        self.assertContains(res, "data-company-id")
        self.assertContains(res, str(s.pk))

    def test_dashboard_and_spa_detail_score_match(self):
        kwargs = dict(
            name="Test Yazılım A.Ş.",
            sector="yazilim",
            employee_count=20,
            location_city="İstanbul",
            is_exporter=True,
        )

        field_names = {f.name for f in Sirket._meta.fields}
        if "unvan" in field_names:
            kwargs["unvan"] = "Test Yazılım A.Ş."

        sirket = Sirket.objects.create(**kwargs)

        dashboard_url = reverse("sirket-dashboard-api", args=[sirket.id])
        spa_detail_url = reverse("companies-spa-detail", args=[sirket.id])

        r1 = self.client.get(dashboard_url)
        r2 = self.client.get(spa_detail_url)

        self.assertEqual(r1.status_code, 200, f"dashboard 200 değil: {r1.status_code} url={dashboard_url}")
        self.assertEqual(r2.status_code, 200, f"spa detail 200 değil: {r2.status_code} url={spa_detail_url}")

        dashboard_json = r1.json()
        spa_detail_json = r2.json()

        self.assertEqual(
            dashboard_json["uyum_skoru"],
            spa_detail_json["uyum_skoru"],
        )

    def test_company_list_score_matches_dashboard(self):
        kwargs = dict(
            name="Skor Test A.Ş.",
            sector="yazilim",
            employee_count=10,
            location_city="İstanbul",
            is_exporter=False,
        )

        field_names = {f.name for f in Sirket._meta.fields}
        if "unvan" in field_names:
            kwargs["unvan"] = "Skor Test A.Ş."

        s = Sirket.objects.create(**kwargs)

        list_url = reverse("companies-spa-list")
        list_res = self.api.get(list_url)
        self.assertEqual(list_res.status_code, 200)

        list_data = self._extract_results(list_res.json())
        item = next(x for x in list_data if x["id"] == s.id)
        score_list = item["uyum_skoru"]

        dash_url = reverse("sirket-dashboard-api", args=[s.id])
        dash_res = self.api.get(dash_url)
        self.assertEqual(dash_res.status_code, 200)

        score_dash = dash_res.json()["uyum_skoru"]

        self.assertEqual(score_list, score_dash)