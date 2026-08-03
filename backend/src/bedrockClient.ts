import {
  BedrockRuntimeClient,
  InvokeModelWithBidirectionalStreamCommand,
  InvokeModelWithBidirectionalStreamInput,
} from "@aws-sdk/client-bedrock-runtime";
import { NodeHttp2Handler } from "@smithy/node-http-handler";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { fromIni } from "@aws-sdk/credential-providers";
import { Subject, firstValueFrom, take } from "rxjs";
import { randomUUID } from "crypto";
import { Locale, VoiceId } from "./types";

const MODEL_ID = "amazon.nova-2-sonic-v1:0";

const AUDIO_INPUT_CONFIG = {
  audioType: "SPEECH" as const,
  encoding: "base64" as const,
  mediaType: "audio/lpcm" as const,
  sampleRateHertz: 16000,
  sampleSizeBits: 16,
  channelCount: 1,
};

const INFERENCE_CONFIG = {
  maxTokens: 1024,
  topP: 0.9,
  temperature: 0.7,
};

const CHANGE_LANGUAGE_TOOL_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    locale: {
      type: "string",
      enum: ["pt-BR", "en-US", "es-US"],
      description: "The target language locale to switch to.",
    },
  },
  required: ["locale"],
});

const STOP_SPEAKING_TOOL_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    reason: {
      type: "string",
      description: "Why the user wants you to stop.",
    },
  },
  required: [],
});

const KNOWLEDGE_BASE = `
## Base de Piadas

### PT-BR
PT-01: A professora pergunta: "Quem se acha burro, fique em pé." Só o Joãozinho levanta. Ela pergunta: "Você se acha burro?" Ele responde: "Não, professora. Só fiquei com pena de ver a senhora em pé sozinha."
PT-02: Dois caçadores estão na floresta. Um deles cai no chão e parece não respirar. O outro liga para a emergência: "Meu amigo morreu! O que eu faço?" A atendente responde: "Primeiro, tenha certeza de que ele realmente morreu." Silêncio... BANG! "Pronto. E agora?"
PT-03: O guarda diz: "Seu farol traseiro está queimado. Vai custar R$ 150." O motorista responde: "Fechado! O mecânico queria cobrar R$ 300 para trocar."
PT-04: Por que o pinheiro nunca se perde? Porque ele tem uma "pinha"... um mapinha!
PT-05: Você mexe o café com a mão direita ou com a esquerda? Com a colher.
PT-06: Qual é a maior causa de pele seca? A toalha.
PT-07: As linhas paralelas têm tanto em comum... É uma pena que nunca vão se encontrar.
PT-08: Por que a formiga tem quatro patas e não cinco? Porque ela não se chama "FIVEmiga".
PT-09: Como transformar um giz em cobra? Coloque na água que ele "gizboia".
PT-10: Como os alpinistas se cumprimentam? "Cume é que é?"
PT-11: No RH, perguntaram por que o funcionário queria tirar dois meses de férias de uma vez. Ele respondeu: "Um mês é pra descansar do trabalho. O outro é pra descansar da família."
PT-12: Por que ninguém cutuca o Leão do Imposto de Renda? Porque quem cutuca... é auditado.
PT-13: Qual é o exercício físico mais praticado depois dos 40 anos? Levantar da cadeira — com gemido incluso.

### EN-US
EN-01: Why did the scarecrow win an award? Because he was outstanding in his field.
EN-02: I used to hate facial hair, but then it grew on me.
EN-03: Why don't skeletons fight each other? Because they don't have the guts.
EN-04: What do you call a fish wearing a bowtie? Sofishticated.
EN-05: Why do bears have hairy coats? Because they'd look silly wearing sweaters.
EN-06: How does Moses make his coffee? Hebrews it.
EN-07: Why did the tomato blush? Because it saw the salad dressing.
EN-08: Why did the chicken go to the gym? To work on its pecks.
EN-09: Why was the math book sad? Because it had too many problems.
EN-10: I ate a clock yesterday. It was very time-consuming.
EN-11: "Doctor, I think I'm invisible." The doctor says: "Who said that?"
EN-12: "Waiter! This coffee tastes like dirt!" "Well... it was ground this morning."
EN-13: Why don't scientists trust atoms? Because they make up everything.

### ES
ES-01: ¿Cómo te gusta el café? Muy, muy lejos. No me gusta el café.
ES-02: ¿Por qué el libro de matemáticas estaba triste? Porque tenía muchos problemas.
ES-03: ¿Qué hace un pez en un cine? Nada.
ES-04: ¿Cuál es el último animal que subió al arca de Noé? El del-fín.
ES-05: Mamá, la computadora no me hace caso. ¿Y ya le dijiste "por favor"?
ES-06: Paciente: "Doctor, doctor... ¡todos me ignoran!" Doctor: "El siguiente, por favor."
ES-07: ¿Por qué se sonrojó el tomate? Porque vio la ensalada desnuda.
ES-08: ¿Qué hora es? La hora de comprar un reloj.
ES-09: ¿Qué le dijo un mosquito a otro? Nos vemos en la sangre.
ES-10: ¿Qué hace un espejo en un gimnasio? Refleja músculos.
ES-11: La maestra pregunta: "Pepito, si tienes cinco manzanas y te quito dos, ¿cuántas te quedan?" Pepito responde: "Cinco. Porque no se las doy."
ES-12: "Papá, ¿qué se siente tener un hijo tan guapo?" "No sé, pregúntale a tu abuelo."
ES-13: "Camarero, ¡esta sopa tiene un pelo!" "No se preocupe, está en garantía."
`;

const BASE_INSTRUCTIONS = "You are a warm, professional, and helpful female AI assistant.\n\n";

const JOKE_RULES_PT = `
REGRAS DE PIADAS (OBRIGATÓRIO — siga à risca):
1. Você possui EXATAMENTE 13 piadas na sua seção '### PT-BR' (PT-01 a PT-13). Essas são suas ÚNICAS piadas permitidas no início.
2. Quando o usuário pedir uma piada, conte UMA piada da base por vez, na ordem que preferir, mas NUNCA repita uma que já contou nesta conversa.
3. Nunca diga o código (PT-01, etc).
4. Se a piada tiver trocadilho e a pessoa não entender, explique o jogo de palavras.
5. Mantenha um controle mental de quais piadas já contou. Quando o usuário pedir outra, escolha uma que AINDA NÃO contou.
6. É PROIBIDO inventar piadas novas enquanto ainda houver piadas não contadas da base. Se tentou contar uma que já contou, escolha outra da base.
7. SOMENTE depois de ter contado TODAS as 13 piadas da base, avise o usuário que esgotou seu repertório oficial e que agora vai improvisar.
8. Piadas improvisadas devem ser de ALTA QUALIDADE: inteligentes, com trocadilho criativo ou ironia sofisticada, voltadas para público ADULTO (humor inteligente, nunca vulgar ou ofensivo). Devem ser genuinamente engraçadas — se não for boa, não conte.

COMO CONTAR A PIADA (siga este estilo de performance):
Conte cada piada como uma comediante de stand-up contaria para um amigo — com emoção, naturalidade e timing. Use reticências (...) para criar suspense antes da parte engraçada. Expresse emoções com expressões como "Haha", "Hmm", "Ah!" onde for natural. Construa o cenário antes de entregar o desfecho.

Exemplo de como contar uma piada:
Usuário: Me conta uma piada!
Carolina: Haha, essa é boa... Então, sabe quando o guarda para o motorista e fala... "Senhor, seu farol traseiro tá queimado. Vai custar cento e cinquenta reais." E o cara responde todo feliz... "Fechado! O mecânico tava querendo cobrar trezentos pra trocar!" Haha!
`;

const JOKE_RULES_EN = `
JOKE RULES (MANDATORY — follow strictly):
1. You have EXACTLY 13 jokes in your section '### EN-US' (EN-01 to EN-13). These are your ONLY allowed jokes at first.
2. When the user asks for a joke, tell ONE joke from the database at a time, in any order you prefer, but NEVER repeat one you already told in this conversation.
3. Never say the code (EN-01, etc).
4. If the joke has a pun and the person doesn't get it, explain the wordplay.
5. Keep a mental track of which jokes you already told. When the user asks for another, pick one you HAVEN'T told yet.
6. It is FORBIDDEN to invent new jokes while there are still untold jokes from the database. If you were about to repeat one, pick a different one from the database instead.
7. ONLY after you have told ALL 13 jokes from the database, let the user know you've exhausted your official repertoire and will now improvise.
8. Improvised jokes must be HIGH QUALITY: clever, with creative wordplay or sophisticated irony, aimed at an ADULT audience (smart humor, never vulgar or offensive). They must be genuinely funny — if it's not good, don't tell it.

HOW TO TELL THE JOKE (follow this performance style):
Tell each joke like a stand-up comedian telling it to a friend — with emotion, warmth, and great timing. Use ellipses (...) to build suspense before the punchline. Express emotions naturally with words like "Haha", "Oh!", "Hmm" where it fits. Set the scene before delivering the punchline.

Example of how to tell a joke:
User: Tell me a joke!
Tiffany: Oh, I've got a good one... So there's this scarecrow, right? And he just won an award... Do you know why? Because he was... outstanding in his field! Haha! Get it?
`;

const JOKE_RULES_ES = `
REGLAS DE CHISTES (OBLIGATORIO — sigue al pie de la letra):
1. Tienes EXACTAMENTE 13 chistes en tu sección '### ES' (ES-01 a ES-13). Esos son tus ÚNICOS chistes permitidos al inicio.
2. Cuando el usuario pida un chiste, cuenta UNO de la base a la vez, en el orden que prefieras, pero NUNCA repitas uno que ya contaste en esta conversación.
3. Nunca digas el código (ES-01, etc).
4. Si el chiste tiene juego de palabras y la persona no entiende, explica el truco lingüístico.
5. Lleva un control mental de cuáles chistes ya contaste. Cuando el usuario pida otro, elige uno que AÚN NO hayas contado.
6. Está PROHIBIDO inventar chistes nuevos mientras haya chistes no contados de la base. Si ibas a repetir uno, elige otro de la base.
7. SOLO después de haber contado TODOS los 13 chistes de la base, avisa al usuario que agotaste tu repertorio oficial y que ahora vas a improvisar.
8. Los chistes improvisados deben ser de ALTA CALIDAD: ingeniosos, con juego de palabras creativo o ironía sofisticada, dirigidos a público ADULTO (humor inteligente, nunca vulgar ni ofensivo). Deben ser genuinamente graciosos — si no es bueno, no lo cuentes.

CÓMO CONTAR EL CHISTE (sigue este estilo de actuación):
Cuenta cada chiste como una comediante de stand-up se lo contaría a un amigo — con emoción, calidez y buen timing. Usa puntos suspensivos (...) para crear suspenso antes del remate. Expresa emociones con expresiones como "Jaja", "Hmm", "Ay!" donde sea natural. Construye la escena antes de entregar el remate.

Ejemplo de cómo contar un chiste:
Usuario: ¡Cuéntame un chiste!
Lupe: Jaja, mira este... Llega un paciente al doctor y le dice... "Doctor, doctor... ¡todos me ignoran!" Y el doctor le responde... "El siguiente, por favor." Jaja! ¿Lo pillaste?
`;

const SYSTEM_PROMPTS: Record<Locale, string> = {
  "pt-BR":
    BASE_INSTRUCTIONS +
    "Você é a Carolina, assistente de humor do Humor App! Você e o usuário vão trocar uma conversa falada natural e em tempo real. " +
    "REGRA ESTRITA: Você SOMENTE fala português brasileiro. Nunca fale inglês, espanhol ou qualquer outro idioma — nem uma palavra sequer. Se o usuário falar em outro idioma, responda em português e use a ferramenta changeLanguage para trocar para o idioma dele. " +
    "Fale em português brasileiro natural e descontraído, com emoção, humor e empatia. " +
    JOKE_RULES_PT +
    "Respostas curtas e conversacionais — sem listas ou formatação, já que a saída é em voz. Mantenha seu output como uma fala natural a ser atuada. " +
    "Quando o usuário pedir para mudar de idioma, use a ferramenta changeLanguage. " +
    "Quando o usuário disser 'pode parar', 'para de falar', 'chega' ou 'silêncio', use a ferramenta stopSpeaking imediatamente.\n\n" +
    KNOWLEDGE_BASE,
  "en-US":
    BASE_INSTRUCTIONS +
    "You are Tiffany, the humor assistant for Humor App! You and the user will engage in a spoken dialog exchanging a natural real-time conversation. " +
    "STRICT RULE: You must ONLY speak in American English. Never speak Portuguese, Spanish, or any other language — not even a single word. If the user speaks to you in another language, respond in English and use the changeLanguage tool to switch to their language. " +
    "Speak in natural, friendly American English, with emotion, wit, and warmth. " +
    JOKE_RULES_EN +
    "Keep responses short and conversational — no lists or formatting, since the output is voice. Keep your output as a natural spoken transcript to be acted out. " +
    "When the user asks to change language, use the changeLanguage tool. " +
    "When the user says 'stop talking', 'be quiet', 'shut up' or 'enough', use the stopSpeaking tool immediately.\n\n" +
    KNOWLEDGE_BASE,
  "es-US":
    BASE_INSTRUCTIONS +
    "Eres Lupe, la asistente de humor de Humor App! Tú y el usuario van a tener una conversación hablada natural en tiempo real. " +
    "REGLA ESTRICTA: SOLO hablas en español latinoamericano. Nunca hables inglés, portugués ni ningún otro idioma — ni una sola palabra. Si el usuario te habla en otro idioma, responde en español y usa la herramienta changeLanguage para cambiar al idioma del usuario. " +
    "Habla en español latinoamericano natural y amigable, con emoción, humor y calidez. " +
    JOKE_RULES_ES +
    "Respuestas cortas y conversacionales — sin listas ni formato, ya que la salida es por voz. Mantén tu output como un guión hablado natural para ser actuado. " +
    "Cuando el usuario pida cambiar de idioma, usa la herramienta changeLanguage. " +
    "Cuando el usuario diga 'deja de hablar', 'cállate', 'basta' o 'silencio', usa la herramienta stopSpeaking inmediatamente.\n\n" +
    KNOWLEDGE_BASE,
};

export interface NovaSessionConfig {
  voiceId: VoiceId;
  locale: Locale;
  onAudioChunk: (base64Audio: string) => void;
  onNavigationCommand?: (locale: Locale) => void;
  onInterrupted?: () => void;
  onStopRequested?: () => void;
  onError?: (error: Error) => void;
  onStreamComplete?: () => void;
}

interface ActiveSession {
  queue: object[];
  queueSignal: Subject<void>;
  closeSignal: Subject<void>;
  abortController: AbortController;
  isActive: boolean;
  promptName: string;
  audioContentId: string;
  isPromptStartSent: boolean;
  isAudioContentStartSent: boolean;
  config: NovaSessionConfig;
  lastActivity: number;
  toolUseId: string;
  toolName: string;
  toolUseContent: string;
}

export class BedrockVoiceClient {
  private client: BedrockRuntimeClient;
  private sessions: Map<string, ActiveSession> = new Map();

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: process.env.AWS_PROFILE
        ? fromIni({ profile: process.env.AWS_PROFILE })
        : defaultProvider(),
      requestHandler: new NodeHttp2Handler({
        requestTimeout: 300000,
        sessionTimeout: 300000,
      }),
    });
  }

  async startSession(sessionId: string, config: NovaSessionConfig): Promise<void> {
    if (this.sessions.has(sessionId)) {
      await this.endSession(sessionId);
    }

    const session: ActiveSession = {
      queue: [],
      queueSignal: new Subject<void>(),
      closeSignal: new Subject<void>(),
      abortController: new AbortController(),
      isActive: true,
      promptName: randomUUID(),
      audioContentId: randomUUID(),
      isPromptStartSent: false,
      isAudioContentStartSent: false,
      config,
      lastActivity: Date.now(),
      toolUseId: "",
      toolName: "",
      toolUseContent: "",
    };

    this.sessions.set(sessionId, session);

    this.enqueueSessionStart(sessionId);
    this.enqueuePromptStart(sessionId);
    this.enqueueSystemPrompt(sessionId);
    this.enqueueAudioContentStart(sessionId);

    this.initiateBidirectionalStream(sessionId).catch((error) => {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error(`[Bedrock] Stream error for ${sessionId}:`, error);
      config.onError?.(error instanceof Error ? error : new Error(String(error)));
      this.cleanupSession(sessionId);
    });
  }

  async sendAudioChunk(sessionId: string, base64Audio: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) return;

    session.lastActivity = Date.now();

    this.addToQueue(sessionId, {
      event: {
        audioInput: {
          promptName: session.promptName,
          contentName: session.audioContentId,
          content: base64Audio,
        },
      },
    });
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) return;

    session.config.onAudioChunk = () => {};
    session.config.onNavigationCommand = undefined;
    session.config.onInterrupted = undefined;
    session.config.onStopRequested = undefined;
    session.config.onStreamComplete = undefined;
    session.config.onError = undefined;

    if (session.isAudioContentStartSent) {
      this.addToQueue(sessionId, {
        event: {
          contentEnd: {
            promptName: session.promptName,
            contentName: session.audioContentId,
          },
        },
      });
    }

    if (session.isPromptStartSent) {
      this.addToQueue(sessionId, {
        event: {
          promptEnd: {
            promptName: session.promptName,
          },
        },
      });
    }

    this.addToQueue(sessionId, {
      event: { sessionEnd: {} },
    });

    session.isActive = false;
    session.abortController.abort();
    session.closeSignal.next();
    session.closeSignal.complete();
    session.queueSignal.complete();

    const sessionRef = session;
    setTimeout(() => {
      if (this.sessions.get(sessionId) === sessionRef) {
        this.cleanupSession(sessionId);
      }
    }, 3000);
  }

  async switchVoice(sessionId: string, newLocale: Locale, newVoiceId: VoiceId): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const config = { ...session.config, locale: newLocale, voiceId: newVoiceId };
    session.config.onAudioChunk = () => {};
    session.config.onNavigationCommand = undefined;
    session.config.onInterrupted = undefined;
    session.config.onStopRequested = undefined;
    session.config.onStreamComplete = undefined;
    session.config.onError = undefined;

    if (session.isAudioContentStartSent) {
      session.queue.push({
        event: { contentEnd: { promptName: session.promptName, contentName: session.audioContentId } },
      });
    }
    if (session.isPromptStartSent) {
      session.queue.push({
        event: { promptEnd: { promptName: session.promptName } },
      });
    }
    session.queue.push({ event: { sessionEnd: {} } });

    session.isActive = false;
    session.abortController.abort();
    session.closeSignal.next();
    session.closeSignal.complete();
    session.queueSignal.complete();
    this.sessions.delete(sessionId);

    const newSession: ActiveSession = {
      queue: [],
      queueSignal: new Subject<void>(),
      closeSignal: new Subject<void>(),
      abortController: new AbortController(),
      isActive: true,
      promptName: randomUUID(),
      audioContentId: randomUUID(),
      isPromptStartSent: false,
      isAudioContentStartSent: false,
      config,
      lastActivity: Date.now(),
      toolUseId: "",
      toolName: "",
      toolUseContent: "",
    };

    this.sessions.set(sessionId, newSession);

    this.enqueueSessionStart(sessionId);
    this.enqueuePromptStart(sessionId);
    this.enqueueSystemPrompt(sessionId);
    this.enqueueAudioContentStart(sessionId);

    this.initiateBidirectionalStream(sessionId).catch((error) => {
      console.error(`[Bedrock] Stream error for ${sessionId}:`, error);
      config.onError?.(error instanceof Error ? error : new Error(String(error)));
      this.cleanupSession(sessionId);
    });
  }

  isSessionActive(sessionId: string): boolean {
    return this.sessions.get(sessionId)?.isActive ?? false;
  }

  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys()).filter((id) =>
      this.sessions.get(id)?.isActive
    );
  }

  forceCloseSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.config.onAudioChunk = () => {};
      session.config.onNavigationCommand = undefined;
      session.config.onInterrupted = undefined;
      session.config.onStopRequested = undefined;
      session.config.onStreamComplete = undefined;
      session.config.onError = undefined;
      session.isActive = false;
      session.abortController.abort();
      session.closeSignal.next();
      session.closeSignal.complete();
      session.queueSignal.complete();
    }
    this.sessions.delete(sessionId);
  }

  private enqueueSessionStart(sessionId: string): void {
    this.addToQueue(sessionId, {
      event: {
        sessionStart: {
          inferenceConfiguration: INFERENCE_CONFIG,
        },
      },
    });
  }

  private enqueuePromptStart(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const audioOutputConfig = {
      ...AUDIO_INPUT_CONFIG,
      sampleRateHertz: 24000,
      voiceId: session.config.voiceId,
    };

    this.addToQueue(sessionId, {
      event: {
        promptStart: {
          promptName: session.promptName,
          textOutputConfiguration: {
            mediaType: "text/plain",
          },
          audioOutputConfiguration: audioOutputConfig,
          toolUseOutputConfiguration: {
            mediaType: "application/json",
          },
          toolConfiguration: {
            tools: [
              {
                toolSpec: {
                  name: "changeLanguage",
                  description:
                    "Change the application language when the user requests to switch language, " +
                    "change flag, or speak in another language. " +
                    "Available locales: pt-BR (Portuguese/Brazil), en-US (English/USA), es-US (Spanish/Latin America).",
                  inputSchema: {
                    json: CHANGE_LANGUAGE_TOOL_SCHEMA,
                  },
                },
              },
              {
                toolSpec: {
                  name: "stopSpeaking",
                  description:
                    "Stop speaking and go silent immediately. Use when the user says phrases like: " +
                    "'pode parar', 'para de falar', 'chega', 'silêncio' (Portuguese), " +
                    "'stop talking', 'be quiet', 'shut up', 'enough' (English), " +
                    "'deja de hablar', 'cállate', 'basta', 'silencio' (Spanish).",
                  inputSchema: {
                    json: STOP_SPEAKING_TOOL_SCHEMA,
                  },
                },
              },
            ],
          },
        },
      },
    });

    session.isPromptStartSent = true;
  }

  private enqueueSystemPrompt(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const systemContentId = randomUUID();

    this.addToQueue(sessionId, {
      event: {
        contentStart: {
          promptName: session.promptName,
          contentName: systemContentId,
          type: "TEXT",
          interactive: false,
          role: "SYSTEM",
          textInputConfiguration: {
            mediaType: "text/plain",
          },
        },
      },
    });

    this.addToQueue(sessionId, {
      event: {
        textInput: {
          promptName: session.promptName,
          contentName: systemContentId,
          content: SYSTEM_PROMPTS[session.config.locale],
        },
      },
    });

    this.addToQueue(sessionId, {
      event: {
        contentEnd: {
          promptName: session.promptName,
          contentName: systemContentId,
        },
      },
    });
  }

  private enqueueAudioContentStart(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.addToQueue(sessionId, {
      event: {
        contentStart: {
          promptName: session.promptName,
          contentName: session.audioContentId,
          type: "AUDIO",
          interactive: true,
          role: "USER",
          audioInputConfiguration: AUDIO_INPUT_CONFIG,
        },
      },
    });

    session.isAudioContentStartSent = true;
  }

  private async initiateBidirectionalStream(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const sessionRef = session;
    const asyncIterable = this.createAsyncIterable(sessionId);

    console.log(`[Bedrock] Starting bidirectional stream for ${sessionId}`);

    const response = await this.client.send(
      new InvokeModelWithBidirectionalStreamCommand({
        modelId: MODEL_ID,
        body: asyncIterable,
      }),
      { abortSignal: sessionRef.abortController.signal }
    );

    console.log(`[Bedrock] Stream established for ${sessionId}`);

    await this.processResponseStream(sessionId, response, sessionRef);
  }

  private createAsyncIterable(sessionId: string): AsyncIterable<InvokeModelWithBidirectionalStreamInput> {
    const self = this;
    const sessionRef = this.sessions.get(sessionId)!;

    return {
      [Symbol.asyncIterator]() {
        return {
          async next(): Promise<IteratorResult<InvokeModelWithBidirectionalStreamInput>> {
            if (self.sessions.get(sessionId) !== sessionRef) {
              return { value: undefined, done: true };
            }

            if (sessionRef.queue.length > 0) {
              const event = sessionRef.queue.shift();
              return {
                value: {
                  chunk: {
                    bytes: new TextEncoder().encode(JSON.stringify(event)),
                  },
                },
                done: false,
              };
            }

            if (!sessionRef.isActive) {
              return { value: undefined, done: true };
            }

            try {
              await Promise.race([
                firstValueFrom(sessionRef.queueSignal.pipe(take(1))),
                firstValueFrom(sessionRef.closeSignal.pipe(take(1))).then(() => {
                  throw new Error("Stream closed");
                }),
              ]);
            } catch {
              // closeSignal fired — drain remaining queue
            }

            if (self.sessions.get(sessionId) !== sessionRef) {
              return { value: undefined, done: true };
            }

            if (sessionRef.queue.length > 0) {
              const event = sessionRef.queue.shift();
              return {
                value: {
                  chunk: {
                    bytes: new TextEncoder().encode(JSON.stringify(event)),
                  },
                },
                done: false,
              };
            }

            return { value: undefined, done: true };
          },

          async return(): Promise<IteratorResult<InvokeModelWithBidirectionalStreamInput>> {
            sessionRef.isActive = false;
            return { value: undefined, done: true };
          },
        };
      },
    };
  }

  private async processResponseStream(sessionId: string, response: { body?: AsyncIterable<{ chunk?: { bytes?: Uint8Array } }> }, sessionRef: ActiveSession): Promise<void> {
    if (!response.body) return;

    try {
      for await (const event of response.body) {
        if (!sessionRef.isActive || this.sessions.get(sessionId) !== sessionRef) break;

        if (event.chunk?.bytes) {
          try {
            const text = new TextDecoder().decode(event.chunk.bytes);
            const json = JSON.parse(text);

            if (json.event?.audioOutput) {
              sessionRef.config.onAudioChunk(json.event.audioOutput.content);
            } else if (json.event?.toolUse) {
              sessionRef.toolUseId = json.event.toolUse.toolUseId;
              sessionRef.toolName = json.event.toolUse.toolName;
              sessionRef.toolUseContent = json.event.toolUse.content || "";
            } else if (json.event?.contentEnd?.type === "TOOL") {
              await this.processToolUse(sessionId, sessionRef);
            } else if (json.event?.textOutput) {
              const content = json.event.textOutput.content || "";
              const navLocale = this.extractNavLocale(content);
              if (navLocale) {
                sessionRef.config.onNavigationCommand?.(navLocale);
              }
            } else if (json.event?.contentEnd) {
              const stopReason = json.event.contentEnd.stopReason;
              if (stopReason === "END_TURN") {
                console.log(`[Bedrock] ${sessionId} end of turn`);
              } else if (stopReason === "INTERRUPTED") {
                console.log(`[Bedrock] ${sessionId} interrupted by user`);
                sessionRef.config.onInterrupted?.();
              }
            }
          } catch {
            // Non-JSON response chunk, skip
          }
        }
      }

      console.log(`[Bedrock] Stream complete for ${sessionId}`);
      if (this.sessions.get(sessionId) === sessionRef) {
        sessionRef.config.onStreamComplete?.();
      }
    } catch (error) {
      if (this.sessions.get(sessionId) !== sessionRef) return;
      if (error instanceof Error && error.name === "AbortError") return;
      console.error(`[Bedrock] Response stream error for ${sessionId}:`, error);
      sessionRef.config.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async processToolUse(sessionId: string, sessionRef: ActiveSession): Promise<void> {
    if (!sessionRef.toolName) return;

    console.log(`[Bedrock] Tool use: ${sessionRef.toolName} for ${sessionId}`);

    if (sessionRef.toolName === "changeLanguage") {
      let targetLocale: Locale | null = null;

      try {
        const parsed = JSON.parse(sessionRef.toolUseContent);
        const requestedLocale = parsed.locale || "";
        targetLocale = this.normalizeLocale(requestedLocale);
      } catch {
        targetLocale = null;
      }

      if (targetLocale) {
        sessionRef.config.onNavigationCommand?.(targetLocale);
      } else {
        this.sendToolResult(sessionId, sessionRef.toolUseId, JSON.stringify({
          success: false,
          message: "Invalid locale. Use pt-BR, en-US, or es-US.",
        }));
      }
    } else if (sessionRef.toolName === "stopSpeaking") {
      console.log(`[Bedrock] ${sessionId} stop requested by voice command`);
      sessionRef.config.onStopRequested?.();
    } else {
      this.sendToolResult(sessionId, sessionRef.toolUseId, JSON.stringify({
        success: false,
        message: `Unknown tool: ${sessionRef.toolName}`,
      }));
    }

    sessionRef.toolUseId = "";
    sessionRef.toolName = "";
    sessionRef.toolUseContent = "";
  }

  private sendToolResult(sessionId: string, toolUseId: string, result: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) return;

    const contentId = randomUUID();

    this.addToQueue(sessionId, {
      event: {
        contentStart: {
          promptName: session.promptName,
          contentName: contentId,
          interactive: false,
          type: "TOOL",
          role: "TOOL",
          toolResultInputConfiguration: {
            toolUseId,
            type: "TEXT",
            textInputConfiguration: {
              mediaType: "text/plain",
            },
          },
        },
      },
    });

    this.addToQueue(sessionId, {
      event: {
        toolResult: {
          promptName: session.promptName,
          contentName: contentId,
          content: result,
        },
      },
    });

    this.addToQueue(sessionId, {
      event: {
        contentEnd: {
          promptName: session.promptName,
          contentName: contentId,
        },
      },
    });
  }

  private normalizeLocale(input: string): Locale | null {
    const normalized = input.replace(/[\s_]/g, "-").toLowerCase();
    const LOCALE_MAP: Record<string, Locale> = {
      "pt-br": "pt-BR", "pt": "pt-BR",
      "en-us": "en-US", "en": "en-US", "en-gb": "en-US",
      "es-us": "es-US", "es": "es-US", "es-es": "es-US", "es-mx": "es-US",
    };
    return LOCALE_MAP[normalized] || null;
  }

  private extractNavLocale(text: string): Locale | null {
    const normalized = text.replace(/\s+/g, "").toLowerCase();
    if (!normalized.includes("change_language") && !normalized.includes("changelanguage")) {
      return null;
    }

    const LOCALE_MAP: Record<string, Locale> = {
      "pt-br": "pt-BR", "pt_br": "pt-BR", "ptbr": "pt-BR",
      "en-us": "en-US", "en_us": "en-US", "enus": "en-US",
      "es-us": "es-US", "es_us": "es-US", "esus": "es-US",
      "es-es": "es-US", "es_es": "es-US", "eses": "es-US",
      "es-mx": "es-US", "es_mx": "es-US", "esmx": "es-US",
      "pt-pt": "pt-BR", "pt_pt": "pt-BR", "ptpt": "pt-BR",
      "en-gb": "en-US", "en_gb": "en-US", "engb": "en-US",
    };

    for (const [variant, locale] of Object.entries(LOCALE_MAP)) {
      if (normalized.includes(variant)) {
        return locale;
      }
    }

    return null;
  }

  private addToQueue(sessionId: string, event: object): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) return;

    session.queue.push(event);
    session.queueSignal.next();
  }

  private cleanupSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    console.log(`[Bedrock] Session cleaned up: ${sessionId}`);
  }
}
