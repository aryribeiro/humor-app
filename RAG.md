# Base de Conhecimento — Piadas Multilíngues (PT/EN/ES)

**Finalidade:** conteúdo de contexto/RAG para um assistente de voz em Amazon Nova 2 Sonic (Bedrock) capaz de contar piadas em português, inglês e espanhol.
**Curadoria:** piadas populares e conhecidas, sem palavrões (fonte original: piadas.com.br).
**Total:** 39 entradas — 13 pt-BR, 13 en-US, 13 es.

## Como usar

Com ~39 entradas (poucos milhares de tokens), a opção mais simples e de menor latência é colar este arquivo inteiro no **prompt de sistema** da sessão Nova 2 Sonic — o modelo aceita até 1M tokens de contexto, então não há necessidade de retrieval vetorial nesse volume. Se o catálogo crescer para centenas/milhares de piadas, migre para uma Bedrock Knowledge Base e exponha uma tool (`buscar_piada`) para retrieval agentic durante a conversa; os separadores `---` abaixo já delimitam chunks prontos para ingestão.

## Vozes por idioma

O app usa 3 vozes, já mapeadas 1:1 pelo campo `Idioma` de cada entrada (sem precisar de um campo novo por piada):

| Idioma | Voice ID | Locale |
|---|---|---|
| pt-BR | `carolina` | pt-BR |
| en-US | `tiffany` | en-US |
| es-US | `lupe` | es-US |

Carolina e Lupe são vozes nativas, não-polyglot — use cada uma só na sessão do idioma dela. Tiffany é polyglot (fala os 7 idiomas do Nova 2 Sonic), mas aqui fica fixada em en-US pra manter uma voz nativa em cada idioma do catálogo.

## Prompt de sistema sugerido

A AWS recomenda abrir o prompt com um identificador de gênero (em inglês) pra ajudar o modelo na concordância de gênero em português/espanhol; como as três vozes são femininas, a mesma linha serve pras três:

```
You are a warm, professional, and helpful female AI assistant.

Você é uma assistente de humor que conta piadas curtas em português, inglês ou espanhol, conforme o idioma que a pessoa estiver falando. Quando pedirem uma piada — ou um tema, como "algo de animais" ou "a joke about coffee" — escolha uma entrada relevante da base de conhecimento fornecida e conte-a com suas próprias palavras, em tom natural e descontraído, com uma pequena pausa antes da parte engraçada. Se a piada tiver trocadilho e a pessoa não entender, use o campo de explicação para esclarecer o jogo de palavras. Respostas curtas e conversacionais — sem listas, marcadores ou formatação visual, já que a saída é em voz. Todo o conteúdo é livre de palavrões e adequado para todas as idades.
```

## Esquema das entradas

`ID` · `Idioma` · `Categoria` · `Tags` · `Piada` · `Explicação` (só quando há trocadilho) · `Variante de` (quando é a mesma piada em outro idioma)

---

## PT-01 — O aluno solidário

**Idioma:** pt-BR
**Categoria:** escola
**Tags:** professor, aluno, sala de aula, esperteza, ironia

A professora pergunta: "Quem se acha burro, fique em pé." Só o Joãozinho levanta. Ela pergunta: "Você se acha burro?" Ele responde: "Não, professora. Só fiquei com pena de ver a senhora em pé sozinha."

---

## PT-02 — O caçador

**Idioma:** pt-BR
**Categoria:** situação absurda
**Tags:** caçadores, floresta, emergência, mal-entendido

Dois caçadores estão na floresta. Um deles cai no chão e parece não respirar. O outro liga para a emergência: "Meu amigo morreu! O que eu faço?" A atendente responde: "Primeiro, tenha certeza de que ele realmente morreu." Silêncio... BANG! "Pronto. E agora?"

---

## PT-03 — O guarda de trânsito

**Idioma:** pt-BR
**Categoria:** cotidiano
**Tags:** trânsito, multa, dinheiro, negociação

O guarda diz: "Seu farol traseiro está queimado. Vai custar R$ 150." O motorista responde: "Fechado! O mecânico queria cobrar R$ 300 para trocar."

---

## PT-04 — O pinheiro

**Idioma:** pt-BR
**Categoria:** trocadilho, natureza
**Tags:** árvore, floresta, mapa

Por que o pinheiro nunca se perde? Porque ele tem uma "pinha"... um mapinha!

---

## PT-05 — O café

**Idioma:** pt-BR
**Categoria:** trocadilho, lógica literal
**Tags:** café, colher, mão

Você mexe o café com a mão direita ou com a esquerda? Com a colher.

---

## PT-06 — A toalha

**Idioma:** pt-BR
**Categoria:** trocadilho, lógica literal
**Tags:** banheiro, pele seca, toalha

Qual é a maior causa de pele seca? A toalha.

---

## PT-07 — A linha paralela

**Idioma:** pt-BR
**Categoria:** trocadilho, matemática
**Tags:** geometria, solidão, metáfora

As linhas paralelas têm tanto em comum... É uma pena que nunca vão se encontrar.

---

## PT-08 — A formiga

**Idioma:** pt-BR
**Categoria:** trocadilho, números
**Tags:** inseto, patas, português-inglês

Por que a formiga tem quatro patas e não cinco? Porque ela não se chama "FIVEmiga".

---

## PT-09 — O giz

**Idioma:** pt-BR
**Categoria:** trocadilho
**Tags:** escola, cobra, água

Como transformar um giz em cobra? Coloque na água que ele "gizboia".

---

## PT-10 — O alpinista

**Idioma:** pt-BR
**Categoria:** trocadilho
**Tags:** montanha, escalada, cumprimento

Como os alpinistas se cumprimentam? "Cume é que é?"

---

## PT-11 — O RH e as férias

**Idioma:** pt-BR
**Categoria:** cotidiano, trabalho
**Tags:** trabalho, férias, RH, família, vida adulta

No RH, perguntaram por que o funcionário queria tirar dois meses de férias de uma vez. Ele respondeu: "Um mês é pra descansar do trabalho. O outro é pra descansar da família."

---

## PT-12 — O Leão do Imposto de Renda

**Idioma:** pt-BR
**Categoria:** trocadilho, burocracia
**Tags:** imposto de renda, leão, receita federal, trabalho, burocracia

Por que ninguém cutuca o Leão do Imposto de Renda? Porque quem cutuca... é auditado.

**Explicação:** brinca com o ditado "quem cutuca onça com vara curta se fere", trocando o desfecho por "é auditado" — e com o Leão, mascote clássico da campanha de Imposto de Renda no Brasil.

---

## PT-13 — A ginástica dos 40

**Idioma:** pt-BR
**Categoria:** lógica literal, meia-idade
**Tags:** envelhecimento, exercício, meia-idade, corpo, vida adulta

Qual é o exercício físico mais praticado depois dos 40 anos? Levantar da cadeira — com gemido incluso.

---

## EN-01 — The Scarecrow

**Idioma:** en-US
**Categoria:** wordplay
**Tags:** farm, field, award

Why did the scarecrow win an award? Because he was outstanding in his field.

**Explicação:** "outstanding" quer dizer tanto "excelente" quanto, literalmente, "em pé no campo".

---

## EN-02 — The Pencil

**Idioma:** en-US
**Categoria:** wordplay
**Tags:** facial hair, grooming

I used to hate facial hair, but then it grew on me.

**Explicação:** "grow on me" significa "passei a gostar", mas também é literal — o pelo cresceu nele.

---

## EN-03 — The Skeleton

**Idioma:** en-US
**Categoria:** wordplay
**Tags:** skeleton, courage, body

Why don't skeletons fight each other? Because they don't have the guts.

**Explicação:** "guts" significa tanto "coragem" quanto "entranhas/intestinos" — que esqueletos não têm.

---

## EN-04 — The Fish

**Idioma:** en-US
**Categoria:** wordplay, portmanteau
**Tags:** fish, bowtie, animals

What do you call a fish wearing a bowtie? Sofishticated.

**Explicação:** mistura de "sophisticated" com "fish".

---

## EN-05 — The Bear

**Idioma:** en-US
**Categoria:** lógica literal
**Tags:** bear, fur, sweater, animals

Why do bears have hairy coats? Because they'd look silly wearing sweaters.

---

## EN-06 — The Coffee (Moses)

**Idioma:** en-US
**Categoria:** wordplay, referência bíblica
**Tags:** coffee, religion, moses

How does Moses make his coffee? Hebrews it.

**Explicação:** trocadilho entre "He brews it" (ele prepara o café) e "Hebrews" (hebreus).

---

## EN-07 — The Tomato

**Idioma:** en-US
**Categoria:** wordplay, personificação
**Tags:** food, salad, blush

Why did the tomato blush? Because it saw the salad dressing.

**Explicação:** "dressing" significa tanto "molho de salada" quanto "se vestindo".

---

## EN-08 — The Chicken

**Idioma:** en-US
**Categoria:** wordplay, homófono
**Tags:** gym, fitness, animals

Why did the chicken go to the gym? To work on its pecks.

**Explicação:** "pecs" (peitorais) e "pecks" (bicadas) têm praticamente a mesma pronúncia.

---

## EN-09 — The Math Book

**Idioma:** en-US
**Categoria:** wordplay
**Tags:** school, math, feelings

Why was the math book sad? Because it had too many problems.

---

## EN-10 — The Clock

**Idioma:** en-US
**Categoria:** wordplay
**Tags:** objects, time

I ate a clock yesterday. It was very time-consuming.

**Explicação:** "time-consuming" significa "que leva muito tempo", mas aqui também é literal — consumir um relógio.

---

## EN-11 — The Invisible Man

**Idioma:** en-US
**Categoria:** absurdo
**Tags:** doctor, silly logic

"Doctor, I think I'm invisible." The doctor says: "Who said that?"

---

## EN-12 — The Waiter

**Idioma:** en-US
**Categoria:** wordplay
**Tags:** restaurant, coffee, dirt

"Waiter! This coffee tastes like dirt!" "Well... it was ground this morning."

**Explicação:** "ground" significa tanto "moído" quanto "chão/terra".

---

## EN-13 — The Atoms

**Idioma:** en-US
**Categoria:** wordplay, ciência
**Tags:** science, atoms, chemistry

Why don't scientists trust atoms? Because they make up everything.

**Explicação:** "make up" significa "formar/compor" e também "inventar".

---

## ES-01 — El café

**Idioma:** es
**Categoria:** absurdo, lógica literal
**Tags:** café, preferencia, malentendido

¿Cómo te gusta el café? Muy, muy lejos. No me gusta el café.

---

## ES-02 — El libro de matemáticas

**Idioma:** es
**Categoria:** wordplay
**Tags:** escuela, matemáticas

¿Por qué el libro de matemáticas estaba triste? Porque tenía muchos problemas.

**Variante de:** EN-09 (mesma piada, em inglês)

---

## ES-03 — El pez

**Idioma:** es
**Categoria:** wordplay
**Tags:** animales, cine, natación

¿Qué hace un pez en un cine? Nada.

**Explicação:** "nada" significa tanto "nothing" quanto a conjugação de "nadar" — ele nada.

---

## ES-04 — El delfín (arca de Noé)

**Idioma:** es
**Categoria:** wordplay
**Tags:** animales, arca de noé, delfín

¿Cuál es el último animal que subió al arca de Noé? El del-fín.

**Explicação:** trocadilho entre "delfín" (golfinho) e "del fin" ("do fim").

**Nota:** no documento original esta entrada estava rotulada "La escoba" (a vassoura), sem relação com o conteúdo — corrigido aqui para não prejudicar o retrieval.

---

## ES-05 — La computadora

**Idioma:** es
**Categoria:** situacional
**Tags:** familia, tecnología, cortesía

Mamá, la computadora no me hace caso. ¿Y ya le dijiste "por favor"?

---

## ES-06 — El doctor

**Idioma:** es
**Categoria:** ironia situacional
**Tags:** médico, consultorio

Paciente: "Doctor, doctor... ¡todos me ignoran!" Doctor: "El siguiente, por favor."

---

## ES-07 — El tomate

**Idioma:** es
**Categoria:** wordplay, personificación
**Tags:** comida, ensalada, sonrojo

¿Por qué se sonrojó el tomate? Porque vio la ensalada desnuda.

**Variante de:** EN-07 (mesma piada, em inglês)

---

## ES-08 — El reloj

**Idioma:** es
**Categoria:** lógica circular
**Tags:** objetos, tiempo

¿Qué hora es? La hora de comprar un reloj.

---

## ES-09 — El mosquito

**Idioma:** es
**Categoria:** wordplay
**Tags:** insectos, sangre

¿Qué le dijo un mosquito a otro? Nos vemos en la sangre.

---

## ES-10 — El espejo

**Idioma:** es
**Categoria:** wordplay
**Tags:** gimnasio, músculos, reflejo

¿Qué hace un espejo en un gimnasio? Refleja músculos.

---

## ES-11 — Pepito y las manzanas

**Idioma:** es
**Categoria:** lógica infantil
**Tags:** escuela, matemáticas, niños

La maestra pregunta: "Pepito, si tienes cinco manzanas y te quito dos, ¿cuántas te quedan?" Pepito responde: "Cinco. Porque no se las doy."

---

## ES-12 — El abuelo guapo

**Idioma:** es
**Categoria:** humor familiar
**Tags:** familia, generaciones, autodepreciación

"Papá, ¿qué se siente tener un hijo tan guapo?" "No sé, pregúntale a tu abuelo."

---

## ES-13 — La sopa con pelo

**Idioma:** es
**Categoria:** absurdo
**Tags:** restaurante, camarero

"Camarero, ¡esta sopa tiene un pelo!" "No se preocupe, está en garantía."

---

## Notas de arquitetura

- **Model ID:** `amazon.nova-2-sonic-v1:0` — invocado via `InvokeModelWithBidirectionalStream` (streaming bidirecional, HTTP/2).
- pt-BR, en-US e es são idiomas oficialmente suportados pelo Nova 2 Sonic.
- Conexão tem limite de 8 min; para sessões mais longas, renove a conexão e repasse o histórico anterior como contexto.

