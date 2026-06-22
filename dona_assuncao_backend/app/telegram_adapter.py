"""Adaptador de Telegram (long polling) — jeito mais rápido e gratuito de testar.

Crie um bot com o @BotFather, copie o token para TELEGRAM_TOKEN no .env,
deixe a API rodando (uvicorn) e rode este script em outro terminal:

    python -m app.telegram_adapter

Cada mensagem recebida é enviada ao /webhook e a resposta volta pro usuário.
"""
import asyncio
import logging

import httpx

from .config import TELEGRAM_TOKEN

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("telegram")

API = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"
WEBHOOK_LOCAL = "http://127.0.0.1:8000/webhook"


async def processar(client: httpx.AsyncClient, update: dict):
    msg = update.get("message")
    if not msg or "text" not in msg:
        return
    chat_id = msg["chat"]["id"]
    nome = msg["chat"].get("first_name", "")
    texto = msg["text"]

    payload = {
        "canal": "telegram",
        "user_id": str(chat_id),
        "nome": nome,
        "texto": texto,
    }
    r = await client.post(WEBHOOK_LOCAL, json=payload, timeout=40)
    resposta = r.json().get("resposta", "...")

    await client.post(
        f"{API}/sendMessage",
        json={"chat_id": chat_id, "text": resposta},
        timeout=20,
    )


async def main():
    if not TELEGRAM_TOKEN:
        raise SystemExit("Defina TELEGRAM_TOKEN no .env primeiro.")
    offset = 0
    logger.info("Bot do Telegram rodando. Mande uma mensagem para ele.")
    async with httpx.AsyncClient() as client:
        while True:
            try:
                r = await client.get(
                    f"{API}/getUpdates",
                    params={"offset": offset, "timeout": 30},
                    timeout=40,
                )
                for update in r.json().get("result", []):
                    offset = update["update_id"] + 1
                    await processar(client, update)
            except Exception as e:  # noqa: BLE001
                logger.warning("Erro no loop: %s", e)
                await asyncio.sleep(3)


if __name__ == "__main__":
    asyncio.run(main())
