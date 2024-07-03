const crypto = require('crypto');
const mongodb = require('mongodb');
const mongoDb = require('../utils/db');
const redisClient = require('../utils/redis');

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    try {
      const UsersCollection = mongoDb.client.db().collection('users');

      const existingUser = await UsersCollection.findOne({ email });

      if (existingUser) {
        return res.status(400).json({ error: 'Already exists' });
      }

      const hashedPassword = await crypto.createHash('sha1').update(password).digest('hex');

      const newUser = {
        email,
        password: hashedPassword,
      };

      const result = await UsersCollection.insertOne(newUser);

      return res.status(201).json({
        id: result.insertedId,
        email: newUser.email,
      });
    } catch (error) {
      return res.status(500).json({ error: `Internal Server Error${error}` });
    }
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;

    try {
      const userId = await redisClient.get(key);

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const UsersCollection = mongoDb.client.db().collection('users');
      const user = await UsersCollection.findOne(
        { _id: new mongodb.ObjectId(userId) }, { projection: { email: 1 } },
      );

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      return res.status(200).json({ id: user._id, email: user.email });
    } catch (error) {
      return res.status(500).json({ error: `Internal Server Error: ${error}` });
    }
  }
}

module.exports = UsersController;
