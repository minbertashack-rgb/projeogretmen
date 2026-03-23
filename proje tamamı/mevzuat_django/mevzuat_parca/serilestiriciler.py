from rest_framework import serializers
from .models import Sirket, Duzenleme, SirketObligation
from .services import hesapla_sirket_skoru


class DuzenlemeMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Duzenleme
        fields = [
            "id",
            "source",
            "title",
            "publish_date",
            "impact_type",
        ]


class SirketMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sirket
        fields = [
            "id",
            "name",
            "unvan",
            "sector",
            "location_city",
        ]


class SirketObligationSerializer(serializers.ModelSerializer):
    duzenleme = DuzenlemeMiniSerializer(read_only=True)

    class Meta:
        model = SirketObligation
        fields = [
            "id",
            "duzenleme",
            "is_applicable",
            "is_compliant",
            "due_date",
            "risk_level",
            "created_at",
            "updated_at",
        ]


class SirketObligationForRegulationSerializer(serializers.ModelSerializer):
    sirket = SirketMiniSerializer(read_only=True)

    class Meta:
        model = SirketObligation
        fields = [
            "id",
            "sirket",
            "is_applicable",
            "is_compliant",
            "due_date",
            "risk_level",
            "created_at",
            "updated_at",
        ]


class CompanyScoreMixin:
    """
    Sirket serializer'larında tekrar eden skor/sayaç alanlarını
    tek yerde toplamak için mixin.
    """

    def _get_score_data(self, obj):
        cache_attr = "_score_data_cache"

        if hasattr(obj, cache_attr):
            return getattr(obj, cache_attr)

        # View tarafında prefetch ile to_attr="_prefetched_obligations" verilirse onu kullanır
        obligations = getattr(obj, "_prefetched_obligations", None)

        data = hesapla_sirket_skoru(obj, obligations=obligations)
        setattr(obj, cache_attr, data)
        return data

    def get_total_obligations(self, obj):
        annotated = getattr(obj, "total_obligations", None)
        if annotated is not None:
            return annotated
        return self._get_score_data(obj)["stats"]["total_obligations"]

    def get_completed_obligations(self, obj):
        annotated = getattr(obj, "completed_obligations", None)
        if annotated is not None:
            return annotated
        return self._get_score_data(obj)["stats"]["completed_obligations"]

    def get_todo_obligations(self, obj):
        annotated = getattr(obj, "todo_obligations", None)
        if annotated is not None:
            return annotated
        return self._get_score_data(obj)["stats"]["open_obligations"]

    def get_uyum_skoru(self, obj):
        annotated = getattr(obj, "uyum_skoru", None)
        if annotated is not None:
            return annotated
        return self._get_score_data(obj)["score"]

    def get_risky(self, obj):
        # View annotate etmişse direkt onu kullan
        annotated = getattr(obj, "risky", None)
        if annotated is not None:
            return annotated

        score_data = self._get_score_data(obj)
        uyum_skoru = score_data["score"]
        high_risk_open_exists = any(
            item.get("risk_level") == "high"
            for item in score_data["todo"]
        )
        return (uyum_skoru < 50) or high_risk_open_exists


class SirketListSerializer(CompanyScoreMixin, serializers.ModelSerializer):
    total_obligations = serializers.SerializerMethodField()
    completed_obligations = serializers.SerializerMethodField()
    todo_obligations = serializers.SerializerMethodField()
    uyum_skoru = serializers.SerializerMethodField()
    risky = serializers.SerializerMethodField()

    class Meta:
        model = Sirket
        fields = [
            "id",
            "name",
            "unvan",
            "vkn",
            "sector",
            "employee_count",
            "location_city",
            "is_exporter",
            "created_at",
            "total_obligations",
            "completed_obligations",
            "todo_obligations",
            "uyum_skoru",
            "risky",
        ]


class SirketDetailSerializer(CompanyScoreMixin, serializers.ModelSerializer):
    obligations = SirketObligationSerializer(
        source="sirketobligation_set",
        many=True,
        read_only=True,
    )
    total_obligations = serializers.SerializerMethodField()
    completed_obligations = serializers.SerializerMethodField()
    todo_obligations = serializers.SerializerMethodField()
    uyum_skoru = serializers.SerializerMethodField()
    risky = serializers.SerializerMethodField()
    skor_ozeti = serializers.SerializerMethodField()

    class Meta:
        model = Sirket
        fields = [
            "id",
            "name",
            "unvan",
            "vkn",
            "sector",
            "employee_count",
            "location_city",
            "is_exporter",
            "created_at",
            "total_obligations",
            "completed_obligations",
            "todo_obligations",
            "uyum_skoru",
            "risky",
            "skor_ozeti",
            "obligations",
        ]

    def get_skor_ozeti(self, obj):
        return self._get_score_data(obj)


class RegulationCountMixin:
    """
    Duzenleme serializer'larında şirket sayaçlarını tek yerde toplar.
    """

    def get_affected_company_count(self, obj):
        annotated = getattr(obj, "affected_company_count", None)
        if annotated is not None:
            return annotated

        return (
            obj.sirketobligation_set
            .filter(is_applicable=True)
            .values("sirket_id")
            .distinct()
            .count()
        )

    def get_compliant_company_count(self, obj):
        annotated = getattr(obj, "compliant_company_count", None)
        if annotated is not None:
            return annotated

        return (
            obj.sirketobligation_set
            .filter(is_applicable=True, is_compliant=True)
            .values("sirket_id")
            .distinct()
            .count()
        )


class DuzenlemeListSerializer(RegulationCountMixin, serializers.ModelSerializer):
    affected_company_count = serializers.SerializerMethodField()
    compliant_company_count = serializers.SerializerMethodField()

    class Meta:
        model = Duzenleme
        fields = [
            "id",
            "source",
            "title",
            "publish_date",
            "url",
            "summary",
            "tags",
            "sectors",
            "impact_type",
            "created_at",
            "affected_company_count",
            "compliant_company_count",
        ]


class DuzenlemeDetailSerializer(RegulationCountMixin, serializers.ModelSerializer):
    obligations = SirketObligationForRegulationSerializer(
        source="sirketobligation_set",
        many=True,
        read_only=True,
    )
    affected_company_count = serializers.SerializerMethodField()
    compliant_company_count = serializers.SerializerMethodField()

    class Meta:
        model = Duzenleme
        fields = [
            "id",
            "source",
            "title",
            "publish_date",
            "url",
            "raw_text",
            "summary",
            "tags",
            "sectors",
            "impact_type",
            "created_at",
            "affected_company_count",
            "compliant_company_count",
            "obligations",
        ]


class DuzenlemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Duzenleme
        fields = "__all__"


class SirketObligationPatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = SirketObligation
        fields = [
            "is_applicable",
            "is_compliant",
            "due_date",
            "risk_level",
        ]