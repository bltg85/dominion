import { getCard, isCardType, CardType } from '../data/cards';
import { playAction, goToBuyPhase, buyCard, endTurn } from './gameState';

// Enkel AI som spelar Dominion
export const executeAITurn = (state, onStateChange) => {
  let currentState = state;
  const delay = 600;

  const playActions = (s) => {
    const player = s.players[s.currentPlayer];
    const actionCards = player.hand
      .map((cardId, index) => ({ cardId, index, card: getCard(cardId) }))
      .filter(c => isCardType(c.card, CardType.ACTION));

    if (s.actions > 0 && actionCards.length > 0) {
      // Priority order for playing actions
      const priorityOrder = [
        'village', 'festival', 'laboratory', 'market', // +actions first
        'harbinger', 'vassal', 'merchant', 'sentry',
        'smithy', 'councilRoom', 'library', // draw
        'cellar', 'chapel', // trashing
        'moneylender', 'mine', 'remodel', 'artisan', // economy
        'workshop', 'bureaucrat', 'bandit', // gaining
        'militia', 'witch', // attacks
        'throneRoom', 'moat', 'poacher'
      ];

      actionCards.sort((a, b) => {
        const aIdx = priorityOrder.indexOf(a.cardId);
        const bIdx = priorityOrder.indexOf(b.cardId);
        const aPriority = aIdx === -1 ? 100 : aIdx;
        const bPriority = bIdx === -1 ? 100 : bIdx;
        return aPriority - bPriority;
      });

      return actionCards[0].index;
    }
    return null;
  };

  const decideBuy = (s) => {
    const coins = s.coins;
    const buys = s.buys;

    if (buys <= 0) return null;

    const supply = s.supply;
    const player = s.players[s.currentPlayer];
    const allCards = [...player.deck, ...player.hand, ...player.discard, ...player.playArea];

    // Count specific cards
    const countCard = (id) => allCards.filter(c => c === id).length;
    const totalCards = allCards.length;

    // Province rush condition
    const provinceCount = supply.province;
    const lateGame = provinceCount <= 4;

    // Buy strategy
    if (coins >= 8 && supply.province > 0) return 'province';
    if (coins >= 6 && supply.gold > 0) return 'gold';

    // Late game duchy buying
    if (lateGame && coins >= 5 && supply.duchy > 0) return 'duchy';

    // Kingdom card priorities based on what's available
    if (coins >= 5) {
      if (supply.witch > 0 && countCard('witch') < 1) return 'witch';
      if (supply.market > 0 && countCard('market') < 2) return 'market';
      if (supply.laboratory > 0 && countCard('laboratory') < 2) return 'laboratory';
      if (supply.festival > 0 && countCard('festival') < 2) return 'festival';
      if (supply.sentry > 0 && countCard('sentry') < 1) return 'sentry';
      if (supply.mine > 0 && countCard('mine') < 1) return 'mine';
      if (supply.councilRoom > 0 && countCard('councilRoom') < 1) return 'councilRoom';
      if (supply.bandit > 0 && countCard('bandit') < 1) return 'bandit';
    }

    if (coins >= 4) {
      if (supply.smithy > 0 && countCard('smithy') < 2) return 'smithy';
      if (supply.militia > 0 && countCard('militia') < 1) return 'militia';
      if (supply.remodel > 0 && countCard('remodel') < 1) return 'remodel';
      if (supply.moneylender > 0 && countCard('moneylender') < 1 && countCard('copper') > 4) return 'moneylender';
      if (supply.throneRoom > 0 && countCard('throneRoom') < 1) return 'throneRoom';
      if (supply.poacher > 0 && countCard('poacher') < 2) return 'poacher';
      if (supply.bureaucrat > 0 && countCard('bureaucrat') < 1) return 'bureaucrat';
      if (supply.gardens > 0 && totalCards >= 20) return 'gardens';
    }

    if (coins >= 3) {
      if (supply.village > 0 && countCard('village') < 3) return 'village';
      if (supply.silver > 0) return 'silver';
      if (supply.workshop > 0 && countCard('workshop') < 1) return 'workshop';
      if (supply.merchant > 0 && countCard('merchant') < 2) return 'merchant';
      if (supply.harbinger > 0 && countCard('harbinger') < 1) return 'harbinger';
      if (supply.vassal > 0 && countCard('vassal') < 1) return 'vassal';
    }

    if (coins >= 2) {
      if (supply.chapel > 0 && countCard('chapel') < 1 && totalCards < 15) return 'chapel';
      if (supply.cellar > 0 && countCard('cellar') < 1) return 'cellar';
      if (supply.moat > 0 && countCard('moat') < 1) return 'moat';
      // Late game estate buying
      if (lateGame && supply.estate > 0) return 'estate';
    }

    return null;
  };

  const runAIStep = (s, step) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let newState = s;

        if (step === 'action') {
          const actionIndex = playActions(newState);
          if (actionIndex !== null) {
            newState = playAction(newState, actionIndex);
            onStateChange(newState);
            resolve(runAIStep(newState, 'action'));
            return;
          }
          resolve(runAIStep(newState, 'treasure'));
          return;
        }

        if (step === 'treasure') {
          newState = goToBuyPhase(newState);
          onStateChange(newState);
          resolve(runAIStep(newState, 'buy'));
          return;
        }

        if (step === 'buy') {
          const cardToBuy = decideBuy(newState);
          if (cardToBuy && newState.buys > 0) {
            newState = buyCard(newState, cardToBuy);
            onStateChange(newState);
            resolve(runAIStep(newState, 'buy'));
            return;
          }
          resolve(runAIStep(newState, 'end'));
          return;
        }

        if (step === 'end') {
          newState = endTurn(newState);
          onStateChange(newState);
          resolve(newState);
          return;
        }

        resolve(newState);
      }, delay);
    });
  };

  return runAIStep(currentState, 'action');
};
