class MatchmakingService {
  constructor() {
    this.waitingPlayers = new Map(); // username -> socketId
    this.waitingTimers = new Map(); // username -> timer
  }

  addPlayer(username, socketId) {
    if (this.waitingTimers.has(username)) {
      clearTimeout(this.waitingTimers.get(username));
      this.waitingTimers.delete(username);
    }

    if (this.waitingPlayers.size > 0) {
      const [opponent, opponentSocketId] = this.waitingPlayers.entries().next().value;
      
      this.waitingPlayers.delete(opponent);
      if (this.waitingTimers.has(opponent)) {
        clearTimeout(this.waitingTimers.get(opponent));
        this.waitingTimers.delete(opponent);
      }

      const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        matchFound: true,
        player1: opponent,
        player2: username,
        gameId: gameId
      };
    }

    this.waitingPlayers.set(username, socketId);

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
