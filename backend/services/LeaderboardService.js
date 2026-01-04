const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  wins: {
    type: Number,
    default: 0
  },
  games: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const Leaderboard = mongoose.models.Leaderboard || mongoose.model('Leaderboard', leaderboardSchema);

class LeaderboardService {
  async addWin(username) {
    try {
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        return; // Silently skip if MongoDB not connected
      }
      await Leaderboard.findOneAndUpdate(
        { username: username },
        { $inc: { wins: 1, games: 1 } },
        { upsert: true, new: true }
      );
    } catch (error) {
      // Silently ignore errors if MongoDB not available
    }
  }

  async addLoss(username) {
    try {
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        return; // Silently skip if MongoDB not connected
      }
      await Leaderboard.findOneAndUpdate(
        { username: username },
        { $inc: { games: 1 } },
        { upsert: true, new: true }
      );
    } catch (error) {
      // Silently ignore errors if MongoDB not available
    }
  }

  async addGame(username) {
    try {
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        return; // Silently skip if MongoDB not connected
      }
      await Leaderboard.findOneAndUpdate(
        { username: username },
        { $inc: { games: 1 } },
        { upsert: true, new: true }
      );
    } catch (error) {
      // Silently ignore errors if MongoDB not available
    }
  }

  async getLeaderboard(limit = 10) {
    try {
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        return [];
      }
      
      const leaderboard = await Leaderboard.find()
        .sort({ wins: -1, games: -1 })
        .limit(limit)
        .lean();
      
      return leaderboard.map(entry => ({
        username: entry.username,
        wins: entry.wins,
        games: entry.games,
        winRate: entry.games > 0 ? ((entry.wins / entry.games) * 100).toFixed(2) : 0
      }));
    } catch (error) {
      // Silently return empty array if MongoDB is not available
      return [];
    }
  }
}

module.exports = { LeaderboardService };
