typing-combat-game/
│
├─ client/                     # Frontend (Three.js + UI)
│  ├─ public/
│  │  └─ index.html
│  │
│  └─ src/
│     ├─ main.js               # App entry point
│     │
│     ├─ core/                 # Game bootstrapping
│     │  ├─ Game.js            # Orchestrates game loop
│     │  ├─ EventBus.js        # Global event system
│     │  └─ Constants.js
│     │
│     ├─ engine/               # GAME LOGIC (no Three.js)
│     │  ├─ GameState.js       # HP, mana, cooldowns
│     │  ├─ Player.js
│     │  ├─ Tool.js
│     │  ├─ ToolRegistry.js
│     │  ├─ CombatResolver.js
│     │  └─ StatusEffects.js
│     │
│     ├─ input/                # Typing & command parsing
│     │  ├─ CommandInput.js
│     │  ├─ CommandParser.js
│     │  ├─ AutoComplete.js
│     │  └─ TypingMetrics.js   # speed, accuracy, combos
│     │
│     ├─ renderer/             # Three.js ONLY
│     │  ├─ SceneManager.js
│     │  ├─ Camera.js
│     │  ├─ Lighting.js
│     │  ├─ Arena.js
│     │  ├─ Character.js
│     │  ├─ SpellRenderer.js
│     │  └─ Effects/
│     │     ├─ IceBallEffect.js
│     │     ├─ ShieldEffect.js
│     │     └─ Explosion.js
│     │
│     ├─ ui/                   # Non-3D UI
│     │  ├─ HUD.js             # HP, mana, cooldowns
│     │  ├─ ToolList.js
│     │  ├─ Notifications.js
│     │  └─ GameOverScreen.js
│     │
│     ├─ ai/                   # Bots
│     │  ├─ BotController.js
│     │  ├─ Difficulty.js
│     │  └─ DecisionTree.js
│     │
│     ├─ network/              # Multiplayer (later)
│     │  ├─ SocketClient.js
│     │  └─ SyncManager.js
│     │
│     ├─ assets/
│     │  ├─ models/
│     │  ├─ textures/
│     │  ├─ sounds/
│     │  └─ fonts/
│     │
│     └─ utils/
│        ├─ Math.js
│        ├─ Timer.js
│        └─ Logger.js
│
├─ server/                     # Backend (Multiplayer)
│  ├─ src/
│  │  ├─ index.js
│  │  ├─ game/
│  │  │  ├─ Match.js
│  │  │  ├─ PlayerState.js
│  │  │  ├─ ToolLogic.js
│  │  │  └─ Resolver.js
│  │  │
│  │  ├─ ai/
│  │  ├─ network/
│  │  └─ utils/
│  │
│  └─ package.json
│
├─ shared/                     # Shared logic & constants
│  ├─ tools/
│  │  ├─ iceBall.json
│  │  ├─ shield.json
│  │  └─ fireBlast.json
│  │
│  ├─ enums.js
│  └─ validators.js
│
├─ docs/
│  ├─ game-design.md
│  ├─ combat-rules.md
│  └─ roadmap.md
│
├─ package.json
└─ README.md
