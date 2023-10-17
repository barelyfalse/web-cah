require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const { v4: uuidv4 } = require('uuid')
const http = require('http')
const { generateRoomId } = require('./functions')

// Cards
const { spaWhite, spaBlack } = require('./carddata')

// Models
const Room = require('./models/room')

// Server app
var app = express()

// Socket.io setup
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

let userTimers = new Map();

// Resgister public directory
app.use(express.static('public'))

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/public/index.html')
})

io.on('connection', async (socket) => {
  let clientId = socket.handshake.query.clientId;
  console.log(socket.rooms)
  if (!clientId) {
    clientId = uuidv4();
    socket.emit('store-id', clientId);
    socket.emit('show-face');
    console.log('New user connected ' + socket.id + ' | ' + clientId);
  } else {
    const inRoom = await Room.findOne({ 'players.id': clientId, state: { $in: ['lobby', 'game'] } } );
    if (inRoom) {
      socket.join(inRoom._id.toString());
      socket.emit('join-lobby');
      const players = inRoom.players.map((p) => { return { name: p.uName, isMaster: p.isMaster } })
      socket.emit('lobby-update', { players: players, settings: {} }, (response) => { });
    } else {
      socket.emit('show-face');
    }
    console.log('Known user connected ' + socket.id + ' | ' + clientId);
  }

  socket.on("create-room", async (arg, callback) => {
    const unamerx = /^[a-zA-Z0-9 !@#$%^&*()_+\[\]:,.?~\\/-]{1,25}$/;
    if (unamerx.test(arg.trim())) {
      try {
        const rooms = await Room.find()
        const newPublicId = generateRoomId(rooms.map((room) => room.publicId))
        const newRoom = new Room({
          publicId: newPublicId,
          players: [ { id: clientId, uName: arg.trim(), isMaster: true, state: 'onLobby' } ],
          curRound: 0,
          state: 'lobby'
        })
        const savedRoom = await newRoom.save();
        console.log(savedRoom._id.toString())
        socket.join(savedRoom._id.toString());
        console.log(socket.rooms)
        callback({status: 'OK'});
        socket.emit('join-lobby');
        socket.emit('lobby-update', { players: [{name: arg.trim(), isMaster: true,}], settings: { lobbyId: newPublicId } }, (response) => {
          console.log('Lobby created');
        });
      } catch(err) {
        console.log(err)
        callback({status: 'Error'});
      }
    } else {
      callback({status: 'Error', msg: 'Invalid username!'});
    }
    
  });

  socket.on('join-room', async (arg, callback) => {
    const unamergx = /^[a-zA-Z0-9 !@#$%^&*()_+\[\]:,.?~\\/-]{1,25}$/;
    if (unamergx.test(arg.uname.trim()) && clientId) {
      const ridregx = /^[A-Z0-9]{5}$/;
      if (ridregx.test(arg.publicId.trim().toUpperCase())) {
        const room = await Room.findOne({ 'publicId': arg.publicId.trim().toUpperCase() });
        if (room) {
          socket.join(room._id.toString());
          //console.log(socket.rooms)
          const roomUpdated = await Room.updateOne({ _id: room._id }, { $push: { players: { id: clientId, uName: arg.uname.trim(), isMaster: false, state: 'onLobby'} } })
          if (roomUpdated.acknowledged) {
            callback({status: 'OK'})
            socket.emit('join-lobby');
            //pull all players?
            let players = room.players.map((p) => { return { name: p.uName, isMaster: p.isMaster } })
            players.push({name: arg.uname.trim(), isMaster: false })
            io.in(room._id.toString()).emit('lobby-update', { players: players, settings: { lobbyId: arg.publicId.trim().toUpperCase() } }, (response) => {});
          } else {
            callback({status: 'Error', msg: 'Something happened'})
          }
        } else {
          callback({status: 'Error', msg: 'Unknown room ID'})
        }
      } else {
        callback({status: 'Error', msg: 'Invalid room ID'})
      }
    } else {
      callback({status: 'Error', msg: 'Invalid username'})
    }
  });

  socket.on('leave-room', async (arg, callback) => { 
    const inRoom = await Room.findOne({ 'players.id': clientId, state: { $in: ['onLobby', 'game'] } } );
    if (inRoom) {
      // borrar si es el último player en la sala
      if (inRoom.players.length <= 1) {
        const deletedRoom = await Room.deleteOne({ _id: inRoom._id })
        if (deletedRoom.acknowledged == true) {
          callback({status: 'OK'})
        } else {
          callback({status: 'Something happened'})
        }
      } else {
        
        const player = inRoom.players.find(player => player.id === clientId);

        if (player.isMaster) {
          //delete then set new master
          const deletedPlayer = await Room.updateOne({ _id: inRoom._id }, { $pull: { players: { id: clientId }}})
          if (deletedPlayer.acknowledged == true) {
            const newMaster = await Room.updateOne({ _id: inRoom._id, 'players.id': { $ne: clientId }}, { $set: { 'players.$[player].isMaster': true }}, { arrayFilters: [{ 'player.id': {$ne: clientId }}]})
            if (newMaster.acknowledged == true) {
              // OK
            } else {
              callback({status: 'Error', msg: 'Something happened'})
            }
          } else {
            callback({status: 'Error', msg: 'Something happened'})
          }
        } else {
          const deletedPlayer = await Room.updateOne({ _id: inRoom._id }, { $pull: { players: { id: clientId }}})
          if (deletedPlayer.acknowledged == true) { 
            // OK
          } else {
            callback({status: 'Error', msg: 'Something happened'})
          }
        }
      }
      const players = inRoom.players.map((player) => {
        return {name: player.uName, isMaster: player.isMaster}
      })
      io.in(inRoom._id.toString()).emit('lobby-update', { players: players, settings: { lobbyId: inRoom.publicId } }, (response) => {})
      socket.leave(inRoom._id.toString());
    } else {
      callback({status: 'Error', msg: 'Something happened'})
    }
  })

  socket.on('disconnect', async () => {
    console.log('user disconnected ' + socket.id);
    /* room = await Room.deleteMany( { 'players.id': clientId, players: { $size: 1 } } );
    console.log(room) */
    // timer for reconection
    // set user state to reconnecting

    console.log(socket.rooms)
    /* const inRoom = await Room.findOne({ 'players.id': clientId, state: { $in: ['onLobby', 'game'] } } );
    if (inRoom) {
      if (inRoom.players.length > 1) {
        // room has multiple players
      } else {
        // the last player, reconnection not needed
      }
    } else {
      // not in room?
    } */
    // update lobby
    // set timer
    // store timer
  });
});

// Connection to mongodb
mongoose.connect(process.env.MONGODB_CONNECTION_STRING)
  .then((result) => {
    console.log('Connected to db')
    server.listen(process.env.SERVER_PORT, () => {
      console.log(`Server listening on port '${process.env.SERVER_PORT}'`);
    });
  })
  .catch((error) => console.log(error))