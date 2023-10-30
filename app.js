require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const Pusher = require('pusher')
const cookieParser = require('cookie-parser')
const { v4: uuidv4 } = require('uuid')
const { generateRoomId, shuffle, createArrayFromLength } = require('./functions')

// Cards
const { spaWhite, spaBlack } = require('./carddata')

// Models
const Room = require('./models/room')

// Server app set
var app = express()
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

// Resgister public directory
app.use(express.static('public'))

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/public/index.html')
})

// Pusher settings
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

app.post("/pusher/auth", (req, res) => {
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;
  const user_id = req.cookies.cah_uid;
  const uname = req.cookies.cah_uname;
  const presenceData = {
    user_id: user_id,
    user_info: { uname: uname },
  };
  const authResponse = pusher.authorizeChannel(socketId, channel, presenceData);
  res.send(authResponse);
});

app.post('/token', async (req, res) => {
  try {
    const id = uuidv4();
    res.status(200).json({
      success: true,
      data: {
        id: id
      },
      error: null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      data: null,
      error: {
        detail: 'Internal server error',
        message: 'An error ocurred'
      }
    });
  }
});

app.post('/create-room', async (req, res) => {
  try {
    const unamerx = /^[a-zA-Z0-9 !@#$%^&*()_+\[\]:,.?~\\/-]{1,25}$/;
    // gather user id and name
    const uname = req.body.uname
    const uid = req.cookies.cah_uid
    // test usename
    if (!unamerx.test(uname)) {
      res.status(422).json({
        success: false,
        data: null,
        error: {
          message: 'Invalid username'
        }
      })
    }
    // generate room code
    const roomPublicId = generateRoomId()
    // create room on mongodb with player inside
    const wcards = shuffle(createArrayFromLength(spaWhite.length))
    const bcards = shuffle(createArrayFromLength(spaBlack.length))

    let newRoom = new Room({
      publicId: roomPublicId,
      players: [{id: uid, uName: uname, score: 0, deck: [], state: 'lobby'}],
      blacks: bcards,
      whites: wcards,
      rounds: 25,
      roomMaster: uid,
      curRound: 0,
      state: 'lobby',
    });
    newRoom.save()
      .then(room => {
        res.status(201).json({
          success: true,
          data: {
            roomId: room._id, 
            roomPId: room.publicId,
            masterId: room.roomMaster
          },
          error: null
        });
      })
      .catch(err => {
        console.error(err);
        res.status(500).json({
          success: false,
          data: null,
          error: {
            detail: 'Internal server error',
            message: 'An error ocurred'
          }
        });
      })
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      data: null,
      error: {
        detail: 'Internal server error',
        message: 'An error ocurred'
      }
    });
  }
});

app.post('/join-room', async (req, res) => {
  //console.log(req)
  try {
    const unamerx = /^[a-zA-Z0-9 !@#$%^&*()_+\[\]:,.?~\\/-]{1,25}$/;
    // gather user id and name
    const uname = req.body.uname
    const roomid = req.body.roomid
    const uid = req.cookies.cah_uid
    // test username
    if (!unamerx.test(uname)) {
      res.status(422).json({
        success: false,
        data: null,
        error: {
          message: 'Invalid username'
        }
      })
    }
    // search for room
    Room.findOneAndUpdate(
      { publicId: roomid.toUpperCase() },
      { $push: { players: {id: uid, uName: uname, score: 0, deck: [], state: 'lobby'} } },
      { new: true, useFindAndModify: false })
      .then(room => {
        res.status(200).json({
          success: true,
          data: {
            roomId: room._id, 
            roomPId: room.publicId,
            masterId: room.roomMaster
          },
          error: null
        });
      })
      .catch(err => {
        res.status(500).json({
          success: false,
          data: null,
          error: {
            detail: 'Internal server error',
            message: 'An error ocurred'
          }
        });
      })
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      data: null,
      error: {
        detail: 'Internal server error',
        message: 'An error ocurred'
      }
    });
  }
});

app.post('/reconnect', async (req, res) => {
  const uid = req.cookies.cah_uid
  try {
    Room.find({ 'players.id': uid, 'state': { $ne: 'ended' }})
      .then(rooms => {
        if (rooms && rooms.length > 0) {
          const room = rooms[0]
          switch (room.state) {
            case 'lobby':
              res.status(200).json({
                success: true,
                data: {
                  reconnecting: true,
                  roomId: room._id,
                  roomPId: room.publicId,
                  masterId: room.roomMaster
                },
                error: null
              });
              break;
            // More responses depending on the state of the room
            default:
              // not a valid state (unlikely)
              res.status(200).json({
                success: true,
                data: {
                  reconnecting: false,
                  message: 'Invalid state'
                },
                error: null
              });
              break;
          }
        } else {
          res.status(200).json({
            success: true,
            data: {
              reconnecting: false,
              noRooms: true
            },
            error: null
          });
        }
      })
      .catch(err => {
        console.log('Error:', err)
        res.status(500).json({
          success: false,
          data: null,
          error: {
            message: 'An error ocurred',
            detail: 'Internal server error'
          }
        });
      }) 
  } catch (err) {
    console.log('Error:', err)
    res.status(500).json({
      success: false,
      data: null,
      error: {
        message: 'An error ocurred',
        detail: 'Internal server error'
      }
    });
  }
  
});

app.post('/leave-room', async (req, res) => {
  const uid = req.cookies.cah_uid
  Room.find({ 'players.id': uid, state: { $ne: 'ended'} })
    .then(rooms => {
      for (let i = 0; i < rooms.length; i++) {
        if (rooms[i].players.length > 1) {
          // many players
          const updatedPlayers = rooms[i].players.filter(player => player.id !== uid);
          rooms[i].players = updatedPlayers;
          rooms[i].save()
            .then(() => {
              res.status(200).json({
                success: true,
                data: {
                  left: true,
                  roomId: rooms[i]._id,
                },
                error: null
              });
            })
            .catch(err => {
              console.log(err)
              res.status(500).json({
                success: false,
                data: null,
                error: {
                  message: 'An error ocurred',
                  detail: 'Internal server error'
                }
              });
            });
        } else {
          // last player
          Room.deleteOne({ _id: rooms[i]._id })
          .then(() => {
            res.status(200).json({
              success: true,
              data: {
                roomDestroyed: true,
                roomId: rooms[i]._id,
              },
              error: null
            });
          })
          .catch(err => {
            console.log('Error deleting room:', err);
            res.status(500).json({
              success: false,
              data: null,
              error: {
                message: 'An error ocurred',
                detail: 'Internal server error'
              }
            });
          });
        }
      }
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({
        success: false,
        data: null,
        error: {
          message: 'An error ocurred',
          detail: 'Internal server error'
        }
      });
    })
});

// Connection to mongodb
mongoose.connect(process.env.MONGODB_CONNECTION_STRING)
  .then((result) => {
    console.log('Connected to db')
    app.listen(process.env.SERVER_PORT, () => {
      console.log(`Server listening on port '${process.env.SERVER_PORT}'`);
    });
  })
  .catch((error) => console.log(error))