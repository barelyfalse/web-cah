const screenParent = document.getElementById('full-overlay');
const selectionZoneEl = document.getElementById('card-selection');
const fview = document.getElementById('face');
const pview = document.getElementById('prepare');
const lview = document.getElementById('lobby');

var socket;
var selectionZoneRect;
var rootFontSize = 16;
var selectionInt = null;
var cards;
var pointer = {first: {}, last: {}};
const isTouchSupported = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
var joining = true;

function setSelectionZoneWidth() {
  rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
  selectionZoneRect = selectionZoneEl.getBoundingClientRect();
  if (cards != null) {
    repositionCards()
  }
}

/*
 * CONTROL
 */

function handleTouchTapStart(event) {
  pointer.first.x = event.touches[0].clientX;
  pointer.first.y = event.touches[0].clientY;
  pointer.first.stamp = Date.now();
}

function handleSelectionPointerMove(event) {
  if (cards == undefined)
    return
  let pointingX;
  pointer.last.time = Date.now() - pointer.first.stamp
  if (event.type == 'touchmove' && event.touches) {
    pointer.last.x = event.touches[0].clientX
    pointer.last.y = event.touches[0].clientY
    pointingX = pointer.last.x - selectionZoneEl.getBoundingClientRect().left;
  } else if (event.type == 'mousemove') {
    pointer.last.x = event.clientX
    pointer.last.y = event.clientY
    pointingX = event.clientX - selectionZoneEl.getBoundingClientRect().left;
  }

  if (!isTouchSupported || pointer.last.time > 100) {
    selectionInt = Math.min(Math.floor((pointingX - rootFontSize) / ((selectionZoneRect.width - (rootFontSize * 12.4)) / (cards.length - 1))), cards.length - 1)
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
}

function handleSelectionPointerLeave(event) {
  if (cards == undefined)
    return
  for(let i = 0; i < cards.length; i++) {
    cards[i].drop()
  }
  selectionInt = null
}

function handleSelectionPointerUp(event) {
  pointer.last.time = Date.now() - pointer.first.stamp
  if(isTouchSupported && pointer.last.time < 150 && selectionInt !== null) {
    sendCard(selectionInt)
  } else if (!isTouchSupported) {
    sendCard(selectionInt)
  }
}

function handleDocumentTap(event) {
  //deselect cards
  if (!selectionZoneEl.contains(event.target) && isTouchSupported && cards) {
    for(let i = 0; i < cards.length; i++) {
      cards[i].drop()
    }
    selectionInt = null
  }
}

/**
 * GAME
 */

function spawnCards() {
  cards = new Array();
  for (let i = 0; i < 10; i++) {
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
  if (!cards[cardIdx])
    return
  cards[cardIdx].moveTo(0, -100, 20)
  cards[cardIdx].destroyCard()
  selectionInt = null
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

/* setSelectionZoneWidth()
spawnCards() */

/**
 * Views methods
 */
function joinView() {
  if (fview && pview) {
    fview.classList.add('view-move')
    pview.classList.remove('view-move')
    document.getElementById('prepare-looby-id-form')?document.getElementById('prepare-looby-id-form').style.display = 'flex':null
    document.getElementById('prepare-title')?document.getElementById('prepare-title').innerText = 'Join Room':null;
    document.getElementById('prepare-submit')?document.getElementById('prepare-submit').innerText = 'Join':null;
    joining = true;
  }
}

function createView() {
  if (fview && pview) {
    fview.classList.add('view-move')
    pview.classList.remove('view-move')
    document.getElementById('prepare-looby-id-form')?document.getElementById('prepare-looby-id-form').style.display = 'none':null
    document.getElementById('prepare-title')?document.getElementById('prepare-title').innerText = 'Create Room':null;
    document.getElementById('prepare-submit')?document.getElementById('prepare-submit').innerText = 'Create':null;
    joining = false;
  }
}

function showFace() {
  if (fview && pview) {
    fview.classList.remove('view-move')
    pview.classList.add('view-move')
  }
}

function showSnackbar(message) {
  const snackHolder = document.getElementById('snackbar-holder')
  if (snackHolder) {
    const template = document.getElementById('snackbar-template');
    const snack = template.content.cloneNode(true).firstElementChild;
    if (snack) {
      snack.querySelector('.snack-text')?snack.querySelector('.snack-text').innerText = message:null
      snackHolder.appendChild(snack)
      setTimeout(function () {
        snack.classList.add('snack-active');
      }, 10);
      setTimeout(function () {
        snack.classList.remove('snack-active');
        snack.addEventListener('transitionend', () => {
          snackHolder.removeChild(snack);
        });
      }, 3000);
    }
  }
}

/**
 * Logic methods
 */
function initialize() {
  let clientId = localStorage.getItem('clientId')

  if (!clientId) {
    socket = io();
  } else {
    socket = io({ query: { clientId } });
  }

  socket.on('connect', () => {
    socket.on('store-id', (clientId) => {
      localStorage.setItem('clientId', clientId);
    });
    socket.on('show-face', (arg, callback) => {
      fview.classList.remove('view-move')
    });
    socket.on('join-lobby', (arg, callback) => {
      if(lview) {
        fview.classList.add('view-move')
        pview.classList.add('view-move')
        lview.classList.remove('view-move')
      }
    });
    socket.on("join", (roomId) => {
      socket.join(roomId);
      console.log("Socket joined room:", roomId);
    });
    socket.on('lobby-update', (arg, callback) => {
      console.log(arg)
      if (arg.players && arg.settings) {
        let playerlist = lview.querySelector('.lobby-list')
        if (playerlist) {
          while (playerlist.firstChild) {
            playerlist.removeChild(playerlist.firstChild);
          }
          arg.players.forEach(player => {
            pl = document.createElement('div')
            pl.classList.add('lobby-player')
            player.isMaster?pl.classList.add('lobby-master'):null
            pl.innerText = player.name
            playerlist.appendChild(pl)
          })
        }
      }
      callback();
    });
    //fview.classList.remove('view-move')
  });
}

function joinCreate() {
  const unamerx = /^[a-zA-Z0-9 !@#$%^&*()_+\[\]:,.?~\\/-]{1,25}$/;
  const roomidrgx = /^[A-Z0-9]{5}$/; 
  let clientId = localStorage.getItem('clientId')

  if(!clientId)
    return

  if (joining) {
    //join logic
    const roomidtxt = document.getElementById('roomid')
    const unametxt = document.getElementById('uname')
    if(socket.connected) {
      if (unametxt && unamerx.test(unametxt.value.trim()) && roomidtxt && roomidrgx.test(roomidtxt.value.trim().toUpperCase())) {
        socket.emit('join-room', {uname: unametxt.value.trim(), publicId: roomidtxt.value.trim().toUpperCase()}, (res) => {
          if (res.status === 'OK') {
            showSnackbar("Joined")
          } else if (res.status === 'Error') {
            showSnackbar(res.msg)
          }
        });
      } else {
        showSnackbar("Invalid username or room ID")
      }
    } else {
      showSnackbar("An error ocurred")
    }
  } else {
    const unametxt = document.getElementById('uname')
    if(socket.connected) {
      if (unametxt && unamerx.test(unametxt.value.trim())) {
        socket.emit('create-room', unametxt.value.trim(), (res) => {
          if (res.status === 'OK') {
            showSnackbar("Room created")
          }
        });
      } else {
        showSnackbar("Invalid username")
      }
    } else {
      showSnackbar("An error ocurred")
    }
  }
}

function leaveRoom() {
  socket.emit('leave-room', {}, (res) => {
    if (res.status === 'OK') {
      showSnackbar('Room left')
      fview.classList.remove('view-move')
      pview.classList.add('view-move')
      lview.classList.add('view-move')
    } else {
      showSnackbar("An error ocurred")
    }
  })
}

initialize();