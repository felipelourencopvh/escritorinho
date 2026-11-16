/**
 * English: the source language. Every key the interface uses lives here;
 * `ptBR.ts` must translate each one (the compiler checks).
 * `{name}` marks a value filled in at runtime.
 */
export const en = {
  // ── Common ──
  'common.add': 'Add',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.delete': 'Delete',
  'common.close': 'Close',
  'common.back': 'Back',
  'common.continue': 'Continue',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.reset': 'Reset',
  'common.undo': 'Undo',
  'common.redo': 'Redo',
  'common.name': 'Name',
  'common.path': 'Path',
  'common.gotIt': 'Got it',

  // ── Agent status lines (translated from the server's English) ──
  'status.reading': 'Reading {value}',
  'status.editing': 'Editing {value}',
  'status.writing': 'Writing {value}',
  'status.running': 'Running: {value}',
  'status.subtask': 'Subtask: {value}',
  'status.creatingTeamNamed': 'Creating team: {value}',
  'status.using': 'Using {value}',
  'status.searchingFiles': 'Searching files',
  'status.searchingCode': 'Searching code',
  'status.fetchingWeb': 'Fetching web content',
  'status.searchingWeb': 'Searching the web',
  'status.waitingAnswer': 'Waiting for your answer',
  'status.planning': 'Planning',
  'status.editingNotebook': 'Editing notebook',
  'status.creatingTeam': 'Creating team',
  'status.sendingMessage': 'Sending message',
  'status.runningSubtask': 'Running subtask',
  'status.idle': 'Idle',
  'status.needsApproval': 'Needs approval',
  'status.mightBeWaiting': 'Might be waiting for input',
  'status.waitingForInput': 'Waiting for input',

  // ── Settings ──
  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.openSessionsFolder': 'Open Sessions Folder',
  'settings.exportLayout': 'Export Layout',
  'settings.importLayout': 'Import Layout',
  'settings.assetDirPlaceholder': 'Absolute asset directory path',
  'settings.addAssetDirectory': 'Add Asset Directory',
  'settings.soundNotifications': 'Sound Notifications',
  'settings.musicPlayer': 'Music Player',
  'settings.musicPlayerHint': "The office radio's player, bottom of the office",
  'settings.watchAllSessions': 'Watch All Sessions',
  'settings.instantDetection': 'Instant Detection (Hooks)',
  'settings.usageBars': 'Usage Bars',
  'settings.usageBarsHint': "Your {provider} plan's weekly and 5-hour usage, top-left",
  'settings.alwaysShowLabels': 'Always Show Labels',
  'settings.headlessAsGhosts': 'Display Headless as Ghosts',
  'settings.showAreas': 'Show Areas',
  'settings.skipPermissions': 'Skip Permissions',
  'settings.showStartDirectory': 'Show Start Directory',
  'settings.showWorkspaceFolders': 'Show Workspace Folders',
  'settings.debugView': 'Debug View',
  'settings.usageBarsConfirmTitle': 'Show usage bars?',
  'settings.connect': 'Connect',

  // ── App ──
  'app.replaceLayoutConfirm': 'Replace the current layout? Unsaved edits will be lost.',
  'app.invalidLayout': 'Invalid layout file.',
  'app.layoutReadFailed': 'Failed to read or parse layout file.',
  'app.rotateHint': 'Rotate (R)',
  'app.viewOnly': 'View only',

  // ── Instant detection (hooks) ──
  'hooks.activeTitle': 'Instant Detection Active',
  'hooks.activeBody': 'Your agents now respond in real-time.',
  'hooks.viewMore': 'View more',
  'hooks.infoTitle': 'Instant Detection is ON',
  'hooks.infoIntro': 'Your {app} office now reacts in real-time:',
  'hooks.infoPermissions': 'Permission prompts appear instantly',
  'hooks.infoTurns': 'Turn completions detected the moment they happen',
  'hooks.infoSound': 'Sound notifications play immediately',
  'hooks.infoHow':
    'This works through Claude Code Hooks, small event listeners that notify {app} whenever something happens in your Claude sessions.',
  'hooks.infoDisable': 'To disable, go to Settings > Instant Detection',

  // ── Intro tour ──
  'intro.welcomeTitle': 'Welcome to {app}!',
  'intro.claudeCodeTitle': 'Powered by Claude Code',
  'intro.usageTitle': 'Track your usage',
  'intro.installFailedTitle': "Hooks couldn't be installed",
  'intro.doneTitle': "You're all set!",
  'intro.stepOf': 'Step {step} of {total}',
  'intro.welcomeBody':
    "In this office, your AI agents become tiny pixel characters: they type at their desks while they work, wander off when they're done, and speak up when they need you.",
  'intro.claudeCodeBody':
    'The office watches your Claude Code sessions and brings them to life in here. New to Claude Code? Download it first:',
  'intro.moreInfo': 'For more info, visit',
  'intro.usageShown': 'Your usage now shows in the top-left corner.',
  'intro.installFailedBody':
    'Something went wrong writing to your Claude Code settings, so the office will watch your sessions the slower way instead. No worries, everything still works and you can retry activating them any time from Settings.',
  'intro.doneBody':
    'Enjoy your new office! Questions, ideas, or pixel art to show off? Come hang out in our Discord.',
  'intro.joinDiscord': 'Join our Discord!',
  'intro.skip': 'Skip',
  'intro.connecting': 'Connecting...',
  'intro.showUsage': 'Show Usage',
  'intro.dontAskAgain': "Don't Ask Again",
  'intro.notNow': 'Not Now',
  'intro.installing': 'Installing...',
  'intro.installHooks': 'Install Hooks',
  'intro.letsGo': "Let's Go",

  // ── Server disclosures (see i18n/serverCopy.ts) ──
  'consent.headline': 'One more thing: hooks!',
  'consent.factWhat':
    'To bring your agents to life in real time, {app} adds hooks for {count} Claude Code events to {file}. Note that your existing settings are kept, and a one-time backup is saved as {backup}.',
  'consent.factData':
    'Claude Code will send those events - including tool names and tool inputs - to a {app} server on this machine. Everything stays local - the server listens only on 127.0.0.1 - unless you explicitly start it with --host to expose it on your network.',
  'consent.factUndo':
    'You can remove the hooks at any time from Settings → Instant Detection (Hooks).',
  'usage.factWhat':
    'To show your remaining weekly and 5-hour usage in the top-left corner, {app} wraps your status line in {file}. It keeps working and looks the same (with no status line, Claude Code hides some footer hints). A one-time backup is saved as {backup}.',
  'usage.factData':
    "Only your usage percentages and reset times, and each session's context percentage, are sent, to the {app} server on this machine.",
  'usage.factUndo': 'You can turn this off at any time from Settings → Usage Bars.',

  // ── Agents ──
  'agent.close': 'Close agent',
  'agent.numbered': 'Agent {id}',
  'status.subtaskPlain': 'Subtask',

  // ── Bottom toolbar ──
  'toolbar.terminalUnavailable': 'Terminal unavailable on this server.',
  'toolbar.newAgent': 'New agent',
  'toolbar.launchAgent': 'Launch agent',
  'toolbar.roster': 'Roster',
  'toolbar.hideRoster': 'Hide roster',
  'toolbar.rosterHint': 'Launch an agent as one of your characters, or edit them',
  'toolbar.editLayout': 'Edit office layout',
  'toolbar.layout': 'Layout',

  // ── Layout edit bar ──
  'edit.undoHint': 'Undo (Ctrl+Z)',
  'edit.redoHint': 'Redo (Ctrl+Y)',
  'edit.saveHint': 'Save layout',
  'edit.resetHint': 'Reset to last saved layout',
  'edit.resetConfirm': 'Reset?',

  // ── Directories ──
  'directory.editTitle': 'Edit Directory',
  'directory.addTitle': 'Add Directory',
  'directory.namePlaceholder': 'Project name',
  'directory.pathPlaceholder': '~/code/my-project',
  'directory.recent': 'Recent working directories',
  'directory.areas': 'Areas',
  'launch.addDirectory': '+ Directory',
  'launch.editNamed': 'Edit {name}',
  'launch.editDirectory': 'Edit directory',
  'launch.hostTag': 'host',

  // ── Zoom ──
  'zoom.hideConversations': 'Hide conversations',
  'zoom.showConversations': 'Show conversations',
  'zoom.in': 'Zoom in (Ctrl+Scroll)',
  'zoom.out': 'Zoom out (Ctrl+Scroll)',

  // ── Layout editor ──
  'editor.placeFurnitureHint': 'Place furniture',
  'editor.furniture': 'Furniture',
  'editor.floorHint': 'Paint floor tiles',
  'editor.floor': 'Floor',
  'editor.wallsHint': 'Paint walls (click to toggle)',
  'editor.walls': 'Walls',
  'editor.petsHint': 'Place pets',
  'editor.pets': 'Pets',
  'editor.areasHint': "Define folder-bound areas — agents spawn in their folder's area",
  'editor.eraseHint': 'Erase tiles to void',
  'editor.erase': 'Erase',
  'editor.copyFloorHint': 'Copy floor pattern + color from existing tile',
  'editor.copy': 'Copy',
  'editor.floorColorHint': 'Adjust floor color',
  'editor.color': 'Color',
  'editor.floorNumbered': 'Floor {n}',
  'editor.wallColorHint': 'Adjust wall color',
  'editor.wallNumbered': 'Wall {n}',
  'editor.areasIntro':
    "Paint areas on the map, then assign workspace folders. Agents will sit in their folder's area.",
  'editor.noAreas': 'No areas yet — add one above',
  'editor.carpetHint': 'Paint carpets',
  'editor.carpet': 'Carpet',
  'editor.carpetColorHint': 'Adjust carpet main + accent colors',
  'editor.furnitureColorHint': 'Adjust color for new furniture',
  'editor.copyCarpetHint': 'Copy carpet variant + colors from existing tile (P)',
  'editor.copyFurnitureHint': 'Copy furniture type from placed item',
  'editor.carpetNumbered': 'Carpet {n}',
  'editor.carpetMain': 'Main',
  'editor.carpetAccent': 'Accent',
  'editor.contrast': 'Contrast',
  'editor.areaNamePlaceholder': 'Area name…',
  'editor.addAreaHint': 'Add a new Area',
  'editor.addArea': 'Add Area',
  'editor.areaColor': 'Area color',
  'editor.removeArea': 'Remove area',
  'editor.noFolders': 'No folders mapped',
  'editor.unmapFolder': 'Unmap folder',
  'editor.allFoldersMapped': 'All folders already mapped',
  'editor.mapFolder': 'Map a folder…',
  'editor.addFolder': 'Add folder…',
} as const;

export type MessageKey = keyof typeof en;
