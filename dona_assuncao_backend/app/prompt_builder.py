"""Monta o system prompt final injetando as variáveis dinâmicas {{...}}."""
import os
from datetime import datetime
from zoneinfo import ZoneInfo

from .config import TELEFONE_PRINCIPAL

_PROMPT_PATH = os.path.join(os.path.dirname(__file__), "system_prompt.md")
_FUSO = ZoneInfo("America/Belem")

with open(_PROMPT_PATH, encoding="utf-8") as f:
    _TEMPLATE = f.read()


def _data_hora_formatada() -> str:
    agora = datetime.now(_FUSO)
    dias = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira",
            "sexta-feira", "sábado", "domingo"]
    return f"{dias[agora.weekday()]}, {agora.strftime('%d/%m/%Y %H:%M')} (horário de Belém)"


def montar_system_prompt(
    nome_usuario: str,
    resumo_conversa: str,
    trechos_base: str,
    campanhas: list[dict],
    canal: str,
) -> str:
    if campanhas:
        campanhas_txt = "; ".join(
            f"{c.get('titulo', '')} — {c.get('descricao', '')}" for c in campanhas
        )
    else:
        campanhas_txt = "Nenhuma campanha cadastrada como ativa no momento."

    substituicoes = {
        "{{data_hora_atual}}": _data_hora_formatada(),
        "{{nome_usuario}}": nome_usuario or "(ainda não informado)",
        "{{resumo_conversa}}": resumo_conversa or "(início de uma nova conversa)",
        "{{trechos_base_conhecimento}}": trechos_base,
        "{{campanhas_ativas}}": campanhas_txt,
        "{{canal}}": canal,
        "{{telefone_principal}}": TELEFONE_PRINCIPAL,
    }

    prompt = _TEMPLATE
    for chave, valor in substituicoes.items():
        prompt = prompt.replace(chave, valor)
    return prompt
