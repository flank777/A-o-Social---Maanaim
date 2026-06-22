# Dona Assunção — Backend (FastAPI + Firebase + Gemini)

Assistente virtual cristã e acolhedora da **Ação Social Semear** e **Comunidade Evangélica Maanaim**.
Stack 100% gratuita: **FastAPI** (backend) · **Firebase Firestore** (banco) · **Gemini** (IA) · **Telegram/WhatsApp** (canal).

---

## 📁 Estrutura

```
dona_assuncao_backend/
├── app/
│   ├── main.py              # API FastAPI (endpoints: web e WhatsApp)
│   ├── service.py           # lógica central compartilhada por todos os canais
│   ├── config.py            # variáveis de ambiente
│   ├── firestore_client.py  # conexão e operações no Firestore
│   ├── gemini_client.py     # chamada à API do Gemini
│   ├── prompt_builder.py    # injeta variáveis dinâmicas no prompt
│   ├── knowledge.py         # busca na base de conhecimento (sem custo)
│   ├── registro.py          # extrai [REGISTRO] e detecta crise
│   ├── notifier.py          # alerta a equipe pelo Telegram
│   ├── whatsapp.py          # cliente da Evolution API (WhatsApp)
│   ├── telegram_adapter.py  # bot de Telegram para testar de graça
│   ├── seed.py              # popula a base de conhecimento inicial
│   └── system_prompt.md     # a personalidade da Dona Assunção
├── docker-compose.yml       # sobe a Evolution API (WhatsApp) localmente
├── firestore.rules          # regras de segurança do Firestore
├── requirements.txt
└── .env.example
```

---

## 🚀 Passo a passo

### 1. Criar o projeto no Firebase (grátis — plano Spark)
1. Acesse https://console.firebase.google.com e crie um projeto.
2. Menu **Build > Firestore Database > Criar banco de dados** (modo produção).
3. **Configurações do projeto (⚙️) > Contas de serviço > Gerar nova chave privada**.
   Baixe o JSON e salve como `serviceAccountKey.json` na raiz do projeto.
4. Em **Firestore > Regras**, cole o conteúdo de `firestore.rules` e publique.

> ⚠️ Fique no plano **Spark (grátis)**. Você terá 20.000 escritas e 50.000 leituras
> por dia — de sobra. **Não** habilite Cloud Storage nem Cloud Functions (eles exigem
> o plano Blaze/cartão). Este projeto não precisa deles.

### 2. Pegar a chave do Gemini (grátis)
1. Acesse https://aistudio.google.com/apikey e crie uma API key.
2. Guarde a chave para o passo 4.

### 3. Instalar dependências
```bash
cd dona_assuncao_backend
python -m venv venv
# Windows (PowerShell):  .\venv\Scripts\Activate.ps1
# Linux/Mac:             source venv/bin/activate
pip install -r requirements.txt
```

### 4. Configurar o `.env`
```bash
cp .env.example .env   # no Windows: copy .env.example .env
```
Edite o `.env` e preencha `GEMINI_API_KEY`, `FIREBASE_CREDENTIALS` (caminho do JSON),
`TELEFONE_PRINCIPAL` e, se for testar no Telegram, `TELEGRAM_TOKEN`.

### 5. Preencher os dados reais
Abra `app/seed.py` e troque os `[EDITAR]` pelos dados verdadeiros (horário, endereço,
PIX, etc.). Depois rode uma vez:
```bash
python -m app.seed
```
Faça o mesmo nas seções `[COMPLETAR]` de `app/system_prompt.md`.

### 6. Rodar a API
```bash
uvicorn app.main:app --reload
```
Teste em http://127.0.0.1:8000/docs (Swagger). Use o `POST /webhook` com:
```json
{ "canal": "web", "user_id": "123", "nome": "Maria", "texto": "Oi, preciso de cesta básica" }
```

### 7. Testar no Telegram (grátis, opcional)
1. No Telegram, fale com o **@BotFather**, crie um bot e copie o token para `TELEGRAM_TOKEN`.
2. Com a API rodando (passo 6), abra outro terminal e rode:
```bash
python -m app.telegram_adapter
```
3. Mande mensagem pro seu bot. Pronto — a Dona Assunção responde. 🙏

---

## 📊 Coleções no Firestore
| Coleção | O que guarda |
|---|---|
| `conversas` | histórico por usuário (`canal:user_id`) |
| `base_conhecimento` | horários, endereço, PIX, FAQ (a Dona Assunção só fala o que está aqui) |
| `campanhas` | campanhas/eventos (campo `ativa: true/false`) |
| `registros` | casos para a equipe humana dar sequência (cesta, oração, urgência) |

---

## 🔔 Notificar a equipe pelo Telegram (já incluído ✅)
Quando alguém pede cesta básica, oração ou está em **urgência**, a equipe recebe
um alerta formatado no Telegram, na hora. Para ativar:

1. Você já tem o bot do passo 7 (token em `TELEGRAM_TOKEN`).
2. Crie um **grupo** no Telegram com a equipe e **adicione o seu bot** nele
   (ou, para receber sozinho, apenas inicie uma conversa com o bot).
3. Descubra o **chat ID** do grupo:
   - Mande qualquer mensagem no grupo.
   - Acesse no navegador (troque `SEU_TOKEN`):
     `https://api.telegram.org/botSEU_TOKEN/getUpdates`
   - Procure por `"chat":{"id":-100xxxxxxxxxx ...}`. Esse número (com o sinal de
     menos, no caso de grupo) é o ID.
4. Cole esse número em `TEAM_TELEGRAM_CHAT_ID` no `.env` e reinicie a API.

Pronto. Casos normais chegam como "🧺 Novo caso"; emergências (fome, risco,
violência) chegam destacadas como "🚨 EMERGÊNCIA". Se a notificação falhar, o
usuário **não** é afetado — o caso continua salvo no Firestore (`registros`).

> Quiser e-mail em vez de (ou além de) Telegram? Dá pra usar a API gratuita do
> Brevo no mesmo ponto do código (`app/notifier.py`).

---

## 📱 WhatsApp via Evolution API (já incluído ✅)
A Evolution API é open-source e self-host — conecta ao WhatsApp por QR code,
**sem custo da API oficial da Meta**.

### 1. Subir a Evolution API
Com Docker instalado, na pasta do projeto:
```bash
# edite docker-compose.yml e troque MUDE_ESTA_CHAVE por uma senha forte
docker compose up -d
```
Acesse o painel em `http://localhost:8080/manager`.

### 2. Criar a instância e conectar o WhatsApp
1. No Manager, crie uma instância chamada `dona_assuncao` (mesmo nome do `.env`).
2. Clique para gerar o **QR code** e leia com o WhatsApp do número da instituição
   (WhatsApp > Aparelhos conectados > Conectar aparelho).
3. Quando aparecer "conectado", o número já está ativo.

### 3. Apontar o webhook para a sua API
Configure a instância para enviar eventos ao seu backend. Pelo Manager
(aba Webhook) ou via requisição, defina:
- **URL:** `https://SEU_BACKEND/webhook/whatsapp`
- **Eventos:** marque `MESSAGES_UPSERT`

> Em desenvolvimento, exponha sua API local com **ngrok** (`ngrok http 8000`)
> e use a URL `https://....ngrok.io/webhook/whatsapp`.

### 4. Preencher o `.env`
```
EVOLUTION_URL=http://localhost:8080
EVOLUTION_API_KEY=a_mesma_senha_do_compose
EVOLUTION_INSTANCE=dona_assuncao
```
Reinicie a API (`uvicorn app.main:app --reload`). Pronto: mande uma mensagem
no WhatsApp da instituição e a Dona Assunção responde. 🙏

> O backend responde **em background**: ele confirma 200 na hora para a Evolution
> e envia a resposta logo depois, evitando timeout enquanto o Gemini pensa.
> Mensagens de grupo e mensagens do próprio bot são ignoradas (sem loop).

---

## 🔌 Conectar ao chat do site (DoaVida)

O site público (`js/dona-assuncao.js`) já sabe chamar este backend — falta só apontar
para onde ele está rodando:

1. Suba a API em algum lugar acessível pela internet (passo "Subir de graça" abaixo,
   ou `uvicorn app.main:app --host 0.0.0.0 --port 8000` numa VM/Render/Fly.io).
2. No painel **Super Admin > Dona Assunção > Configurações**, preencha o campo
   **"URL base do backend"** com a URL pública da API (ex.: `https://sua-api.exemplo.com`,
   sem `/webhook` no final) e clique em **Testar conexão** antes de salvar.
3. A partir daí, toda mensagem do chat público vai para `POST {url}/webhook` (Gemini real,
   com memória de conversa e detecção de crise). Se o campo ficar vazio ou o backend
   não responder a tempo, o widget volta automaticamente a responder pelo matching local
   de `agent_knowledge` — nunca trava nem mostra erro para o visitante.
4. Configure `CORS_ORIGINS` no `.env` com o domínio real do site (ex.:
   `CORS_ORIGINS=https://acaosocialsemear.org`) em vez de `*`, para que só o seu site
   consiga chamar a API pelo navegador.

> O endpoint `/webhook` tem um limite simples de mensagens por IP (`RATE_LIMIT_MAX` /
> `RATE_LIMIT_WINDOW` no `.env`) para evitar flood consumindo a cota do Gemini.

---

## ☁️ Subir de graça (produção)
- **Oracle Cloud Always Free**: VM ARM gratuita pra sempre — ideal pra rodar a API
  e (no futuro) a Evolution API do WhatsApp 24h. Não trava em horas como outros.
- Alternativas: **Render** (free) ou **Fly.io**.
- Para WhatsApp sem custo de API oficial: **Evolution API** (open-source, self-host).

---

## 🛡️ Segurança já incluída
- `firestore.rules` bloqueia acesso direto de clientes (tudo passa pelo backend).
- O prompt tem protocolo de crise (CVV 188, 190/192, 180, Conselho Tutelar),
  defesa contra prompt injection e proteção de dados sensíveis/LGPD.
- O `serviceAccountKey.json` e o `.env` **nunca** devem ir para o GitHub
  (adicione ambos ao `.gitignore`).
