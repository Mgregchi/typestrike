import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";

// ============================================================================
// SHARED DATA - Tool Definitions
// ============================================================================

const TOOLS = {
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

// ============================================================================
// ENGINE - Game Logic
// ============================================================================

class GameEngine {
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

// ============================================================================
// AI - Bot Controller
// ============================================================================

class BotAI {
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const App = () => {
  const [mount, setMount] = useState(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const playerMeshRef = useRef(null);
  const botMeshRef = useRef(null);
  const animationRef = useRef(null);
  const projectilesRef = useRef([]);
  const animationsRef = useRef([]);
  const realtimeLoopRef = useRef(null);

  const [screen, setScreen] = useState("home");
  const [countdown, setCountdown] = useState(3);
  const [settings, setSettings] = useState({
    dodgingEnabled: false,
    combatMode: "turnbased", // 'turnbased' or 'realtime'
  });
  const [engine, setEngine] = useState(null);
  const [bot, setBot] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Real-time update loop
  useEffect(() => {
    if (!engine || !engine.isRealTime || screen !== "playing") return;

    const interval = setInterval(() => {
      engine.updateRealTime();
      setGameState({ ...engine.getState() });
    }, 100);

    return () => clearInterval(interval);
  }, [engine, screen]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 8, 12);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x16213e,
      roughness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(20, 20, 0x0f3460, 0x0f3460);
    scene.add(gridHelper);

    const playerGroup = new THREE.Group();
    const playerBodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8);
    const playerMaterial = new THREE.MeshStandardMaterial({
      color: 0x4ecca3,
      emissive: 0x2a7f62,
      emissiveIntensity: 0.3,
    });
    const playerBody = new THREE.Mesh(playerBodyGeometry, playerMaterial);
    playerBody.castShadow = true;
    playerGroup.add(playerBody);

    const playerHeadGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const playerHead = new THREE.Mesh(playerHeadGeometry, playerMaterial);
    playerHead.position.y = 1.25;
    playerHead.castShadow = true;
    playerGroup.add(playerHead);

    playerGroup.position.set(-4, 1.5, 0);
    playerGroup.userData.baseY = 1.5;
    scene.add(playerGroup);
    playerMeshRef.current = playerGroup;

    const botGroup = new THREE.Group();
    const botBodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8);
    const botMaterial = new THREE.MeshStandardMaterial({
      color: 0xe63946,
      emissive: 0x8b2835,
      emissiveIntensity: 0.3,
    });
    const botBody = new THREE.Mesh(botBodyGeometry, botMaterial);
    botBody.castShadow = true;
    botGroup.add(botBody);

    const botHeadGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const botHead = new THREE.Mesh(botHeadGeometry, botMaterial);
    botHead.position.y = 1.25;
    botHead.castShadow = true;
    botGroup.add(botHead);

    botGroup.position.set(4, 1.5, 0);
    botGroup.userData.baseY = 1.5;
    scene.add(botGroup);
    botMeshRef.current = botGroup;

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      projectilesRef.current = projectilesRef.current.filter((projectile) => {
        projectile.mesh.position.x += projectile.velocity.x;
        projectile.mesh.position.y += projectile.velocity.y;
        projectile.mesh.position.z += projectile.velocity.z;
        projectile.life--;

        if (!projectile.hit) {
          const targetPos = projectile.target.position;
          const dist = projectile.mesh.position.distanceTo(targetPos);
          if (dist < 1) {
            projectile.hit = true;
            createImpactEffect(
              projectile.mesh.position.clone(),
              projectile.color,
              projectile.dodged
            );
          }
        }

        if (projectile.life <= 0) {
          scene.remove(projectile.mesh);
          return false;
        }
        return true;
      });

      // Update character animations
      animationsRef.current = animationsRef.current.filter((anim) => {
        anim.progress += anim.speed;
        if (anim.progress >= 1) {
          if (anim.onComplete) anim.onComplete();
          return false;
        }
        anim.update(anim.progress);
        return true;
      });

      const time = Date.now() * 0.001;
      if (playerMeshRef.current && !playerMeshRef.current.userData.animating) {
        playerMeshRef.current.position.y =
          playerMeshRef.current.userData.baseY + Math.sin(time * 2) * 0.1;
      }
      if (botMeshRef.current && !botMeshRef.current.userData.animating) {
        botMeshRef.current.position.y =
          botMeshRef.current.userData.baseY +
          Math.sin(time * 2 + Math.PI) * 0.1;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mount && renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [mount]);

  // Character animations
  const animateDodgeJump = (characterMesh) => {
    if (!characterMesh) return;

    const baseY = characterMesh.userData.baseY;
    characterMesh.userData.animating = true;

    animationsRef.current.push({
      progress: 0,
      speed: 0.08,
      update: (t) => {
        // Jump up and down
        const jumpHeight = Math.sin(t * Math.PI) * 2;
        characterMesh.position.y = baseY + jumpHeight;
      },
      onComplete: () => {
        characterMesh.position.y = baseY;
        characterMesh.userData.animating = false;
      },
    });
  };

  // Visual effects
  const createProjectile = (from, to, color, target, dodged = false) => {
    if (!sceneRef.current) return;

    const geometry = new THREE.SphereGeometry(0.3, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.8,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(from);

    const glowGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glow);

    sceneRef.current.add(mesh);

    const direction = new THREE.Vector3().subVectors(to, from).normalize();
    projectilesRef.current.push({
      mesh,
      velocity: direction.multiplyScalar(0.3),
      life: 30,
      target,
      color,
      hit: false,
      dodged,
    });
  };

  const createImpactEffect = (position, color, dodged) => {
    if (!sceneRef.current) return;

    if (dodged) {
      const geometry = new THREE.TorusGeometry(0.8, 0.1, 8, 16);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.8,
      });
      const ring = new THREE.Mesh(geometry, material);
      ring.position.copy(position);
      ring.rotation.x = Math.PI / 2;
      sceneRef.current.add(ring);

      let scale = 1;
      const animateMiss = () => {
        scale += 0.1;
        ring.scale.set(scale, scale, scale);
        material.opacity -= 0.05;
        if (material.opacity > 0) {
          requestAnimationFrame(animateMiss);
        } else {
          sceneRef.current.remove(ring);
        }
      };
      animateMiss();
      return;
    }

    for (let i = 0; i < 12; i++) {
      const geometry = new THREE.SphereGeometry(0.2, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
      });
      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(position);

      const angle = (i / 12) * Math.PI * 2;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * 0.15,
        Math.random() * 0.1,
        Math.sin(angle) * 0.15
      );

      sceneRef.current.add(particle);

      const animateParticle = () => {
        particle.position.add(velocity);
        velocity.y -= 0.01;
        material.opacity -= 0.03;

        if (material.opacity > 0) {
          requestAnimationFrame(animateParticle);
        } else {
          sceneRef.current.remove(particle);
        }
      };
      animateParticle();
    }
  };

  const createShieldEffect = (position) => {
    if (!sceneRef.current) return;

    const geometry = new THREE.SphereGeometry(1.2, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4ecca3,
      transparent: true,
      opacity: 0.4,
      wireframe: true,
    });
    const shield = new THREE.Mesh(geometry, material);
    shield.position.copy(position);
    sceneRef.current.add(shield);

    let scale = 0;
    const animateShield = () => {
      scale += 0.05;
      shield.scale.set(scale, scale, scale);
      material.opacity = 0.6 - scale * 0.3;

      if (scale < 1.5) {
        requestAnimationFrame(animateShield);
      } else {
        sceneRef.current.remove(shield);
      }
    };
    animateShield();
  };

  const createHealEffect = (position) => {
    if (!sceneRef.current) return;

    for (let i = 0; i < 8; i++) {
      const geometry = new THREE.SphereGeometry(0.15, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0x4ecca3,
        transparent: true,
        opacity: 0.8,
      });
      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(position);
      particle.position.y += Math.random() * 2 - 1;
      sceneRef.current.add(particle);

      const targetY = position.y + 3;
      const animateHeal = () => {
        particle.position.y += 0.1;
        material.opacity -= 0.02;

        if (particle.position.y < targetY && material.opacity > 0) {
          requestAnimationFrame(animateHeal);
        } else {
          sceneRef.current.remove(particle);
        }
      };
      setTimeout(() => animateHeal(), i * 50);
    }
  };

  // Handle visual effects
  useEffect(() => {
    if (
      !gameState ||
      !gameState.lastAction ||
      !playerMeshRef.current ||
      !botMeshRef.current
    )
      return;

    const action = gameState.lastAction;
    const fromPos =
      action.caster === "player"
        ? playerMeshRef.current.position
        : botMeshRef.current.position;
    const toPos =
      action.caster === "player"
        ? botMeshRef.current.position
        : playerMeshRef.current.position;
    const targetMesh =
      action.caster === "player" ? botMeshRef.current : playerMeshRef.current;
    const casterMesh =
      action.caster === "player" ? playerMeshRef.current : botMeshRef.current;

    const toolLower = action.tool.toLowerCase();
    const dodged = action.results.some((r) => r.dodged);

    if (toolLower.includes("dodge") || toolLower.includes("jump")) {
      animateDodgeJump(casterMesh);
    } else if (toolLower.includes("ice")) {
      createProjectile(fromPos, toPos, 0x4ecca3, targetMesh, dodged);
    } else if (toolLower.includes("fire")) {
      createProjectile(fromPos, toPos, 0xff6b35, targetMesh, dodged);
    } else if (toolLower.includes("lightning")) {
      createProjectile(fromPos, toPos, 0xffd700, targetMesh, dodged);
    } else if (toolLower.includes("strike")) {
      createProjectile(fromPos, toPos, 0xffffff, targetMesh, dodged);
    } else if (toolLower.includes("shield")) {
      createShieldEffect(fromPos);
    } else if (toolLower.includes("heal")) {
      createHealEffect(fromPos);
    }
  }, [gameState?.lastAction]);

  // Input handling
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);

    if (value.length > 0) {
      const matches = Object.values(TOOLS)
        .filter((tool) => {
          if (tool.key === "dodge" && !settings.dodgingEnabled) return false;
          return tool.aliases.some((alias) =>
            alias.startsWith(value.toLowerCase())
          );
        })
        .slice(0, 5);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || !engine || gameState?.gameOver || screen !== "playing")
      return;

    const result = engine.useTool(input, true);

    if (result.success) {
      const dodged = result.results.some((r) => r.dodged);
      setMessage(
        dodged ? `${result.tool} used but DODGED!` : `You used ${result.tool}!`
      );
      setInput("");
      setSuggestions([]);
      setGameState({ ...engine.getState() });

      // Turn-based: bot responds
      if (
        !engine.isRealTime &&
        engine.getState().turn === "bot" &&
        !engine.getState().gameOver
      ) {
        setTimeout(async () => {
          bot.takeTurn((botResult) => {
            if (botResult.success) {
              const botDodged = botResult.results.some((r) => r.dodged);
              setMessage(
                botDodged
                  ? `Bot used ${botResult.tool} but you DODGED!`
                  : `Bot used ${botResult.tool}!`
              );
            }
            setGameState({ ...engine.getState() });
          });
        }, 500);
      }
    } else {
      setMessage(`❌ ${result.message}`);
      setTimeout(() => setMessage(""), 2000);
    }
  };

  const startNewGame = () => {
    setScreen("countdown");
    setCountdown(3);
    const newEngine = new GameEngine(settings);
    const newBot = new BotAI(newEngine);
    setEngine(newEngine);
    setBot(newBot);
    setGameState(newEngine.getState());
  };

  useEffect(() => {
    if (screen === "countdown" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (screen === "countdown" && countdown === 0) {
      setTimeout(() => {
        setScreen("playing");
        setMessage("FIGHT!");

        // Start real-time bot loop if in real-time mode
        if (engine && engine.isRealTime && bot) {
          bot.startRealTimeLoop((result) => {
            if (result.success) {
              const botDodged = result.results.some((r) => r.dodged);
              setMessage(
                botDodged
                  ? `Bot used ${result.tool} but you DODGED!`
                  : `Bot used ${result.tool}!`
              );
              setGameState({ ...engine.getState() });
            }
          });
        }
      }, 500);
    }
  }, [screen, countdown, engine, bot]);

  const handleReset = () => {
    setScreen("home");
    setEngine(null);
    setBot(null);
    setGameState(null);
    setInput("");
    setMessage("");
  };

  // Home Screen
  if (screen === "home") {
    return (
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        <div
          ref={setMount}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            visibility: "hidden",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontFamily: "monospace",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h1
              style={{
                fontSize: "64px",
                marginBottom: "20px",
                color: "#4ecca3",
                textShadow: "0 0 20px rgba(78,204,163,0.5)",
              }}
            >
              ⚔️ TYPE STRIKE ⚔️
            </h1>
            <p
              style={{
                fontSize: "18px",
                color: "#aaa",
                marginBottom: "50px",
              }}
            >
              Combat through typing
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                alignItems: "center",
              }}
            >
              <button
                onClick={startNewGame}
                style={{
                  padding: "20px 60px",
                  fontSize: "24px",
                  background: "#4ecca3",
                  color: "#0f0f1e",
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  width: "300px",
                }}
              >
                NEW GAME
              </button>

              <button
                onClick={() => setShowHelp(true)}
                style={{
                  padding: "15px 60px",
                  fontSize: "18px",
                  background: "#0f3460",
                  color: "#4ecca3",
                  border: "2px solid #4ecca3",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  width: "300px",
                }}
              >
                HOW TO PLAY
              </button>

              <button
                onClick={() => setShowSettings(true)}
                style={{
                  padding: "15px 60px",
                  fontSize: "18px",
                  background: "#0f3460",
                  color: "#4ecca3",
                  border: "2px solid #4ecca3",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  width: "300px",
                }}
              >
                SETTINGS
              </button>
            </div>
          </div>
        </div>

        {showHelp && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => setShowHelp(false)}
          >
            <div
              style={{
                background: "#1a1a2e",
                padding: "40px",
                borderRadius: "12px",
                maxWidth: "600px",
                maxHeight: "80vh",
                overflowY: "auto",
                border: "2px solid #4ecca3",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                style={{
                  color: "#4ecca3",
                  marginBottom: "20px",
                  fontSize: "32px",
                }}
              >
                How to Play
              </h2>

              <div style={{ marginBottom: "30px" }}>
                <h3
                  style={{
                    color: "#4ecca3",
                    fontSize: "20px",
                    marginBottom: "10px",
                  }}
                >
                  Objective
                </h3>
                <p style={{ color: "#ccc", lineHeight: "1.6" }}>
                  Defeat your opponent by reducing their HP to zero. Type tool
                  names to cast abilities.
                </p>
              </div>

              <div style={{ marginBottom: "30px" }}>
                <h3
                  style={{
                    color: "#4ecca3",
                    fontSize: "20px",
                    marginBottom: "10px",
                  }}
                >
                  Combat Modes
                </h3>
                <p style={{ color: "#ccc", lineHeight: "1.6" }}>
                  <strong>Turn-Based:</strong> Take turns casting abilities.
                  Wait for your turn to act.
                  <br />
                  <br />
                  <strong>Real-Time:</strong> Cast abilities anytime! Faster
                  typists have the advantage. Both you and the bot act
                  simultaneously.
                </p>
              </div>

              <div style={{ marginBottom: "30px" }}>
                <h3
                  style={{
                    color: "#4ecca3",
                    fontSize: "20px",
                    marginBottom: "10px",
                  }}
                >
                  Controls
                </h3>
                <p style={{ color: "#ccc", lineHeight: "1.6" }}>
                  Type the name of a tool and press Enter or click CAST. Use
                  autocomplete suggestions for quick casting.
                </p>
              </div>

              <button
                onClick={() => setShowHelp(false)}
                style={{
                  padding: "15px 40px",
                  fontSize: "18px",
                  background: "#4ecca3",
                  color: "#0f0f1e",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  width: "100%",
                }}
              >
                GOT IT!
              </button>
            </div>
          </div>
        )}

        {showSettings && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => setShowSettings(false)}
          >
            <div
              style={{
                background: "#1a1a2e",
                padding: "40px",
                borderRadius: "12px",
                maxWidth: "500px",
                border: "2px solid #4ecca3",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                style={{
                  color: "#4ecca3",
                  marginBottom: "30px",
                  fontSize: "32px",
                }}
              >
                Settings
              </h2>

              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    color: "#4ecca3",
                    fontWeight: "bold",
                    marginBottom: "10px",
                    fontSize: "18px",
                  }}
                >
                  Combat Mode
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() =>
                      setSettings({ ...settings, combatMode: "turnbased" })
                    }
                    style={{
                      flex: 1,
                      padding: "15px",
                      background:
                        settings.combatMode === "turnbased"
                          ? "#4ecca3"
                          : "#0f3460",
                      color:
                        settings.combatMode === "turnbased"
                          ? "#0f0f1e"
                          : "#4ecca3",
                      border: "2px solid #4ecca3",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    Turn-Based
                  </button>
                  <button
                    onClick={() =>
                      setSettings({ ...settings, combatMode: "realtime" })
                    }
                    style={{
                      flex: 1,
                      padding: "15px",
                      background:
                        settings.combatMode === "realtime"
                          ? "#4ecca3"
                          : "#0f3460",
                      color:
                        settings.combatMode === "realtime"
                          ? "#0f0f1e"
                          : "#4ecca3",
                      border: "2px solid #4ecca3",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    Real-Time
                  </button>
                </div>
                <div
                  style={{ color: "#aaa", fontSize: "12px", marginTop: "10px" }}
                >
                  {settings.combatMode === "turnbased"
                    ? "Take turns to attack. Strategic and methodical."
                    : "Act anytime! Fast typing wins. More intense action."}
                </div>
              </div>

              <div style={{ marginBottom: "30px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                    padding: "15px",
                    background: "#0f3460",
                    borderRadius: "8px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={settings.dodgingEnabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        dodgingEnabled: e.target.checked,
                      })
                    }
                    style={{
                      width: "20px",
                      height: "20px",
                      marginRight: "15px",
                      cursor: "pointer",
                    }}
                  />
                  <div>
                    <div
                      style={{
                        color: "#4ecca3",
                        fontWeight: "bold",
                        marginBottom: "5px",
                      }}
                    >
                      Enable Dodging
                    </div>
                    <div style={{ color: "#aaa", fontSize: "14px" }}>
                      Allow players to dodge attacks by typing "dodge" or "jump"
                    </div>
                  </div>
                </label>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                style={{
                  padding: "15px 40px",
                  fontSize: "18px",
                  background: "#4ecca3",
                  color: "#0f0f1e",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  width: "100%",
                }}
              >
                SAVE
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Countdown Screen
  if (screen === "countdown") {
    return (
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        <div ref={setMount} style={{ width: "100%", height: "100%" }} />
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
            zIndex: 100,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontSize: countdown > 0 ? "120px" : "80px",
              color: "#4ecca3",
              fontWeight: "bold",
              fontFamily: "monospace",
              textShadow: "0 0 40px rgba(78,204,163,0.8)",
            }}
          >
            {countdown > 0 ? countdown : "FIGHT!"}
          </div>
        </div>
      </div>
    );
  }

  // Playing Screen
  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0f0f1e",
        color: "#fff",
        fontFamily: "monospace",
      }}
    >
      <div ref={setMount} style={{ flex: 1, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            background: "rgba(0,0,0,0.7)",
            padding: "15px",
            borderRadius: "8px",
            minWidth: "200px",
          }}
        >
          <div
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              color: "#4ecca3",
              marginBottom: "10px",
            }}
          >
            YOU
          </div>
          <div style={{ marginBottom: "5px" }}>
            HP:{" "}
            <span
              style={{
                color: gameState.player.hp > 50 ? "#4ecca3" : "#e63946",
              }}
            >
              {gameState.player.hp}/{gameState.player.maxHp}
            </span>
          </div>
          <div style={{ marginBottom: "5px" }}>
            Mana:{" "}
            <span style={{ color: "#4ecca3" }}>
              {Math.floor(gameState.player.mana)}/{gameState.player.maxMana}
            </span>
          </div>
          {gameState.player.shield > 0 && (
            <div style={{ color: "#4ecca3" }}>
              Shield: {gameState.player.shield}
            </div>
          )}
          {gameState.player.isDodging && (
            <div style={{ color: "#ffff00" }}>🛡️ READY TO DODGE</div>
          )}
        </div>

        <div
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "rgba(0,0,0,0.7)",
            padding: "15px",
            borderRadius: "8px",
            minWidth: "200px",
            textAlign: "right",
          }}
        >
          <div
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              color: "#e63946",
              marginBottom: "10px",
            }}
          >
            BOT
          </div>
          <div style={{ marginBottom: "5px" }}>
            HP:{" "}
            <span
              style={{
                color: gameState.bot.hp > 50 ? "#4ecca3" : "#e63946",
              }}
            >
              {gameState.bot.hp}/{gameState.bot.maxHp}
            </span>
          </div>
          <div style={{ marginBottom: "5px" }}>
            Mana:{" "}
            <span style={{ color: "#e63946" }}>
              {Math.floor(gameState.bot.mana)}/{gameState.bot.maxMana}
            </span>
          </div>
          {gameState.bot.shield > 0 && (
            <div style={{ color: "#e63946" }}>
              Shield: {gameState.bot.shield}
            </div>
          )}
          {gameState.bot.isDodging && (
            <div style={{ color: "#ffff00" }}>🛡️ READY TO DODGE</div>
          )}
        </div>

        <div
          style={{
            position: "absolute",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.7)",
            padding: "10px 20px",
            borderRadius: "8px",
          }}
        >
          {gameState.gameOver ? (
            <span
              style={{ color: "#ffd700", fontWeight: "bold", fontSize: "20px" }}
            >
              {gameState.winner === "player" ? "🎉 VICTORY!" : "💀 DEFEAT"}
            </span>
          ) : (
            <span
              style={{
                color: engine.isRealTime
                  ? "#ffd700"
                  : gameState.turn === "player"
                  ? "#4ecca3"
                  : "#e63946",
                fontWeight: "bold",
                fontSize: "16px",
              }}
            >
              {engine.isRealTime
                ? "⚡ REAL-TIME MODE"
                : gameState.turn === "player"
                ? "YOUR TURN"
                : "BOT'S TURN"}
            </span>
          )}
        </div>

        <button
          onClick={() => setShowHelp(true)}
          style={{
            position: "absolute",
            top: 20,
            right: "50%",
            transform: "translateX(130px)",
            background: "rgba(0,0,0,0.7)",
            color: "#4ecca3",
            border: "2px solid #4ecca3",
            padding: "8px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          HELP
        </button>
      </div>

      <div
        style={{
          background: "#1a1a2e",
          padding: "20px",
          borderTop: "2px solid #0f3460",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "10px",
            fontSize: "16px",
            color: "#4ecca3",
            minHeight: "24px",
          }}
        >
          {message}
        </div>

        {suggestions.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              marginBottom: "10px",
              flexWrap: "wrap",
            }}
          >
            {suggestions.map((tool, idx) => (
              <button
                key={idx}
                onClick={() => setInput(tool.name.toLowerCase())}
                style={{
                  background: "#0f3460",
                  color: "#4ecca3",
                  border: "1px solid #4ecca3",
                  padding: "5px 15px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                {tool.name}
              </button>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "10px",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSubmit();
              }
            }}
            placeholder="Type a tool name..."
            disabled={
              gameState.gameOver ||
              (!engine.isRealTime && gameState.turn !== "player")
            }
            style={{
              flex: 1,
              padding: "15px",
              fontSize: "18px",
              background: "#0f0f1e",
              color: "#fff",
              border: "2px solid #4ecca3",
              borderRadius: "8px",
              outline: "none",
            }}
            autoFocus
          />
          <button
            onClick={handleSubmit}
            disabled={
              gameState.gameOver ||
              (!engine.isRealTime && gameState.turn !== "player")
            }
            style={{
              padding: "15px 30px",
              fontSize: "18px",
              background: "#4ecca3",
              color: "#0f0f1e",
              border: "none",
              borderRadius: "8px",
              cursor:
                gameState.gameOver ||
                (!engine.isRealTime && gameState.turn !== "player")
                  ? "not-allowed"
                  : "pointer",
              fontWeight: "bold",
              opacity:
                gameState.gameOver ||
                (!engine.isRealTime && gameState.turn !== "player")
                  ? 0.5
                  : 1,
            }}
          >
            CAST
          </button>
          {gameState.gameOver && (
            <button
              onClick={handleReset}
              style={{
                padding: "15px 30px",
                fontSize: "18px",
                background: "#e63946",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              MENU
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
