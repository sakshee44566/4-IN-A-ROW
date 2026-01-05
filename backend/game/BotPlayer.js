const { GameEngine } = require('./GameEngine');

class BotPlayer {
  getMove(game) {
    const botPlayer = 2;
    
    for (let col = 0; col < 7; col++) {
      const testGame = game.clone();
      if (testGame.makeMove(col).success) {
        if (testGame.getWinner() === botPlayer) {
          return col;
        }
      }
    }
    
    for (let col = 0; col < 7; col++) {
      const testGame = game.clone();
      testGame.currentPlayer = testGame.currentPlayer === 1 ? 2 : 1;
      if (testGame.makeMove(col).success) {
        if (testGame.getWinner() === (botPlayer === 1 ? 2 : 1)) {
          return col;
        }
      }
    }
    
    const centerColumns = [3, 2, 4, 1, 5, 0, 6];
    for (const col of centerColumns) {
      const testGame = game.clone();
      if (testGame.makeMove(col).success) {
        if (this.createsWinningOpportunity(testGame, botPlayer)) {
          return col;
        }
      }
    }
    
    for (const col of centerColumns) {
      const testGame = game.clone();
      if (testGame.makeMove(col).success) {
        return col;
      }
    }
    
    for (let col = 0; col < 7; col++) {
      const testGame = game.clone();
      if (testGame.makeMove(col).success) {
        return col;
      }
    }
    
    return null;
  }
  
  createsWinningOpportunity(game, player) {
    const board = game.getBoard();
    
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 5; col++) {
        let count = 0;
        let emptyCol = -1;
        for (let i = 0; i < 4; i++) {
          if (board[row][col + i] === player) {
            count++;
          } else if (board[row][col + i] === 0) {
            emptyCol = col + i;
          } else {
            count = 0;
            break;
          }
        }
        if (count === 3 && emptyCol !== -1) {
          if (row === 5 || board[row + 1][emptyCol] !== 0) {
            return true;
          }
        }
      }
    }
    
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 3; row++) {
        let count = 0;
        for (let i = 0; i < 4; i++) {
          if (board[row + i][col] === player) {
            count++;
          } else if (board[row + i][col] !== 0) {
            count = 0;
            break;
          }
        }
        if (count === 3) {
          return true;
        }
      }
    }
    
    return false;
  }
}

module.exports = { BotPlayer };





