import { useState, useEffect, useRef } from 'react';
import { getCard, isCardType, CardType } from '../data/cards';
import {
  createGameState,
  playAction,
  goToBuyPhase,
  buyCard,
  endTurn,
  discardCards,
  trashCards,
  selectGainCard,
  selectTrashCard,
  topdeckCard,
  cancelPendingEffect,
} from '../game/gameState';
import { executeAITurn } from '../game/ai';
import './GameBoard.css';

const GameBoard = () => {
  const [gameState, setGameState] = useState(createGameState);
  const [selectedCards, setSelectedCards] = useState([]);
  const logRef = useRef(null);

  const player = gameState.players[0];
  const opponent = gameState.players[1];
  const currentPlayer = gameState.players[gameState.currentPlayer];
  const isPlayerTurn = gameState.currentPlayer === 0;
  const isAIThinking = gameState.currentPlayer === 1 && !gameState.gameOver;

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameState.log]);

  useEffect(() => {
    if (isAIThinking && !gameState.pendingEffect) {
      executeAITurn(gameState, setGameState);
    }
  }, [gameState.currentPlayer, gameState.pendingEffect]);

  const getCardClass = (cardId) => {
    const card = getCard(cardId);
    if (!card) return '';
    if (isCardType(card, CardType.CURSE)) return 'card-curse';
    if (isCardType(card, CardType.VICTORY)) return 'card-victory';
    if (isCardType(card, CardType.TREASURE)) return 'card-treasure';
    if (isCardType(card, CardType.ATTACK)) return 'card-attack';
    if (isCardType(card, CardType.REACTION)) return 'card-reaction';
    if (isCardType(card, CardType.ACTION)) return 'card-action';
    return '';
  };

  const handlePlayCard = (cardIndex) => {
    if (!isPlayerTurn || gameState.gameOver) return;

    const cardId = player.hand[cardIndex];
    const card = getCard(cardId);
    const pe = gameState.pendingEffect;

    // Handle pending effects that require card selection from hand
    if (pe) {
      // Discard effects (militia, cellar, poacher)
      if (pe.type === 'militia' || pe.type === 'cellar' || pe.type === 'poacher') {
        setSelectedCards(prev => {
          if (prev.includes(cardIndex)) {
            return prev.filter(i => i !== cardIndex);
          }
          const maxCards = pe.cardsToDiscard || pe.maxCards;
          if (pe.type === 'cellar' || prev.length < maxCards) {
            return [...prev, cardIndex];
          }
          return prev;
        });
        return;
      }

      // Chapel - trash selection
      if (pe.type === 'chapel') {
        setSelectedCards(prev => {
          if (prev.includes(cardIndex)) {
            return prev.filter(i => i !== cardIndex);
          }
          if (prev.length < pe.maxCards) {
            return [...prev, cardIndex];
          }
          return prev;
        });
        return;
      }

      // Remodel/Mine - select card to trash
      if ((pe.type === 'remodel' || pe.type === 'mine') && pe.step === 'trash') {
        if (pe.type === 'mine' && !isCardType(card, CardType.TREASURE)) {
          return; // Mine can only trash treasures
        }
        setGameState(selectTrashCard(gameState, cardIndex));
        setSelectedCards([]);
        return;
      }

      // Artisan - topdeck
      if (pe.type === 'artisan' && pe.step === 'topdeck') {
        setGameState(topdeckCard(gameState, cardIndex));
        setSelectedCards([]);
        return;
      }

      // Throne Room - select action to play twice
      if (pe.type === 'throneRoom') {
        if (isCardType(card, CardType.ACTION)) {
          // Play the selected action twice
          let newState = { ...gameState };
          const newPlayer = { ...player };
          newPlayer.hand = [...player.hand];
          newPlayer.hand.splice(cardIndex, 1);
          newPlayer.playArea = [...player.playArea, cardId];
          newState.players = [...gameState.players];
          newState.players[0] = newPlayer;
          newState.pendingEffect = null;
          newState.log = [...gameState.log, `You play ${card.name} twice with Throne Room`];

          if (card.effect) {
            const effect = card.effect(newState);
            // Apply effect twice (simplified - some effects won't stack correctly)
            if (effect.cardsToDraw) {
              for (let i = 0; i < effect.cardsToDraw * 2; i++) {
                if (newPlayer.deck.length === 0 && newPlayer.discard.length > 0) {
                  newPlayer.deck = [...newPlayer.discard].sort(() => Math.random() - 0.5);
                  newPlayer.discard = [];
                }
                if (newPlayer.deck.length > 0) {
                  newPlayer.hand.push(newPlayer.deck.pop());
                }
              }
            }
            if (effect.actionsToAdd) newState.actions += effect.actionsToAdd * 2;
            if (effect.buysToAdd) newState.buys += effect.buysToAdd * 2;
            if (effect.coinsToAdd) newState.coins += effect.coinsToAdd * 2;
          }
          setGameState(newState);
          setSelectedCards([]);
        }
        return;
      }

      return;
    }

    // Normal action playing
    if (gameState.phase === 'action' && isCardType(card, CardType.ACTION) && gameState.actions > 0) {
      setGameState(playAction(gameState, cardIndex));
    }
  };

  const handleBuyCard = (cardId) => {
    if (!isPlayerTurn || gameState.gameOver) return;

    const pe = gameState.pendingEffect;
    const card = getCard(cardId);

    // Handle gain effects
    if (pe) {
      if (pe.type === 'workshop' && card.cost <= pe.maxCost && gameState.supply[cardId] > 0) {
        setGameState(selectGainCard(gameState, cardId));
        return;
      }
      if (pe.type === 'remodel' && pe.step === 'gain' && card.cost <= pe.maxCost && gameState.supply[cardId] > 0) {
        setGameState(selectGainCard(gameState, cardId));
        return;
      }
      if (pe.type === 'artisan' && pe.step === 'gain' && card.cost <= pe.maxCost && gameState.supply[cardId] > 0) {
        setGameState(selectGainCard(gameState, cardId));
        return;
      }
      if (pe.type === 'mine' && pe.step === 'gain' && card.cost <= pe.maxCost && isCardType(card, CardType.TREASURE) && gameState.supply[cardId] > 0) {
        setGameState(selectGainCard(gameState, cardId));
        return;
      }
      return;
    }

    // Normal buying
    if (gameState.phase !== 'buy') return;
    if (card.cost <= gameState.coins && gameState.supply[cardId] > 0 && gameState.buys > 0) {
      setGameState(buyCard(gameState, cardId));
    }
  };

  const handleConfirmSelection = () => {
    const pe = gameState.pendingEffect;
    if (!pe) return;

    if (pe.type === 'militia' || pe.type === 'poacher') {
      if (selectedCards.length === pe.cardsToDiscard) {
        setGameState(discardCards(gameState, selectedCards));
        setSelectedCards([]);
      }
    } else if (pe.type === 'cellar') {
      setGameState(trashCards(gameState, selectedCards)); // trashCards handles cellar specially
      setSelectedCards([]);
    } else if (pe.type === 'chapel') {
      if (selectedCards.length > 0) {
        setGameState(trashCards(gameState, selectedCards));
        setSelectedCards([]);
      }
    }
  };

  const handleCancelEffect = () => {
    setGameState(cancelPendingEffect(gameState));
    setSelectedCards([]);
  };

  const handleEndActions = () => {
    if (!isPlayerTurn || gameState.phase !== 'action' || gameState.pendingEffect) return;
    setGameState(goToBuyPhase(gameState));
  };

  const handleEndTurn = () => {
    if (!isPlayerTurn || gameState.gameOver || gameState.pendingEffect) return;
    setGameState(endTurn(gameState));
  };

  const handleNewGame = () => {
    setGameState(createGameState());
    setSelectedCards([]);
  };

  const canPlayCard = (cardId) => {
    if (!isPlayerTurn || gameState.gameOver || gameState.pendingEffect) return false;
    const card = getCard(cardId);
    return gameState.phase === 'action' && isCardType(card, CardType.ACTION) && gameState.actions > 0;
  };

  const canBuyCard = (cardId) => {
    if (!isPlayerTurn || gameState.gameOver) return false;
    const card = getCard(cardId);
    const pe = gameState.pendingEffect;

    // Gain effects
    if (pe) {
      if (pe.type === 'workshop') return card.cost <= pe.maxCost && gameState.supply[cardId] > 0;
      if (pe.type === 'remodel' && pe.step === 'gain') return card.cost <= pe.maxCost && gameState.supply[cardId] > 0;
      if (pe.type === 'artisan' && pe.step === 'gain') return card.cost <= pe.maxCost && gameState.supply[cardId] > 0;
      if (pe.type === 'mine' && pe.step === 'gain') return card.cost <= pe.maxCost && isCardType(card, CardType.TREASURE) && gameState.supply[cardId] > 0;
      return false;
    }

    if (gameState.phase !== 'buy') return false;
    return card.cost <= gameState.coins && gameState.supply[cardId] > 0 && gameState.buys > 0;
  };

  // Get effect prompt text
  const getEffectPrompt = () => {
    const pe = gameState.pendingEffect;
    if (!pe) return null;

    switch (pe.type) {
      case 'militia':
        return `Discard ${pe.cardsToDiscard} cards (${selectedCards.length} selected)`;
      case 'cellar':
        return `Select cards to discard and redraw (${selectedCards.length} selected)`;
      case 'chapel':
        return `Trash up to ${pe.maxCards} cards (${selectedCards.length} selected)`;
      case 'workshop':
        return `Gain a card costing up to $${pe.maxCost}`;
      case 'remodel':
        return pe.step === 'trash' ? 'Select a card to trash' : `Gain a card costing up to $${pe.maxCost}`;
      case 'mine':
        return pe.step === 'trash' ? 'Select a Treasure to trash' : `Gain a Treasure costing up to $${pe.maxCost}`;
      case 'artisan':
        return pe.step === 'gain' ? `Gain a card costing up to $${pe.maxCost} to your hand` : 'Select a card to put on your deck';
      case 'throneRoom':
        return 'Select an Action card to play twice';
      case 'poacher':
        return `Discard ${pe.cardsToDiscard} cards (${selectedCards.length} selected)`;
      default:
        return null;
    }
  };

  // Supply organization
  const victorySupply = ['estate', 'duchy', 'province'];
  const treasureSupply = ['copper', 'silver', 'gold'];
  const curseSupply = ['curse'];
  const kingdomSupply = gameState.kingdom.sort((a, b) => {
    const cardA = getCard(a);
    const cardB = getCard(b);
    return cardA.cost - cardB.cost || a.localeCompare(b);
  });

  const effectPrompt = getEffectPrompt();

  return (
    <div className="iso-game">
      {/* Left panel - Log */}
      <div className="iso-log-panel">
        <div className="iso-log" ref={logRef}>
          {gameState.log.map((entry, index) => (
            <div key={index} className="log-entry">{entry}</div>
          ))}
        </div>
      </div>

      {/* Right panel - Game */}
      <div className="iso-main-panel">
        {/* Header */}
        <div className="iso-header">
          <span className="iso-title">Dominion</span>
          {gameState.gameOver ? (
            <span className="iso-status">
              Game Over - {gameState.winner === 0 ? 'You Win!' : gameState.winner === 1 ? 'AI Wins!' : 'Tie!'}
              ({gameState.scores[0]} - {gameState.scores[1]})
              <button onClick={handleNewGame} className="iso-btn">New Game</button>
            </span>
          ) : (
            <span className="iso-status">
              Turn {gameState.turn} - {isPlayerTurn ? 'Your turn' : "AI's turn"}
              {isAIThinking && ' (thinking...)'}
            </span>
          )}
        </div>

        {/* Supply */}
        <div className="iso-section">
          <div className="iso-section-title">Supply</div>
          <div className="iso-supply">
            <div className="iso-supply-row">
              {victorySupply.map(cardId => {
                const card = getCard(cardId);
                const canBuy = canBuyCard(cardId);
                return (
                  <span
                    key={cardId}
                    className={`iso-supply-card ${getCardClass(cardId)} ${canBuy ? 'buyable' : ''} ${gameState.supply[cardId] === 0 ? 'empty' : ''}`}
                    onClick={() => handleBuyCard(cardId)}
                  >
                    {card.name} (${card.cost}) [{gameState.supply[cardId]}]
                  </span>
                );
              })}
              {curseSupply.map(cardId => {
                const card = getCard(cardId);
                return (
                  <span
                    key={cardId}
                    className={`iso-supply-card ${getCardClass(cardId)} ${gameState.supply[cardId] === 0 ? 'empty' : ''}`}
                  >
                    {card.name} [{gameState.supply[cardId]}]
                  </span>
                );
              })}
            </div>
            <div className="iso-supply-row">
              {treasureSupply.map(cardId => {
                const card = getCard(cardId);
                const canBuy = canBuyCard(cardId);
                return (
                  <span
                    key={cardId}
                    className={`iso-supply-card ${getCardClass(cardId)} ${canBuy ? 'buyable' : ''} ${gameState.supply[cardId] === 0 ? 'empty' : ''}`}
                    onClick={() => handleBuyCard(cardId)}
                  >
                    {card.name} (${card.cost}) [{gameState.supply[cardId]}]
                  </span>
                );
              })}
            </div>
            <div className="iso-supply-row">
              {kingdomSupply.slice(0, 5).map(cardId => {
                const card = getCard(cardId);
                const canBuy = canBuyCard(cardId);
                return (
                  <span
                    key={cardId}
                    className={`iso-supply-card ${getCardClass(cardId)} ${canBuy ? 'buyable' : ''} ${gameState.supply[cardId] === 0 ? 'empty' : ''}`}
                    onClick={() => handleBuyCard(cardId)}
                    title={card.description}
                  >
                    {card.name} (${card.cost}) [{gameState.supply[cardId]}]
                  </span>
                );
              })}
            </div>
            <div className="iso-supply-row">
              {kingdomSupply.slice(5, 10).map(cardId => {
                const card = getCard(cardId);
                const canBuy = canBuyCard(cardId);
                return (
                  <span
                    key={cardId}
                    className={`iso-supply-card ${getCardClass(cardId)} ${canBuy ? 'buyable' : ''} ${gameState.supply[cardId] === 0 ? 'empty' : ''}`}
                    onClick={() => handleBuyCard(cardId)}
                    title={card.description}
                  >
                    {card.name} (${card.cost}) [{gameState.supply[cardId]}]
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Players */}
        <div className="iso-section">
          <div className="iso-players">
            <div className="iso-player">
              <span className="iso-player-name">You:</span>
              <span>Deck: {player.deck.length}</span>
              <span>Discard: {player.discard.length}</span>
            </div>
            <div className="iso-player opponent">
              <span className="iso-player-name">AI:</span>
              <span>Deck: {opponent.deck.length}</span>
              <span>Discard: {opponent.discard.length}</span>
              <span>Hand: {opponent.hand.length}</span>
            </div>
            {gameState.trash.length > 0 && (
              <div className="iso-player">
                <span>Trash: {gameState.trash.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Current state */}
        <div className="iso-section">
          <div className="iso-state">
            <span className="iso-phase">{gameState.phase === 'action' ? 'Action Phase' : 'Buy Phase'}</span>
            <span>Actions: <strong>{gameState.actions}</strong></span>
            <span>Buys: <strong>{gameState.buys}</strong></span>
            <span>Coins: <strong>${gameState.coins}</strong></span>
          </div>
        </div>

        {/* Played cards */}
        {currentPlayer.playArea.length > 0 && (
          <div className="iso-section">
            <div className="iso-section-title">In Play</div>
            <div className="iso-played">
              {currentPlayer.playArea.map((cardId, index) => (
                <span key={index} className={`iso-card ${getCardClass(cardId)}`}>
                  {getCard(cardId).name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Effect prompt */}
        {effectPrompt && (
          <div className="iso-section iso-effect-prompt">
            <strong>{effectPrompt}</strong>
            <div className="iso-effect-buttons">
              {(gameState.pendingEffect?.type === 'militia' ||
                gameState.pendingEffect?.type === 'cellar' ||
                gameState.pendingEffect?.type === 'chapel' ||
                gameState.pendingEffect?.type === 'poacher') && (
                <button
                  onClick={handleConfirmSelection}
                  disabled={
                    (gameState.pendingEffect?.type === 'militia' && selectedCards.length !== gameState.pendingEffect.cardsToDiscard) ||
                    (gameState.pendingEffect?.type === 'poacher' && selectedCards.length !== gameState.pendingEffect.cardsToDiscard)
                  }
                  className="iso-btn"
                >
                  Confirm
                </button>
              )}
              {(gameState.pendingEffect?.type === 'cellar' ||
                gameState.pendingEffect?.type === 'chapel' ||
                gameState.pendingEffect?.type === 'workshop' ||
                gameState.pendingEffect?.type === 'throneRoom') && (
                <button onClick={handleCancelEffect} className="iso-btn">
                  Skip/Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {/* Hand */}
        <div className="iso-section">
          <div className="iso-section-title">Your Hand ({player.hand.length} cards)</div>
          <div className="iso-hand">
            {player.hand.map((cardId, index) => {
              const card = getCard(cardId);
              const canPlay = canPlayCard(cardId);
              const isSelected = selectedCards.includes(index);
              const pe = gameState.pendingEffect;

              let isClickable = canPlay;
              if (pe) {
                if (pe.type === 'militia' || pe.type === 'cellar' || pe.type === 'chapel' || pe.type === 'poacher') {
                  isClickable = true;
                }
                if ((pe.type === 'remodel' && pe.step === 'trash') || (pe.type === 'artisan' && pe.step === 'topdeck')) {
                  isClickable = true;
                }
                if (pe.type === 'mine' && pe.step === 'trash') {
                  isClickable = isCardType(card, CardType.TREASURE);
                }
                if (pe.type === 'throneRoom') {
                  isClickable = isCardType(card, CardType.ACTION);
                }
              }

              return (
                <span
                  key={index}
                  className={`iso-card ${getCardClass(cardId)} ${canPlay ? 'playable' : ''} ${isSelected ? 'selected' : ''} ${isClickable ? 'clickable' : ''}`}
                  onClick={() => isClickable && handlePlayCard(index)}
                  title={card.description}
                >
                  {card.name}
                </span>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        {isPlayerTurn && !gameState.gameOver && !gameState.pendingEffect && (
          <div className="iso-actions">
            {gameState.phase === 'action' && (
              <button onClick={handleEndActions} className="iso-btn">
                End Actions
              </button>
            )}
            {gameState.phase === 'buy' && (
              <button onClick={handleEndTurn} className="iso-btn">
                End Turn
              </button>
            )}
          </div>
        )}

        {/* Card reference */}
        <div className="iso-section iso-help">
          <div className="iso-section-title">Kingdom Cards</div>
          <div className="iso-card-info">
            {kingdomSupply.map(cardId => {
              const card = getCard(cardId);
              return (
                <div key={cardId} className="iso-card-ref">
                  <span className={`iso-card ${getCardClass(cardId)}`}>{card.name}</span>
                  <span className="iso-card-desc">(${card.cost}) {card.description}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
