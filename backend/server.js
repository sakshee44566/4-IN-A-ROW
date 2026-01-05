const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Game = require('./models/Game');
const { GameEngine } = require('./game/GameEngine');
const { MatchmakingService } = require('./services/MatchmakingService');
const { BotPlayer } = require('./game/BotPlayer');
const { LeaderboardService } = require('./services/LeaderboardService');
const { AuthService } = require('./services/AuthService');

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? FRONTEND_URL : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

const io = socketIo(server, {
  cors: corsOptions
});

app.use(cors(corsOptions));
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/4inarow';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✓ MongoDB connected successfully');
})
.catch(err => {
  console.error('✗ MongoDB connection error:', err.message);
  console.log('⚠️  Server will continue but game persistence will not work until MongoDB is connected.');
  console.log('   Make sure MongoDB is running or update MONGODB_URI in .env file');
});

const matchmakingService = new MatchmakingService();
const leaderboardService = new LeaderboardService();
const authService = new AuthService();

const authenticatedUsers = new Map();
const socketToUser = new Map();

const activeGames = new Map();
const playerSockets = new Map();
const socketPlayers = new Map();
const gamePlayers = new Map();
const botTimers = new Map();

async function startGame(player1, player2, gameId, io) {
  console.log(`\n🎮 Starting game: ${player1} vs ${player2}, gameId: ${gameId}`);
  const gameEngine = new GameEngine(player1, player2);
  activeGames.set(gameId, { game: gameEngine, createdAt: Date.now() });
  
  gamePlayers.set(gameId, {
    player1: player1,
    player2: player2,
    socket1: playerSockets.get(player1),
    socket2: player2 === 'BOT' ? null : playerSockets.get(player2)
  });

  const socket1Id = playerSockets.get(player1);
  let socket1 = socket1Id ? io.sockets.sockets.get(socket1Id) : null;
  
  if (!socket1 && authenticatedUsers.has(player1)) {
    const authInfo = authenticatedUsers.get(player1);
    socket1 = io.sockets.sockets.get(authInfo.socketId);
    if (socket1) {
      playerSockets.set(player1, authInfo.socketId);
      socketPlayers.set(authInfo.socketId, player1);
      console.log(`  ✓ Found socket via authenticatedUsers fallback for ${player1}`);
    }
  }
  
  if (!socket1) {
    for (const [socketId, socket] of io.sockets.sockets.entries()) {
      const userInfo = socketToUser.get(socketId);
      if (userInfo && userInfo.username === player1) {
        socket1 = socket;
        playerSockets.set(player1, socketId);
        socketPlayers.set(socketId, player1);
        console.log(`  ✓ Found socket via socketToUser search for ${player1}`);
        break;
      }
    }
  }
  
  const socket2 = player2 === 'BOT' ? null : (playerSockets.get(player2) ? io.sockets.sockets.get(playerSockets.get(player2)) : null);

  console.log(`  Socket1 for ${player1} (${socket1Id || 'not in map'}):`, socket1 ? '✓ found' : '✗ not found');
  console.log(`  Socket2 for ${player2}:`, socket2 ? '✓ found' : '✗ not found (BOT)');

  if (socket1) {
    socket1.join(gameId);
    socket1.emit('matchFound', {
      gameId: gameId,
      opponent: player2,
      isPlayer1: true
    });
    console.log(`  ✓ matchFound event sent to ${player1}`);
  } else {
    console.log(`  ✗ ERROR: Could not find socket for ${player1} after all fallback attempts`);
    console.log(`  Current playerSockets:`, Array.from(playerSockets.keys()));
    console.log(`  Current authenticatedUsers:`, Array.from(authenticatedUsers.keys()));
  }

  if (socket2) {
    socket2.join(gameId);
    socket2.emit('matchFound', {
      gameId: gameId,
      opponent: player1,
      isPlayer1: false
    });
    console.log(`  ✓ matchFound event sent to ${player2}`);
  }

  const initialState = {
    gameId: gameId,
    board: gameEngine.getBoard(),
    currentPlayer: gameEngine.getCurrentPlayer(),
    status: gameEngine.getStatus(),
    players: {
      player1: player1,
      player2: player2
    }
  };
  
  io.to(gameId).emit('gameState', initialState);
  
  if (socket1) {
    socket1.emit('gameState', initialState);
  }
  
  console.log(`  ✓ gameState event sent to game ${gameId}`);
  console.log(`  Game status: ${gameEngine.getStatus()}, Current player: ${gameEngine.getCurrentPlayer()}\n`);
}

app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await leaderboardService.getLeaderboard();
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/game/:gameId', async (req, res) => {
  try {
    const game = await Game.findById(req.params.gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const result = await authService.register(username, password);
    
    if (result.success) {
      res.json({
        token: result.token,
        user: result.user
      });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await authService.login(username, password);
    
    if (result.success) {
      res.json({
        token: result.token,
        user: result.user
      });
    } else {
      res.status(401).json({ error: result.message });
    }
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const userInfo = socketToUser.get(socket.id);
    if (userInfo) {
      socketToUser.delete(socket.id);
      const authInfo = authenticatedUsers.get(userInfo.username);
      if (authInfo && authInfo.socketId === socket.id) {
        authenticatedUsers.delete(userInfo.username);
      }
      playerSockets.delete(userInfo.username);
      socketPlayers.delete(socket.id);
    }
  });

  socket.on('authenticate', async ({ token }) => {
    try {
      if (!token) {
        socket.emit('authError', { message: 'Authentication token required' });
        return;
      }

      const decoded = authService.verifyToken(token);
      if (!decoded) {
        socket.emit('authError', { message: 'Invalid or expired token' });
        return;
      }

      const { userId, username } = decoded;

      const existingAuth = authenticatedUsers.get(username);
      if (existingAuth && existingAuth.socketId !== socket.id) {
        const oldSocket = io.sockets.sockets.get(existingAuth.socketId);
        if (oldSocket) {
          oldSocket.emit('authError', { message: 'You have logged in from another device/session' });
          oldSocket.disconnect();
        }
        console.log(`Cleaning up stale state for ${username} from previous session`);
        matchmakingService.removePlayer(username);
        if (botTimers.has(username)) {
          clearTimeout(botTimers.get(username));
          botTimers.delete(username);
        }
        playerSockets.delete(username);
        socketPlayers.delete(existingAuth.socketId);
      }

      authenticatedUsers.set(username, { socketId: socket.id, token, userId });
      socketToUser.set(socket.id, { username, userId });
      
      socket.emit('authenticated', { username, userId });
      console.log(`User authenticated: ${username} (${socket.id})`);
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('authError', { message: 'Authentication failed' });
    }
  });

  socket.on('join', async ({ username, gameId, token }) => {
    console.log('Join event received:', { username, gameId, socketId: socket.id });
    try {
      if (!token) {
        socket.emit('error', { message: 'Authentication required. Please login first.' });
        return;
      }

      const decoded = authService.verifyToken(token);
      if (!decoded) {
        socket.emit('error', { message: 'Invalid or expired token. Please login again.' });
        return;
      }

      if (decoded.username !== username) {
        socket.emit('error', { message: 'You can only play as your own account' });
        return;
      }

      const userInfo = socketToUser.get(socket.id);
      if (!userInfo || userInfo.username !== username) {
        socket.emit('error', { message: 'Please authenticate first' });
        return;
      }

      if (!username) {
        socket.emit('error', { message: 'Username is required' });
        return;
      }
      
      console.log(`Cleaning up stale state for ${username}`);
      
      if (matchmakingService.isPlayerWaiting(username)) {
        console.log(`Removing ${username} from matchmaking queue (stale state)`);
        matchmakingService.removePlayer(username);
      }
      
      if (botTimers.has(username)) {
        console.log(`Clearing bot timer for ${username} (stale state)`);
        clearTimeout(botTimers.get(username));
        botTimers.delete(username);
      }
      
      const oldSocketId = playerSockets.get(username);
      if (oldSocketId && oldSocketId !== socket.id) {
        console.log(`Removing stale socket mapping for ${username}: ${oldSocketId} -> ${socket.id}`);
        socketPlayers.delete(oldSocketId);
      }
      
      if (gameId) {
        const gameData = activeGames.get(gameId);
        if (gameData) {
          const game = gameData.game;
          const playerInfo = gamePlayers.get(gameId);
          
          if (playerInfo && (playerInfo.player1 === username || playerInfo.player2 === username)) {
            playerSockets.set(username, socket.id);
            socketPlayers.set(socket.id, username);
            
            if (playerInfo.player1 === username) {
              playerInfo.socket1 = socket.id;
            } else if (playerInfo.player2 === username) {
              playerInfo.socket2 = socket.id;
            }
            
            socket.join(gameId);
            socket.emit('gameState', {
              gameId: gameId,
              board: game.getBoard(),
              currentPlayer: game.getCurrentPlayer(),
              status: game.getStatus(),
              players: {
                player1: game.getPlayers().player1,
                player2: game.getPlayers().player2
              }
            });
            
            socket.to(gameId).emit('playerReconnected', { username });
            return;
          }
        }
      }

      const result = matchmakingService.addPlayer(username, socket.id);
      
      playerSockets.set(username, socket.id);
      socketPlayers.set(socket.id, username);
      
      const currentUserInfo = socketToUser.get(socket.id);
      if (!currentUserInfo) {
        socketToUser.set(socket.id, { username, userId: decoded.userId });
      }
      
      socket.emit('matchmaking', { status: 'waiting' });

      if (result.matchFound) {
        if (botTimers.has(result.player1)) {
          clearTimeout(botTimers.get(result.player1));
          botTimers.delete(result.player1);
        }
        if (botTimers.has(result.player2)) {
          clearTimeout(botTimers.get(result.player2));
          botTimers.delete(result.player2);
        }
        await startGame(result.player1, result.player2, result.gameId, io);
      } else {
        console.log(`Player ${username} waiting for match. Bot will start in 10 seconds if no opponent joins.`);
        const timer = setTimeout(async () => {
          console.log(`Bot timer fired for ${username}`);
          console.log(`Is player waiting?`, matchmakingService.isPlayerWaiting(username));
          
          const playerSocketId = playerSockets.get(username);
          const playerSocket = playerSocketId ? io.sockets.sockets.get(playerSocketId) : null;
          const isSocketConnected = playerSocket && playerSocket.connected;
          
          console.log(`Player socket exists:`, !!playerSocket, `Connected:`, isSocketConnected);
          
          if (matchmakingService.isPlayerWaiting(username) || isSocketConnected) {
            console.log(`No opponent found for ${username}. Starting bot game...`);
            matchmakingService.removePlayer(username);
            botTimers.delete(username);
            
            const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await startGame(username, 'BOT', gameId, io);
            console.log(`Bot game started for ${username} with gameId: ${gameId}`);
          } else {
            console.log(`Player ${username} is no longer waiting and socket not connected (may have disconnected)`);
            botTimers.delete(username);
          }
        }, 10000);
        botTimers.set(username, timer);
        console.log(`Bot timer set for ${username}, will fire in 10 seconds`);
      }
    } catch (error) {
      console.error('Join error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('makeMove', async ({ gameId, column, token }) => {
    console.log('makeMove received:', { gameId, column, socketId: socket.id });
    try {
      if (!token) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const decoded = authService.verifyToken(token);
      if (!decoded) {
        socket.emit('error', { message: 'Invalid or expired token' });
        return;
      }

      const userInfo = socketToUser.get(socket.id);
      if (!userInfo || userInfo.username !== decoded.username) {
        socket.emit('error', { message: 'Authentication mismatch' });
        return;
      }

      if (!gameId) {
        socket.emit('error', { message: 'Game ID is required' });
        return;
      }
      
      const gameData = activeGames.get(gameId);
      if (!gameData) {
        console.log('Game not found in activeGames:', gameId);
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const game = gameData.game;
      const username = userInfo.username;
      const playerInfo = gamePlayers.get(gameId);

      if (username !== playerInfo.player1 && username !== playerInfo.player2) {
        socket.emit('error', { message: 'You are not a player in this game' });
        return;
      }

      if (game.getStatus() !== 'playing') {
        socket.emit('error', { message: 'Game is not in playing state' });
        return;
      }

      const currentPlayer = game.getCurrentPlayer();
      const expectedPlayer = (currentPlayer === 1) ? playerInfo.player1 : playerInfo.player2;
      
      if (username !== expectedPlayer) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }

      console.log(`Making move: player=${username}, column=${column}, currentPlayer=${currentPlayer}`);
      const moveResult = game.makeMove(column);
      console.log(`Move result:`, moveResult);
      if (!moveResult.success) {
        console.log(`Move failed: ${moveResult.message}`);
        socket.emit('error', { message: moveResult.message });
        return;
      }
      console.log(`Move successful! New game status: ${game.getStatus()}`);

      let gameStatus = game.getStatus();
      if (gameStatus !== 'playing') {
        const winner = game.getWinner();
        const winnerName = gameStatus === 'draw' ? null : (winner ? (winner === 1 ? playerInfo.player1 : playerInfo.player2) : null);
        console.log(`Game ended: status=${gameStatus}, winner=${winner}, winnerName=${winnerName}`);
        
        try {
          if (mongoose.connection.readyState === 1) {
            const gameDoc = new Game({
              gameId: gameId,
              player1: playerInfo.player1,
              player2: playerInfo.player2,
              moves: game.getMoves(),
              winner: winnerName,
              status: gameStatus,
              startedAt: gameData.createdAt,
              endedAt: Date.now()
            });
            await gameDoc.save();
            console.log(`Game saved to database: ${gameId}`);
          } else {
            console.log(`MongoDB not connected - skipping game save for ${gameId}`);
          }
        } catch (dbError) {
          console.log('Could not save game to database:', dbError.message);
        }

        if (mongoose.connection.readyState === 1) {
          try {
            if (winnerName) {
              await leaderboardService.addWin(winnerName);
              const loserName = winnerName === playerInfo.player1 ? playerInfo.player2 : playerInfo.player1;
              if (loserName !== 'BOT') {
                await leaderboardService.addLoss(loserName);
              }
            } else if (gameStatus === 'draw') {
              if (playerInfo.player1 !== 'BOT') {
                await leaderboardService.addLoss(playerInfo.player1);
              }
              if (playerInfo.player2 !== 'BOT') {
                await leaderboardService.addLoss(playerInfo.player2);
              }
            }
          } catch (dbError) {
            console.log('Could not update leaderboard (MongoDB not connected):', dbError.message);
          }
        }

        activeGames.delete(gameId);
        gamePlayers.delete(gameId);
      }

      gameStatus = game.getStatus();
      const gameWinner = game.getWinner();
      const winnerName = gameStatus === 'draw' ? null : (gameWinner ? (gameWinner === 1 ? playerInfo.player1 : playerInfo.player2) : null);
      
      console.log(`Broadcasting game state: status=${gameStatus}, winner=${gameWinner}, winnerName=${winnerName}`);
      
      io.to(gameId).emit('gameState', {
        gameId: gameId,
        board: game.getBoard(),
        currentPlayer: game.getCurrentPlayer(),
        status: gameStatus,
        winner: winnerName,
        players: {
          player1: playerInfo.player1,
          player2: playerInfo.player2
        }
      });

      if (game.getStatus() === 'playing' && playerInfo.player2 === 'BOT') {
        setTimeout(async () => {
          const botPlayer = new BotPlayer();
          const botMove = botPlayer.getMove(game);
          
          if (botMove !== null) {
            const botResult = game.makeMove(botMove);
            if (botResult.success) {
              let botGameStatus = game.getStatus();
              if (botGameStatus !== 'playing') {
                const botWinner = game.getWinner();
                const botWinnerName = botGameStatus === 'draw' ? null : (botWinner ? (botWinner === 1 ? playerInfo.player1 : playerInfo.player2) : null);
                console.log(`Bot game ended: status=${botGameStatus}, winner=${botWinner}, winnerName=${botWinnerName}`);
                
                try {
                  if (mongoose.connection.readyState === 1) {
                    const gameDoc = new Game({
                      gameId: gameId,
                      player1: playerInfo.player1,
                      player2: playerInfo.player2,
                      moves: game.getMoves(),
                      winner: botWinnerName,
                      status: botGameStatus,
                      startedAt: gameData.createdAt,
                      endedAt: Date.now()
                    });
                    await gameDoc.save();
                    console.log(`Game saved to database: ${gameId}`);
                  }
                } catch (dbError) {
                  console.log('Could not save game to database:', dbError.message);
                }

                if (mongoose.connection.readyState === 1) {
                  try {
                    if (botWinnerName) {
                      await leaderboardService.addWin(botWinnerName);
                      const botLoserName = botWinnerName === playerInfo.player1 ? playerInfo.player2 : playerInfo.player1;
                      if (botLoserName !== 'BOT') {
                        await leaderboardService.addLoss(botLoserName);
                      }
                    } else if (botGameStatus === 'draw') {
                      if (playerInfo.player1 !== 'BOT') {
                        await leaderboardService.addLoss(playerInfo.player1);
                      }
                      if (playerInfo.player2 !== 'BOT') {
                        await leaderboardService.addLoss(playerInfo.player2);
                      }
                    }
                  } catch (dbError) {
                    console.log('Could not update leaderboard (MongoDB not connected):', dbError.message);
                  }
                }

                activeGames.delete(gameId);
                gamePlayers.delete(gameId);
              }

              botGameStatus = game.getStatus();
              const botGameWinner = game.getWinner();
              const botWinnerName = botGameStatus === 'draw' ? null : (botGameWinner ? (botGameWinner === 1 ? playerInfo.player1 : playerInfo.player2) : null);
              
              io.to(gameId).emit('gameState', {
                gameId: gameId,
                board: game.getBoard(),
                currentPlayer: game.getCurrentPlayer(),
                status: botGameStatus,
                winner: botWinnerName,
                players: {
                  player1: playerInfo.player1,
                  player2: playerInfo.player2
                }
              });
            }
          }
        }, 500);
      }
    } catch (error) {
      console.error('Make move error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', async () => {
    const username = socketPlayers.get(socket.id);
    console.log('Client disconnected:', socket.id, username);

    if (username) {
      for (const [gameId, playerInfo] of gamePlayers.entries()) {
        if (playerInfo.player1 === username || playerInfo.player2 === username) {
          const gameData = activeGames.get(gameId);
          if (gameData && gameData.game.getStatus() === 'playing') {
            setTimeout(async () => {
              const currentGameData = activeGames.get(gameId);
              const currentPlayerInfo = gamePlayers.get(gameId);
              
              if (currentGameData && currentGameData.game.getStatus() === 'playing') {
                const socket1Exists = io.sockets.sockets.get(currentPlayerInfo.socket1);
                const socket2Exists = io.sockets.sockets.get(currentPlayerInfo.socket2);
                
                if (!socket1Exists || !socket2Exists) {
                  const disconnectedPlayer = !socket1Exists ? currentPlayerInfo.player1 : currentPlayerInfo.player2;
                  const winner = disconnectedPlayer === currentPlayerInfo.player1 ? currentPlayerInfo.player2 : currentPlayerInfo.player1;
                  
                  const game = currentGameData.game;
                  game.setStatus('forfeited');
                  
                  try {
                    if (mongoose.connection.readyState === 1) {
                      const gameDoc = new Game({
                        gameId: gameId,
                        player1: currentPlayerInfo.player1,
                        player2: currentPlayerInfo.player2,
                        moves: game.getMoves(),
                        winner: winner,
                        status: 'forfeited',
                        startedAt: currentGameData.createdAt,
                        endedAt: Date.now()
                      });
                      await gameDoc.save();
                      console.log(`Game saved to database: ${gameId}`);
                    }
                  } catch (dbError) {
                    console.log('Could not save game to database:', dbError.message);
                  }

                  if (mongoose.connection.readyState === 1) {
                    try {
                      if (winner !== 'BOT') {
                        await leaderboardService.addWin(winner);
                      }
                      if (disconnectedPlayer !== 'BOT') {
                        await leaderboardService.addLoss(disconnectedPlayer);
                      }
                    } catch (dbError) {
                      console.log('Could not update leaderboard:', dbError.message);
                    }
                  }

                  io.to(gameId).emit('gameState', {
                    gameId: gameId,
                    board: game.getBoard(),
                    status: 'forfeited',
                    winner: winner,
                    players: {
                      player1: currentPlayerInfo.player1,
                      player2: currentPlayerInfo.player2
                    }
                  });

                  activeGames.delete(gameId);
                  gamePlayers.delete(gameId);
                }
              }
            }, 30000);
          }
          
          socket.to(gameId).emit('playerDisconnected', { username });
          break;
        }
      }

      if (botTimers.has(username)) {
        clearTimeout(botTimers.get(username));
        botTimers.delete(username);
      }
      
      playerSockets.delete(username);
      socketPlayers.delete(socket.id);
      matchmakingService.removePlayer(username);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
  console.log(`\nWaiting for players...\n`);
});
