import { getCard, CardType, isCardType } from '../data/cards';
import './Card.css';

const Card = ({ cardId, onClick, selected, small, count, disabled }) => {
  const card = getCard(cardId);

  if (!card) return null;

  const getCardColor = () => {
    if (isCardType(card, CardType.ACTION) && isCardType(card, CardType.ATTACK)) {
      return 'card-attack';
    }
    if (isCardType(card, CardType.ACTION) && isCardType(card, CardType.REACTION)) {
      return 'card-reaction';
    }
    if (isCardType(card, CardType.ACTION)) {
      return 'card-action';
    }
    if (isCardType(card, CardType.TREASURE)) {
      return 'card-treasure';
    }
    if (isCardType(card, CardType.VICTORY)) {
      return 'card-victory';
    }
    return '';
  };

  const classes = [
    'card',
    getCardColor(),
    selected ? 'selected' : '',
    small ? 'card-small' : '',
    disabled ? 'disabled' : '',
    onClick ? 'clickable' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={disabled ? undefined : onClick}>
      <div className="card-header">
        <span className="card-name">{card.name}</span>
        <span className="card-cost">{card.cost}</span>
      </div>
      <div className="card-body">
        <p className="card-description">{card.description}</p>
      </div>
      {count !== undefined && (
        <div className="card-count">{count}</div>
      )}
    </div>
  );
};

export default Card;
