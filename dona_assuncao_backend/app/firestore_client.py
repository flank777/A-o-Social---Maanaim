"""Cliente do Firestore (Firebase Admin SDK) e operações de dados.

O Admin SDK roda no servidor e tem acesso total — por isso as security rules
(firestore.rules) bloqueiam o acesso direto de clientes. Tudo passa por aqui.
"""
import json
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, firestore

from .config import FIREBASE_CREDENTIALS, MAX_HISTORICO

_db = None


def get_db():
    """Inicializa o Firebase uma única vez e devolve o client do Firestore."""
    global _db
    if _db is None:
        if not firebase_admin._apps:
            raw = FIREBASE_CREDENTIALS.strip()
            # Em plataformas sem upload de arquivo (Render, Fly.io, Railway...), a
            # variável FIREBASE_CREDENTIALS pode conter o JSON inteiro em vez de um caminho.
            cred_source = json.loads(raw) if raw.startswith("{") else raw
            cred = credentials.Certificate(cred_source)
            firebase_admin.initialize_app(cred)
        _db = firestore.client()
    return _db


def _agora():
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# CONVERSAS
# ---------------------------------------------------------------------------
def carregar_conversa(user_id: str) -> dict:
    """Devolve {mensagens: [...], resumo: str, nome: str} para o usuário."""
    doc = get_db().collection("conversas").document(user_id).get()
    if doc.exists:
        return doc.to_dict()
    return {"mensagens": [], "resumo": "", "nome": ""}


def salvar_turno(user_id: str, nome: str, msg_usuario: str, msg_assistente: str):
    """Acrescenta o par (usuário, assistente) ao histórico da conversa."""
    ref = get_db().collection("conversas").document(user_id)
    dados = carregar_conversa(user_id)

    mensagens = dados.get("mensagens", [])
    mensagens.append({"role": "user", "text": msg_usuario, "ts": _agora().isoformat()})
    mensagens.append({"role": "model", "text": msg_assistente, "ts": _agora().isoformat()})

    # Mantém só as mais recentes para não crescer sem limite
    mensagens = mensagens[-(MAX_HISTORICO * 2):]

    ref.set(
        {
            "nome": nome or dados.get("nome", ""),
            "mensagens": mensagens,
            "atualizado_em": _agora().isoformat(),
        },
        merge=True,
    )


# ---------------------------------------------------------------------------
# BASE DE CONHECIMENTO
# ---------------------------------------------------------------------------
def listar_base_conhecimento() -> list[dict]:
    """Devolve todos os documentos da base (são poucos, cabe na memória)."""
    docs = get_db().collection("base_conhecimento").stream()
    return [d.to_dict() for d in docs]


def listar_campanhas_ativas() -> list[dict]:
    docs = (
        get_db()
        .collection("campanhas")
        .where(filter=firestore.FieldFilter("ativa", "==", True))
        .stream()
    )
    return [d.to_dict() for d in docs]


# ---------------------------------------------------------------------------
# REGISTROS (repasse para a equipe humana)
# ---------------------------------------------------------------------------
def salvar_registro(user_id: str, registro: dict):
    """Salva um [REGISTRO] gerado pela Dona Assunção para a equipe dar sequência."""
    registro = dict(registro)
    registro["user_id"] = user_id
    registro["status"] = "novo"
    registro["criado_em"] = _agora().isoformat()
    get_db().collection("registros").add(registro)
