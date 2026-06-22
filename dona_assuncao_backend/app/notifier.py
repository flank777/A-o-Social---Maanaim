"""Notificação à equipe via Telegram.

Quando a Dona Assunção gera um [REGISTRO] (cesta básica, oração, voluntariado
ou urgência), a equipe recebe uma mensagem formatada no Telegram, na hora.

Reaproveita o mesmo bot (TELEGRAM_TOKEN). Defina TEAM_TELEGRAM_CHAT_ID com o
chat/grupo da equipe (veja o README para descobrir o ID).

A função é "à prova de falha": se a notificação der erro, ela apenas registra
um aviso no log e NÃO derruba a resposta ao usuário.
"""
import logging

import httpx

from .config import TELEGRAM_TOKEN, TEAM_TELEGRAM_CHAT_ID

logger = logging.getLogger("notifier")

_API = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

# Emoji por tipo de caso, para a equipe bater o olho e entender
_EMOJI_TIPO = {
    "cesta_basica": "🧺",
    "oracao": "🙏",
    "voluntariado": "🙌",
    "doacao": "❤️",
    "urgencia": "🚨",
    "outro": "📌",
}


def _formatar(registro: dict) -> str:
    urgencia = (registro.get("urgencia") or "normal").lower()
    tipo = (registro.get("tipo") or "outro").lower()
    emoji = _EMOJI_TIPO.get(tipo, "📌")

    # Destaque para emergência
    cabecalho = "🚨🚨 *EMERGÊNCIA* 🚨🚨" if urgencia == "emergencia" else f"{emoji} *Novo caso*"

    linhas = [
        cabecalho,
        f"*Tipo:* {tipo}",
        f"*Urgência:* {urgencia.upper()}",
        f"*Nome:* {registro.get('nome', '—')}",
        f"*Contato:* {registro.get('contato', '—')}",
        f"*Necessidade:* {registro.get('necessidade', '—')}",
        f"*Região:* {registro.get('regiao', '—')}",
    ]
    if urgencia == "emergencia":
        linhas.append("\n⚠️ _Atenção imediata. Caso pode envolver risco grave._")
    return "\n".join(linhas)


async def notificar_equipe(registro: dict) -> bool:
    """Envia o alerta. Retorna True se enviou, False se não pôde/erro."""
    if not TELEGRAM_TOKEN or not TEAM_TELEGRAM_CHAT_ID:
        logger.info("Notificação à equipe desativada (faltam TELEGRAM_TOKEN/TEAM_TELEGRAM_CHAT_ID).")
        return False

    texto = _formatar(registro)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{_API}/sendMessage",
                json={
                    "chat_id": TEAM_TELEGRAM_CHAT_ID,
                    "text": texto,
                    "parse_mode": "Markdown",
                },
            )
            r.raise_for_status()
        logger.info("Equipe notificada (tipo=%s, urgencia=%s).",
                    registro.get("tipo"), registro.get("urgencia"))
        return True
    except Exception as e:  # noqa: BLE001
        logger.warning("Falha ao notificar a equipe: %s", e)
        return False
