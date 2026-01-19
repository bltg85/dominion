// Korttyper
export const CardType = {
  TREASURE: 'treasure',
  VICTORY: 'victory',
  ACTION: 'action',
  ATTACK: 'attack',
  REACTION: 'reaction',
  CURSE: 'curse',
};

// Alla kort i spelet (Dominion Base Set)
export const cards = {
  // === TREASURE ===
  copper: {
    id: 'copper',
    name: 'Copper',
    type: [CardType.TREASURE],
    cost: 0,
    coins: 1,
    description: '+$1',
  },
  silver: {
    id: 'silver',
    name: 'Silver',
    type: [CardType.TREASURE],
    cost: 3,
    coins: 2,
    description: '+$2',
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    type: [CardType.TREASURE],
    cost: 6,
    coins: 3,
    description: '+$3',
  },

  // === VICTORY ===
  estate: {
    id: 'estate',
    name: 'Estate',
    type: [CardType.VICTORY],
    cost: 2,
    victoryPoints: 1,
    description: '1 VP',
  },
  duchy: {
    id: 'duchy',
    name: 'Duchy',
    type: [CardType.VICTORY],
    cost: 5,
    victoryPoints: 3,
    description: '3 VP',
  },
  province: {
    id: 'province',
    name: 'Province',
    type: [CardType.VICTORY],
    cost: 8,
    victoryPoints: 6,
    description: '6 VP',
  },

  // === CURSE ===
  curse: {
    id: 'curse',
    name: 'Curse',
    type: [CardType.CURSE],
    cost: 0,
    victoryPoints: -1,
    description: '-1 VP',
  },

  // === KINGDOM CARDS (2 cost) ===
  cellar: {
    id: 'cellar',
    name: 'Cellar',
    type: [CardType.ACTION],
    cost: 2,
    description: '+1 Action. Discard any number of cards, then draw that many.',
    effect: () => ({ actionsToAdd: 1, special: 'cellar' }),
  },
  chapel: {
    id: 'chapel',
    name: 'Chapel',
    type: [CardType.ACTION],
    cost: 2,
    description: 'Trash up to 4 cards from your hand.',
    effect: () => ({ special: 'chapel' }),
  },
  moat: {
    id: 'moat',
    name: 'Moat',
    type: [CardType.ACTION, CardType.REACTION],
    cost: 2,
    description: '+2 Cards. (Reaction: Reveal to block attacks)',
    effect: () => ({ cardsToDraw: 2 }),
  },

  // === KINGDOM CARDS (3 cost) ===
  harbinger: {
    id: 'harbinger',
    name: 'Harbinger',
    type: [CardType.ACTION],
    cost: 3,
    description: '+1 Card, +1 Action. Look through your discard pile. You may put a card onto your deck.',
    effect: () => ({ cardsToDraw: 1, actionsToAdd: 1, special: 'harbinger' }),
  },
  merchant: {
    id: 'merchant',
    name: 'Merchant',
    type: [CardType.ACTION],
    cost: 3,
    description: '+1 Card, +1 Action. The first time you play a Silver this turn, +$1.',
    effect: () => ({ cardsToDraw: 1, actionsToAdd: 1, special: 'merchant' }),
  },
  vassal: {
    id: 'vassal',
    name: 'Vassal',
    type: [CardType.ACTION],
    cost: 3,
    description: '+$2. Discard the top card of your deck. If it is an Action, you may play it.',
    effect: () => ({ coinsToAdd: 2, special: 'vassal' }),
  },
  village: {
    id: 'village',
    name: 'Village',
    type: [CardType.ACTION],
    cost: 3,
    description: '+1 Card, +2 Actions',
    effect: () => ({ cardsToDraw: 1, actionsToAdd: 2 }),
  },
  workshop: {
    id: 'workshop',
    name: 'Workshop',
    type: [CardType.ACTION],
    cost: 3,
    description: 'Gain a card costing up to $4.',
    effect: () => ({ special: 'workshop' }),
  },

  // === KINGDOM CARDS (4 cost) ===
  bureaucrat: {
    id: 'bureaucrat',
    name: 'Bureaucrat',
    type: [CardType.ACTION, CardType.ATTACK],
    cost: 4,
    description: 'Gain a Silver onto your deck. Each other player reveals a Victory card and puts it onto their deck.',
    effect: () => ({ special: 'bureaucrat', attack: 'bureaucrat' }),
  },
  gardens: {
    id: 'gardens',
    name: 'Gardens',
    type: [CardType.VICTORY],
    cost: 4,
    victoryPoints: 0, // Calculated dynamically
    description: 'Worth 1 VP per 10 cards you have (round down).',
    dynamicVP: true,
  },
  militia: {
    id: 'militia',
    name: 'Militia',
    type: [CardType.ACTION, CardType.ATTACK],
    cost: 4,
    description: '+$2. Each other player discards down to 3 cards.',
    effect: () => ({ coinsToAdd: 2, attack: 'discardTo3' }),
  },
  moneylender: {
    id: 'moneylender',
    name: 'Moneylender',
    type: [CardType.ACTION],
    cost: 4,
    description: 'You may trash a Copper from your hand for +$3.',
    effect: () => ({ special: 'moneylender' }),
  },
  poacher: {
    id: 'poacher',
    name: 'Poacher',
    type: [CardType.ACTION],
    cost: 4,
    description: '+1 Card, +1 Action, +$1. Discard a card per empty Supply pile.',
    effect: () => ({ cardsToDraw: 1, actionsToAdd: 1, coinsToAdd: 1, special: 'poacher' }),
  },
  remodel: {
    id: 'remodel',
    name: 'Remodel',
    type: [CardType.ACTION],
    cost: 4,
    description: 'Trash a card from your hand. Gain a card costing up to $2 more than it.',
    effect: () => ({ special: 'remodel' }),
  },
  smithy: {
    id: 'smithy',
    name: 'Smithy',
    type: [CardType.ACTION],
    cost: 4,
    description: '+3 Cards',
    effect: () => ({ cardsToDraw: 3 }),
  },
  throneRoom: {
    id: 'throneRoom',
    name: 'Throne Room',
    type: [CardType.ACTION],
    cost: 4,
    description: 'You may play an Action card from your hand twice.',
    effect: () => ({ special: 'throneRoom' }),
  },

  // === KINGDOM CARDS (5 cost) ===
  bandit: {
    id: 'bandit',
    name: 'Bandit',
    type: [CardType.ACTION, CardType.ATTACK],
    cost: 5,
    description: 'Gain a Gold. Each other player reveals the top 2 cards of their deck, trashes a revealed Treasure other than Copper, and discards the rest.',
    effect: () => ({ special: 'bandit', attack: 'bandit' }),
  },
  councilRoom: {
    id: 'councilRoom',
    name: 'Council Room',
    type: [CardType.ACTION],
    cost: 5,
    description: '+4 Cards, +1 Buy. Each other player draws a card.',
    effect: () => ({ cardsToDraw: 4, buysToAdd: 1, special: 'councilRoom' }),
  },
  festival: {
    id: 'festival',
    name: 'Festival',
    type: [CardType.ACTION],
    cost: 5,
    description: '+2 Actions, +1 Buy, +$2',
    effect: () => ({ actionsToAdd: 2, buysToAdd: 1, coinsToAdd: 2 }),
  },
  laboratory: {
    id: 'laboratory',
    name: 'Laboratory',
    type: [CardType.ACTION],
    cost: 5,
    description: '+2 Cards, +1 Action',
    effect: () => ({ cardsToDraw: 2, actionsToAdd: 1 }),
  },
  library: {
    id: 'library',
    name: 'Library',
    type: [CardType.ACTION],
    cost: 5,
    description: 'Draw until you have 7 cards in hand, skipping any Action cards you choose to.',
    effect: () => ({ special: 'library' }),
  },
  market: {
    id: 'market',
    name: 'Market',
    type: [CardType.ACTION],
    cost: 5,
    description: '+1 Card, +1 Action, +1 Buy, +$1',
    effect: () => ({ cardsToDraw: 1, actionsToAdd: 1, buysToAdd: 1, coinsToAdd: 1 }),
  },
  mine: {
    id: 'mine',
    name: 'Mine',
    type: [CardType.ACTION],
    cost: 5,
    description: 'You may trash a Treasure from your hand. Gain a Treasure to your hand costing up to $3 more than it.',
    effect: () => ({ special: 'mine' }),
  },
  sentry: {
    id: 'sentry',
    name: 'Sentry',
    type: [CardType.ACTION],
    cost: 5,
    description: '+1 Card, +1 Action. Look at the top 2 cards of your deck. Trash and/or discard any. Put the rest back in any order.',
    effect: () => ({ cardsToDraw: 1, actionsToAdd: 1, special: 'sentry' }),
  },
  witch: {
    id: 'witch',
    name: 'Witch',
    type: [CardType.ACTION, CardType.ATTACK],
    cost: 5,
    description: '+2 Cards. Each other player gains a Curse.',
    effect: () => ({ cardsToDraw: 2, attack: 'curse' }),
  },

  // === KINGDOM CARDS (6 cost) ===
  artisan: {
    id: 'artisan',
    name: 'Artisan',
    type: [CardType.ACTION],
    cost: 6,
    description: 'Gain a card to your hand costing up to $5. Put a card from your hand onto your deck.',
    effect: () => ({ special: 'artisan' }),
  },
};

// Hämta ett kort baserat på ID
export const getCard = (cardId) => cards[cardId];

// Kontrollera om ett kort är av en viss typ
export const isCardType = (card, type) => card.type.includes(type);

// Lista över alla kingdom-kort
export const kingdomCards = [
  'cellar', 'chapel', 'moat',
  'harbinger', 'merchant', 'vassal', 'village', 'workshop',
  'bureaucrat', 'gardens', 'militia', 'moneylender', 'poacher', 'remodel', 'smithy', 'throneRoom',
  'bandit', 'councilRoom', 'festival', 'laboratory', 'library', 'market', 'mine', 'sentry', 'witch',
  'artisan',
];

// Välj 10 slumpmässiga kingdom-kort för ett spel
export const selectKingdomCards = (count = 10) => {
  const shuffled = [...kingdomCards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};
