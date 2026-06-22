"""Configurações carregadas a partir do .env"""
import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
FIREBASE_CREDENTIALS = os.getenv("FIREBASE_CREDENTIALS", "./serviceAccountKey.json")
TELEFONE_PRINCIPAL = os.getenv("TELEFONE_PRINCIPAL", "(91) 90000-0000")
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN", "")
# Chat (ou grupo) do Telegram onde a EQUIPE recebe os alertas de novos casos
TEAM_TELEGRAM_CHAT_ID = os.getenv("TEAM_TELEGRAM_CHAT_ID", "")

# ===== WhatsApp via Evolution API =====
EVOLUTION_URL = os.getenv("EVOLUTION_URL", "")          # ex.: http://localhost:8080
EVOLUTION_API_KEY = os.getenv("EVOLUTION_API_KEY", "")  # apikey global ou da instância
EVOLUTION_INSTANCE = os.getenv("EVOLUTION_INSTANCE", "")  # nome da instância criada

# Quantas mensagens recentes enviar ao modelo como histórico
MAX_HISTORICO = 20
# Quantos trechos da base de conhecimento injetar por mensagem
TOP_K_CONHECIMENTO = 4

# ===== CORS (o widget do site público chama esta API direto do navegador) =====
# Lista separada por vírgula das origens autorizadas (ex.: https://meusite.com).
# "*" libera qualquer origem — aceitável aqui pois o /webhook não usa cookies
# nem credenciais, mas prefira restringir ao domínio real do site em produção.
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]

# ===== Limite simples de abuso (proteção de custo do Gemini) =====
# Janela deslizante por IP: no máximo RATE_LIMIT_MAX mensagens por RATE_LIMIT_WINDOW segundos.
RATE_LIMIT_MAX = int(os.getenv("RATE_LIMIT_MAX", "12"))
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))
