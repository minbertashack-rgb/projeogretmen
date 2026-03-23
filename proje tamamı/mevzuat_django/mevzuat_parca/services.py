from datetime import date
from .models import SirketObligation


def hesapla_sirket_skoru(sirket, obligations=None):
    """
    Şirketin uyum skorunu hesaplar.

    Mantık:
    - Varsayılan olarak şirketin tüm obligation kayıtlarını çeker
    - is_applicable=True olanları skor hesabına dahil eder
    - is_compliant=True olanları completed sayar
    - is_compliant=False olanları open/todo sayar
    - due_date geçmişse overdue sayar
    - impact_type + risk_level'e göre puan düşer
    """

    # Eğer dışarıdan obligations verilmediyse DB'den çek
    if obligations is None:
        obligations = (
            SirketObligation.objects
            .filter(sirket=sirket)
            .select_related("duzenleme")
        )

    # Liste / QuerySet fark etmesin
    obligations = list(obligations)

    # Uygulanabilir / uygulanamaz ayrımı
    applicable_obligations = [obl for obl in obligations if obl.is_applicable]
    not_applicable_count = len(obligations) - len(applicable_obligations)

    today = date.today()
    score = 100
    open_count = 0
    overdue_count = 0
    todo_items = []
    completed_items = []

    # Senin modeline göre impact_type choice'ları:
    # zorunlu, opsiyonel_tesvik, risk
    impact_penalties = {
        "zorunlu": 20,
        "opsiyonel_tesvik": 5,
        "risk": 10,
    }

    risk_level_penalties = {
        "low": 0,
        "medium": 5,
        "high": 10,
    }

    for obl in applicable_obligations:
        item = {
            "obligation_id": obl.id,
            "regulation_id": obl.duzenleme.id,
            "regulation_title": obl.duzenleme.title,
            "due_date": str(obl.due_date) if obl.due_date else None,
            "risk_level": obl.risk_level,
            "impact_type": obl.duzenleme.impact_type,
            "is_applicable": obl.is_applicable,
            "is_compliant": obl.is_compliant,
        }

        if obl.is_compliant:
            completed_items.append(item)
            continue

        # Açık yükümlülük
        open_count += 1

        # Gecikmiş mi?
        is_overdue = bool(obl.due_date and obl.due_date < today)
        if is_overdue:
            overdue_count += 1

        item["is_overdue"] = is_overdue
        todo_items.append(item)

        # Etki tipi + risk seviyesine göre ceza
        penalty = impact_penalties.get(obl.duzenleme.impact_type, 5)
        penalty += risk_level_penalties.get(obl.risk_level, 0)

        score -= penalty

    if score < 0:
        score = 0

    return {
        "score": score,
        "stats": {
            "total_obligations": len(obligations),
            "applicable_obligations": len(applicable_obligations),
            "not_applicable_obligations": not_applicable_count,
            "completed_obligations": len(completed_items),
            "open_obligations": open_count,
            "overdue_obligations": overdue_count,
        },
        "todo": todo_items,
        "completed": completed_items,
        "sirket": {
            "id": sirket.id,
            "name": sirket.name,
            "unvan": getattr(sirket, "unvan", ""),
            "sector": getattr(sirket, "sector", ""),
        },
    }