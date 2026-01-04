const { GameEngine } = require('./GameEngine');

class BotPlayer {
  getMove(game) {
    // Strategy:
    // 1. Check if bot can win in the next move
    // 2. Check if opponent can win in the next move (block)
    // 3. Try to create a winning opportunity
    // 4. Make a strategic move (center preference)
    
    const botPlayer = 2; // Bot is always player 2
    
    // 1. Try to win
    for (let col = 0; col < 7; col++) {
      const testGame = game.clone();
      if (testGame.makeMove(col).success) {
        if (testGame.getWinner() === botPlayer) {
          return col;
        }
      }
    }
    
    // 2. Block opponent from winning
    for (let col = 0; col < 7; col++) {
      const testGame = game.clone();
      // Switch to opponent's turn
      testGame.currentPlayer = testGame.currentPlayer === 1 ? 2 : 1;
      if (testGame.makeMove(col).success) {
        if (testGame.getWinner() === (botPlayer === 1 ? 2 : 1)) {
          // Opponent would win here, so block
          return col;
        }
      }
    }
    
    // 3. Try to create a winning opportunity (3 in a row)
    const centerColumns = [3, 2, 4, 1, 5, 0, 6]; // Prefer center columns
    for (const col of centerColumns) {
      const testGame = game.clone();
      if (testGame.makeMove(col).success) {
        // Check if this move creates a winning opportunity
        if (this.createsWinningOpportunity(testGame, botPlayer)) {
          return col;
        }
      }
    }
    
    // 4. Make a strategic move (prefer center)
    for (const col of centerColumns) {
      const testGame = game.clone();
      if (testGame.makeMove(col).success) {
        return col;
      }
    }
    
    // Fallback: find any valid move
    for (let col = 0; col < 7; col++) {
      const testGame = game.clone();
      if (testGame.makeMove(col).success) {
        return col;
      }
    }
    
    return null;
  }
  
  createsWinningOpportunity(game, player) {
    // Check if player has 3 in a row that can be extended
    const board = game.getBoard();
    
    // Check horizontal opportunities
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
          // Check if this column can be played
          if (row === 5 || board[row + 1][emptyCol] !== 0) {
            return true;
          }
        }
      }
    }
    
    // Check vertical opportunities
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
    
    // Check diagonal opportunities (simplified check)
    // This is a simplified version - full implementation would check all diagonals
    
    return false;
  }
}

module.exports = { BotPlayer };



