from ..models import SirketObligation


def calculate_compliance_stats(company):
    obligations = SirketObligation.objects.filter(
        sirket=company,
        is_applicable=True,
    ).select_related("duzenleme")

    total_count = obligations.count()
    compliant_count = obligations.filter(is_compliant=True).count()
    pending_count = total_count - compliant_count
    high_risk_open_count = obligations.filter(
        is_compliant=False,
        risk_level="high",
    ).count()

    if total_count == 0:
        uyum_skoru = 100
    else:
        uyum_skoru = round((compliant_count / total_count) * 100)

    risky = (uyum_skoru < 50) or (high_risk_open_count > 0)

    return {
        "total_obligations": total_count,
        "completed_obligations": compliant_count,
        "pending_obligations": pending_count,
        "high_risk_open_count": high_risk_open_count,
        "uyum_skoru": uyum_skoru,
        "risky": risky,
    }