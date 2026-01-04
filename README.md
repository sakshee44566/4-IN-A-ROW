# 🎯 4 in a Row - Real-Time Multiplayer Game

A real-time multiplayer version of the classic **4 in a Row** (Connect Four) game built with Node.js, Express, Socket.io, React, and MongoDB. Features include player matchmaking, competitive bot opponent, game persistence, leaderboard, and Kafka analytics integration.

## 🚀 Features

- **Real-time multiplayer gameplay** using WebSockets
- **Matchmaking system** with 10-second bot fallback
- **Competitive bot AI** that blocks wins and creates winning opportunities
- **Player reconnection** within 30 seconds
- **Game persistence** using MongoDB
- **Leaderboard** tracking wins and statistics
- **Kafka integration** for game analytics (optional)
- **React frontend** with clean UI

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- Kafka (optional, for analytics)

## 🛠 Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd "4 IN A ROW"
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/4inarow
KAFKA_BROKERS=localhost:9092
```

**Note:** 
- If using MongoDB Atlas, replace `MONGODB_URI` with your connection string
- Kafka is optional - if not configured, events will be logged to console
- To run the Kafka consumer: `npm run consumer` (separate terminal)

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend` directory (optional, defaults work for local development):

```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_SOCKET_URL=http://localhost:3001
```

### 4. Start MongoDB

**Local MongoDB:**
```bash
# Make sure MongoDB is running
mongod
```

**Or use MongoDB Atlas** - just update the `MONGODB_URI` in your `.env` file

### 5. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

The backend server will start on `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

The frontend will start on `http://localhost:3000` and automatically open in your browser.

## 🎮 How to Play

1. **Enter your username** on the login screen
2. **Wait for an opponent** (up to 10 seconds)
   - If another player joins, you'll be matched
   - If no player joins, you'll play against a bot
3. **Take turns dropping discs** by clicking on a column
4. **Win by connecting 4 discs** horizontally, vertically, or diagonally
5. **View the leaderboard** to see top players

## 🧠 Bot Strategy

The competitive bot uses the following strategy:
1. **Win immediately** if it has a winning move
2. **Block opponent** from winning on their next move
3. **Create winning opportunities** by setting up 3 in a row
4. **Prefer center columns** for better strategic positioning

## 🔌 Reconnection

If you disconnect during a game:
- You have **30 seconds** to reconnect
- Use your username and game ID to rejoin
- If you don't reconnect in time, the game is forfeited

## 📊 Kafka Analytics (Optional)

To enable Kafka analytics:

1. Install and start Kafka
2. Create a topic named `game-events`:
   ```bash
   kafka-topics --create --topic game-events --bootstrap-server localhost:9092
   ```
3. Update `KAFKA_BROKERS` in backend `.env`
4. Start the Kafka consumer (in a separate terminal):
   ```bash
   cd backend
   npm run consumer
   ```
5. Events will be sent to Kafka and processed by the consumer

**Events tracked:**
- Game started
- Move made
- Game ended (with duration, winner, status)

**Note:** If Kafka is not configured, events will be logged to the console as a fallback.

## 🏗 Project Structure

```
4 IN A ROW/
├── backend/
│   ├── game/
│   │   ├── GameEngine.js      # Game logic and rules
│   │   └── BotPlayer.js       # Bot AI implementation
│   ├── models/
│   │   └── Game.js            # MongoDB game model
│   ├── services/
│   │   ├── MatchmakingService.js  # Player matchmaking
│   │   ├── LeaderboardService.js  # Leaderboard logic
│   │   └── KafkaProducer.js       # Kafka event producer
│   ├── server.js              # Main server file
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.js             # Main React component
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
└── README.md
```

## 🧪 Testing

### Test Matchmaking
1. Open two browser windows/tabs
2. Enter different usernames
3. Start games simultaneously - you should be matched

### Test Bot
1. Open one browser window
2. Enter a username and start
3. Wait 10 seconds - bot should start automatically

### Test Reconnection
1. Start a game
2. Close the browser tab
3. Reopen and use the same username and game ID
4. You should reconnect to the game

## 🚀 Deployment

### Backend Deployment

1. Set environment variables on your hosting platform
2. Ensure MongoDB is accessible
3. Deploy to services like:
   - Heroku
   - AWS
   - Railway
   - DigitalOcean

### Frontend Deployment

1. Build the React app:
   ```bash
   cd frontend
   npm run build
   ```
2. Deploy the `build` folder to:
   - Netlify
   - Vercel
   - AWS S3 + CloudFront
   - Any static hosting service

3. Update `REACT_APP_API_URL` and `REACT_APP_SOCKET_URL` to point to your backend

## 📝 API Endpoints

### REST API

- `GET /api/leaderboard` - Get leaderboard data
- `GET /api/game/:gameId` - Get game details

### WebSocket Events

**Client → Server:**
- `join` - Join matchmaking or reconnect to game
- `makeMove` - Make a move in the game

**Server → Client:**
- `matchmaking` - Matchmaking status
- `matchFound` - Match found, game starting
- `gameState` - Game state update
- `error` - Error message
- `playerDisconnected` - Opponent disconnected
- `playerReconnected` - Opponent reconnected

## 🐛 Troubleshooting

**MongoDB connection error:**
- Ensure MongoDB is running
- Check `MONGODB_URI` in `.env`
- For Atlas, whitelist your IP address

**Socket connection issues:**
- Check CORS settings in `server.js`
- Ensure backend is running before frontend
- Check firewall/network settings

**Bot not starting:**
- Wait the full 10 seconds
- Check browser console for errors
- Verify backend logs

## 📄 License

This project is created as an assignment submission.

## 👤 Author

Created as a backend engineering intern assignment.

---

**Enjoy playing 4 in a Row! 🎮**
