"""Popula o Firestore com a base de conhecimento inicial e campanhas.

Edite os textos com os dados REAIS da instituição e rode uma vez:

    python -m app.seed

A Dona Assunção só fala o que estiver aqui. Se um dado não existe, ela
encaminha para a equipe (em vez de inventar).
"""
from .firestore_client import get_db

BASE = [
    {
        "titulo": "Horário de atendimento",
        "tags": ["horario", "funcionamento", "atendimento", "aberto"],
        "conteudo": "Atendemos de segunda a sexta, das 8h às 17h. "
                    "[EDITAR com o horário real]",
    },
    {
        "titulo": "Endereço",
        "tags": ["endereco", "local", "onde", "localizacao"],
        "conteudo": "Estamos na [RUA, Nº, BAIRRO, CIDADE]. "
                    "[EDITAR com o endereço real]",
    },
    {
        "titulo": "Contatos",
        "tags": ["contato", "telefone", "whatsapp", "email", "falar"],
        "conteudo": "Telefone/WhatsApp: [EDITAR]. E-mail: [EDITAR].",
    },
    {
        "titulo": "Cesta básica",
        "tags": ["cesta", "basica", "alimento", "ajuda", "comida"],
        "conteudo": "Para solicitar cesta básica é preciso [documentos: EDITAR]. "
                    "A avaliação é feita pela assistente social. "
                    "Critérios e frequência: [EDITAR].",
    },
    {
        "titulo": "Doação de alimentos e roupas",
        "tags": ["doar", "doacao", "alimento", "roupa", "leite", "cesta"],
        "conteudo": "Recebemos alimentos não perecíveis, cestas prontas, leite e "
                    "roupas em bom estado. [EDITAR conforme a realidade].",
    },
    {
        "titulo": "Contribuição financeira (PIX)",
        "tags": ["pix", "dinheiro", "financeiro", "contribuir", "transferencia", "mensal"],
        "conteudo": "Você pode contribuir por PIX: chave [EDITAR — só preencha "
                    "com a chave oficial]. Também aceitamos doação mensal/recorrente.",
    },
    {
        "titulo": "Voluntariado",
        "tags": ["voluntario", "voluntariado", "ajudar", "servir", "doar tempo"],
        "conteudo": "Quer ser voluntário? Que bênção! As áreas e horários são "
                    "[EDITAR]. Deixe seu contato que a equipe te chama.",
    },
    {
        "titulo": "Comunidade Evangélica Maanaim",
        "tags": ["igreja", "maanaim", "culto", "visitar", "participar"],
        "conteudo": "A Comunidade Evangélica Maanaim realiza cultos [dias/horários: "
                    "EDITAR]. Todos são bem-vindos para visitar e participar.",
    },
    {
        "titulo": "Projetos sociais e crianças",
        "tags": ["projeto", "social", "crianca", "criancas", "familia"],
        "conteudo": "A Ação Social Semear desenvolve projetos para famílias em "
                    "vulnerabilidade e crianças carentes. [EDITAR com os projetos].",
    },
]

CAMPANHAS = [
    {
        "titulo": "Campanha do Agasalho",
        "descricao": "Arrecadação de roupas e cobertores para o inverno.",
        "ativa": False,  # mude para True quando estiver acontecendo
    },
]


def run():
    db = get_db()
    for item in BASE:
        db.collection("base_conhecimento").add(item)
    for c in CAMPANHAS:
        db.collection("campanhas").add(c)
    print(f"OK: {len(BASE)} itens de conhecimento e {len(CAMPANHAS)} campanhas inseridos.")


if __name__ == "__main__":
    run()
