"""Integração com WhatsApp via Evolution API (open-source, self-host, grátis).

A Evolution API conecta ao WhatsApp por QR code e:
  - ENVIA o evento de cada mensagem recebida para o nosso /webhook/whatsapp
  - RECEBE nossos pedidos de envio em POST /message/sendText/{instance}

Docs: https://doc.evolution-api.com
"""
import logging

import httpx

from .config import EVOLUTION_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE

logger = logging.getLogger("whatsapp")


def _extrair_texto(message: dict) -> str | None:
    """Pega o texto de mensagens simples ou estendidas; ignora o resto."""
    if not isinstance(message, dict):
        return None
    if "conversation" in message:
        return message["conversation"]
    ext = message.get("extendedTextMessage")
    if isinstance(ext, dict) and "text" in ext:
        return ext["text"]
    return None


def parse_evento(payload: dict) -> dict | None:
    """Converte o webhook da Evolution em {user_id, nome, texto}.

    Devolve None quando a mensagem deve ser ignorada (própria, de grupo,
    sem texto, ou evento que não é de mensagem).
    """
    if payload.get("event") not in ("messages.upsert", "MESSAGES_UPSERT"):
        return None

    data = payload.get("data")
    # Algumas versões mandam uma lista em data
    if isinstance(data, list):
        data = data[0] if data else None
    if not isinstance(data, dict):
        return None

    key = data.get("key", {})
    # Ignora mensagens enviadas pelo próprio bot (evita loop)
    if key.get("fromMe"):
        return None

    remote_jid = key.get("remoteJid", "")
    # Ignora grupos (terminam em @g.us)
    if remote_jid.endswith("@g.us"):
        return None

    texto = _extrair_texto(data.get("message", {}))
    if not texto:
        return None

    numero = remote_jid.split("@")[0]  # ex.: 5591999999999
    nome = data.get("pushName", "")
    return {"user_id": numero, "nome": nome, "texto": texto}


async def enviar_whatsapp(numero: str, texto: str) -> bool:
    """Envia uma mensagem de texto pelo WhatsApp via Evolution API."""
    if not EVOLUTION_URL or not EVOLUTION_API_KEY or not EVOLUTION_INSTANCE:
        logger.warning("Envio WhatsApp desativado (faltam variáveis EVOLUTION_*).")
        return False

    url = f"{EVOLUTION_URL.rstrip('/')}/message/sendText/{EVOLUTION_INSTANCE}"
    headers = {"apikey": EVOLUTION_API_KEY, "Content-Type": "application/json"}
    body = {"number": numero, "text": texto}

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(url, headers=headers, json=body)
            r.raise_for_status()
        return True
    except Exception as e:  # noqa: BLE001
        logger.warning("Falha ao enviar WhatsApp para %s: %s", numero, e)
        return False
