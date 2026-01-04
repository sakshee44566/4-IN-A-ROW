// Quick setup checker
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/4inarow';

console.log('Checking setup...\n');

// Check MongoDB
console.log('Checking MongoDB connection...');
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 2000
})
.then(() => {
  console.log('✓ MongoDB is running and accessible');
  mongoose.connection.close();
  process.exit(0);
})
.catch(err => {
  console.log('✗ MongoDB is not accessible');
  console.log('  Error:', err.message);
  console.log('\nTo fix this:');
  console.log('  1. Make sure MongoDB is installed and running');
  console.log('  2. Or use MongoDB Atlas and update MONGODB_URI in .env');
  process.exit(1);
});



