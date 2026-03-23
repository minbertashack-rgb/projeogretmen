from django.db.models import (
    Q,
    Count,
    Case,
    When,
    Value,
    FloatField,
    F,
    ExpressionWrapper,
    BooleanField,
    Prefetch,
)
from django.db.models.functions import Cast
from django.shortcuts import get_object_or_404, render, redirect
from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_http_methods

from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Sirket, Duzenleme, SirketObligation

# Eğer dosya adın serializers.py ise bunu değiştir:
# from .serializers import ...
from .serilestiriciler import (
    SirketListSerializer,
    SirketDetailSerializer,
    DuzenlemeSerializer,
    DuzenlemeListSerializer,
    DuzenlemeDetailSerializer,
    SirketObligationPatchSerializer,
)

from .services import hesapla_sirket_skoru
from .pagination import StandardResultsSetPagination


RISKY_DEFAULT_THRESHOLD = 80.0

TR_LOWER = {"I": "ı", "İ": "i"}


def tr_lower(s: str) -> str:
    return "".join(TR_LOWER.get(ch, ch.lower()) for ch in s)


def tr_variants(s: str):
    s = (s or "").strip()
    if not s:
        return []

    vs = set()
    vs.add(s)
    vs.add(s.lower())
    vs.add(s.upper())
    vs.add(s.title())

    vs.add(s.replace("i", "İ"))
    vs.add(s.replace("İ", "i"))
    vs.add(s.replace("I", "ı"))
    vs.add(s.replace("ı", "I"))

    x = tr_lower(s)
    vs.add(x)
    vs.add(x.title())

    return [v for v in vs if v]


def _as_bool(v):
    if isinstance(v, bool):
        return v
    return str(v).strip().lower() in ("1", "true", "yes", "on", "evet")


def _annotated_sirket_queryset(with_prefetch=False):
    qs = (
        Sirket.objects.all()
        .annotate(
            total_obligations=Count(
                "sirketobligation",
                filter=Q(sirketobligation__is_applicable=True),
                distinct=True,
            ),
            completed_obligations=Count(
                "sirketobligation",
                filter=Q(
                    sirketobligation__is_applicable=True,
                    sirketobligation__is_compliant=True,
                ),
                distinct=True,
            ),
            todo_obligations=Count(
                "sirketobligation",
                filter=Q(
                    sirketobligation__is_applicable=True,
                    sirketobligation__is_compliant=False,
                ),
                distinct=True,
            ),
            high_risk_open_count=Count(
                "sirketobligation",
                filter=Q(
                    sirketobligation__is_applicable=True,
                    sirketobligation__is_compliant=False,
                    sirketobligation__risk_level="high",
                ),
                distinct=True,
            ),
        )
        .annotate(
            uyum_skoru=Case(
                When(total_obligations=0, then=Value(100.0)),
                default=ExpressionWrapper(
                    Cast(F("completed_obligations"), FloatField()) * Value(100.0)
                    / Cast(F("total_obligations"), FloatField()),
                    output_field=FloatField(),
                ),
                output_field=FloatField(),
            )
        )
        .annotate(
            risky=Case(
                When(
                    Q(uyum_skoru__lt=RISKY_DEFAULT_THRESHOLD) | Q(high_risk_open_count__gt=0),
                    then=Value(True),
                ),
                default=Value(False),
                output_field=BooleanField(),
            )
        )
    )

    if with_prefetch:
        qs = qs.prefetch_related(
            Prefetch(
                "sirketobligation_set",
                queryset=SirketObligation.objects.select_related("duzenleme").order_by("-updated_at"),
                to_attr="_prefetched_obligations",
            )
        )

    return qs


def _annotated_duzenleme_queryset(with_prefetch=False):
    qs = (
        Duzenleme.objects.all()
        .annotate(
            affected_company_count=Count(
                "sirketobligation__sirket",
                filter=Q(sirketobligation__is_applicable=True),
                distinct=True,
            ),
            compliant_company_count=Count(
                "sirketobligation__sirket",
                filter=Q(
                    sirketobligation__is_applicable=True,
                    sirketobligation__is_compliant=True,
                ),
                distinct=True,
            ),
        )
        .order_by("-publish_date", "-id")
    )

    if with_prefetch:
        qs = qs.prefetch_related(
            Prefetch(
                "sirketobligation_set",
                queryset=SirketObligation.objects.select_related("sirket").order_by("-updated_at"),
            )
        )

    return qs


def build_dashboard_payload(sirket: Sirket):
    sonuc = hesapla_sirket_skoru(sirket)

    sirket_data = {
        "id": sirket.id,
        "name": sirket.name,
        "unvan": sirket.unvan,
        "vkn": sirket.vkn,
        "sector": sirket.sector,
        "employee_count": sirket.employee_count,
        "location_city": sirket.location_city,
        "is_exporter": sirket.is_exporter,
        "created_at": sirket.created_at,
        "compliance_score": sonuc["score"],
    }

    return {
        "sirket": sirket_data,
        "uyum_skoru": sonuc["score"],
        "stats": sonuc["stats"],
        "todo": sonuc["todo"],
        "completed": sonuc["completed"],
    }


@require_http_methods(["GET"])
def sirket_dashboard_api(request, pk):
    sirket = get_object_or_404(Sirket, pk=pk)
    payload = build_dashboard_payload(sirket)
    return JsonResponse(payload, json_dumps_params={"ensure_ascii": False})


@api_view(["PATCH"])
def obligation_status_api(request, pk):
    obligation = get_object_or_404(
        SirketObligation.objects.select_related("sirket", "duzenleme"),
        pk=pk,
    )

    serializer = SirketObligationPatchSerializer(
        obligation,
        data=request.data,
        partial=True,
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()

    return Response(build_dashboard_payload(obligation.sirket), status=status.HTTP_200_OK)


class SirketSpaListAPIView(generics.ListAPIView):
    serializer_class = SirketListSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = Sirket.objects.all()

        q = (self.request.query_params.get("q") or "").strip()
        sector = (self.request.query_params.get("sector") or "").strip()
        city = (self.request.query_params.get("city") or "").strip()
        is_exporter = self.request.query_params.get("is_exporter")
        ordering = self.request.query_params.get("ordering", "-created_at")

        if q:
            variants = tr_variants(q)
            q_filter = Q()

            for v in variants:
                q_filter |= (
                    Q(name__icontains=v)
                    | Q(unvan__icontains=v)
                    | Q(vkn__icontains=v)
                    | Q(sector__icontains=v)
                    | Q(location_city__icontains=v)
                )

            qs = qs.filter(q_filter)

        if sector and sector != "all":
            qs = qs.filter(sector__iexact=sector)

        if city:
            city_variants = tr_variants(city)
            city_filter = Q()
            for v in city_variants:
                city_filter |= Q(location_city__icontains=v)
            qs = qs.filter(city_filter)

        if is_exporter not in (None, ""):
            qs = qs.filter(is_exporter=_as_bool(is_exporter))

        allowed_ordering = {
            "id", "-id",
            "name", "-name",
            "sector", "-sector",
            "employee_count", "-employee_count",
            "location_city", "-location_city",
            "created_at", "-created_at",
            "uyum_skoru", "-uyum_skoru",
        }

        if ordering not in allowed_ordering:
            ordering = "-created_at"

        if ordering not in ("uyum_skoru", "-uyum_skoru"):
            qs = qs.order_by(ordering)

        self._ordering = ordering
        self._risky = _as_bool(self.request.query_params.get("risky"))
        self._threshold_raw = self.request.query_params.get("threshold")
        self._min_score_raw = self.request.query_params.get("min_score")
        self._max_score_raw = self.request.query_params.get("max_score")

        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        try:
            threshold = float(self._threshold_raw) if self._threshold_raw else 80.0
        except ValueError:
            threshold = 80.0

        try:
            min_score = float(self._min_score_raw) if self._min_score_raw else None
        except ValueError:
            min_score = None

        try:
            max_score = float(self._max_score_raw) if self._max_score_raw else None
        except ValueError:
            max_score = None

        enriched = []
        for sirket in queryset:
            sonuc = hesapla_sirket_skoru(sirket)

            row = SirketListSerializer(sirket).data
            row["uyum_skoru"] = sonuc.get("score", 0)
            row["compliance_score"] = sonuc.get("score", 0)
            row["stats"] = sonuc.get("stats", {})
            row["open_count"] = sonuc.get("open_count", 0)
            row["overdue_count"] = sonuc.get("overdue_count", 0)
            row["risky"] = (
                float(row["uyum_skoru"]) < threshold
                or int(row["overdue_count"]) > 0
            )

            if self._risky and not row["risky"]:
                continue

            if min_score is not None and float(row["uyum_skoru"]) < min_score:
                continue

            if max_score is not None and float(row["uyum_skoru"]) > max_score:
                continue

            enriched.append(row)

        if self._ordering == "uyum_skoru":
            enriched.sort(key=lambda x: float(x.get("uyum_skoru", 0)))
        elif self._ordering == "-uyum_skoru":
            enriched.sort(key=lambda x: float(x.get("uyum_skoru", 0)), reverse=True)

        page = self.paginate_queryset(enriched)
        if page is not None:
            return self.get_paginated_response(page)

        return Response(enriched)

class SirketSpaDetailAPIView(generics.RetrieveAPIView):
    serializer_class = SirketDetailSerializer
    lookup_field = "pk"
    lookup_url_kwarg = "pk"

    def get_queryset(self):
        return _annotated_sirket_queryset(with_prefetch=True)

    def retrieve(self, request, *args, **kwargs):
        sirket = self.get_object()

        sonuc = hesapla_sirket_skoru(
            sirket,
            obligations=getattr(sirket, "_prefetched_obligations", None),
        )

        data = self.get_serializer(sirket).data
        data["uyum_skoru"] = sonuc.get("score", 0)
        data["compliance_score"] = sonuc.get("score", 0)
        data["stats"] = sonuc.get("stats", {})
        data["todo"] = sonuc.get("todo", [])
        data["completed"] = sonuc.get("completed", [])
        data["open_count"] = sonuc.get("open_count", 0)
        data["overdue_count"] = sonuc.get("overdue_count", 0)

        return Response(data)


class SirketObligationPatchView(generics.UpdateAPIView):
    queryset = SirketObligation.objects.select_related("sirket", "duzenleme")
    serializer_class = SirketObligationPatchSerializer
    lookup_field = "pk"
    lookup_url_kwarg = "pk"

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            build_dashboard_payload(instance.sirket),
            status=status.HTTP_200_OK,
        )



class SirketDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = _annotated_sirket_queryset(with_prefetch=True)
    serializer_class = SirketDetailSerializer


class DuzenlemeListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        return _annotated_duzenleme_queryset()

    def get_serializer_class(self):
        if self.request.method == "GET":
            return DuzenlemeListSerializer
        return DuzenlemeSerializer


class DuzenlemeDetailView(generics.RetrieveUpdateDestroyAPIView):
    def get_queryset(self):
        return _annotated_duzenleme_queryset(with_prefetch=True)

    def get_serializer_class(self):
        if self.request.method == "GET":
            return DuzenlemeDetailSerializer
        return DuzenlemeSerializer


def sirket_dashboard_page(request, pk):
    sirket = get_object_or_404(Sirket, pk=pk)
    sonuc = hesapla_sirket_skoru(sirket)

    context = {
        "sirket": sirket,
        "compliance_score": sonuc["score"],
        "stats": sonuc["stats"],
        "todo": sonuc["todo"],
        "completed": sonuc["completed"],
    }
    return render(request, "sirket_dashboard.html", context)


def sirket_list_page(request):
    selected_sector = (request.GET.get("sector") or "").strip()

    sirket_qs = _annotated_sirket_queryset().order_by("name")
    if selected_sector and selected_sector != "all":
        sirket_qs = sirket_qs.filter(sector=selected_sector)

    sirketler = [
        {
            "sirket": s,
            "score": round(float(getattr(s, "uyum_skoru", 100.0)), 2),
        }
        for s in sirket_qs
    ]

    context = {
        "sirketler": sirketler,
        "selected_sector": selected_sector,
        "sector_choices": Sirket.SECTOR_CHOICES,
    }
    return render(request, "sirket_list.html", context)


def sirket_riskli_list_page(request):
    try:
        threshold = float(request.GET.get("max_score", str(RISKY_DEFAULT_THRESHOLD)))
    except ValueError:
        threshold = RISKY_DEFAULT_THRESHOLD

    sirket_qs = (
        _annotated_sirket_queryset()
        .filter(Q(uyum_skoru__lt=threshold) | Q(high_risk_open_count__gt=0))
        .order_by("name")
    )

    sirketler = [
        {
            "sirket": s,
            "score": round(float(getattr(s, "uyum_skoru", 100.0)), 2),
        }
        for s in sirket_qs
    ]

    context = {
        "sirketler": sirketler,
        "threshold": threshold,
    }
    return render(request, "sirket_riskli_list.html", context)


@require_POST
def obligation_complete(request, pk):
    obligation = get_object_or_404(SirketObligation, pk=pk)
    obligation.is_compliant = True
    obligation.save(update_fields=["is_compliant", "updated_at"])
    return redirect(f"/api/companies/{obligation.sirket_id}/dashboard-page/")


@require_POST
def obligation_reset(request, pk):
    obligation = get_object_or_404(SirketObligation, pk=pk)
    obligation.is_compliant = False
    obligation.save(update_fields=["is_compliant", "updated_at"])
    return redirect(f"/api/companies/{obligation.sirket_id}/dashboard-page/")


def companies_spa_list(request):
    sirketler = Sirket.objects.all().order_by("id")
    return render(request, "companies_spa_list.html", {"sirketler": sirketler})


def companies_spa_detail(request, pk):
    sirket = get_object_or_404(Sirket, pk=pk)
    return render(
        request,
        "companies_spa_detail.html",
        {
            "company_id": sirket.pk,
            "company_name": sirket.name,
        },
    )


@require_http_methods(["GET"])
def companies_spa_list_api(request):
    qs = _annotated_sirket_queryset().order_by("id")

    data = [
        {
            "id": s.id,
            "name": s.name,
            "unvan": s.unvan,
            "sector": s.sector,
            "location_city": s.location_city,
            "is_exporter": s.is_exporter,
            "uyum_skoru": round(float(getattr(s, "uyum_skoru", 100.0)), 2),
            "risky": bool(getattr(s, "risky", False)),
            "total_obligations": getattr(s, "total_obligations", 0),
            "completed_obligations": getattr(s, "completed_obligations", 0),
            "todo_obligations": getattr(s, "todo_obligations", 0),
            "high_risk_open_count": getattr(s, "high_risk_open_count", 0),
        }
        for s in qs
    ]

    return JsonResponse(data, safe=False, json_dumps_params={"ensure_ascii": False})