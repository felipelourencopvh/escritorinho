# Escritorinho

**A pixel art office where you talk to your Claude Code agents.** Give each agent a name and a role, chat with it in speech bubbles, hand it files by dropping them on its desk, and answer its questions with a click, while it types away at its little desk.

English and Brazilian Portuguese, switchable at any time. _[Leia em português ↓](#português)_

> Escritorinho is a fork of **[Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents)** (MIT) by Pablo De Lucca and its contributors. The office, the characters, the layout editor and the agent tracking are their work; Escritorinho adds the conversation layer on top. If you only want to _watch_ your agents, use the original.

## What it adds to Pixel Agents

- **Named agents with a briefing.** Each folder can have an agent name ("Ana") and a briefing: its role, how it should work, where its notes are. The briefing is passed to Claude Code (`--append-system-prompt`) every time an agent starts or resumes there; nothing is written into your project.
- **Chat.** Click an agent and talk to it in speech bubbles. What you write is typed into the agent's own terminal, so the chat and the terminal are two views of one session; the terminal is one tab away.
- **The desk.** Drop files on an agent's chat, card or character (or use the Files button). They are saved in an `escritorinho-desk/` folder inside its working directory, and your next message tells the agent where they are.
- **Answer from the chat.** When the agent's terminal shows a question (a permission request, "trust this folder?"), the chat shows it with one button per option. The screen is read first: no key is ever sent to a terminal that isn't showing that question.
- **Replies as light markdown** (headings, lists, code, links).
- **No "skip permissions" mode.** Every agent asks before acting.
- **English and Brazilian Portuguese** (Settings → Language).

## Requirements

- macOS, Linux or Windows, with **Node.js 20+**
- **[Claude Code](https://claude.com/claude-code)** installed and logged in (`claude` on your PATH)

## Install and run

Not on npm yet, so run it from a clone:

```bash
git clone https://github.com/felipelourencopvh/escritorinho.git
cd escritorinho
npm ci
npm run compile
node dist/cli.js --port 3100 --pty-host
```

Open the URL it prints (`http://127.0.0.1:3100/?token=…`). **Treat that URL as a password**: whoever has it can launch agents as you.

`--pty-host` keeps your agents running in a separate process, so restarting or updating Escritorinho doesn't end them. Without it, agents end when the server stops.

## Using it

1. **+** → **+ Directory**: add a project folder. Give it an **agent name** and a **briefing** if you like.
2. Pick the folder in the **+** menu to start an agent there. It sits at a desk and its chat opens.
3. Write to it. Drop files on it. Answer its questions with the buttons.
4. Past conversations are in the left sidebar; click one to resume it.

## The reception

Ask for an agent in plain words and have it created for you: "call the agent for the Acme site".
The reception is an ordinary agent whose briefing tells it to find the project in your notes, write
the new agent's briefing and create it with `escritorinho agent add … --launch`. Set it up once with
[`docs/reception-briefing.md`](docs/reception-briefing.md).

```bash
node dist/cli.js agent list                       # the office's agents
node dist/cli.js agent add --name Acme --path ~/code/acme --agent-name Ana \
  --briefing-file briefing.txt --launch            # create (or update) and open one
```

The command talks to the running office (the token comes from `~/.escritorinho/`, never typed).

## Security and privacy

- The server listens on **127.0.0.1 only**. Every action that changes something (launching an agent, typing into it, saving a file on its desk) needs the token in the URL and the expected host; uploads also check the page's origin.
- Files dropped on a desk keep only their base name (no paths), never overwrite an existing file, and are never written through a symbolic link.
- Escritorinho reads Claude Code's transcripts (`~/.claude/projects/`) to show what agents do. Nothing is sent anywhere else: no telemetry, no analytics.
- **Instant detection (hooks)** and **usage bars** are optional. Both ask before writing to `~/.claude/settings.json`, keep a one-time backup (`settings.json.escritorinho.backup`), and undo cleanly from Settings. Escritorinho only ever touches its own entries, never Pixel Agents' or anyone else's.
- Its own data lives in `~/.escritorinho/`.

## Development

Same layout and tooling as Pixel Agents: see [`CLAUDE.md`](CLAUDE.md) (architecture reference) and [`CONTRIBUTING.md`](CONTRIBUTING.md).

```bash
npm run compile      # types, lint, bundles
npm test             # server + webview unit tests
```

Translations live in `webview-ui/src/i18n/`: `en.ts` is the source; `ptBR.ts` must translate every key (the build fails otherwise). Adding a language is one more dictionary and one line in `LOCALES`.

## Credits and license

- **[Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents)** by Pablo De Lucca and contributors: the project this is built on (MIT).
- Character art based on the **Metro City** pack by [JIK-A-4](https://jik-a-4.itch.io/metrocity-free-topdown-character-pack) (CC0).
- Escritorinho changes by Felipe Lourenço.

MIT: see [LICENSE](LICENSE).

---

## Português

**Um escritório em pixel art onde você conversa com os seus agentes do Claude Code.** Dê um nome e um papel a cada agente, converse com ele em balões, entregue arquivos soltando na mesa dele e responda às perguntas dele com um clique, enquanto ele digita na mesinha.

O Escritorinho é baseado no **[Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents)** (MIT), de Pablo De Lucca e colaboradores. O escritório, os personagens e o acompanhamento dos agentes são trabalho deles; o Escritorinho acrescenta a parte de conversa.

### O que ele faz

- **Agentes com nome e briefing.** Cada pasta pode ter um nome de agente ("Ana") e um briefing: o papel dele e onde ficam as anotações. O briefing vai para o Claude Code sempre que um agente começa ou é retomado ali, sem gravar nada no seu projeto.
- **Chat em balões.** Clique no agente e converse. O que você escreve vai para o terminal dele; chat e terminal são a mesma sessão.
- **A mesa.** Solte arquivos no chat, no cartão ou no boneco (ou use o botão Arquivos). Eles vão para a pasta `escritorinho-desk/` do agente, e a sua próxima mensagem avisa onde estão.
- **Responder pelo chat.** Quando o terminal do agente faz uma pergunta (pedido de autorização, "confiar nesta pasta?"), o chat mostra um botão para cada opção. A tela é conferida antes: nenhuma tecla é enviada se a pergunta não estiver lá.
- **Sem modo de pular autorizações.** Todo agente pergunta antes de agir.
- **Inglês e português do Brasil** (Configurações → Idioma).

### Como rodar

Precisa de Node.js 20+ e do Claude Code instalado e logado.

```bash
git clone https://github.com/felipelourencopvh/escritorinho.git
cd escritorinho
npm ci
npm run compile
node dist/cli.js --port 3100 --pty-host
```

Abra o endereço que aparecer (`http://127.0.0.1:3100/?token=…`). **Esse endereço é como uma senha**: quem tiver ele consegue abrir agentes no seu nome. Com `--pty-host`, os agentes continuam rodando mesmo se o Escritorinho for reiniciado.

### A recepção

Peça um agente com as suas palavras ("chama o agente do site da Acme") e ele é criado para você. A recepção é um agente comum cujo briefing manda procurar o projeto nas suas anotações, escrever o briefing do novo agente e criá-lo com `escritorinho agent add … --launch`. Veja o modelo em [`docs/reception-briefing.md`](docs/reception-briefing.md).

### Segurança e privacidade

Só escuta em 127.0.0.1, exige o token para qualquer ação, não manda nada para fora (sem telemetria), só mexe no `~/.claude/settings.json` com a sua autorização (com cópia de segurança e desfazer pelas Configurações) e guarda os próprios dados em `~/.escritorinho/`.
