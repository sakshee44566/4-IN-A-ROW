class MatchmakingService {
  constructor() {
    this.waitingPlayers = new Map(); // username -> socketId
    this.waitingTimers = new Map(); // username -> timer
  }

  addPlayer(username, socketId) {
    // Remove any existing timer for this player
    if (this.waitingTimers.has(username)) {
      clearTimeout(this.waitingTimers.get(username));
      this.waitingTimers.delete(username);
    }

    // Check if there's a waiting player
    if (this.waitingPlayers.size > 0) {
      const [opponent, opponentSocketId] = this.waitingPlayers.entries().next().value;
      
      // Remove opponent from waiting list
      this.waitingPlayers.delete(opponent);
      if (this.waitingTimers.has(opponent)) {
        clearTimeout(this.waitingTimers.get(opponent));
        this.waitingTimers.delete(opponent);
      }

      // Generate game ID
      const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        matchFound: true,
        player1: opponent,
        player2: username,
        gameId: gameId
      };
    }

    // No waiting player, add to queue
    this.waitingPlayers.set(username, socketId);

    // Note: Bot timer is handled in server.js, not here
    // This service just manages the waiting queue

    return {
      matchFound: false
    };
  }

  removePlayer(username) {
    if (this.waitingPlayers.has(username)) {
      this.waitingPlayers.delete(username);
    }
    if (this.waitingTimers.has(username)) {
      clearTimeout(this.waitingTimers.get(username));
      this.waitingTimers.delete(username);
    }
  }

  isPlayerWaiting(username) {
    return this.waitingPlayers.has(username);
  }

  getWaitingPlayer(username) {
    if (this.waitingTimers.has(username)) {
      // Player is waiting, return bot match after timeout
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          resolve({
            matchFound: true,
            player1: username,
            player2: 'BOT',
            gameId: gameId
          });
        }, 10000 - (Date.now() - (this.waitingTimers.get(username)._idleStart || Date.now())));
      });
    }
    return null;
  }
}

module.exports = { MatchmakingService };
