# Quick Start Guide

## Prerequisites Checklist

- [ ] Node.js installed (v14+)
- [ ] MongoDB running (local or Atlas)
- [ ] (Optional) Kafka for analytics

## Setup Steps

### 1. Backend Setup (Terminal 1)

```bash
cd backend
npm install
```

Create `.env` file:
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/4inarow
KAFKA_BROKERS=localhost:9092
```

Start backend:
```bash
npm start
```

### 2. Frontend Setup (Terminal 2)

```bash
cd frontend
npm install
npm start
```

Frontend will open at `http://localhost:3000`


## Testing

1. **Test Matchmaking**: Open two browser windows, enter different usernames, start games
2. **Test Bot**: Open one browser, enter username, wait 10 seconds
3. **Test Gameplay**: Click column numbers to drop discs
4. **Check Leaderboard**: View wins and statistics

## Common Issues

**MongoDB Connection Error:**
- Make sure MongoDB is running
- Check `MONGODB_URI` in `.env`
- For Atlas: Whitelist your IP

**Socket Connection Issues:**
- Start backend before frontend
- Check ports (3001 for backend, 3000 for frontend)
- Check CORS settings if deploying

**Bot Not Starting:**
- Wait full 10 seconds
- Check browser console for errors
- Verify backend logs




