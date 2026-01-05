class GameEngine {
  constructor(player1, player2) {
    this.player1 = player1;
    this.player2 = player2;
    this.board = Array(6).fill(null).map(() => Array(7).fill(0));
    this.currentPlayer = 1;
    this.status = 'playing';
    this.winner = null;
    this.moves = [];
  }

  getBoard() {
    return this.board;
  }

  getCurrentPlayer() {
    return this.currentPlayer;
  }

  getStatus() {
    return this.status;
  }

  getWinner() {
    return this.winner;
  }

  getPlayers() {
    return {
      player1: this.player1,
      player2: this.player2
    };
  }

  getMoves() {
    return this.moves;
  }

  setStatus(status) {
    this.status = status;
  }

  makeMove(column) {
    if (this.status !== 'playing') {
      return { success: false, message: 'Game is not in playing state' };
    }

    if (column < 0 || column >= 7) {
      return { success: false, message: 'Invalid column' };
    }

    let row = -1;
    for (let i = 5; i >= 0; i--) {
      if (this.board[i][column] === 0) {
        row = i;
        break;
      }
    }

    if (row === -1) {
      return { success: false, message: 'Column is full' };
    }

    this.board[row][column] = this.currentPlayer;
    
    this.moves.push({
      player: this.currentPlayer,
      column: column,
      row: row,
      timestamp: Date.now()
    });

    if (this.checkWin(row, column)) {
      this.status = 'won';
      this.winner = this.currentPlayer;
      return { success: true, message: 'Move successful' };
    }

    if (this.isBoardFull()) {
      this.status = 'draw';
      this.winner = null;
      return { success: true, message: 'Move successful' };
    }

    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    return { success: true, message: 'Move successful' };
  }

  checkWin(row, column) {
    const player = this.board[row][column];
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal /
      [1, -1]   // diagonal \
    ];

    for (const [dx, dy] of directions) {
      let count = 1;

      for (let i = 1; i < 4; i++) {
        const newRow = row + dx * i;
        const newCol = column + dy * i;
        if (newRow >= 0 && newRow < 6 && newCol >= 0 && newCol < 7 && 
            this.board[newRow][newCol] === player) {
          count++;
        } else {
          break;
        }
      }

      for (let i = 1; i < 4; i++) {
        const newRow = row - dx * i;
        const newCol = column - dy * i;
        if (newRow >= 0 && newRow < 6 && newCol >= 0 && newCol < 7 && 
            this.board[newRow][newCol] === player) {
          count++;
        } else {
          break;
        }
      }

      if (count >= 4) {
        return true;
      }
    }

    return false;
  }

  isBoardFull() {
    for (let col = 0; col < 7; col++) {
      if (this.board[0][col] === 0) {
        return false;
      }
    }
    return true;
  }

  clone() {
    const cloned = new GameEngine(this.player1, this.player2);
    cloned.board = this.board.map(row => [...row]);
    cloned.currentPlayer = this.currentPlayer;
    cloned.status = this.status;
    cloned.winner = this.winner;
    cloned.moves = [...this.moves];
    return cloned;
  }
}

module.exports = { GameEngine };
