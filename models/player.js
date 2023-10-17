const mongoose = require('mongoose')
const Schema = mongoose.Schema

const playerSchema = new Schema({
  id: { type: String, required: true },
  uName: { type: String, required: true },
  score: { type: [Number], required: false },
  deck: { type: [Number], required: false },
  isMaster: { type: Boolean, required: true },
  state: { type: String, required: true }
})

module.exports = { playerSchema }