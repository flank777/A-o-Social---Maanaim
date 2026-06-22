"""API da Dona Assunção.

Endpoints:
  GET  /health            -> verificação simples
  POST /webhook           -> canal genérico (web / testes)
  POST /webhook/whatsapp  -> recebe eventos da Evolution API (WhatsApp)

A lógica central vive em app/service.py e é compartilhada por todos os canais.
"""
import logging
import time
from collections import defaultdict

from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .config import CORS_ORIGINS, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW
from .service import processar_mensagem
from .whatsapp import parse_evento, enviar_whatsapp

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dona_assuncao")

app = FastAPI(title="Dona Assunção API", version="2.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class MensagemEntrada(BaseModel):
    canal: str = "web"
    user_id: str = Field(..., min_length=1, max_length=200)
    nome: str | None = Field(None, max_length=120)
    texto: str = Field(..., min_length=1, max_length=1000)


class RespostaSaida(BaseModel):
    resposta: str
    urgente: bool = False


@app.get("/health")
def health():
    return {"status": "ok", "assistente": "Dona Assunção"}


# Janela deslizante em memória, por IP — suficiente para uma única instância.
# Se a API rodar com múltiplos workers/réplicas, cada processo tem sua própria
# contagem (o limite real vira N vezes maior), mas ainda barra abuso grosseiro.
_rate_buckets: dict[str, list[float]] = defaultdict(list)


def _rate_limited(chave: str) -> bool:
    agora = time.monotonic()
    inicio_janela = agora - RATE_LIMIT_WINDOW
    bucket = _rate_buckets[chave]
    while bucket and bucket[0] < inicio_janela:
        bucket.pop(0)
    if len(bucket) >= RATE_LIMIT_MAX:
        return True
    bucket.append(agora)
    return False


@app.post("/webhook", response_model=RespostaSaida)
async def webhook(entrada: MensagemEntrada, request: Request):
    """Canal genérico: responde de forma síncrona (útil para web e testes)."""
    client_ip = request.client.host if request.client else "desconhecido"
    if _rate_limited(client_ip):
        raise HTTPException(status_code=429, detail="Muitas mensagens em pouco tempo. Aguarde um instante.")

    resultado = await processar_mensagem(
        canal=entrada.canal,
        user_id_raw=entrada.user_id,
        nome=entrada.nome or "",
        texto=entrada.texto,
    )
    corpo = {"resposta": resultado["resposta"], "urgente": resultado["urgente"]}
    if not resultado.get("disponivel", True):
        # Gemini falhou: devolve 503 para o canal web trocar pelo fallback local
        # (o corpo continua tendo "resposta" útil para canais sem alternativa,
        # como o telegram_adapter, que só lê esse campo sem checar o status).
        return JSONResponse(status_code=503, content=corpo)
    return RespostaSaida(**corpo)


async def _responder_whatsapp(numero: str, nome: str, texto: str):
    """Processa a mensagem e devolve a resposta pelo WhatsApp (roda em background)."""
    resultado = await processar_mensagem(
        canal="whatsapp", user_id_raw=numero, nome=nome, texto=texto
    )
    await enviar_whatsapp(numero, resultado["resposta"])


@app.post("/webhook/whatsapp")
async def webhook_whatsapp(request: Request, background: BackgroundTasks):
    """Recebe eventos da Evolution API.

    Responde 200 imediatamente e processa em background, para a Evolution não
    sofrer timeout enquanto o Gemini gera a resposta.
    """
    payload = await request.json()
    evento = parse_evento(payload)
    if evento:
        background.add_task(
            _responder_whatsapp, evento["user_id"], evento["nome"], evento["texto"]
        )
    # Sempre 200, mesmo para eventos ignorados (status, grupos, etc.)
    return {"status": "ok"}
