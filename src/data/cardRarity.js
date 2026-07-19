export const CARD_RARITY = Object.freeze({
  common: Object.freeze({
    displayName: "Common",
    key: "common",
    accentColor: "#E8DFC8",
    borderColor: "#B9B3A5",
    glowColor: "rgba(232, 223, 200, 0.14)",
    labelColor: "#F4EBD7",
    foilIntensity: 0,
    motionIntensity: 0,
    rewardRevealClass: "rarity-reveal-common",
    collectionFilterColor: "#D6CDB8",
    shopBadgeColor: "#C8BEA8",
  }),
  uncommon: Object.freeze({
    displayName: "Uncommon",
    key: "uncommon",
    accentColor: "#2F8F68",
    borderColor: "#4FA77F",
    glowColor: "rgba(47, 143, 104, 0.28)",
    labelColor: "#A9E3C7",
    foilIntensity: 0.08,
    motionIntensity: 0,
    rewardRevealClass: "rarity-reveal-uncommon",
    collectionFilterColor: "#3E9C75",
    shopBadgeColor: "#397F61",
  }),
  rare: Object.freeze({
    displayName: "Rare",
    key: "rare",
    accentColor: "#3E7EDB",
    borderColor: "#5B91E5",
    glowColor: "rgba(62, 126, 219, 0.32)",
    labelColor: "#B8D4FF",
    foilIntensity: 0.24,
    motionIntensity: 0.55,
    rewardRevealClass: "rarity-reveal-rare",
    collectionFilterColor: "#4A84D8",
    shopBadgeColor: "#3569B0",
  }),
  epic: Object.freeze({
    displayName: "Epic",
    key: "epic",
    accentColor: "#7C4FC6",
    borderColor: "#9870D6",
    glowColor: "rgba(124, 79, 198, 0.38)",
    labelColor: "#D8C3FF",
    foilIntensity: 0.38,
    motionIntensity: 0.75,
    rewardRevealClass: "rarity-reveal-epic",
    collectionFilterColor: "#895DC9",
    shopBadgeColor: "#6842A8",
  }),
  legendary: Object.freeze({
    displayName: "Legendary",
    key: "legendary",
    accentColor: "#D4A63B",
    borderColor: "#E8C66A",
    glowColor: "rgba(212, 166, 59, 0.44)",
    labelColor: "#FFE6A3",
    foilIntensity: 0.48,
    motionIntensity: 0.9,
    rewardRevealClass: "rarity-reveal-legendary",
    collectionFilterColor: "#D5A83F",
    shopBadgeColor: "#B8892D",
  }),
  mythic: Object.freeze({
    displayName: "Mythic",
    key: "mythic",
    accentColor: "#9E273B",
    borderColor: "#C64A57",
    glowColor: "rgba(198, 74, 87, 0.44)",
    labelColor: "#FFDDE2",
    foilIntensity: 0.56,
    motionIntensity: 1,
    rewardRevealClass: "rarity-reveal-mythic",
    collectionFilterColor: "#A83245",
    shopBadgeColor: "#842033",
    futureOnly: true,
  }),
});

export const ACTIVE_CARD_RARITIES = Object.freeze([
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
]);

export const FUTURE_CARD_RARITIES = Object.freeze(["mythic"]);

export function getCardRarity(rarity) {
  return CARD_RARITY[rarity] || CARD_RARITY.common;
}

export function getRarityCssVariables(rarity) {
  const config = getCardRarity(rarity);
  return {
    "--rarity-accent": config.accentColor,
    "--rarity-border": config.borderColor,
    "--rarity-glow": config.glowColor,
    "--rarity-label": config.labelColor,
    "--rarity-foil": config.foilIntensity,
    "--rarity-motion": config.motionIntensity,
    "--rarity-glow-size": `${5 + 14 * config.foilIntensity}px`,
    "--rarity-glint-opacity": config.foilIntensity * 0.7,
    "--rarity-glint-low": config.foilIntensity * 0.2,
    "--rarity-glint-high": config.foilIntensity * 0.72,
    "--rarity-reduced-foil": config.foilIntensity * 0.42,
    "--rarity-rim-opacity": 0.35 + config.foilIntensity,
  };
}
