const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

class AuthService {
  async register(username, password) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ username: username.toLowerCase() });
      if (existingUser) {
        return { success: false, message: 'Username already taken' };
      }

      // Create new user
      const user = new User({
        username: username.trim(),
        password: password
      });
      await user.save();

      // Generate token
      const token = this.generateToken(user._id.toString(), user.username);

      return {
        success: true,
        token,
        user: {
          id: user._id.toString(),
          username: user.username
        }
      };
    } catch (error) {
      if (error.code === 11000) {
        return { success: false, message: 'Username already taken' };
      }
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(e => e.message).join(', ');
        return { success: false, message: messages };
      }
      return { success: false, message: 'Registration failed' };
    }
  }

  async login(username, password) {
    try {
      const user = await User.findOne({ username: username.trim() });
      if (!user) {
        return { success: false, message: 'Invalid username or password' };
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return { success: false, message: 'Invalid username or password' };
      }

      // Generate token
      const token = this.generateToken(user._id.toString(), user.username);

      return {
        success: true,
        token,
        user: {
          id: user._id.toString(),
          username: user.username
        }
      };
    } catch (error) {
      return { success: false, message: 'Login failed' };
    }
  }

  generateToken(userId, username) {
    return jwt.sign(
      { userId, username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
}

module.exports = { AuthService };


