import { TOOLS } from "../constants/tools.js";

// ============================================================================
// AI - Bot Controller
// ============================================================================

export class BotAI {
  constructor(engine) {
    this.engine = engine;
    this.isThinking = false;
  }

  makeDecision() {
    const state = this.engine.getState();
    const bot = state.bot;
    const player = state.player;

    const availableTools = [];

    for (const [key, tool] of Object.entries(TOOLS)) {
      const canUse = this.engine.canUseTool(bot, key);
      if (canUse.valid) {
        availableTools.push({ key, ...tool });
      }
    }

    if (availableTools.length === 0) return null;

    let chosenTool = null;

    if (this.engine.settings.dodgingEnabled && Math.random() > 0.7) {
      chosenTool = availableTools.find((t) => t.key === "dodge");
    }

    if (!chosenTool && bot.hp < 40 && bot.mana >= 25) {
      chosenTool = availableTools.find((t) => t.key === "heal");
    }

    if (
      !chosenTool &&
      bot.shield === 0 &&
      bot.mana >= 15 &&
      Math.random() > 0.6
    ) {
      chosenTool = availableTools.find((t) => t.key === "shield");
    }

    if (!chosenTool) {
      const attacks = availableTools.filter((t) => t.type === "attack");
      if (attacks.length > 0) {
        attacks.sort((a, b) => {
          const aDmg = a.effects.find((e) => e.type === "damage")?.value || 0;
          const bDmg = b.effects.find((e) => e.type === "damage")?.value || 0;
          return bDmg - aDmg;
        });
        chosenTool = attacks[0];
      }
    }

    if (!chosenTool) {
      chosenTool =
        availableTools[Math.floor(Math.random() * availableTools.length)];
    }

    return chosenTool.name;
  }

  takeTurn(onComplete) {
    if (this.isThinking) return;
    this.isThinking = true;

    setTimeout(() => {
      const decision = this.makeDecision();
      if (decision) {
        const result = this.engine.useTool(decision, false);
        this.isThinking = false;
        if (onComplete) onComplete(result);
      } else {
        this.isThinking = false;
        if (onComplete)
          onComplete({ success: false, message: "Bot has no valid moves" });
      }
    }, 800 + Math.random() * 700);
  }

  startRealTimeLoop(onAction) {
    const act = () => {
      if (!this.engine.state.gameOver && this.engine.isRealTime) {
        this.takeTurn((result) => {
          if (onAction && result.success) {
            onAction(result);
          }
          // Schedule next action
          setTimeout(act, 1500 + Math.random() * 1500);
        });
      }
    };
    act();
  }
}
