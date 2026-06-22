"""Extração do bloco [REGISTRO] e detecção de palavras de risco.

A Dona Assunção, ao concluir um caso, gera um bloco entre [REGISTRO] e
[/REGISTRO]. Aqui nós o extraímos (para salvar no Firestore) e o removemos
do texto que vai para o usuário.
"""
import re
import unicodedata

_REGISTRO_RE = re.compile(r"\[REGISTRO\](.*?)\[/REGISTRO\]", re.DOTALL | re.IGNORECASE)

# Palavras que indicam possível crise grave -> marcar como emergência e alertar
_PALAVRAS_RISCO = {
    "suicidio", "me matar", "tirar minha vida", "nao aguento mais", "acabar com tudo",
    "me machucar", "automutilacao", "violencia", "apanhar", "me bateu", "espancou",
    "abuso", "estupro", "fome", "passando fome", "sem comer", "morrer",
}


def _sem_acento(texto: str) -> str:
    texto = texto.lower()
    texto = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in texto if not unicodedata.combining(c))


def extrair_registro(resposta: str) -> tuple[str, dict | None]:
    """Devolve (texto_limpo_para_usuario, registro_dict_ou_None)."""
    match = _REGISTRO_RE.search(resposta)
    if not match:
        return resposta.strip(), None

    bloco = match.group(1).strip()
    registro = {}
    for linha in bloco.splitlines():
        if ":" in linha:
            chave, _, valor = linha.partition(":")
            registro[chave.strip().lower()] = valor.strip()

    texto_limpo = _REGISTRO_RE.sub("", resposta).strip()
    return texto_limpo, (registro or None)


def detectar_urgencia(mensagem: str) -> bool:
    """True se a mensagem do usuário contém indícios de crise grave."""
    texto = _sem_acento(mensagem)
    return any(p in texto for p in _PALAVRAS_RISCO)
