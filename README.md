# Type Strike

Type Strike is a **text-driven combat game** where players fight each other (or AI bots) by **typing the names of tools and abilities** instead of using traditional key-based controls.

Typing is not just input — it is the **core gameplay mechanic**. Speed, accuracy, and decision-making directly affect combat outcomes.

The project combines **game logic**, **typing mechanics**, and **Three.js-powered visuals** into a clean, scalable architecture suitable for both single-player and multiplayer gameplay.

---

## Core Idea

Instead of pressing buttons like `A`, `B`, or `X`, players cast actions by typing commands such as:

* `ice ball`
* `shield`
* `fire blast`

When a valid tool name is typed and submitted:

1. The game engine validates the command
2. The combat logic resolves the action
3. The renderer visualizes the result (projectiles, shields, effects)

This creates a unique blend of:

* Strategy
* Typing skill
* Tactical decision-making

---

## Key Features

* **Typing-based combat system**
* **Tool-driven gameplay** (abilities are treated as tools)
* **Turn-based combat (MVP)** with real-time support planned
* **AI bot opponents**
* **Multiplayer-ready architecture**
* **Three.js visual rendering**
* **Shared tool definitions between client and server**

---

## Gameplay Overview

### Basic Combat Flow (Turn-Based)

1. Player is presented with:

   * Current HP and mana
   * Available tools
   * Tool cooldowns
2. Player types a tool name and submits
3. The engine validates:

   * Tool exists
   * Tool is owned by the player
   * Resource and cooldown requirements are met
4. Combat effects are applied
5. Visual effects are rendered
6. Turn passes to the opponent

---

## Tools System

Tools are the foundation of the game.

Each tool represents an action such as attacking, defending, or applying a status effect.

### Tool Characteristics

* Name and aliases (to support flexible typing)
* Type (attack, defense, utility)
* Resource cost (mana, stamina)
* Cooldown
* Cast time
* One or more effects (damage, freeze, shield, etc.)

Tools are:

* Defined in shared data files
* Loaded by both client and server
* Used for validation, AI decisions, autocomplete, and rendering

---

## Typing Mechanics

Typing is treated as a **skill**, not just input.

### Input Handling

* Commands are normalized and matched against known tools
* Aliases and partial matches are supported
* Invalid or mistyped commands fail gracefully

### Optional Advanced Mechanics

* Typing speed bonuses
* Accuracy-based damage scaling
* Combo chains for fast, correct inputs
* Mistype penalties (delays, wasted turns, or mana loss)

---

## Game Logic vs Rendering (Important Design Rule)

The project enforces a **strict separation** between:

### Game Engine (Logic)

* Validates commands
* Applies combat rules
* Calculates damage and effects
* Manages turns, cooldowns, and status effects
* Determines win/loss conditions

### Renderer (Three.js)

* Displays characters and arena
* Animates spells and effects
* Shows visual feedback for actions
* Never decides game outcomes

This separation ensures:

* Fair multiplayer gameplay
* Server authority
* Easier testing and scaling

---

## Visual Design Philosophy

The game favors **clarity over realism**.

* Simple arena layout
* Stylized characters
* Clear spell effects
* Minimal UI clutter

Visuals are meant to:

* Reinforce typed actions
* Make combat readable
* Provide satisfying feedback

---

## AI Bots

Bots use the same tool system as players.

They:

* Select tools based on game state
* Simulate human reaction delays
* Respect cooldowns and resources

Difficulty levels control:

* Decision quality
* Reaction time
* Mistake probability

---

## Multiplayer Architecture (Planned)

The architecture is designed for multiplayer from the start.

* Server is authoritative
* Clients submit typed commands
* Server validates and resolves combat
* Clients only render results

This prevents cheating and allows:

* Ranked matches
* Spectators
* Replays

---

## Project Structure Philosophy

The project is organized around **responsibility**, not technology:

* **Engine** → rules and logic
* **Input** → typing and parsing
* **Renderer** → visuals only
* **AI** → bot decision-making
* **Network** → multiplayer sync
* **Shared** → common definitions

This structure allows:

* Independent development
* Easier testing
* Future expansion

---

## MVP Scope

The initial MVP focuses on:

* Turn-based combat
* Single arena
* Limited tool set
* AI opponent
* Local gameplay

Multiplayer, rankings, and real-time combat are planned future phases.

---

## Who This Project Is For

* Developers interested in **game architecture**
* Experimentation with **alternative input mechanics**
* Typing-based or educational game design
* Multiplayer game systems
* Three.js-based interactive experiences

---

## Design Goals

* Simple to understand, hard to master
* Skill-based, not button-mashing
* Fair and deterministic combat
* Visually expressive without heavy assets
* Scalable from MVP to full product

---

## Roadmap (High-Level)

* MVP turn-based combat
* Expanded tool library
* Real-time combat mode
* Online multiplayer
* Rankings and progression
* Accessibility and mobile support

---

## Final Note

Type Strike is not just a game — it’s an exploration of **typing as a primary game mechanic**.

Contributors are encouraged to:

* Respect the separation of concerns
* Keep logic deterministic
* Treat typing as a first-class system
* Prioritize clarity over complexity

Welcome to the arena ⚔️
