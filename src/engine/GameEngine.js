import { TOOLS } from "../constants/tools.js";

// ============================================================================
// ENGINE - Game Logic
// ============================================================================

export class GameEngine {
  constructor(settings = {}) {
    this.settings = settings;
    this.state = this.getInitialState();
    this.isRealTime = settings.combatMode === "realtime";
  }

  getInitialState() {
    return {
      player: {
        hp: 100,
        maxHp: 100,
        mana: 100,
        maxMana: 100,
        shield: 0,
        cooldowns: {},
        statusEffects: [],
        isDodging: false,
        lastManaRegen: Date.now(),
      },
      bot: {
        hp: 100,
        maxHp: 100,
        mana: 100,
        maxMana: 100,
        shield: 0,
        cooldowns: {},
        statusEffects: [],
        isDodging: false,
        lastManaRegen: Date.now(),
      },
      turn: "player",
      turnCount: 0,
      gameOver: false,
      winner: null,
      lastAction: null,
    };
  }

  getState() {
    return this.state;
  }

  findTool(input) {
    const normalized = input.toLowerCase().trim();
    for (const [key, tool] of Object.entries(TOOLS)) {
      if (tool.aliases.some((alias) => alias === normalized)) {
        return { key, ...tool };
      }
    }
    return null;
  }

  canUseTool(entity, toolKey) {
    const tool = TOOLS[toolKey];
    if (!tool) return { valid: false, reason: "Tool not found" };

    if (toolKey === "dodge" && !this.settings.dodgingEnabled) {
      return { valid: false, reason: "Dodging is disabled" };
    }

    if (entity.mana < tool.manaCost) {
      return { valid: false, reason: "Not enough mana" };
    }

    const cooldownRemaining = entity.cooldowns[toolKey] || 0;
    if (cooldownRemaining > 0) {
      return {
        valid: false,
        reason: `Cooldown: ${cooldownRemaining}${
          this.isRealTime ? "s" : " turns"
        }`,
      };
    }

    return { valid: true };
  }

  useTool(toolInput, isPlayer = true) {
    if (this.state.gameOver) return { success: false, message: "Game is over" };

    // In turn-based, check turn
    if (!this.isRealTime) {
      const currentTurn = isPlayer ? "player" : "bot";
      if (this.state.turn !== currentTurn) {
        return { success: false, message: "Not your turn" };
      }
    }

    const tool = this.findTool(toolInput);
    if (!tool) {
      return { success: false, message: "Unknown tool" };
    }

    const caster = isPlayer ? this.state.player : this.state.bot;
    const target = isPlayer ? this.state.bot : this.state.player;

    const canUse = this.canUseTool(caster, tool.key);
    if (!canUse.valid) {
      return { success: false, message: canUse.reason };
    }

    caster.mana -= tool.manaCost;

    // Set cooldown (time-based for realtime, turn-based otherwise)
    if (this.isRealTime) {
      caster.cooldowns[tool.key] = tool.cooldown; // Will be decremented by time
    } else {
      caster.cooldowns[tool.key] = tool.cooldown;
    }

    const results = [];
    for (const effect of tool.effects) {
      const result = this.applyEffect(effect, caster, target);
      results.push(result);
    }

    this.state.lastAction = {
      caster: isPlayer ? "player" : "bot",
      tool: tool.name,
      toolKey: tool.key,
      results,
      timestamp: Date.now(),
    };

    this.checkGameOver();

    // In turn-based, switch turn
    if (!this.isRealTime && !this.state.gameOver) {
      this.endTurn();
    }

    return {
      success: true,
      tool: tool.name,
      results,
      message: `${tool.name} used!`,
    };
  }

  applyEffect(effect, caster, target) {
    switch (effect.type) {
      case "damage":
        if (target.isDodging) {
          target.isDodging = false;
          return { type: "damage", value: 0, dodged: true };
        }

        let damage = effect.value;
        if (target.shield > 0) {
          const absorbed = Math.min(target.shield, damage);
          target.shield -= absorbed;
          damage -= absorbed;
          if (damage > 0) {
            target.hp = Math.max(0, target.hp - damage);
          }
          return {
            type: "damage",
            value: effect.value,
            absorbed,
            final: damage,
          };
        } else {
          target.hp = Math.max(0, target.hp - damage);
          return { type: "damage", value: damage };
        }

      case "heal":
        const healed = Math.min(effect.value, caster.maxHp - caster.hp);
        caster.hp = Math.min(caster.maxHp, caster.hp + effect.value);
        return { type: "heal", value: healed };

      case "shield":
        caster.shield += effect.value;
        return { type: "shield", value: effect.value };

      case "dodge":
        caster.isDodging = true;
        return { type: "dodge", duration: effect.duration };

      case "slow":
        return { type: "slow", duration: effect.duration };

      default:
        return { type: "unknown" };
    }
  }

  endTurn() {
    for (const entity of [this.state.player, this.state.bot]) {
      for (const key in entity.cooldowns) {
        entity.cooldowns[key] = Math.max(0, entity.cooldowns[key] - 1);
      }
      entity.mana = Math.min(entity.maxMana, entity.mana + 10);

      if (entity.isDodging) {
        entity.isDodging = false;
      }
    }

    this.state.turn = this.state.turn === "player" ? "bot" : "player";
    this.state.turnCount++;
  }

  updateRealTime() {
    const now = Date.now();

    for (const entity of [this.state.player, this.state.bot]) {
      // Regenerate mana over time (10 per second)
      if (now - entity.lastManaRegen >= 1000) {
        entity.mana = Math.min(entity.maxMana, entity.mana + 10);
        entity.lastManaRegen = now;
      }

      // Decrease cooldowns over time
      for (const key in entity.cooldowns) {
        if (entity.cooldowns[key] > 0) {
          const timePassed = (now - (entity.lastCooldownUpdate || now)) / 1000;
          entity.cooldowns[key] = Math.max(
            0,
            entity.cooldowns[key] - timePassed
          );
        }
      }
      entity.lastCooldownUpdate = now;
    }
  }

  checkGameOver() {
    if (this.state.player.hp <= 0) {
      this.state.gameOver = true;
      this.state.winner = "bot";
    } else if (this.state.bot.hp <= 0) {
      this.state.gameOver = true;
      this.state.winner = "player";
    }
  }

  reset() {
    this.state = this.getInitialState();
  }
}
