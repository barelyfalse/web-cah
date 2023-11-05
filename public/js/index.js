const screenParent = document.getElementById('full-overlay')
const selectionZoneEl = document.getElementById('card-selection')
const fview = document.getElementById('face')
const pview = document.getElementById('prepare')
const lview = document.getElementById('lobby')
const gview = document.getElementById('game')

//Pusher.logToConsole = true;
const pusher = new Pusher('16494569c1a82a4fde64', {
  cluster: 'us2',
  forceTLS: true,
  channelAuthorization: { endpoint: '/pusher/auth' },
})
let channel
var selectionZoneRect
var rootFontSize = 16
var selectionInt = null
var cards
var pointer = { first: {}, last: {} }
const isTouchSupported =
  'ontouchstart' in window ||
  navigator.maxTouchPoints > 0 ||
  navigator.msMaxTouchPoints > 0
var joining = true
let master = false

function setSelectionZoneWidth() {
  rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize)
  selectionZoneRect = selectionZoneEl.getBoundingClientRect()
  if (cards != null) {
    repositionCards()
  }
}

/*
 * CONTROL
 */
function handleTouchTapStart(event) {
  pointer.first.x = event.touches[0].clientX
  pointer.first.y = event.touches[0].clientY
  pointer.first.stamp = Date.now()
}

function handleSelectionPointerMove(event) {
  if (cards == undefined) return
  let pointingX
  pointer.last.time = Date.now() - pointer.first.stamp
  if (event.type == 'touchmove' && event.touches) {
    pointer.last.x = event.touches[0].clientX
    pointer.last.y = event.touches[0].clientY
    pointingX = pointer.last.x - selectionZoneEl.getBoundingClientRect().left
  } else if (event.type == 'mousemove') {
    pointer.last.x = event.clientX
    pointer.last.y = event.clientY
    pointingX = event.clientX - selectionZoneEl.getBoundingClientRect().left
  }

  if (!isTouchSupported || pointer.last.time > 100) {
    selectionInt = Math.min(
      Math.floor(
        (pointingX - rootFontSize) /
          ((selectionZoneRect.width - rootFontSize * 12.4) / (cards.length - 1))
      ),
      cards.length - 1
    )
    if (selectionInt >= 0) {
      for (let i = 0; i < cards.length; i++) {
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
  if (cards == undefined) return
  for (let i = 0; i < cards.length; i++) {
    cards[i].drop()
  }
  selectionInt = null
}

function handleSelectionPointerUp(event) {
  pointer.last.time = Date.now() - pointer.first.stamp
  if (isTouchSupported && pointer.last.time < 150 && selectionInt !== null) {
    sendCard(selectionInt)
  } else if (!isTouchSupported) {
    sendCard(selectionInt)
  }
}

function handleDocumentTap(event) {
  //deselect cards
  if (!selectionZoneEl.contains(event.target) && isTouchSupported && cards) {
    for (let i = 0; i < cards.length; i++) {
      cards[i].drop()
    }
    selectionInt = null
  }
}

/**
 * GAME
 */
function spawnCards(newCards) {
  setSelectionZoneWidth()
  for (let i = 0; i < newCards.length; i++) {
    const startingX = selectionZoneRect.left + i * (rootFontSize * 4)
    cards.push(
      new Card(
        newCards[i].id,
        newCards[i].text,
        startingX,
        selectionZoneRect.bottom + 200
      )
    )
  }
  repositionCards()
}

function repositionCards() {
  const totalCards = cards.length
  const cardWidthPx = rootFontSize * 12.4
  const availableWidth = selectionZoneRect.width - cardWidthPx
  const sep = availableWidth / (totalCards - 1)
  let nextX = selectionZoneRect.left
  cards.forEach((card) => {
    card.moveTo(nextX, selectionZoneRect.top + rootFontSize * 5, 5)
    nextX += sep
  })
}

function sendCard(cardIdx) {
  if (!cards || !cards[cardIdx]) return
  cards[cardIdx].moveTo(0, -100, 20)
  cards[cardIdx].destroyCard()
  selectionInt = null
  if (cardIdx !== -1) {
    cards.splice(cardIdx, 1)
  }
  repositionCards()
  setTimeout(getCard, 1000)
}

function getCard() {
  cards.push(
    new Card(
      1,
      'cartica',
      selectionZoneRect.right,
      selectionZoneRect.bottom + 200
    )
  )
  repositionCards()
}

/**
 * Views methods
 */
function joinView() {
  if (fview && pview) {
    fview.classList.add('view-move')
    gview.classList.add('view-move')
    pview.classList.remove('view-move')
    document.getElementById('prepare-looby-id-form')
      ? (document.getElementById('prepare-looby-id-form').style.display =
          'flex')
      : null
    document.getElementById('prepare-title')
      ? (document.getElementById('prepare-title').innerText = 'Join Room')
      : null
    document.getElementById('prepare-submit')
      ? (document.getElementById('prepare-submit').innerText = 'Join')
      : null
    joining = true
  }
}

function createView() {
  if (fview && pview) {
    fview.classList.add('view-move')
    gview.classList.add('view-move')
    pview.classList.remove('view-move')
    document.getElementById('prepare-looby-id-form')
      ? (document.getElementById('prepare-looby-id-form').style.display =
          'none')
      : null
    document.getElementById('prepare-title')
      ? (document.getElementById('prepare-title').innerText = 'Create Room')
      : null
    document.getElementById('prepare-submit')
      ? (document.getElementById('prepare-submit').innerText = 'Create')
      : null
    joining = false
  }
}

function showFace() {
  if (fview && pview) {
    fview.classList.remove('view-move')
    pview.classList.add('view-move')
    gview.classList.add('view-move')
  }
}

function lobbyView() {
  if (lview) {
    fview.classList.add('view-move')
    pview.classList.add('view-move')
    gview.classList.add('view-move')
    lview.classList.remove('view-move')
  }
}

function gameView() {
  if (gview) {
    fview.classList.add('view-move')
    pview.classList.add('view-move')
    lview.classList.add('view-move')
    gview.classList.remove('view-move')
  }
}

function showSnackbar(message, type = 'info') {
  const snackHolder = document.getElementById('snackbar-holder')
  if (snackHolder) {
    const template = document.getElementById('snackbar-template')
    const snack = template.content.cloneNode(true).firstElementChild
    if (snack) {
      snack.querySelector('.snack-text').innerText = message
      snack.classList.add(type)
      switch (type) {
        case 'info':
          snack.querySelector('.snack-icon').innerHTML = '&#8505'
          break
        case 'success':
          snack.querySelector('.snack-icon').innerHTML = '&#10004'
          break
        case 'caution':
          snack.querySelector('.snack-icon').innerHTML = '&#33'
          break
        case 'error':
          snack.querySelector('.snack-icon').innerHTML = '&#10008'
          break
        default:
          break
      }
      snackHolder.appendChild(snack)
      setTimeout(function () {
        snack.classList.add('snack-active')
      }, 10)
      setTimeout(function () {
        snack.classList.remove('snack-active')
        snack.addEventListener('transitionend', () => {
          snackHolder.removeChild(snack)
        })
      }, 3000)
    }
  }
}

/**
 * Utilities
 */
function getCookie(cookieName) {
  const name = cookieName + '='
  const decodedCookie = decodeURIComponent(document.cookie)
  const cookieArray = decodedCookie.split(';')

  for (let i = 0; i < cookieArray.length; i++) {
    let cookie = cookieArray[i]
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1)
    }
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length, cookie.length)
    }
  }
  return null
}

function deleteCookie(cookieName) {
  document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

function addLobbyPlayer(listEl, id, name, isMaster = false) {
  pl = document.createElement('div')
  pl.classList.add('lobby-player')
  pl.id = id
  isMaster ? pl.classList.add('lobby-master') : null
  pl.innerText = name
  listEl.appendChild(pl)
}

function deleteLobbyPlayer(id) {
  const el = document.getElementById(id)
  if (el) el.parentNode.removeChild(el)
}

/**
 * Logic methods
 */
function setChannel(channelName, id) {
  channel = pusher.subscribe('presence-' + id)
  const masterId = getCookie('cah_mid')
  const clientId = getCookie('cah_uid')
  let playerlist = lview.querySelector('.lobby-list')
  channel.bind('pusher:subscription_succeeded', (members) => {
    document.getElementById('roomid_input')
      ? (document.getElementById('roomid_input').value = channelName)
      : null
    if (members.me.id == masterId)
      document.getElementById('game-start-btn')
        ? (document.getElementById('game-start-btn').style.display = 'flex')
        : null
    while (playerlist.firstChild) {
      playerlist.removeChild(playerlist.firstChild)
    }
    members.each((member) => {
      addLobbyPlayer(
        playerlist,
        member.id,
        member.info.uname,
        masterId == member.id
      )
    })
    lobbyView()
    showSnackbar('Joined room ' + channelName, 'info')
  })
  channel.bind('pusher:member_added', (member) => {
    addLobbyPlayer(
      playerlist,
      member.id,
      member.info.uname,
      masterId == member.id
    )
    showSnackbar(member.info.uname + ' joined', 'info')
  })
  channel.bind('pusher:member_removed', (member) => {
    deleteLobbyPlayer(member.id)
    showSnackbar(member.info.uname + ' leave', 'info')
  })
  channel.bind('start-game', (data) => {
    gameView()
    showSnackbar('Game started', 'info')
    console.log('starting game')
    cards = new Array()
  })
  channel.bind('round-start', (data) => {
    setTimeout(() => {
      // set state (czar or jester)
      // show czar
      showSnackbar('New round started', 'info')
      // add new cards
      spawnCards(data.newCards.find((set) => set.player == clientId).cards)
      // show black card
    }, 1000)
  })
}

async function initialize() {
  if (!document.cookie.match('(^|;) ?cah_uid=([^;]*)(;|$)')) {
    try {
      const response = await fetch('/token', { method: 'POST' })
      const res = await response.json()
      if (res.success) {
        fview.classList.remove('view-move')
      } else {
        if (res.error.message) showSnackbar(res.error.message, 'error')
        throw new Error(
          `Error! Status: ${response.status}, Details: ${JSON.stringify(
            res.error
          )}`
        )
      }
    } catch (error) {
      console.error('Tokenization fail:', error)
    }
  } else {
    try {
      const response = await fetch('/reconnect', { method: 'POST' })
      const res = await response.json()
      if (res.success) {
        if (res.data.reconnecting) {
          setChannel(res.data.roomPId, res.data.roomId)
        } else {
          if (res.data.message) showSnackbar(res.data.message, 'caution')
        }
        if (res.data.noRooms) fview.classList.remove('view-move')
      } else {
        if (res.error.message) showSnackbar(res.error.message, 'error')
        throw new Error(
          `Error! Status: ${response.status}, Details: ${JSON.stringify(
            res.error
          )}`
        )
      }
    } catch (error) {
      console.error('Reconnection fail:', error)
    }
  }
}

async function joinCreate() {
  const unamerx = /^[a-zA-Z0-9 !@#$%^&*()_+\[\]:,.?~\\/-]{1,25}$/
  const roomidrgx = /^[A-Z0-9]{5}$/
  let clientId = getCookie('cah_uid')
  if (!clientId) return

  if (joining) {
    const roomidtxt = document.getElementById('roomid')
    const unametxt = document.getElementById('uname')
    if (
      !unametxt ||
      !unamerx.test(unametxt.value.trim()) ||
      !roomidtxt ||
      !roomidrgx.test(roomidtxt.value.trim().toUpperCase())
    ) {
      if (unamerx.test(unametxt.value.trim())) {
        showSnackbar('Invalid name', 'error')
      }
      // add room id error snackbar
      return
    }
    try {
      const response = await fetch('/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uname: unametxt.value.trim(),
          roomid: roomidtxt.value.trim().toUpperCase(),
        }),
      })
      const res = await response.json()
      if (res.success) {
        setChannel(res.data.roomPId, res.data.roomId)
      } else {
        if (res.error.message) showSnackbar(res.error.message, 'error')
        throw new Error(
          `Joining error! Status: ${response.status}, Details: ${JSON.stringify(
            res.error
          )}`
        )
      }
    } catch (error) {
      console.error('Join error:', error)
    }
  } else {
    // Creating room
    const unametxt = document.getElementById('uname')
    if (!unametxt || !unamerx.test(unametxt.value.trim())) return
    try {
      const response = await fetch('/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uname: unametxt.value.trim() }),
      })

      const res = await response.json()

      if (res.success) {
        showSnackbar('Room created', 'success')
        setChannel(res.data.roomPId, res.data.roomId)
      } else {
        if (res.error.message) showSnackbar(res.error.message, 'error')
        throw new Error(
          `Creation error! Status: ${
            response.status
          }, Details: ${JSON.stringify(res.error)}`
        )
      }
    } catch (error) {
      console.error('Room creation error:', error)
    }
  }
}

async function leaveRoom() {
  try {
    const response = await fetch('/leave-room', { method: 'POST' })

    const res = await response.json()
    if (res.success) {
      pusher.unsubscribe('presence-' + res.data.roomId)

      if (res.data.left) {
        showSnackbar('Room left', 'success')
      }
      if (res.data.roomDestroyed) {
        showSnackbar('Room destroyed', 'success')
      }

      fview.classList.remove('view-move')
      pview.classList.add('view-move')
      lview.classList.add('view-move')
    } else {
      if (res.error.message) showSnackbar(res.error.message, 'error')
      throw new Error(
        `Creation error! Status: ${response.status}, Details: ${JSON.stringify(
          res.error
        )}`
      )
    }
  } catch (error) {
    console.error('Error leaving:', error)
  }
}

async function startGame() {
  try {
    const response = await fetch('/start-game', { method: 'POST' })
    const res = await response.json()
    if (res.success) {
      //
    } else {
      if (res.error) showSnackbar(res.error.message, 'error')
      throw new Error(
        `Starting error! Status: ${response.status}, Details: ${JSON.stringify(
          res.error
        )}`
      )
    }
  } catch (error) {
    console.error('Error starting the game:', error)
  }
}

initialize()
