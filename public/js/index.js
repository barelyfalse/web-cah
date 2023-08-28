const screenParent = document.getElementById('full-overlay')
const selectionZoneEl = document.getElementById('card-selection');
var selectionZoneRect;
var rootFontSize = 16;
var selectionInt = null;
var cards;
var touchStart = {};

function setSelectionZoneWidth() {
  rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
  selectionZoneRect = selectionZoneEl.getBoundingClientRect();
  if (cards != null) {
    repositionCards()
  }
}

/*
 * Control
 */

function handleTouchTapStart(event) {
  touchStart.time = Date.now();
  touchStart.x = event.touches[0].clientX;
  touchStart.y = event.touches[0].clientY;
  console.log(touchStart)
}

function handleSelectionPointerMove(event) {
  var pointerX = 0;
  if (event.type === 'mousemove') {
      pointerX = event.clientX - selectionZoneEl.getBoundingClientRect().left;
  } else if (event.type === 'touchmove') {
    var touch = event.touches[0];
    pointerX = touch.clientX - selectionZoneEl.getBoundingClientRect().left;
  }

  selectionInt = Math.min(Math.max(0, Math.floor((pointerX - rootFontSize) / ((selectionZoneRect.width - (rootFontSize * 12.4)) / (cards.length - 1)))), cards.length - 1)
  if (selectionInt >= 0) {
    for(let i = 0; i < cards.length; i++) {
      if (selectionInt == i) {
        cards[i].raise()
      } else {
        cards[i].drop()
      }
    }
  }
}

function handleSelectionPointerLeave(event) {
  for(let i = 0; i < cards.length; i++) {
    cards[i].drop()
  }
  selectionInt = null
}

function handleSelection(event) {
  if (selectionInt == null) 
    return
  if (event.type === 'click') {
    //console.log('Clicked: ' + selectionInt)
    sendCard(selectionInt)
    selectionInt = null
  } else if (event.type === 'touchend') {
    console.log(event.touches)
    const endX = event.touches[0].clientX - touchStart.x
    const endY = event.touches[0].clientY - touchStart.y
    const endTime = Date.now() - touchStart.time
    if (Math.abs(endX) < 10 && Math.abs(endY) < 10 && endTime < 100) {
      console.log('Taped: ' + selectionInt)
      selectionInt = null
    }
  }
}

function spawnCards() {
  cards = new Array();
  for (let i = 0; i < 10; i++) {
    //'Vomitar a la vez que un grupo de arañas eclosionan en tu cerebro y salen por tus conductos lagrimales'
    //whiteCards[Math.floor(Math.random() * whiteCards.length)].text
    const startingX = selectionZoneRect.left + (i * (rootFontSize * 4))
    cards.push(new Card(1, whiteCards[Math.floor(Math.random() * whiteCards.length)].text, startingX, selectionZoneRect.bottom + 200))
  }
  repositionCards()
}

function repositionCards() {
  const totalCards = cards.length
  const cardWidthPx = rootFontSize * 12.4
  const availableWidth = selectionZoneRect.width - cardWidthPx
  const sep = availableWidth / (totalCards - 1)
  let nextX = selectionZoneRect.left
  cards.forEach(card => {
    card.moveTo(nextX, selectionZoneRect.top + rootFontSize * 5, 5)
    nextX += sep
  });
}

function sendCard(cardIdx) {
  cards[cardIdx].moveTo(0, -100, 20)
  cards[cardIdx].destroyCard()
  if (cardIdx !== -1) {
    cards.splice(cardIdx, 1);
  }
  repositionCards();
  setTimeout(getCard, 1000)
}

function getCard() {
  cards.push(new Card(1, whiteCards[Math.floor(Math.random() * whiteCards.length)].text, selectionZoneRect.right, selectionZoneRect.bottom + 200))
  repositionCards();
}

setSelectionZoneWidth()
spawnCards()