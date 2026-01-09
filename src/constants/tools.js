// ============================================================================
// SHARED DATA - Tool Definitions
// ============================================================================

export const TOOLS = {
  iceball: {
    name: "Ice Ball",
    aliases: ["ice ball", "iceball", "ice"],
    type: "attack",
    manaCost: 20,
    cooldown: 2,
    effects: [
      { type: "damage", value: 25 },
      { type: "slow", duration: 1, value: 0.5 },
    ],
    description: "Launch a freezing projectile",
  },
  fireball: {
    name: "Fireball",
    aliases: ["fireball", "fire ball", "fire"],
    type: "attack",
    manaCost: 30,
    cooldown: 3,
    effects: [{ type: "damage", value: 40 }],
    description: "Cast a powerful fire blast",
  },
  shield: {
    name: "Shield",
    aliases: ["shield", "defend", "block"],
    type: "defense",
    manaCost: 15,
    cooldown: 4,
    effects: [{ type: "shield", value: 30, duration: 2 }],
    description: "Create a protective barrier",
  },
  heal: {
    name: "Heal",
    aliases: ["heal", "restore", "mend"],
    type: "utility",
    manaCost: 25,
    cooldown: 5,
    effects: [{ type: "heal", value: 35 }],
    description: "Restore health",
  },
  lightning: {
    name: "Lightning",
    aliases: ["lightning", "bolt", "shock"],
    type: "attack",
    manaCost: 35,
    cooldown: 4,
    effects: [{ type: "damage", value: 50 }],
    description: "Strike with lightning",
  },
  strike: {
    name: "Strike",
    aliases: ["strike", "hit", "attack"],
    type: "attack",
    manaCost: 10,
    cooldown: 1,
    effects: [{ type: "damage", value: 15 }],
    description: "Quick melee attack",
  },
  dodge: {
    name: "Dodge",
    aliases: ["dodge", "evade", "avoid", "jump"],
    type: "defense",
    manaCost: 10,
    cooldown: 2,
    effects: [{ type: "dodge", duration: 1 }],
    description: "Jump to evade the next attack",
  },
};
