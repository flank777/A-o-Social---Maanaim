"""Cliente da API do Gemini via REST (httpx).

Usar REST evita problemas de versão de SDK e deixa claro o que é enviado.
Endpoint: generativelanguage.googleapis.com
"""
import logging

import httpx

from .config import GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger("dona_assuncao")

_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
_RESPOSTA_INDISPONIVEL = (
    "Desculpe, meu querido, tive uma dificuldade técnica agora. "
    "Pode tentar me escrever de novo? Se preferir, fale com nossa equipe. 🙏"
)


async def gerar_resposta(system_prompt: str, historico: list[dict], mensagem: str) -> tuple[str, bool]:
    """Envia o prompt + histórico + nova mensagem e devolve (texto, disponivel).

    historico: lista de {"role": "user"|"model", "text": "..."}
    disponivel=False indica que o Gemini falhou e o texto é só a mensagem de
    desculpas — quem chama decide se mostra isso (canais sem alternativa, como
    WhatsApp/Telegram) ou troca por uma resposta local (canal web).
    """
    contents = []
    for m in historico:
        contents.append({"role": m["role"], "parts": [{"text": m["text"]}]})
    contents.append({"role": "user", "parts": [{"text": mensagem}]})

    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1024,
            "topP": 0.95,
            # Modelos "thinking" (gemini-3.x/2.5) gastam parte do orçamento de
            # tokens em raciocínio interno antes da resposta final. Para um
            # chat de atendimento isso só atrasa e, se o raciocínio consumir
            # todo o maxOutputTokens, vaza texto de pensamento cru pro usuário.
            # Desligamos para sempre devolver direto a resposta final.
            "thinkingConfig": {"thinkingBudget": 0},
        },
        # Mantém segurança padrão; ajuste se necessário no console.
    }

    url = f"{_BASE_URL}/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
    except (httpx.HTTPStatusError, httpx.RequestError) as e:
        # Gemini fora do ar, sobrecarregado (503) ou cota excedida (429).
        logger.warning("Gemini indisponível: %s", e)
        return _RESPOSTA_INDISPONIVEL, False

    try:
        partes = data["candidates"][0]["content"]["parts"]
        # Filtra qualquer parte marcada como raciocínio interno (defesa extra
        # caso o thinkingBudget=0 não seja respeitado por algum modelo/versão).
        texto = "".join(p.get("text", "") for p in partes if not p.get("thought")).strip()
        return (texto, True) if texto else (_RESPOSTA_INDISPONIVEL, False)
    except (KeyError, IndexError):
        # Resposta bloqueada por filtro ou formato inesperado
        return _RESPOSTA_INDISPONIVEL, False
