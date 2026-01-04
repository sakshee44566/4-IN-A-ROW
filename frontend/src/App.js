import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './index.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true); // true for login, false for register
  const [token, setToken] = useState(localStorage.getItem('authToken') || null);
  const [gameId, setGameId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [status, setStatus] = useState(token ? 'waiting' : 'login'); // login, waiting, playing, ended
  const [error, setError] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [opponent, setOpponent] = useState(null);
  const [isPlayer1, setIsPlayer1] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const reconnectTimerRef = useRef(null);
  const usernameRef = useRef(username);

  // Keep usernameRef in sync with username state
  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  // Define fetchLeaderboard before it's used
  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${API_URL}/api/leaderboard`);
      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  useEffect(() => {
    // Load leaderboard on mount
    fetchLeaderboard();
    
    // Set up socket connection with auto-reconnect enabled
    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 100,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 5000
    });
    setSocket(newSocket);

    // Check initial connection state
    if (newSocket.connected) {
      setSocketConnected(true);
    }

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setSocketConnected(true);
      setError(null);
    });

    newSocket.on('authenticated', (data) => {
      console.log('Authenticated:', data);
      setUsername(data.username);
      usernameRef.current = data.username;
    });

    newSocket.on('authError', (data) => {
      console.error('Auth error:', data.message);
      setError(data.message);
      setToken(null);
      localStorage.removeItem('authToken');
      setStatus('login');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setSocketConnected(false);
    });

    newSocket.on('reconnect', () => {
      console.log('Reconnected to server');
      setSocketConnected(true);
      setError(null);
      // Re-authenticate if token exists
      if (token) {
        newSocket.emit('authenticate', { token });
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setSocketConnected(false);
      setError('Failed to connect to server. Make sure the backend is running on port 3001.');
    });

    newSocket.on('matchmaking', (data) => {
      setStatus('waiting');
      setError(null);
    });

    newSocket.on('matchFound', (data) => {
      setGameId(data.gameId);
      setOpponent(data.opponent);
      setIsPlayer1(data.isPlayer1);
      setStatus('playing');
    });

    newSocket.on('gameState', (data) => {
      console.log('gameState received:', data);
      setGameState(data);
      if (data.gameId) {
        setGameId(data.gameId);
      }
      if (data.status === 'playing') {
        // Always set status to playing when gameState shows playing
        // This ensures we transition from waiting to playing even if matchFound wasn't received
        setStatus('playing');
        // Set opponent if not already set
        if (data.players) {
          const myUsername = usernameRef.current;
          const opponent = data.players.player1 === myUsername ? data.players.player2 : data.players.player1;
          if (opponent && opponent !== myUsername) {
            setOpponent(opponent);
            setIsPlayer1(data.players.player1 === myUsername);
          }
        }
        const currentPlayerName = data.currentPlayer === 1 ? data.players.player1 : data.players.player2;
        setIsMyTurn(currentPlayerName === usernameRef.current);
        console.log('Current player:', currentPlayerName, 'My username:', usernameRef.current, 'Is my turn:', currentPlayerName === usernameRef.current);
      } else {
        setIsMyTurn(false);
        if (data.status !== 'playing') {
          setStatus('ended');
        }
      }
    });

    newSocket.on('error', (data) => {
      setError(data.message);
    });

    newSocket.on('playerDisconnected', (data) => {
      setError(`Player ${data.username} disconnected. Waiting for reconnection...`);
    });

    newSocket.on('playerReconnected', (data) => {
      setError(null);
    });

    // Capture the ref value for cleanup
    const reconnectTimer = reconnectTimerRef.current;

    return () => {
      newSocket.close();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, []); // Empty dependency array - socket should only be created once on mount

  // Separate effect for authentication when token or socket changes
  useEffect(() => {
    if (socket && token && socketConnected) {
      socket.emit('authenticate', { token });
    }
  }, [socket, token, socketConnected]);

  useEffect(() => {
    // Refresh leaderboard periodically
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });

      const data = await response.json();

      if (response.ok && data.token) {
        setToken(data.token);
        localStorage.setItem('authToken', data.token);
        setUsername(data.user.username);
        usernameRef.current = data.user.username;
        setError(null);
        
        // Authenticate socket and join
        if (socket) {
          socket.emit('authenticate', { token: data.token });
          setTimeout(() => {
            socket.emit('join', { username: data.user.username, token: data.token });
            setStatus('waiting');
          }, 100);
        }
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError('Failed to connect to server. Make sure backend is running.');
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('authToken');
    setUsername('');
    setPassword('');
    setStatus('login');
    setGameState(null);
    setGameId(null);
    setError(null);
    
    // Disconnect socket to clear server-side auth state
    // Then immediately reconnect to maintain connection for smooth UX
    if (socket) {
      socket.disconnect();
      // Reconnect immediately after disconnect to maintain connection state
      // This ensures the UI shows "Connected" without requiring a page refresh
      socket.connect();
    }
  };

  const handleReconnect = (e) => {
    e.preventDefault();
    if (username.trim() && gameId && token) {
      socket.emit('join', { username: username.trim(), gameId: gameId, token: token });
      setError(null);
    }
  };

  const handleColumnClick = (column) => {
    console.log('Column clicked:', column);
    console.log('isMyTurn:', isMyTurn);
    console.log('gameState:', gameState);
    console.log('gameId:', gameId);
    console.log('socket:', socket ? 'connected' : 'not connected');
    
    if (!socket) {
      setError('Not connected to server');
      return;
    }
    
    if (!gameId) {
      setError('Game ID not set');
      return;
    }
    
    if (!isMyTurn) {
      setError('Not your turn');
      return;
    }
    
    if (!gameState || gameState.status !== 'playing') {
      setError('Game is not in playing state');
      return;
    }
    
    console.log('Emitting makeMove:', { gameId, column });
    socket.emit('makeMove', { gameId: gameId, column: column, token: token });
    setError(null);
  };

  const renderCell = (row, col) => {
    const cellValue = gameState.board[row][col];
    let cellClass = 'cell';
    let cellContent = '';

    if (cellValue === 1) {
      cellClass += ' player1';
      cellContent = '●';
    } else if (cellValue === 2) {
      cellClass += ' player2';
      cellContent = '●';
    }

    if (!isMyTurn || gameState.status !== 'playing') {
      cellClass += ' disabled';
    }

    return (
      <div
        key={`${row}-${col}`}
        className={cellClass}
      >
        {cellContent}
      </div>
    );
  };

  const renderBoard = () => {
    if (!gameState) return null;

    // Column headers (clickable)
    const columnHeaders = [];
    for (let col = 0; col < 7; col++) {
      columnHeaders.push(
        <div
          key={`header-${col}`}
          className="cell"
          style={{
            cursor: isMyTurn && gameState.status === 'playing' ? 'pointer' : 'not-allowed',
            backgroundColor: isMyTurn && gameState.status === 'playing' ? '#4CAF50' : '#9E9E9E',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '16px',
            opacity: isMyTurn && gameState.status === 'playing' ? 1 : 0.6,
            transition: 'all 0.2s'
          }}
          onClick={() => {
            if (isMyTurn && gameState.status === 'playing') {
              handleColumnClick(col);
            }
          }}
          onMouseEnter={(e) => {
            if (isMyTurn && gameState.status === 'playing') {
              e.target.style.transform = 'scale(1.1)';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
          }}
        >
          {col + 1}
        </div>
      );
    }

    const rows = [];
    for (let row = 0; row < 6; row++) {
      const cells = [];
      for (let col = 0; col < 7; col++) {
        cells.push(renderCell(row, col));
      }
      rows.push(
        <div key={row} className="board-row">
          {cells}
        </div>
      );
    }

    return (
      <div>
        <div className="board-row" style={{ marginBottom: '5px' }}>
          {columnHeaders}
        </div>
        <div className="game-board">{rows}</div>
      </div>
    );
  };

  const getStatusMessage = () => {
    if (!gameState) return '';
    
    if (gameState.status === 'won') {
      return `🎉 ${gameState.winner === username ? 'You Won!' : `${gameState.winner} Won!`}`;
    } else if (gameState.status === 'draw') {
      return "It's a Draw!";
    } else if (gameState.status === 'forfeited') {
      return `Game Forfeited - ${gameState.winner} Wins!`;
    } else if (gameState.status === 'playing') {
      return isMyTurn ? 'Your Turn!' : `Waiting for ${opponent}...`;
    }
    return '';
  };

  return (
    <div className="app">
      <div className="header">
        <h1>🎮 4 in a Row</h1>
      </div>

      <div className="game-container">
        {status === 'login' && (
          <div className="login-screen">
            <h2>{isLogin ? 'Login' : 'Register'}</h2>
            {!socketConnected && (
              <div style={{ color: '#f44336', marginBottom: '10px' }}>
                ⚠️ Not connected to server. Make sure backend is running.
              </div>
            )}
            {socketConnected && (
              <div style={{ color: '#4CAF50', marginBottom: '10px' }}>
                ✓ Connected to server
              </div>
            )}
            <form onSubmit={handleAuth}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
                disabled={!socketConnected}
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_]+"
                title="Username must be 3-20 characters, letters, numbers, and underscores only"
              />
              <br />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                disabled={!socketConnected}
                minLength={6}
                style={{ marginTop: '10px' }}
              />
              <br />
              <button type="submit" disabled={!socketConnected} style={{ marginTop: '15px' }}>
                {socketConnected ? (isLogin ? 'Login' : 'Register') : 'Connecting...'}
              </button>
            </form>
            <div style={{ marginTop: '15px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4CAF50',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
              </button>
            </div>
            {gameId && (
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
                <p>Have a game ID? Reconnect to existing game:</p>
                <input
                  type="text"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  placeholder="Game ID"
                  style={{ marginTop: '10px' }}
                />
                <br />
                <button onClick={handleReconnect} style={{ marginTop: '10px' }}>
                  Reconnect
                </button>
              </div>
            )}
          </div>
        )}

        {status === 'waiting' && (
          <div className="waiting-screen">
            <h2>Waiting for opponent...</h2>
            <div className="spinner"></div>
            <p>If no player joins within 10 seconds, you'll play against a bot!</p>
          </div>
        )}

        {(status === 'playing' || status === 'ended') && gameState && (
          <div className="game-board-container">
            <div className="game-info">
              <h2>Game #{gameId}</h2>
              <p>
                You: <strong>{username}</strong> ({isPlayer1 ? 'Player 1' : 'Player 2'}) vs{' '}
                <strong>{opponent}</strong>
              </p>
            </div>

            {error && <div className="error">{error}</div>}
            
            {/* Game Status Card */}
            <div style={{ 
              marginTop: '15px', 
              padding: '12px 16px', 
              backgroundColor: '#ffffff', 
              borderRadius: '8px',
              marginBottom: '15px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    backgroundColor: socket ? '#4CAF50' : '#f44336',
                    display: 'inline-block'
                  }}></span>
                  <span style={{ fontSize: '14px', color: '#666' }}>
                    {socket ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                {gameState?.status === 'playing' && (
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {isMyTurn ? (
                      <span style={{ color: '#4CAF50', fontWeight: '500' }}>Your Turn</span>
                    ) : (
                      <span style={{ color: '#FF9800' }}>Waiting for {opponent}...</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {renderBoard()}

            <div className={`game-status ${gameState.status}`}>
              {getStatusMessage()}
            </div>

            {status === 'ended' && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setStatus('waiting');
                    setGameState(null);
                    setGameId(null);
                    setOpponent(null);
                    if (socket && token) {
                      socket.emit('join', { username: username, token: token });
                    }
                    fetchLeaderboard();
                  }}
                  style={{
                    padding: '10px 20px',
                    fontSize: '16px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Play Again
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '10px 20px',
                    fontSize: '16px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}

        <div className="leaderboard">
          <h2>🏆 Leaderboard</h2>
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Wins</th>
                <th>Games</th>
                <th>Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center' }}>
                    No games played yet
                  </td>
                </tr>
              ) : (
                leaderboard.map((player, index) => (
                  <tr key={player.username}>
                    <td>{index + 1}</td>
                    <td>{player.username}</td>
                    <td>{player.wins}</td>
                    <td>{player.games}</td>
                    <td>{player.winRate}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
