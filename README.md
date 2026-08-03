# Humor App!

Web app trilíngue de piadas com navegação por voz, alimentado pelo Amazon Nova 2 Sonic via Amazon Bedrock.

## Stack

| Camada | Tecnologia | Deploy |
|--------|------------|--------|
| Frontend | Next.js 15 + TypeScript + Tailwind CSS v4 | Vercel |
| Backend | Node.js 20 + TypeScript + WebSocket + Express | AWS App Runner |
| Voz | Amazon Nova 2 Sonic (speech-to-speech) | Amazon Bedrock |
| Texto | Amazon Nova Lite (geração de piadas) | Amazon Bedrock |
| Infra | CloudFormation (ECR + IAM + App Runner) | AWS |

## Idiomas e Vozes

| Idioma | Locale | Voice ID | Assistente |
|--------|--------|----------|------------|
| Português BR | pt-BR | carolina | Carolina |
| English US | en-US | tiffany | Tiffany |
| Español US | es-US | lupe | Lupe |

## Setup Local

### Pré-requisitos

- Node.js 20+
- AWS CLI configurado com acesso ao Bedrock em `us-east-1`
- Docker (para build do backend)

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

O servidor inicia em `http://localhost:4000`. Health check: `GET /health`.

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

O app inicia em `http://localhost:3000`.

### Testando a integração local

1. Inicie o backend (`npm run dev` no diretório `backend/`)
2. Inicie o frontend (`npm run dev` no diretório `frontend/`)
3. Abra `http://localhost:3000`
4. Clique no botão de microfone para testar a voz
5. Selecione uma categoria de piada para testar a geração via texto

## Deploy em Produção

### 1. Deploy da infra AWS (CloudFormation)

```bash
cd infra
chmod +x deploy.sh
./deploy.sh
```

O script executa automaticamente:
- Cria repositório ECR
- Builda e pusha a imagem Docker
- Cria IAM roles (Bedrock + ECR access)
- Deploya o App Runner
- Aguarda o serviço ficar RUNNING
- Exibe a URL final

### 2. Deploy do frontend (Vercel)

Deploy direto via Vercel CLI ou dashboard. O diretório root é `frontend/`.

```bash
cd frontend
npx vercel --prod
```

### 3. Configurar variáveis de ambiente no Vercel

| Variável | Valor |
|----------|-------|
| `NEXT_PUBLIC_WS_URL` | `wss://<app-runner-url>` (exibida no final do deploy.sh) |

## Comandos de voz suportados

### Português (Carolina)
- "muda para inglês" / "vai para espanhol"
- "clica na bandeira americana"
- "me conta uma piada" / "outra piada"

### English (Tiffany)
- "switch to Portuguese" / "change to Spanish"
- "click the Brazil flag"
- "tell me a joke" / "another one"

### Español (Lupe)
- "cambia a inglés" / "pon el portugués"
- "bandera americana"
- "cuéntame un chiste" / "otro chiste"

## Atalhos de teclado

| Tecla | Ação |
|-------|------|
| `Alt+1` | Português (BR) |
| `Alt+2` | English (US) |
| `Alt+3` | Español (ES) |
| `Space` | Toggle microfone |
| `Escape` | Parar narração |
| `J` | Nova piada |

## Arquitetura

```
Browser (Next.js)                    AWS App Runner
┌──────────────────┐    WebSocket    ┌──────────────────────┐
│  AudioWorklet    │ ──── PCM ────▶  │  wsHandler           │
│  (16kHz capture) │                 │  sessionManager      │
│                  │ ◀── PCM ─────  │  bedrockClient       │──▶ Bedrock Nova 2 Sonic
│  AudioWorklet    │                 │  intentDetector      │
│  (24kHz playback)│                 │  jokeGenerator       │──▶ Bedrock Nova Lite
└──────────────────┘                 └──────────────────────┘
```

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Microfone não funciona | Verificar HTTPS (obrigatório) ou localhost. Checar permissões do browser. |
| WebSocket não conecta | Verificar `NEXT_PUBLIC_WS_URL`. App Runner deve estar RUNNING. |
| Voz não responde | Verificar IAM Role tem acesso ao Bedrock. Região deve ser `us-east-1`. |
| Piadas não geram | Verificar acesso ao modelo `amazon.nova-lite-v1:0` no Bedrock. |
| CORS bloqueado | Verificar origin no backend. Preview deploys (*.vercel.app) são permitidos. |
