"""Recuperação simples de conhecimento por sobreposição de palavras.

A base é pequena (horários, PIX, endereço, FAQ), então não precisamos de
busca vetorial/embeddings. Pontuamos cada documento pela quantidade de
palavras em comum com a mensagem do usuário e devolvemos os melhores.
"""
import re
import unicodedata

from .config import TOP_K_CONHECIMENTO

# Palavras muito comuns que não ajudam na busca
_STOPWORDS = {
    "a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "ou", "que",
    "para", "pra", "por", "com", "sem", "em", "no", "na", "nos", "nas", "um",
    "uma", "uns", "umas", "se", "ao", "aos", "como", "qual", "quais", "quem",
    "onde", "quando", "meu", "minha", "voce", "voces", "eu", "isso", "aqui",
    "tem", "ter", "ser", "estou", "esta", "sou", "me", "te", "lhe", "ja",
}


def _normalizar(texto: str) -> list[str]:
    texto = texto.lower()
    texto = unicodedata.normalize("NFKD", texto)
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    palavras = re.findall(r"[a-z0-9]+", texto)
    return [p for p in palavras if p not in _STOPWORDS and len(p) > 2]


def buscar_conhecimento(mensagem: str, base: list[dict]) -> str:
    """Devolve um texto com os trechos mais relevantes para injetar no prompt."""
    if not base:
        return "(nenhuma informação disponível na base no momento)"

    termos_msg = set(_normalizar(mensagem))
    pontuados = []

    for item in base:
        titulo = item.get("titulo", "")
        conteudo = item.get("conteudo", "")
        tags = " ".join(item.get("tags", []))
        termos_doc = set(_normalizar(f"{titulo} {conteudo} {tags}"))
        pontuacao = len(termos_msg & termos_doc)
        if pontuacao > 0:
            pontuados.append((pontuacao, titulo, conteudo))

    pontuados.sort(key=lambda x: x[0], reverse=True)
    selecionados = pontuados[:TOP_K_CONHECIMENTO]

    if not selecionados:
        # Sem correspondência: manda os títulos pra ela ao menos saber o que existe
        titulos = [item.get("titulo", "") for item in base[:TOP_K_CONHECIMENTO]]
        return "Temas disponíveis: " + "; ".join(t for t in titulos if t)

    return "\n\n".join(f"### {titulo}\n{conteudo}" for _, titulo, conteudo in selecionados)
