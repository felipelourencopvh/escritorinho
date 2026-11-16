/** Português do Brasil. Uma tradução para cada chave de `en.ts`. */
import type { MessageKey } from './en.js';

export const ptBR: Record<MessageKey, string> = {
  // ── Comum ──
  'common.add': 'Adicionar',
  'common.cancel': 'Cancelar',
  'common.save': 'Salvar',
  'common.delete': 'Excluir',
  'common.close': 'Fechar',
  'common.back': 'Voltar',
  'common.continue': 'Continuar',
  'common.yes': 'Sim',
  'common.no': 'Não',
  'common.reset': 'Desfazer tudo',
  'common.undo': 'Desfazer',
  'common.redo': 'Refazer',
  'common.name': 'Nome',
  'common.path': 'Caminho',
  'common.gotIt': 'Entendi',

  // ── Status dos agentes ──
  'status.reading': 'Lendo {value}',
  'status.editing': 'Editando {value}',
  'status.writing': 'Escrevendo {value}',
  'status.running': 'Executando: {value}',
  'status.subtask': 'Subtarefa: {value}',
  'status.creatingTeamNamed': 'Criando equipe: {value}',
  'status.using': 'Usando {value}',
  'status.searchingFiles': 'Procurando arquivos',
  'status.searchingCode': 'Procurando no código',
  'status.fetchingWeb': 'Abrindo página da web',
  'status.searchingWeb': 'Pesquisando na web',
  'status.waitingAnswer': 'Esperando sua resposta',
  'status.planning': 'Planejando',
  'status.editingNotebook': 'Editando notebook',
  'status.creatingTeam': 'Criando equipe',
  'status.sendingMessage': 'Enviando mensagem',
  'status.runningSubtask': 'Fazendo subtarefa',
  'status.idle': 'Parado',
  'status.needsApproval': 'Precisa da sua autorização',
  'status.mightBeWaiting': 'Talvez esperando você',
  'status.waitingForInput': 'Esperando você',

  // ── Configurações ──
  'settings.title': 'Configurações',
  'settings.language': 'Idioma',
  'settings.openSessionsFolder': 'Abrir pasta das sessões',
  'settings.exportLayout': 'Exportar escritório',
  'settings.importLayout': 'Importar escritório',
  'settings.assetDirPlaceholder': 'Caminho completo da pasta de desenhos',
  'settings.addAssetDirectory': 'Adicionar pasta de desenhos',
  'settings.soundNotifications': 'Aviso sonoro',
  'settings.musicPlayer': 'Rádio',
  'settings.musicPlayerHint': 'O rádio do escritório, no rodapé',
  'settings.watchAllSessions': 'Mostrar todas as sessões',
  'settings.instantDetection': 'Detecção instantânea (ganchos)',
  'settings.usageBars': 'Barras de uso',
  'settings.usageBarsHint':
    'Uso semanal e de 5 horas do seu plano {provider}, no canto superior esquerdo',
  'settings.alwaysShowLabels': 'Sempre mostrar nomes',
  'settings.headlessAsGhosts': 'Mostrar agentes sem terminal como fantasmas',
  'settings.showAreas': 'Mostrar salas',
  'settings.skipPermissions': 'Pular autorizações',
  'settings.showStartDirectory': 'Mostrar pasta inicial',
  'settings.showWorkspaceFolders': 'Mostrar pastas do workspace',
  'settings.debugView': 'Modo de depuração',
  'settings.usageBarsConfirmTitle': 'Mostrar barras de uso?',
  'settings.connect': 'Conectar',

  // ── App ──
  'app.replaceLayoutConfirm':
    'Substituir o escritório atual? As mudanças não salvas serão perdidas.',
  'app.invalidLayout': 'Arquivo de escritório inválido.',
  'app.layoutReadFailed': 'Não foi possível ler o arquivo do escritório.',
  'app.rotateHint': 'Girar (R)',
  'app.viewOnly': 'Só visualização',

  // ── Instant detection (hooks) ──
  'hooks.activeTitle': 'Detecção instantânea ligada',
  'hooks.activeBody': 'Seus agentes agora respondem em tempo real.',
  'hooks.viewMore': 'Saiba mais',
  'hooks.infoTitle': 'A detecção instantânea está ligada',
  'hooks.infoIntro': 'Seu {app} agora reage em tempo real:',
  'hooks.infoPermissions': 'Os pedidos de autorização aparecem na hora',
  'hooks.infoTurns': 'O fim de cada tarefa é percebido no mesmo instante',
  'hooks.infoSound': 'O aviso sonoro toca imediatamente',
  'hooks.infoHow':
    'Isso funciona pelos ganchos (hooks) do Claude Code, pequenos avisos que contam ao {app} tudo o que acontece nas suas sessões do Claude.',
  'hooks.infoDisable': 'Para desligar, vá em Configurações > Detecção instantânea',

  // ── Intro tour ──
  'intro.welcomeTitle': 'Bem-vindo ao {app}!',
  'intro.claudeCodeTitle': 'Funciona com o Claude Code',
  'intro.usageTitle': 'Acompanhe seu uso',
  'intro.installFailedTitle': 'Não deu para instalar os ganchos',
  'intro.doneTitle': 'Tudo pronto!',
  'intro.stepOf': 'Passo {step} de {total}',
  'intro.welcomeBody':
    'Neste escritório, seus agentes de IA viram bonequinhos em pixel: digitam na mesa enquanto trabalham, dão uma volta quando terminam e chamam você quando precisam.',
  'intro.claudeCodeBody':
    'O escritório acompanha suas sessões do Claude Code e dá vida a elas aqui. Ainda não tem o Claude Code? Instale primeiro:',
  'intro.moreInfo': 'Para saber mais, acesse',
  'intro.usageShown': 'Seu uso agora aparece no canto superior esquerdo.',
  'intro.installFailedBody':
    'Algo deu errado ao gravar nas configurações do Claude Code, então o escritório vai acompanhar suas sessões do jeito mais lento. Não se preocupe: tudo continua funcionando e você pode tentar de novo quando quiser, em Configurações.',
  'intro.doneBody':
    'Aproveite seu escritório novo! Dúvidas, ideias ou pixel art para mostrar? Venha para o nosso Discord.',
  'intro.joinDiscord': 'Entre no nosso Discord!',
  'intro.skip': 'Pular',
  'intro.connecting': 'Conectando...',
  'intro.showUsage': 'Mostrar uso',
  'intro.dontAskAgain': 'Não perguntar mais',
  'intro.notNow': 'Agora não',
  'intro.installing': 'Instalando...',
  'intro.installHooks': 'Instalar ganchos',
  'intro.letsGo': 'Vamos lá',

  // ── Server disclosures (see i18n/serverCopy.ts) ──
  'consent.headline': 'Só mais uma coisa: os ganchos!',
  'consent.factWhat':
    'Para dar vida aos seus agentes em tempo real, o {app} adiciona ganchos para {count} eventos do Claude Code em {file}. Suas configurações atuais são mantidas, e uma cópia de segurança é salva uma única vez como {backup}.',
  'consent.factData':
    'O Claude Code vai enviar esses eventos (incluindo o nome das ferramentas e o que é passado para elas) para um servidor do {app} neste computador. Tudo fica local: o servidor só escuta em 127.0.0.1, a não ser que você o inicie de propósito com --host para expor na sua rede.',
  'consent.factUndo':
    'Você pode remover os ganchos quando quiser em Configurações → Detecção instantânea (ganchos).',
  'usage.factWhat':
    'Para mostrar quanto resta do seu uso semanal e de 5 horas no canto superior esquerdo, o {app} envolve a sua linha de status em {file}. Ela continua funcionando e com a mesma aparência (sem linha de status, o Claude Code esconde algumas dicas do rodapé). Uma cópia de segurança é salva uma única vez como {backup}.',
  'usage.factData':
    'Só são enviados os percentuais de uso, os horários de renovação e o percentual de contexto de cada sessão, para o servidor do {app} neste computador.',
  'usage.factUndo': 'Você pode desligar isso quando quiser em Configurações → Barras de uso.',

  // ── Agents ──
  'agent.close': 'Fechar agente',
  'agent.numbered': 'Agente {id}',
  'status.subtaskPlain': 'Subtarefa',

  // ── Bottom toolbar ──
  'toolbar.terminalUnavailable': 'Terminal indisponível neste servidor.',
  'toolbar.newAgent': 'Novo agente',
  'toolbar.launchAgent': 'Abrir agente',
  'toolbar.roster': 'Elenco',
  'toolbar.hideRoster': 'Esconder elenco',
  'toolbar.rosterHint': 'Abra um agente com um dos seus personagens, ou edite-os',
  'toolbar.editLayout': 'Editar o escritório',
  'toolbar.layout': 'Escritório',

  // ── Layout edit bar ──
  'edit.undoHint': 'Desfazer (Ctrl+Z)',
  'edit.redoHint': 'Refazer (Ctrl+Y)',
  'edit.saveHint': 'Salvar escritório',
  'edit.resetHint': 'Voltar para o último escritório salvo',
  'edit.resetConfirm': 'Desfazer tudo?',

  // ── Directories ──
  'directory.editTitle': 'Editar pasta',
  'directory.addTitle': 'Adicionar pasta',
  'directory.namePlaceholder': 'Nome do projeto',
  'directory.pathPlaceholder': '~/Documentos/meu-projeto',
  'directory.recent': 'Pastas usadas recentemente',
  'directory.areas': 'Salas',
  'launch.addDirectory': '+ Pasta',
  'launch.editNamed': 'Editar {name}',
  'launch.editDirectory': 'Editar pasta',
  'launch.hostTag': 'inicial',

  // ── Zoom ──
  'zoom.hideConversations': 'Esconder conversas',
  'zoom.showConversations': 'Mostrar conversas',
  'zoom.in': 'Aproximar (Ctrl+rolagem)',
  'zoom.out': 'Afastar (Ctrl+rolagem)',

  // ── Layout editor ──
  'editor.placeFurnitureHint': 'Colocar móveis',
  'editor.furniture': 'Móveis',
  'editor.floorHint': 'Pintar o piso',
  'editor.floor': 'Piso',
  'editor.wallsHint': 'Pintar paredes (clique para pôr ou tirar)',
  'editor.walls': 'Paredes',
  'editor.petsHint': 'Colocar bichinhos',
  'editor.pets': 'Bichinhos',
  'editor.areasHint': 'Defina salas ligadas a pastas: os agentes aparecem na sala da sua pasta',
  'editor.eraseHint': 'Apagar piso',
  'editor.erase': 'Apagar',
  'editor.copyFloorHint': 'Copiar desenho e cor de um piso existente',
  'editor.copy': 'Copiar',
  'editor.floorColorHint': 'Ajustar a cor do piso',
  'editor.color': 'Cor',
  'editor.floorNumbered': 'Piso {n}',
  'editor.wallColorHint': 'Ajustar a cor das paredes',
  'editor.wallNumbered': 'Parede {n}',
  'editor.areasIntro':
    'Pinte as salas no mapa e depois ligue cada uma a uma pasta. Os agentes vão sentar na sala da sua pasta.',
  'editor.noAreas': 'Nenhuma sala ainda. Crie uma acima',
  'editor.carpetHint': 'Colocar tapetes',
  'editor.carpet': 'Tapete',
  'editor.carpetColorHint': 'Ajustar as cores do tapete',
  'editor.furnitureColorHint': 'Ajustar a cor dos móveis novos',
  'editor.copyCarpetHint': 'Copiar modelo e cores de um tapete existente (P)',
  'editor.copyFurnitureHint': 'Copiar o tipo de um móvel já colocado',
  'editor.carpetNumbered': 'Tapete {n}',
  'editor.carpetMain': 'Principal',
  'editor.carpetAccent': 'Detalhe',
  'editor.contrast': 'Contraste',
  'editor.areaNamePlaceholder': 'Nome da sala…',
  'editor.addAreaHint': 'Criar uma sala nova',
  'editor.addArea': 'Criar sala',
  'editor.areaColor': 'Cor da sala',
  'editor.removeArea': 'Remover sala',
  'editor.noFolders': 'Nenhuma pasta ligada',
  'editor.unmapFolder': 'Desligar pasta',
  'editor.allFoldersMapped': 'Todas as pastas já estão ligadas',
  'editor.mapFolder': 'Ligar uma pasta…',
  'editor.addFolder': 'Adicionar pasta…',
};
