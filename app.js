require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const Pusher = require('pusher')
const cookieParser = require('cookie-parser')
const { v4: uuidv4 } = require('uuid')
const {
  generateRoomId,
  generateKey,
  validUsername,
  shuffle,
  createArrayFromLength,
  validDocID,
  validUUId,
} = require('./functions')

// Cards
const { spaWhite, spaBlack } = require('./carddata')

// Models
const Room = require('./models/room')

// Server app set
var app = express()
app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({ extended: false }))
app.use(express.static('public'))

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html')
})

// Pusher settings
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
})

app.post('/pusher/auth', (req, res) => {
  const socketId = req.body.socket_id
  const channel = req.body.channel_name
  const user_id = req.cookies.cah_uid
  const uname = req.cookies.cah_uname
  const presenceData = {
    user_id: user_id,
    user_info: { uname: uname },
  }
  const authResponse = pusher.authorizeChannel(socketId, channel, presenceData)
  res.send(authResponse)
})

app.post('/token', async (req, res) => {
  try {
    const id = uuidv4()
    res.setHeader('Set-Cookie', `cah_uid=${id}; Max-Age=21600; Secure`)
    res.status(200).json({
      success: true,
      data: {
        id: id,
      },
      error: null,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      data: null,
      error: {
        detail: 'Internal server error',
        message: 'An error ocurred',
      },
    })
  }
})

app.post('/create-room', async (req, res) => {
  try {
    const uname = req.body.uname
    const uid = req.cookies.cah_uid
    if (!validUsername(uname)) {
      res.status(422).json({
        success: false,
        data: null,
        error: {
          message: 'Invalid username',
        },
      })
    } else {
      const roomPublicId = generateRoomId()
      const masterKey = generateKey()

      const wcards = shuffle(createArrayFromLength(spaWhite.length))
      const bcards = shuffle(createArrayFromLength(spaBlack.length))

      let newRoom = new Room({
        publicId: roomPublicId,
        players: [
          { id: uid, uName: uname, score: 0, deck: [], state: 'lobby' },
        ],
        blacks: bcards,
        whites: wcards,
        rounds: 25,
        masterId: uid,
        masterKey: masterKey,
        curRound: 0,
        state: 'lobby',
      })
      newRoom
        .save()
        .then((room) => {
          const cookies = [
            `cah_uid=${uid}; Max-Age=21600; Secure`,
            `cah_uname=${uname}; Max-Age=21600; Secure`,
            `cah_rid=${room._id}; Max-Age=21600; Secure`,
            `cah_mid=${room.masterId}; Max-Age=21600; Secure`,
            `cah_mkey=${room.masterKey}; Max-Age=21600; HttpOnly Secure`,
          ]
          res.setHeader('Set-Cookie', cookies)
          res.status(201).json({
            success: true,
            data: {
              roomId: room._id,
              roomPId: room.publicId,
            },
            error: null,
          })
        })
        .catch((err) => {
          console.error(err)
          res.status(500).json({
            success: false,
            data: null,
            error: {
              detail: 'Internal server error',
              message: 'An error ocurred',
            },
          })
        })
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      data: null,
      error: {
        detail: 'Internal server error',
        message: 'An error ocurred',
      },
    })
  }
})

app.post('/join-room', async (req, res) => {
  try {
    const uname = req.body.uname
    const roomid = req.body.roomid
    const uid = req.cookies.cah_uid
    if (!validUsername(uname)) {
      res.status(422).json({
        success: false,
        data: null,
        error: {
          message: 'Invalid username',
        },
      })
    }
    // search for room
    Room.findOneAndUpdate(
      { publicId: roomid.toUpperCase() },
      {
        $push: {
          players: {
            id: uid,
            uName: uname,
            score: 0,
            deck: [],
            state: 'lobby',
          },
        },
      },
      { new: true, useFindAndModify: false }
    )
      .then((room) => {
        if (!room) {
          res.status(204).json({
            success: false,
            data: null,
            error: {
              message: "Room doesn't exist!",
            },
          })
        } else {
          const cookies = [
            `cah_uid=${uid}; Max-Age=21600; Secure`,
            `cah_uname=${uname}; Max-Age=21600; Secure`,
            `cah_rid=${room._id}; Max-Age=21600; Secure`,
            `cah_mid=${room.masterId}; Max-Age=21600; Secure`,
          ]
          res.setHeader('Set-Cookie', cookies)
          res.status(200).json({
            success: true,
            data: {
              roomId: room._id,
              roomPId: room.publicId,
            },
            error: null,
          })
        }
      })
      .catch((err) => {
        res.status(500).json({
          success: false,
          data: null,
          error: {
            detail: 'Internal server error',
            message: 'An error ocurred',
          },
        })
      })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      data: null,
      error: {
        detail: 'Internal server error',
        message: 'An error ocurred',
      },
    })
  }
})

app.post('/reconnect', async (req, res) => {
  const uid = req.cookies.cah_uid
  try {
    Room.find({ 'players.id': uid, state: { $ne: 'ended' } })
      .then((rooms) => {
        if (rooms && rooms.length > 0) {
          const room = rooms[0]
          switch (room.state) {
            case 'lobby':
              const cookies = [
                `cah_uid=${uid}; Max-Age=21600; Secure`,
                `cah_rid=${room._id}; Max-Age=21600; Secure`,
                `cah_mid=${room.masterId}; Max-Age=21600; Secure`,
              ]
              res.setHeader('Set-Cookie', cookies)
              res.status(200).json({
                success: true,
                data: {
                  reconnecting: true,
                  roomId: room._id,
                  roomPId: room.publicId,
                },
                error: null,
              })
              break
            // More responses depending on the state of the room
            default:
              // not a valid state (unlikely)
              res.status(200).json({
                success: true,
                data: {
                  reconnecting: false,
                  message: 'Invalid state',
                },
                error: null,
              })
              break
          }
        } else {
          res.status(200).json({
            success: true,
            data: {
              reconnecting: false,
              noRooms: true,
            },
            error: null,
          })
        }
      })
      .catch((err) => {
        console.log('Error:', err)
        res.status(500).json({
          success: false,
          data: null,
          error: {
            message: 'An error ocurred',
            detail: 'Internal server error',
          },
        })
      })
  } catch (err) {
    console.log('Error:', err)
    res.status(500).json({
      success: false,
      data: null,
      error: {
        message: 'An error ocurred',
        detail: 'Internal server error',
      },
    })
  }
})

app.post('/leave-room', async (req, res) => {
  const uid = req.cookies.cah_uid
  const rid = req.cookies.cah_rid
  Room.find({ _id: rid, state: { $ne: 'ended' } })
    .then((rooms) => {
      if (!rooms) {
        res.status(204).json({
          success: false,
          data: null,
          error: {
            message: 'An error ocurred',
            detail: 'No rooms found',
          },
        })
      } else {
        for (let i = 0; i < rooms.length; i++) {
          if (rooms[i].players.length > 1) {
            // many players
            const updatedPlayers = rooms[i].players.filter(
              (player) => player.id !== uid
            )
            rooms[i].players = updatedPlayers
            rooms[i]
              .save()
              .then(() => {
                const cookies = [
                  'cah_rid=; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
                  'cah_mid=; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
                  'cah_mkey=; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
                ]
                res.setHeader('Set-Cookie', cookies)
                res.status(200).json({
                  success: true,
                  data: {
                    left: true,
                    roomId: rooms[i]._id,
                  },
                  error: null,
                })
              })
              .catch((err) => {
                console.log(err)
                res.status(500).json({
                  success: false,
                  data: null,
                  error: {
                    message: 'An error ocurred',
                    detail: 'Internal server error',
                  },
                })
              })
          } else {
            // last player
            Room.deleteOne({ _id: rooms[i]._id })
              .then(() => {
                const cookies = [
                  'cah_rid=; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
                  'cah_mid=; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
                  'cah_mkey=; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
                ]
                res.setHeader('Set-Cookie', cookies)
                res.status(200).json({
                  success: true,
                  data: {
                    roomDestroyed: true,
                    roomId: rooms[i]._id,
                  },
                  error: null,
                })
              })
              .catch((err) => {
                console.log('Error deleting room:', err)
                res.status(500).json({
                  success: false,
                  data: null,
                  error: {
                    message: 'An error ocurred',
                    detail: 'Internal server error',
                  },
                })
              })
          }
        }
      }
    })
    .catch((err) => {
      console.log(err)
      res.status(500).json({
        success: false,
        data: null,
        error: {
          message: 'An error ocurred',
          detail: 'Internal server error',
        },
      })
    })
})

app.post('/start-game', async (req, res) => {
  const uid = req.cookies.cah_uid
  const rid = req.cookies.cah_mid
  const mkey = req.cookies.cah_mkey
  // valid master uid?
  if (!validUUId(uid)) {
    res.status(400).json({
      success: false,
      data: null,
      error: {
        message: 'An error ocurred',
        detail: 'Invalid ID provided',
      },
    })
  } else {
    Room.findById(rid)
      .then((room) => {
        if (!room) {
          res.status(404).json({
            success: false,
            data: null,
            error: {
              message: 'An error ocurred',
              detail: 'Room Not Found',
            },
          })
        } else {
          if (room.masterKey != mkey) {
            res.status(403).json({
              success: false,
              data: null,
              error: {
                detail: 'Forbidden',
              },
            })
          } else {
            // pop hand cards
            // pop black card
            // raise start game event
            // send player order list
            // raise round start on each player
            // send cards, czar, black card

            res.status(200).json({
              success: false,
              data: null,
              error: null,
            })
          }
        }
      })
      .catch((err) => {
        console.log(err)
        res.status(500).json({
          success: false,
          data: null,
          error: {
            message: 'An error ocurred',
            detail: 'Error when finding room',
          },
        })
      })
  }

  // get
})

// Connection to mongodb
mongoose
  .connect(process.env.MONGODB_CONNECTION_STRING)
  .then((result) => {
    console.log('Connected to db')
    app.listen(process.env.SERVER_PORT, () => {
      console.log(`Server listening on port '${process.env.SERVER_PORT}'`)
    })
  })
  .catch((error) => console.log(error))
