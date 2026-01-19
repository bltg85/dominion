import { cards, getCard, isCardType, CardType, selectKingdomCards } from '../data/cards';

// Skapa initial supply
export const createSupply = (numPlayers = 2, selectedKingdom) => {
  const victoryCards = numPlayers === 2 ? 8 : 12;
  const curseCards = (numPlayers - 1) * 10;

  const supply = {
    // Basic cards
    copper: 60 - (numPlayers * 7),
    silver: 40,
    gold: 30,
    estate: victoryCards,
    duchy: victoryCards,
    province: victoryCards,
    curse: curseCards,
  };

  // Add kingdom cards
  selectedKingdom.forEach(cardId => {
    supply[cardId] = cardId === 'gardens' ? victoryCards : 10;
  });

  return supply;
};

// Skapa en spelares startlek
export const createStartingDeck = () => {
  const deck = [];
  for (let i = 0; i < 7; i++) deck.push('copper');
  for (let i = 0; i < 3; i++) deck.push('estate');
  return shuffle([...deck]);
};

// Blanda en array
export const shuffle = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Skapa initial spelstate
export const createGameState = (selectedKingdom = null) => {
  const kingdom = selectedKingdom || selectKingdomCards(10);
  const player1Deck = createStartingDeck();
  const player2Deck = createStartingDeck();

  return {
    supply: createSupply(2, kingdom),
    kingdom: kingdom,
    trash: [],
    players: [
      {
        id: 0,
        name: 'You',
        deck: player1Deck.slice(5),
        hand: player1Deck.slice(0, 5),
        discard: [],
        playArea: [],
        isAI: false,
      },
      {
        id: 1,
        name: 'AI',
        deck: player2Deck.slice(5),
        hand: player2Deck.slice(0, 5),
        discard: [],
        playArea: [],
        isAI: true,
      },
    ],
    currentPlayer: 0,
    phase: 'action',
    actions: 1,
    buys: 1,
    coins: 0,
    turn: 1,
    gameOver: false,
    winner: null,
    log: ['Game started! Your turn.'],
    // Special state for interactive effects
    pendingEffect: null,
    merchantBonus: false, // For Merchant card
  };
};

// Dra kort från leken
export const drawCards = (state, playerIndex, count) => {
  const newState = { ...state };
  const player = { ...newState.players[playerIndex] };
  player.deck = [...player.deck];
  player.hand = [...player.hand];
  player.discard = [...player.discard];

  for (let i = 0; i < count; i++) {
    if (player.deck.length === 0) {
      if (player.discard.length === 0) break;
      player.deck = shuffle([...player.discard]);
      player.discard = [];
    }
    if (player.deck.length > 0) {
      const card = player.deck.pop();
      player.hand.push(card);
    }
  }

  newState.players = [...state.players];
  newState.players[playerIndex] = player;
  return newState;
};

// Spela ett action-kort
export const playAction = (state, cardIndex) => {
  if (state.phase !== 'action' || state.actions <= 0) {
    return state;
  }

  const player = state.players[state.currentPlayer];
  const cardId = player.hand[cardIndex];
  const card = getCard(cardId);

  if (!isCardType(card, CardType.ACTION)) {
    return state;
  }

  let newState = { ...state };
  const newPlayer = { ...player };

  // Flytta kortet till spelytan
  newPlayer.hand = [...player.hand];
  newPlayer.hand.splice(cardIndex, 1);
  newPlayer.playArea = [...player.playArea, cardId];

  newState.players = [...state.players];
  newState.players[state.currentPlayer] = newPlayer;
  newState.actions = state.actions - 1;
  newState.log = [...state.log, `${player.name} plays ${card.name}`];

  // Applicera kortets effekt
  if (card.effect) {
    const effect = card.effect(newState);
    newState = applyEffect(newState, effect, cardId);
  }

  return newState;
};

// Applicera en korteffekt
const applyEffect = (state, effect, cardId) => {
  let newState = { ...state };

  if (effect.cardsToDraw) {
    newState = drawCards(newState, state.currentPlayer, effect.cardsToDraw);
  }
  if (effect.actionsToAdd) {
    newState.actions += effect.actionsToAdd;
  }
  if (effect.buysToAdd) {
    newState.buys += effect.buysToAdd;
  }
  if (effect.coinsToAdd) {
    newState.coins += effect.coinsToAdd;
  }
  if (effect.attack) {
    newState = handleAttack(newState, effect.attack);
  }
  if (effect.special) {
    newState = handleSpecialEffect(newState, effect.special, cardId);
  }

  return newState;
};

// Hantera speciella korteffekter
const handleSpecialEffect = (state, specialType, cardId) => {
  let newState = { ...state };
  const player = state.players[state.currentPlayer];

  switch (specialType) {
    case 'moneylender': {
      // Auto-trash Copper if player has one
      const copperIndex = player.hand.indexOf('copper');
      if (copperIndex !== -1) {
        const newPlayer = { ...player };
        newPlayer.hand = [...player.hand];
        newPlayer.hand.splice(copperIndex, 1);
        newState.players = [...state.players];
        newState.players[state.currentPlayer] = newPlayer;
        newState.trash = [...state.trash, 'copper'];
        newState.coins += 3;
        newState.log = [...newState.log, `${player.name} trashes a Copper for +$3`];
      }
      break;
    }

    case 'merchant': {
      newState.merchantBonus = true;
      break;
    }

    case 'cellar': {
      // For AI: discard victory cards and redraw
      if (player.isAI) {
        const newPlayer = { ...player };
        newPlayer.hand = [...player.hand];
        newPlayer.discard = [...player.discard];
        const toDiscard = newPlayer.hand.filter(id => {
          const c = getCard(id);
          return isCardType(c, CardType.VICTORY) || isCardType(c, CardType.CURSE);
        });
        newPlayer.hand = newPlayer.hand.filter(id => {
          const c = getCard(id);
          return !isCardType(c, CardType.VICTORY) && !isCardType(c, CardType.CURSE);
        });
        newPlayer.discard.push(...toDiscard);
        newState.players = [...state.players];
        newState.players[state.currentPlayer] = newPlayer;
        if (toDiscard.length > 0) {
          newState = drawCards(newState, state.currentPlayer, toDiscard.length);
          newState.log = [...newState.log, `${player.name} discards ${toDiscard.length} cards and draws ${toDiscard.length}`];
        }
      } else {
        newState.pendingEffect = { type: 'cellar', maxCards: 99 };
      }
      break;
    }

    case 'chapel': {
      if (player.isAI) {
        // AI trashes Coppers and Estates
        const newPlayer = { ...player };
        newPlayer.hand = [...player.hand];
        let trashed = 0;
        const toTrash = [];
        for (let i = newPlayer.hand.length - 1; i >= 0 && trashed < 4; i--) {
          if (newPlayer.hand[i] === 'copper' || newPlayer.hand[i] === 'estate' || newPlayer.hand[i] === 'curse') {
            toTrash.push(newPlayer.hand[i]);
            newPlayer.hand.splice(i, 1);
            trashed++;
          }
        }
        if (toTrash.length > 0) {
          newState.trash = [...state.trash, ...toTrash];
          newState.players = [...state.players];
          newState.players[state.currentPlayer] = newPlayer;
          newState.log = [...newState.log, `${player.name} trashes ${toTrash.length} cards`];
        }
      } else {
        newState.pendingEffect = { type: 'chapel', maxCards: 4 };
      }
      break;
    }

    case 'workshop': {
      if (player.isAI) {
        // AI gains best card costing up to 4
        const options = ['silver', 'village', 'smithy'].filter(id =>
          state.supply[id] > 0 && getCard(id).cost <= 4
        );
        if (options.length > 0) {
          const cardToGain = options[0];
          newState = gainCard(newState, state.currentPlayer, cardToGain);
        }
      } else {
        newState.pendingEffect = { type: 'workshop', maxCost: 4 };
      }
      break;
    }

    case 'remodel': {
      if (player.isAI) {
        // AI remodels worst card
        if (player.hand.length > 0) {
          const handWithCards = player.hand.map((id, idx) => ({ id, idx, card: getCard(id) }));
          handWithCards.sort((a, b) => a.card.cost - b.card.cost);
          const toTrash = handWithCards[0];
          const maxCost = toTrash.card.cost + 2;

          const newPlayer = { ...player };
          newPlayer.hand = [...player.hand];
          newPlayer.hand.splice(toTrash.idx, 1);
          newState.players = [...state.players];
          newState.players[state.currentPlayer] = newPlayer;
          newState.trash = [...state.trash, toTrash.id];

          // Gain best card
          const options = Object.keys(state.supply).filter(id =>
            state.supply[id] > 0 && getCard(id).cost <= maxCost
          ).sort((a, b) => getCard(b).cost - getCard(a).cost);

          if (options.length > 0) {
            newState = gainCard(newState, state.currentPlayer, options[0]);
            newState.log = [...newState.log, `${player.name} remodels ${toTrash.card.name} into ${getCard(options[0]).name}`];
          }
        }
      } else {
        newState.pendingEffect = { type: 'remodel', step: 'trash' };
      }
      break;
    }

    case 'mine': {
      if (player.isAI) {
        // AI upgrades treasure
        const treasures = player.hand.filter(id => isCardType(getCard(id), CardType.TREASURE));
        if (treasures.length > 0) {
          const toTrash = treasures.includes('silver') ? 'silver' :
                          treasures.includes('copper') ? 'copper' : null;
          if (toTrash) {
            const idx = player.hand.indexOf(toTrash);
            const maxCost = getCard(toTrash).cost + 3;
            const upgrade = toTrash === 'copper' ? 'silver' : 'gold';

            if (state.supply[upgrade] > 0) {
              const newPlayer = { ...player };
              newPlayer.hand = [...player.hand];
              newPlayer.hand.splice(idx, 1);
              newPlayer.hand.push(upgrade);
              newState.players = [...state.players];
              newState.players[state.currentPlayer] = newPlayer;
              newState.supply = { ...state.supply };
              newState.supply[upgrade]--;
              newState.trash = [...state.trash, toTrash];
              newState.log = [...newState.log, `${player.name} mines ${getCard(toTrash).name} into ${getCard(upgrade).name}`];
            }
          }
        }
      } else {
        newState.pendingEffect = { type: 'mine', step: 'trash' };
      }
      break;
    }

    case 'artisan': {
      if (player.isAI) {
        // AI gains Gold or best card up to 5, puts worst card on deck
        const options = Object.keys(state.supply).filter(id =>
          state.supply[id] > 0 && getCard(id).cost <= 5
        ).sort((a, b) => getCard(b).cost - getCard(a).cost);

        if (options.length > 0) {
          const cardToGain = options.includes('gold') ? 'gold' : options[0];
          const newPlayer = { ...state.players[state.currentPlayer] };
          newPlayer.hand = [...newPlayer.hand, cardToGain];
          newState.supply = { ...state.supply };
          newState.supply[cardToGain]--;

          // Put worst card on deck
          const handWithCards = newPlayer.hand.map((id, idx) => ({ id, idx, card: getCard(id) }));
          handWithCards.sort((a, b) => a.card.cost - b.card.cost);
          const toPutBack = handWithCards[0];
          newPlayer.hand.splice(toPutBack.idx, 1);
          newPlayer.deck = [...newPlayer.deck, toPutBack.id];

          newState.players = [...state.players];
          newState.players[state.currentPlayer] = newPlayer;
          newState.log = [...newState.log, `${player.name} gains ${getCard(cardToGain).name} and topdecks a card`];
        }
      } else {
        newState.pendingEffect = { type: 'artisan', step: 'gain', maxCost: 5 };
      }
      break;
    }

    case 'bureaucrat': {
      // Gain Silver onto deck
      if (state.supply.silver > 0) {
        const newPlayer = { ...player };
        newPlayer.deck = [...player.deck, 'silver'];
        newState.players = [...state.players];
        newState.players[state.currentPlayer] = newPlayer;
        newState.supply = { ...state.supply };
        newState.supply.silver--;
        newState.log = [...newState.log, `${player.name} gains a Silver onto their deck`];
      }
      break;
    }

    case 'bandit': {
      // Gain Gold
      if (state.supply.gold > 0) {
        newState = gainCard(newState, state.currentPlayer, 'gold');
        newState.log = [...newState.log, `${player.name} gains a Gold`];
      }
      break;
    }

    case 'councilRoom': {
      // Each other player draws a card
      const otherPlayer = state.currentPlayer === 0 ? 1 : 0;
      newState = drawCards(newState, otherPlayer, 1);
      newState.log = [...newState.log, `${state.players[otherPlayer].name} draws a card`];
      break;
    }

    case 'library': {
      // Draw until 7 cards (simplified: just draw)
      const toDraw = Math.max(0, 7 - player.hand.length);
      if (toDraw > 0) {
        newState = drawCards(newState, state.currentPlayer, toDraw);
        newState.log = [...newState.log, `${player.name} draws to 7 cards`];
      }
      break;
    }

    case 'vassal': {
      // Discard top card, play if action
      const newPlayer = { ...player };
      newPlayer.deck = [...player.deck];
      if (newPlayer.deck.length === 0 && player.discard.length > 0) {
        newPlayer.deck = shuffle([...player.discard]);
        newPlayer.discard = [];
      }
      if (newPlayer.deck.length > 0) {
        const topCard = newPlayer.deck.pop();
        const card = getCard(topCard);
        newPlayer.discard = [...(newPlayer.discard || player.discard), topCard];
        newState.players = [...state.players];
        newState.players[state.currentPlayer] = newPlayer;
        newState.log = [...newState.log, `${player.name} discards ${card.name}`];

        // Auto-play if action (simplified)
        if (isCardType(card, CardType.ACTION) && player.isAI) {
          newPlayer.discard.pop();
          newPlayer.playArea = [...player.playArea, topCard];
          if (card.effect) {
            const effect = card.effect(newState);
            newState = applyEffect(newState, effect, topCard);
          }
        }
      }
      break;
    }

    case 'harbinger': {
      // AI puts best card from discard on deck
      if (player.isAI && player.discard.length > 0) {
        const newPlayer = { ...player };
        newPlayer.discard = [...player.discard];
        const discardWithCards = newPlayer.discard.map((id, idx) => ({ id, idx, card: getCard(id) }));
        discardWithCards.sort((a, b) => b.card.cost - a.card.cost);
        if (discardWithCards.length > 0) {
          const best = discardWithCards[0];
          newPlayer.discard.splice(best.idx, 1);
          newPlayer.deck = [...player.deck, best.id];
          newState.players = [...state.players];
          newState.players[state.currentPlayer] = newPlayer;
          newState.log = [...newState.log, `${player.name} topdecks ${best.card.name}`];
        }
      }
      break;
    }

    case 'sentry': {
      // Simplified: AI trashes Coppers/Curses from top 2
      if (player.isAI) {
        const newPlayer = { ...player };
        newPlayer.deck = [...player.deck];
        const revealed = [];
        for (let i = 0; i < 2 && newPlayer.deck.length > 0; i++) {
          revealed.push(newPlayer.deck.pop());
        }
        const toTrash = revealed.filter(id => id === 'copper' || id === 'curse' || id === 'estate');
        const toKeep = revealed.filter(id => id !== 'copper' && id !== 'curse' && id !== 'estate');
        newPlayer.deck.push(...toKeep);
        newState.trash = [...state.trash, ...toTrash];
        newState.players = [...state.players];
        newState.players[state.currentPlayer] = newPlayer;
        if (toTrash.length > 0) {
          newState.log = [...newState.log, `${player.name} trashes ${toTrash.length} cards with Sentry`];
        }
      }
      break;
    }

    case 'poacher': {
      // Discard per empty pile
      const emptyPiles = Object.values(state.supply).filter(c => c === 0).length;
      if (emptyPiles > 0 && player.hand.length > 0) {
        if (player.isAI) {
          const newPlayer = { ...player };
          newPlayer.hand = [...player.hand];
          newPlayer.discard = [...player.discard];
          const toDiscard = Math.min(emptyPiles, newPlayer.hand.length);
          for (let i = 0; i < toDiscard; i++) {
            // Discard worst cards
            const handWithCards = newPlayer.hand.map((id, idx) => ({ id, idx, card: getCard(id) }));
            handWithCards.sort((a, b) => {
              const aVic = isCardType(a.card, CardType.VICTORY) ? 0 : 1;
              const bVic = isCardType(b.card, CardType.VICTORY) ? 0 : 1;
              if (aVic !== bVic) return aVic - bVic;
              return a.card.cost - b.card.cost;
            });
            const worst = handWithCards[0];
            newPlayer.discard.push(newPlayer.hand.splice(worst.idx, 1)[0]);
          }
          newState.players = [...state.players];
          newState.players[state.currentPlayer] = newPlayer;
          newState.log = [...newState.log, `${player.name} discards ${toDiscard} cards (Poacher)`];
        } else {
          newState.pendingEffect = { type: 'poacher', cardsToDiscard: emptyPiles };
        }
      }
      break;
    }

    case 'throneRoom': {
      // Simplified: AI plays best action twice
      if (player.isAI) {
        const actions = player.hand
          .map((id, idx) => ({ id, idx, card: getCard(id) }))
          .filter(c => isCardType(c.card, CardType.ACTION));
        if (actions.length > 0) {
          actions.sort((a, b) => b.card.cost - a.card.cost);
          const toPlay = actions[0];
          const newPlayer = { ...player };
          newPlayer.hand = [...player.hand];
          newPlayer.hand.splice(toPlay.idx, 1);
          newPlayer.playArea = [...player.playArea, toPlay.id];
          newState.players = [...state.players];
          newState.players[state.currentPlayer] = newPlayer;
          newState.log = [...newState.log, `${player.name} plays ${toPlay.card.name} twice with Throne Room`];

          // Play twice
          if (toPlay.card.effect) {
            const effect = toPlay.card.effect(newState);
            newState = applyEffect(newState, effect, toPlay.id);
            newState = applyEffect(newState, effect, toPlay.id);
          }
        }
      } else {
        newState.pendingEffect = { type: 'throneRoom' };
      }
      break;
    }
  }

  return newState;
};

// Ge ett kort till en spelare
export const gainCard = (state, playerIndex, cardId, toHand = false) => {
  if (state.supply[cardId] <= 0) return state;

  const newState = { ...state };
  const player = { ...state.players[playerIndex] };

  if (toHand) {
    player.hand = [...player.hand, cardId];
  } else {
    player.discard = [...player.discard, cardId];
  }

  newState.players = [...state.players];
  newState.players[playerIndex] = player;
  newState.supply = { ...state.supply };
  newState.supply[cardId]--;

  return newState;
};

// Hantera attack-effekter
const handleAttack = (state, attackType) => {
  let newState = { ...state };
  const currentPlayer = state.players[state.currentPlayer];
  const opponentIndex = state.currentPlayer === 0 ? 1 : 0;
  const opponent = state.players[opponentIndex];

  // Kolla om motståndaren har Moat
  const hasMoat = opponent.hand.includes('moat');
  if (hasMoat) {
    newState.log = [...newState.log, `${opponent.name} reveals Moat and blocks the attack!`];
    return newState;
  }

  switch (attackType) {
    case 'discardTo3': {
      if (opponent.hand.length > 3) {
        if (opponent.isAI) {
          newState = aiDiscardTo(newState, opponentIndex, 3);
        } else {
          newState.pendingEffect = { type: 'militia', cardsToDiscard: opponent.hand.length - 3 };
        }
      }
      break;
    }

    case 'curse': {
      if (state.supply.curse > 0) {
        newState = gainCard(newState, opponentIndex, 'curse');
        newState.log = [...newState.log, `${opponent.name} gains a Curse`];
      }
      break;
    }

    case 'bureaucrat': {
      // Opponent puts Victory card on deck
      const victoryCards = opponent.hand.filter(id => isCardType(getCard(id), CardType.VICTORY));
      if (victoryCards.length > 0) {
        const newOpponent = { ...opponent };
        const cardToPut = victoryCards[0];
        const idx = newOpponent.hand.indexOf(cardToPut);
        newOpponent.hand = [...opponent.hand];
        newOpponent.hand.splice(idx, 1);
        newOpponent.deck = [...opponent.deck, cardToPut];
        newState.players = [...state.players];
        newState.players[opponentIndex] = newOpponent;
        newState.log = [...newState.log, `${opponent.name} puts ${getCard(cardToPut).name} on their deck`];
      } else {
        newState.log = [...newState.log, `${opponent.name} reveals no Victory cards`];
      }
      break;
    }

    case 'bandit': {
      // Reveal top 2 cards, trash treasure (not Copper)
      const newOpponent = { ...opponent };
      newOpponent.deck = [...opponent.deck];
      newOpponent.discard = [...opponent.discard];

      if (newOpponent.deck.length < 2 && opponent.discard.length > 0) {
        newOpponent.deck = [...newOpponent.deck, ...shuffle([...opponent.discard])];
        newOpponent.discard = [];
      }

      const revealed = [];
      for (let i = 0; i < 2 && newOpponent.deck.length > 0; i++) {
        revealed.push(newOpponent.deck.pop());
      }

      const treasures = revealed.filter(id => {
        const c = getCard(id);
        return isCardType(c, CardType.TREASURE) && id !== 'copper';
      });
      const others = revealed.filter(id => {
        const c = getCard(id);
        return !isCardType(c, CardType.TREASURE) || id === 'copper';
      });

      if (treasures.length > 0) {
        // Trash best treasure
        treasures.sort((a, b) => getCard(b).cost - getCard(a).cost);
        const toTrash = treasures[0];
        newState.trash = [...state.trash, toTrash];
        newOpponent.discard.push(...treasures.slice(1), ...others);
        newState.log = [...newState.log, `${opponent.name} trashes ${getCard(toTrash).name}`];
      } else {
        newOpponent.discard.push(...revealed);
      }

      newState.players = [...state.players];
      newState.players[opponentIndex] = newOpponent;
      break;
    }
  }

  return newState;
};

// AI discard ner till X kort
const aiDiscardTo = (state, playerIndex, targetHandSize) => {
  const player = state.players[playerIndex];
  const newPlayer = { ...player };
  newPlayer.hand = [...player.hand];
  newPlayer.discard = [...player.discard];

  while (newPlayer.hand.length > targetHandSize) {
    const handWithCards = newPlayer.hand.map((id, idx) => ({ id, idx, card: getCard(id) }));
    handWithCards.sort((a, b) => {
      const aVic = isCardType(a.card, CardType.VICTORY) || isCardType(a.card, CardType.CURSE) ? 0 : 1;
      const bVic = isCardType(b.card, CardType.VICTORY) || isCardType(b.card, CardType.CURSE) ? 0 : 1;
      if (aVic !== bVic) return aVic - bVic;
      return a.card.cost - b.card.cost;
    });
    const worst = handWithCards[0];
    newPlayer.discard.push(newPlayer.hand.splice(worst.idx, 1)[0]);
  }

  const discarded = player.hand.length - newPlayer.hand.length;
  const newState = { ...state };
  newState.players = [...state.players];
  newState.players[playerIndex] = newPlayer;
  newState.log = [...state.log, `${player.name} discards ${discarded} cards`];

  return newState;
};

// Släng kort (för spelaren)
export const discardCards = (state, cardIndices) => {
  const playerIndex = state.pendingEffect?.type === 'militia' ?
    (state.currentPlayer === 0 ? 1 : 0) : state.currentPlayer;
  const player = state.players[playerIndex];

  const newState = { ...state };
  const newPlayer = { ...player };

  const discarded = [];
  const newHand = [];

  player.hand.forEach((cardId, index) => {
    if (cardIndices.includes(index)) {
      discarded.push(cardId);
    } else {
      newHand.push(cardId);
    }
  });

  newPlayer.hand = newHand;
  newPlayer.discard = [...player.discard, ...discarded];

  newState.players = [...state.players];
  newState.players[playerIndex] = newPlayer;
  newState.pendingEffect = null;
  newState.log = [...state.log, `${player.name} discards ${discarded.length} cards`];

  return newState;
};

// Trash kort
export const trashCards = (state, cardIndices) => {
  const player = state.players[state.currentPlayer];
  const newState = { ...state };
  const newPlayer = { ...player };

  const trashed = [];
  const newHand = [];

  player.hand.forEach((cardId, index) => {
    if (cardIndices.includes(index)) {
      trashed.push(cardId);
    } else {
      newHand.push(cardId);
    }
  });

  newPlayer.hand = newHand;
  newState.players = [...state.players];
  newState.players[state.currentPlayer] = newPlayer;
  newState.trash = [...state.trash, ...trashed];

  // Handle cellar - draw cards equal to discarded
  if (state.pendingEffect?.type === 'cellar') {
    // Actually cellar discards then draws, but we're using trash UI
    // Let's fix this - cellar should discard, not trash
    newPlayer.discard = [...player.discard, ...trashed];
    newState.trash = state.trash; // Don't actually trash
    const drawState = drawCards(newState, state.currentPlayer, trashed.length);
    drawState.log = [...state.log, `${player.name} discards ${trashed.length} cards and draws ${trashed.length}`];
    drawState.pendingEffect = null;
    return drawState;
  }

  newState.log = [...state.log, `${player.name} trashes ${trashed.map(id => getCard(id).name).join(', ')}`];
  newState.pendingEffect = null;

  return newState;
};

// Välj kort att få (workshop, remodel, etc.)
export const selectGainCard = (state, cardId) => {
  let newState = { ...state };
  const player = state.players[state.currentPlayer];

  if (state.pendingEffect?.type === 'workshop') {
    newState = gainCard(newState, state.currentPlayer, cardId);
    newState.log = [...newState.log, `${player.name} gains ${getCard(cardId).name}`];
    newState.pendingEffect = null;
  }

  if (state.pendingEffect?.type === 'remodel' && state.pendingEffect.step === 'gain') {
    newState = gainCard(newState, state.currentPlayer, cardId);
    newState.log = [...newState.log, `${player.name} gains ${getCard(cardId).name}`];
    newState.pendingEffect = null;
  }

  if (state.pendingEffect?.type === 'artisan' && state.pendingEffect.step === 'gain') {
    // Gain to hand
    const newPlayer = { ...player };
    newPlayer.hand = [...player.hand, cardId];
    newState.supply = { ...state.supply };
    newState.supply[cardId]--;
    newState.players = [...state.players];
    newState.players[state.currentPlayer] = newPlayer;
    newState.log = [...newState.log, `${player.name} gains ${getCard(cardId).name} to hand`];
    newState.pendingEffect = { type: 'artisan', step: 'topdeck' };
  }

  if (state.pendingEffect?.type === 'mine' && state.pendingEffect.step === 'gain') {
    // Gain treasure to hand
    const newPlayer = { ...player };
    newPlayer.hand = [...player.hand, cardId];
    newState.supply = { ...state.supply };
    newState.supply[cardId]--;
    newState.players = [...state.players];
    newState.players[state.currentPlayer] = newPlayer;
    newState.log = [...newState.log, `${player.name} gains ${getCard(cardId).name} to hand`];
    newState.pendingEffect = null;
  }

  return newState;
};

// Välj kort att trasha för remodel/mine
export const selectTrashCard = (state, cardIndex) => {
  const player = state.players[state.currentPlayer];
  const cardId = player.hand[cardIndex];
  const card = getCard(cardId);

  const newState = { ...state };
  const newPlayer = { ...player };
  newPlayer.hand = [...player.hand];
  newPlayer.hand.splice(cardIndex, 1);
  newState.players = [...state.players];
  newState.players[state.currentPlayer] = newPlayer;
  newState.trash = [...state.trash, cardId];
  newState.log = [...state.log, `${player.name} trashes ${card.name}`];

  if (state.pendingEffect?.type === 'remodel') {
    newState.pendingEffect = { type: 'remodel', step: 'gain', maxCost: card.cost + 2 };
  }

  if (state.pendingEffect?.type === 'mine') {
    newState.pendingEffect = { type: 'mine', step: 'gain', maxCost: card.cost + 3 };
  }

  return newState;
};

// Sätt kort på toppen av leken (Artisan)
export const topdeckCard = (state, cardIndex) => {
  const player = state.players[state.currentPlayer];
  const cardId = player.hand[cardIndex];

  const newState = { ...state };
  const newPlayer = { ...player };
  newPlayer.hand = [...player.hand];
  newPlayer.hand.splice(cardIndex, 1);
  newPlayer.deck = [...player.deck, cardId];
  newState.players = [...state.players];
  newState.players[state.currentPlayer] = newPlayer;
  newState.log = [...state.log, `${player.name} topdecks ${getCard(cardId).name}`];
  newState.pendingEffect = null;

  return newState;
};

// Spela treasure-kort automatiskt
export const playTreasures = (state) => {
  let newState = { ...state };
  const player = state.players[state.currentPlayer];
  const newPlayer = { ...player };

  let totalCoins = state.coins;
  const treasures = [];
  const nonTreasures = [];
  let silverPlayed = false;

  player.hand.forEach(cardId => {
    const card = getCard(cardId);
    if (isCardType(card, CardType.TREASURE)) {
      treasures.push(cardId);
      totalCoins += card.coins;
      if (cardId === 'silver') silverPlayed = true;
    } else {
      nonTreasures.push(cardId);
    }
  });

  // Merchant bonus
  if (state.merchantBonus && silverPlayed) {
    totalCoins += 1;
    newState.log = [...state.log, `Merchant bonus: +$1`];
  }

  newPlayer.hand = nonTreasures;
  newPlayer.playArea = [...player.playArea, ...treasures];

  newState.players = [...state.players];
  newState.players[state.currentPlayer] = newPlayer;
  newState.coins = totalCoins;
  newState.phase = 'buy';

  if (treasures.length > 0) {
    newState.log = [...(newState.log || state.log), `${player.name} plays treasures for $${totalCoins}`];
  }

  return newState;
};

// Köp ett kort
export const buyCard = (state, cardId) => {
  if (state.phase !== 'buy' || state.buys <= 0) {
    return state;
  }

  const card = getCard(cardId);
  if (!card || card.cost > state.coins || state.supply[cardId] <= 0) {
    return state;
  }

  let newState = { ...state };
  newState = gainCard(newState, state.currentPlayer, cardId);
  newState.coins = state.coins - card.cost;
  newState.buys = state.buys - 1;
  newState.log = [...newState.log, `${state.players[state.currentPlayer].name} buys ${card.name}`];

  return newState;
};

// Avsluta turen
export const endTurn = (state) => {
  const newState = { ...state };
  const player = state.players[state.currentPlayer];
  const newPlayer = { ...player };

  newPlayer.discard = [...player.discard, ...player.hand, ...player.playArea];
  newPlayer.hand = [];
  newPlayer.playArea = [];

  newState.players = [...state.players];
  newState.players[state.currentPlayer] = newPlayer;

  const drawnState = drawCards(newState, state.currentPlayer, 5);

  const nextPlayer = state.currentPlayer === 0 ? 1 : 0;
  drawnState.currentPlayer = nextPlayer;
  drawnState.phase = 'action';
  drawnState.actions = 1;
  drawnState.buys = 1;
  drawnState.coins = 0;
  drawnState.merchantBonus = false;
  drawnState.pendingEffect = null;

  if (nextPlayer === 0) {
    drawnState.turn = state.turn + 1;
  }

  drawnState.log = [...drawnState.log, `--- Turn ${drawnState.turn}: ${drawnState.players[nextPlayer].name}'s turn ---`];

  return checkGameOver(drawnState);
};

// Räkna victory points inklusive Gardens
export const calculateVP = (player) => {
  const allCards = [...player.deck, ...player.hand, ...player.discard, ...player.playArea];
  const totalCards = allCards.length;

  return allCards.reduce((total, cardId) => {
    const card = getCard(cardId);
    if (card.dynamicVP) {
      // Gardens: 1 VP per 10 cards
      return total + Math.floor(totalCards / 10);
    }
    return total + (card.victoryPoints || 0);
  }, 0);
};

// Kolla om spelet är slut
export const checkGameOver = (state) => {
  const newState = { ...state };

  const emptyPiles = Object.entries(state.supply)
    .filter(([id, count]) => count === 0)
    .length;

  if (state.supply.province === 0 || emptyPiles >= 3) {
    newState.gameOver = true;

    const scores = state.players.map(player => calculateVP(player));
    newState.scores = scores;

    if (scores[0] > scores[1]) {
      newState.winner = 0;
    } else if (scores[1] > scores[0]) {
      newState.winner = 1;
    } else {
      newState.winner = -1;
    }

    newState.log = [...state.log,
      `Game Over! Scores: You ${scores[0]} - AI ${scores[1]}`,
      newState.winner === 0 ? 'You win!' :
      newState.winner === 1 ? 'AI wins!' :
      'Tie!'
    ];
  }

  return newState;
};

// Gå till buy-fas
export const goToBuyPhase = (state) => {
  return playTreasures({ ...state, phase: 'buy' });
};

// Cancel pending effect
export const cancelPendingEffect = (state) => {
  return { ...state, pendingEffect: null };
};
