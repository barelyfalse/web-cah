const mongoose = require('mongoose')
const Schema = mongoose.Schema

const playerSchema = new Schema({
  id: { type: String, required: true },
  uName: { type: String, required: true },
  score: { type: [Number], required: false },
  lastResponse: { type: [Number], required: false },
  state: { type: String, required: true },
})

module.exports = { playerSchema }
