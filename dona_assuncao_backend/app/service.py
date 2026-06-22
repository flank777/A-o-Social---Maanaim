"""Lógica central da Dona Assunção, compartilhada por todos os canais.

Qualquer canal (web, Telegram, WhatsApp) chama processar_mensagem() e recebe
a resposta pronta. Assim não duplicamos a orquestração.
"""
import logging

from .firestore_client import (
    carregar_conversa,
    salvar_turno,
    salvar_registro,
    listar_base_conhecimento,
    listar_campanhas_ativas,
)
from .knowledge import buscar_conhecimento
from .prompt_builder import montar_system_prompt
from .gemini_client import gerar_resposta
from .registro import extrair_registro, detectar_urgencia
from .notifier import notificar_equipe

logger = logging.getLogger("dona_assuncao")


async def processar_mensagem(canal: str, user_id_raw: str, nome: str, texto: str) -> dict:
    """Processa uma mensagem e devolve {'resposta': str, 'urgente': bool}."""
    user_id = f"{canal}:{user_id_raw}"

    # 1-2. Histórico
    conversa = carregar_conversa(user_id)
    historico = conversa.get("mensagens", [])
    nome = nome or conversa.get("nome", "")
    resumo = conversa.get("resumo", "")

    # 3. Conhecimento relevante
    base = listar_base_conhecimento()
    trechos = buscar_conhecimento(texto, base)
    campanhas = listar_campanhas_ativas()

    # 4. System prompt
    system_prompt = montar_system_prompt(
        nome_usuario=nome,
        resumo_conversa=resumo,
        trechos_base=trechos,
        campanhas=campanhas,
        canal=canal,
    )

    # Detecção de crise (reforça o protocolo do prompt)
    urgente = detectar_urgencia(texto)

    # 5. Gemini
    historico_modelo = [{"role": m["role"], "text": m["text"]} for m in historico]
    resposta_bruta, gemini_disponivel = await gerar_resposta(system_prompt, historico_modelo, texto)

    # 6. Extrai [REGISTRO] e notifica a equipe
    resposta_limpa, registro = extrair_registro(resposta_bruta)
    if registro:
        if urgente:
            registro["urgencia"] = "emergencia"
        salvar_registro(user_id, registro)
        logger.info("Registro salvo (urgencia=%s)", registro.get("urgencia"))
        await notificar_equipe(registro)
    elif urgente:
        await notificar_equipe(
            {
                "tipo": "urgencia",
                "urgencia": "emergencia",
                "nome": nome or "(não informado)",
                "contato": user_id_raw,
                "necessidade": texto[:200],
                "regiao": "—",
            }
        )

    # 7. Salva o turno
    salvar_turno(user_id, nome, texto, resposta_limpa)

    return {"resposta": resposta_limpa, "urgente": urgente, "disponivel": gemini_disponivel}
