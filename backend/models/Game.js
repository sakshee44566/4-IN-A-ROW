const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true
  },
  player1: {
    type: String,
    required: true
  },
  player2: {
    type: String,
    required: true
  },
  moves: [{
    player: Number,
    column: Number,
    row: Number,
    timestamp: Number
  }],
  winner: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['playing', 'draw', 'won', 'forfeited'],
    default: 'playing'
  },
  startedAt: {
    type: Number,
    required: true
  },
  endedAt: {
    type: Number,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Game', gameSchema);





