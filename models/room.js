const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { playerSchema } = require("./player");

const roomSchema = new Schema(
  {
    publicId: {
      type: String,
      required: true,
    },
    players: {
      type: [playerSchema],
      required: true,
    },
    blacks: {
      type: [Number],
      required: false,
    },
    whites: {
      type: [Number],
      required: false,
    },
    rounds: {
      type: Number,
      required: false,
    },
    masterId: {
      type: String,
      require: true,
    },
    masterKey: {
      type: String,
      required: true,
    },
    curRound: {
      type: Number,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Room = mongoose.model("Room", roomSchema);
module.exports = Room;
