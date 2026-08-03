# Humor App!

Web app trilíngue de piadas com conversa por voz em tempo real, alimentado pelo Amazon Nova 2 Sonic via Amazon Bedrock.

A interação é inteiramente falada: o usuário clica no microfone (ou diz a palavra de ativação), conversa com a assistente e ela conta piadas de um repertório curado, trocando de idioma por comando de voz.

## Stack

| Camada | Tecnologia | Deploy |
|--------|------------|--------|
| Frontend | Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 | Vercel |
| Transporte | Socket.IO (HTTP long-polling) | — |
| Backend | Node.js 20 + TypeScript + Express + Socket.IO | AWS App Runner |
| Voz | Amazon Nova 2 Sonic (`amazon.nova-2-sonic-v1:0`, speech-to-speech bidirecional) | Amazon Bedrock |
| Infra | CloudFormation (ECR + IAM + App Runner) | AWS |

O modelo de voz é o único modelo usado: não há geração de texto separada. As piadas ficam embutidas no prompt de sistema da própria sessão Nova 2 Sonic.

## Idiomas e Vozes

| Idioma | Locale | Voice ID | Assistente |
|--------|--------|----------|------------|
| Português BR | `pt-BR` | `carolina` | Carolina |
| English US | `en-US` | `tiffany` | Tiffany |
| Español Latino | `es-US` | `lupe` | Lupe |

Cada sessão fala **um único idioma**. Trocar de idioma derruba a sessão Bedrock atual e abre outra com o novo prompt e a nova voz (`switchVoice`) — o histórico da conversa não é preservado na troca.

## Base de piadas

O repertório vive em [RAG.md](RAG.md): 39 piadas curadas (13 por idioma), sem palavrões. O conteúdo é injetado inteiro no prompt de sistema — no volume atual não há retrieval vetorial nem Knowledge Base.

As regras de performance (embutidas em [bedrockClient.ts](backend/src/bedrockClient.ts)) obrigam a assistente a:

1. Contar uma piada por vez, sem repetir nenhuma já contada na conversa.
2. Nunca inventar piadas enquanto houver piadas não contadas da base.
3. Só improvisar depois de esgotar as 13 — avisando o usuário antes.
4. Explicar o trocadilho se a pessoa não entender.
5. Entregar com timing de stand-up (reticências antes do desfecho, interjeições naturais).

## Comandos de voz

A assistente dispõe de duas ferramentas (tools) no Bedrock:

| Tool | O que faz |
|------|-----------|
| `changeLanguage` | Troca o idioma do app e da voz (`pt-BR`, `en-US`, `es-US`) |
| `stopSpeaking` | Silencia e encerra a escuta imediatamente |

### Português (Carolina)
- "muda para inglês" / "vai para espanhol"
- "me conta uma piada" / "outra piada"
- "pode parar" / "para de falar" / "chega" / "silêncio"
- **Ativação:** "ativa o microfone"

### English (Tiffany)
- "switch to Portuguese" / "change to Spanish"
- "tell me a joke" / "another one"
- "stop talking" / "be quiet" / "enough"
- **Wake phrase:** "activate the microphone"

### Español (Lupe)
- "cambia a inglés" / "pon el portugués"
- "cuéntame un chiste" / "otro chiste"
- "deja de hablar" / "cállate" / "basta" / "silencio"
- **Activación:** "activa el micrófono"

A palavra de ativação usa a Web Speech API do navegador (não o Bedrock) e só fica escutando quando a sessão de voz está ociosa e conectada. Onde a API não existe, a dica some da interface e o microfone só abre por clique ou teclado.

## Atalhos de teclado

| Tecla | Ação |
|-------|------|
| `Alt+1` | Português (BR) |
| `Alt+2` | English (US) |
| `Alt+3` | Español (Latino) |
| `Alt+4` | Toggle microfone |
| `Space` | Toggle microfone (fora de campos de texto) |
| `Escape` | Parar narração |

## Compatibilidade de navegador

O Firefox é **bloqueado** por uma tela de aviso trilíngue — os recursos de áudio em tempo real usados pelo app não funcionam nele. Navegadores suportados: Chrome, Edge, Safari e Opera. O microfone exige HTTPS (ou `localhost`).

## Setup Local

### Pré-requisitos

- Node.js 20+
- AWS CLI configurado com acesso ao Bedrock em `us-east-1` e ao modelo `amazon.nova-2-sonic-v1:0`
- Docker (apenas para o deploy do backend)

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

O servidor inicia em `http://localhost:4000`. Health check: `GET /health` (retorna sessões ativas e sessões de voz abertas no Bedrock).

Variáveis (`backend/.env`):

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | `4000` | Porta HTTP |
| `AWS_REGION` | `us-east-1` | Região do Bedrock |
| `AWS_PROFILE` | — | Perfil do `~/.aws/credentials`; sem ele, usa a cadeia padrão de credenciais |
| `LOG_LEVEL` | `info` | Nível de log |

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

O app inicia em `http://localhost:3000`.

Variáveis (`frontend/.env.local`):

| Variável | Valor local |
|----------|-------------|
| `NEXT_PUBLIC_WS_URL` | `http://localhost:4000` |

Como o transporte é Socket.IO em long-polling, essa variável usa esquema **HTTP** (`http://` local, `https://` em produção) — nunca `ws://` ou `wss://`.

### Testando a integração local

1. Suba o backend (`npm run dev` em `backend/`)
2. Suba o frontend (`npm run dev` em `frontend/`)
3. Abra `http://localhost:3000` em Chrome, Edge, Safari ou Opera
4. Clique no botão de microfone e peça uma piada
5. Diga "muda para inglês" para validar a troca de idioma por voz

## Deploy em Produção

### 1. Infra AWS (CloudFormation)

```bash
cd infra
chmod +x deploy.sh
./deploy.sh
```

O script executa 8 etapas: valida pré-requisitos, cria o repositório ECR, builda e pusha a imagem Docker (tags `latest` e timestamp), cria as IAM roles (Bedrock + pull do ECR), deploya o App Runner, aguarda o status `RUNNING` e imprime a URL final.

Os templates são aplicados nesta ordem: [01-ecr.yaml](infra/01-ecr.yaml) → [02-iam.yaml](infra/02-iam.yaml) → [03-apprunner.yaml](infra/03-apprunner.yaml). O serviço roda com 0.25 vCPU / 0.5 GB e health check em `/health`.

### 2. Frontend (Vercel)

```bash
cd frontend
npx vercel --prod
```

O diretório root é `frontend/`. O [vercel.json](frontend/vercel.json) fixa os headers de segurança (`X-Frame-Options: DENY`, `nosniff`, `Permissions-Policy: microphone=(self)`) e o `Content-Type` correto dos AudioWorklets.

### 3. Variáveis de ambiente no Vercel

| Variável | Valor |
|----------|-------|
| `NEXT_PUBLIC_WS_URL` | `https://<app-runner-url>` |

O `deploy.sh` imprime essa URL pronta ao final da execução.

### 4. CORS

A origem de produção é **allowlist fixa** em [server.ts](backend/src/server.ts):

```
http://localhost:3000
https://humor2026.vercel.app
```

Preview deploys da Vercel (`*-git-*.vercel.app`) **não** são aceitos automaticamente — para testar um preview, adicione a origem à lista e refaça o deploy do backend.

## Arquitetura

```
Browser (Next.js / Vercel)                    AWS App Runner
┌────────────────────────┐   Socket.IO      ┌──────────────────────┐
│  useAudioWorklet       │  (long-polling)  │  server.ts           │
│  captura 16 kHz ───────┼── PCM base64 ──▶ │  wsHandler           │
│                        │                  │  sessionManager      │
│  AudioPlayer           │                  │  bedrockClient       │
│  playback 24 kHz  ◀────┼── PCM base64 ──  │   └─ stream bidir. ──┼──▶ Nova 2 Sonic
│                        │                  │      tools:          │     (Bedrock)
│  useWakeWord           │                  │      changeLanguage  │
│  (Web Speech API)      │                  │      stopSpeaking    │
└────────────────────────┘                  └──────────────────────┘
```

Diagrama completo em [docs/arquitetura-humor-app.drawio](docs/arquitetura-humor-app.drawio) (PNG ao lado).

### Áudio

| Direção | Formato | Taxa |
|---------|---------|------|
| Captura (mic → Bedrock) | LPCM 16 bits mono, base64 | 16 kHz |
| Reprodução (Bedrock → alto-falante) | LPCM 16 bits mono, base64 | 24 kHz |

O player usa um buffer circular com 0,5 s de pré-buffer antes de começar a tocar, e sinaliza o fim da fala após 10 quadros silenciosos consecutivos.

### Eventos Socket.IO

| Cliente → Servidor | Servidor → Cliente |
|--------------------|--------------------|
| `start_listening` | `session_created`, `listening_started` |
| `stop_listening` | `listening_stopped`, `stop_requested` |
| `audio_chunk` | `audio_output`, `interrupted` |
| `set_language` | `language_changed`, `navigation_command` |
| `ping_msg` | `pong_msg`, `error_msg` |

O cliente reconecta indefinidamente com backoff exponencial e jitter; a cada reconexão o estado de voz é zerado e o buffer de áudio, limpo.

## Estrutura do projeto

```
humor-app/
├── backend/src/
│   ├── server.ts          # Express + Socket.IO + CORS + graceful shutdown
│   ├── wsHandler.ts       # Eventos por conexão, ponte socket ↔ Bedrock
│   ├── bedrockClient.ts   # Stream bidirecional, prompts de sistema, tools
│   ├── sessionManager.ts  # Estado da sessão (locale, voz, escuta)
│   └── types.ts
├── frontend/
│   ├── app/               # Página única + layout + tema
│   ├── components/        # VoiceButton, FlagSelector, Flag, AudioPlayer, Toast
│   ├── hooks/             # useVoiceSession, useAudioWorklet, useWakeWord, ...
│   ├── lib/               # wsClient (Socket.IO), i18n, voiceConfig
│   └── public/worklets/   # AudioWorklets de captura e reprodução
├── infra/                 # CloudFormation + deploy.sh
├── docs/                  # Diagrama de arquitetura (draw.io)
├── RAG.md                 # Base de 39 piadas curadas
└── HUMOR_APP_MASTER_PROMPT.md
```

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Tela de navegador incompatível | Firefox é bloqueado por design. Use Chrome, Edge, Safari ou Opera. |
| Microfone não funciona | Exige HTTPS ou `localhost`. Checar permissão do browser e a `Permissions-Policy` do host. |
| Conexão não estabelece | Conferir `NEXT_PUBLIC_WS_URL` (esquema `https://`, não `wss://`) e se o App Runner está `RUNNING`. |
| Conecta mas é rejeitado no CORS | A origem precisa estar na allowlist de `ALLOWED_ORIGINS` em `server.ts` — inclusive previews da Vercel. |
| Voz não responde | Verificar se a instance role do App Runner tem acesso ao Bedrock e se a região é `us-east-1`. |
| Erro ao abrir a sessão de voz | Confirmar acesso ao modelo `amazon.nova-2-sonic-v1:0` no console do Bedrock. |
| Palavra de ativação não funciona | A Web Speech API não existe em todos os navegadores; a dica só aparece quando é suportada. |
| Assistente repete piadas | Comportamento do modelo — as regras anti-repetição vivem no prompt de sistema e dependem do controle mental da sessão. |
