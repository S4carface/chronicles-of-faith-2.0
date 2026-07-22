// Pure resolution of Story Choice / blessing stat effects into a run-state patch.
//
// This exists so effect mapping is testable and lives in one place. It returns
// a partial object to merge into the run (via updateRun); it never mutates.
//
// IMPORTANT effect-field mapping (fixes the earlier bug where Faith and Block
// rewards both wrote to buffAttack):
//   - "faith"       → startFaithNext  (extra starting Faith for the next battle)
//   - "block"       → startBlockNext  (starting Block for the next battle)
//   - "buff_attack" → buffAttack      (next attack damage buff — unchanged)
//   - "heal"        → playerHp (+, capped at maxHp)
//   - "damage"      → playerHp (−, floored at 1)
//   - effect.gold   → gold (+)
// Card grants (miracle_card / cardReward / card_upgrade) and story bookkeeping
// are handled by the caller, since they have side effects beyond stat state.

export function applyStoryEffect(run, effect) {
  const update = {};
  if (!effect) return update;

  switch (effect.type) {
    case "faith":
      // Advertised as Faith for the next battle — grant starting Faith, not attack.
      update.startFaithNext = (run.startFaithNext || 0) + effect.value;
      break;
    case "block":
      // Advertised as Block for the next battle — grant starting Block, not attack.
      update.startBlockNext = (run.startBlockNext || 0) + effect.value;
      break;
    case "buff_attack":
      update.buffAttack = (run.buffAttack || 0) + effect.value;
      break;
    case "heal":
      update.playerHp = Math.min(run.maxHp, run.playerHp + effect.value);
      break;
    case "damage":
      update.playerHp = Math.max(1, run.playerHp + effect.value);
      break;
    default:
      break;
  }

  if (effect.gold) {
    update.gold = (run.gold || 0) + effect.gold;
  }

  return update;
}
