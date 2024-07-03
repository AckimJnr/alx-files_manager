const crypto = require('crypto');
const mongoDb = require('../utils/db');

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
        email: newUser.email,
        id: result.insertedId,
      });
    } catch (error) {
      return res.status(500).json({ error: `Internal Server Error${error}` });
    }
  }
}

module.exports = UsersController;
