const screenParent = document.getElementById('full-overlay');
const selectionZoneEl = document.getElementById('card-selection');
const fview = document.getElementById('face');
const pview = document.getElementById('prepare');
const lview = document.getElementById('lobby');

Pusher.logToConsole = true;
const pusher = new Pusher(
  "16494569c1a82a4fde64", {
    cluster: "us2",
    forceTLS: true,
    channelAuthorization: { endpoint: "/pusher/auth"}
  }
);
let channel;

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
  if (!cards || !cards[cardIdx])
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

function showSnackbar(message, type = 'info') {
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

function getCookie(cookieName) {
  const name = cookieName + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');

  for (let i = 0; i < cookieArray.length; i++) {
    let cookie = cookieArray[i];
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length, cookie.length);
    }
  }
  return null;
}

function deleteCookie(cookieName) {
  document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

function addLobbyPlayer(listEl, id, name, isMaster=false) {
  pl = document.createElement('div')
  pl.classList.add('lobby-player')
  pl.id = id;
  isMaster?pl.classList.add('lobby-master'):null
  pl.innerText = name
  listEl.appendChild(pl)
}

function deleteLobbyPlayer(id) {
  const el = document.getElementById(id);
  if (el)
    el.parentNode.removeChild(el);
}

function setChannel(channelName, id) {
  channel = pusher.subscribe("presence-" + id);
  let playerlist = lview.querySelector('.lobby-list')
  channel.bind("pusher:subscription_succeeded", (members) => {
    document.getElementById('roomid_input')?document.getElementById('roomid_input').value=channelName:null
    if(lview) {
      fview.classList.add('view-move')
      pview.classList.add('view-move')
      lview.classList.remove('view-move')
    }
    while (playerlist.firstChild) {
      playerlist.removeChild(playerlist.firstChild);
    }
    members.each((member) => {
      addLobbyPlayer(playerlist, member.id, member.info.uname, member.info.ismaster)
    })
    showSnackbar('Joined room ' + channelName)
  });
  channel.bind("pusher:member_added", (member) => {
    addLobbyPlayer(playerlist, member.id, member.info.uname, member.info.ismaster)
    showSnackbar(member.info.uname + ' joined')
  });
  channel.bind("pusher:member_removed", (member) => {
    deleteLobbyPlayer(member.id)
    showSnackbar(member.info.uname + ' leave')
  });
}

async function initialize() {
  //first time?
  if (!document.cookie.match("(^|;) ?cah_uid=([^;]*)(;|$)")) {
    try {
      const response = await fetch('/auth', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        document.cookie = "cah_uid=" + data.id;
        fview.classList.remove('view-move')
      } else {
        console.error('Retrive error:', response.status);
      }
    } catch (error) {
      showSnackbar("Auth error")
      console.error('Auth fail:', error);
      return
    }
  } else {
    // reconecting?
    // reconection process?
    try {
      let clientId = getCookie('cah_uid')
      const res = await fetch('/reconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: clientId }),
      });
      if (res.ok) {
        const data = await res.json()
        if (data.reconnecting) {
          setChannel(data.roompid, data.roomid)
        }
        if (data.norooms) {
          fview.classList.remove('view-move')
        }
      } else {
        console.error('Retrive error:', res.status);
      }
    } catch (err) {
      showSnackbar("Reconnection error")
      console.error('Auth fail:', err);
      return
    }
  }
}




async function joinCreate() {
  const unamerx = /^[a-zA-Z0-9 !@#$%^&*()_+\[\]:,.?~\\/-]{1,25}$/;
  const roomidrgx = /^[A-Z0-9]{5}$/; 
  let clientId = getCookie('cah_uid')
  if(!clientId)
    return

  if (joining) {
    const roomidtxt = document.getElementById('roomid')
    const unametxt = document.getElementById('uname')
    if (!unametxt || !unamerx.test(unametxt.value.trim()) || !roomidtxt || !roomidrgx.test(roomidtxt.value.trim().toUpperCase()))
      return
    
    try {
      document.cookie = "cah_uname=" + unametxt.value.trim();
      const res = await fetch('/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uname: unametxt.value.trim(), roomid: roomidtxt.value.trim().toUpperCase() }),
      });
      const data = await res.json()
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      } else {
        setChannel(data.roompid, data.roomid)
      }
    } catch (error) {
      console.error('Error:', error);
    }
  } else {
    // creating
    console.log('trying to create room')
    const unametxt = document.getElementById('uname')
    if (!unametxt || !unamerx.test(unametxt.value.trim()))
      return
    try {
      document.cookie = "cah_uname=" + unametxt.value.trim();

      const res = await fetch('/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uname: unametxt.value.trim() }),
      });
  
      if (!res.ok) {
        showSnackbar('Room creation error')
        throw new Error(`HTTP error! status: ${res.status}`);
      } else {
        showSnackbar('Room created')
      }
  
      const data = await res.json();

      if (data.roomid) {
        setChannel(data.roompid, data.roomid)
      } else {
        console.error('Error');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

async function leaveRoom() {
  try {
    const res = await fetch('/leave-room', { method: 'POST' });
    if (!res.ok) {
      showSnackbar('You can not leave')
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();

    if(data.roomid) {
      pusher.unsubscribe('presence-'+data.roomid)
      deleteCookie('cah_uid')
      fview.classList.remove('view-move')
      pview.classList.add('view-move')
      lview.classList.add('view-move')
    }
    if (data.left) {
      showSnackbar('Room left')
    }
    if (data.roomdestroyed) {
      showSnackbar('Room destroyed')
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

initialize();