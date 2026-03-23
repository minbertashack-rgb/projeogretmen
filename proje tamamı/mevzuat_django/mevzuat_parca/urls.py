from django.urls import path
from .views import (
    SirketSpaListAPIView,
    SirketSpaDetailAPIView,
    SirketObligationPatchView,
    SirketDetailView,
    DuzenlemeListCreateView,
    DuzenlemeDetailView,
    sirket_dashboard_api,
    sirket_dashboard_page,
    sirket_list_page,
    sirket_riskli_list_page,
    obligation_complete,
    obligation_reset,
    companies_spa_list,
    companies_spa_detail,
)

urlpatterns = [
    # =========================================================
    # JSON API ENDPOINTLERI
    # =========================================================
    path(
        "api/companies-spa/",
        SirketSpaListAPIView.as_view(),
        name="companies-spa-list",
    ),
    path(
        "api/companies-spa/<int:pk>/",
        SirketSpaDetailAPIView.as_view(),
        name="companies-spa-detail",
    ),
    path(
        "api/company-obligations/<int:pk>/",
        SirketObligationPatchView.as_view(),
        name="obligation-status-api",
    ),

    path(
        "api/companies/<int:pk>/dashboard/",
        sirket_dashboard_api,
        name="sirket-dashboard-api",
    ),
    path(
        "api/companies/<int:pk>/",
        SirketDetailView.as_view(),
        name="company-detail",
    ),

    path(
        "api/duzenlemeler/",
        DuzenlemeListCreateView.as_view(),
        name="duzenleme-list-create",
    ),
    path(
        "api/duzenlemeler/<int:pk>/",
        DuzenlemeDetailView.as_view(),
        name="duzenleme-detail",
    ),

    # =========================================================
    # HTML / TEMPLATE SAYFALARI
    # =========================================================
    path(
        "companies-spa/",
        companies_spa_list,
        name="companies-spa-page",
    ),
    path(
        "companies-spa/<int:pk>/",
        companies_spa_detail,
        name="companies-spa-detail-page",
    ),

    path(
        "api/companies/<int:pk>/dashboard-page/",
        sirket_dashboard_page,
        name="sirket-dashboard-page",
    ),
    path(
        "sirket-list/",
        sirket_list_page,
        name="sirket-list-page",
    ),
    path(
        "companies-risky/",
        sirket_riskli_list_page,
        name="sirket-riskli-list-page",
    ),
    path(
        "obligations/<int:pk>/complete/",
        obligation_complete,
        name="obligation-complete",
    ),
    path(
        "obligations/<int:pk>/reset/",
        obligation_reset,
        name="obligation-reset",
    ),
]