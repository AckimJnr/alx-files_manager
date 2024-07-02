const mongoDb = require('../utils/db');
const redisDb = require('../utils/redis');

class AppController {
  static async getStatus(req, res) {
    try {
      const redistStatus = redisDb.isAlive();
      const mongoStatus = mongoDb.isAlive();
      res.status(200).json({ redis: redistStatus, db: mongoStatus });
    } catch (error) {
      res.status(500).json({ redis: false, db: false });
    }
  }

  static async getStats(req, res) {
    try {
      const users = await mongoDb.nbUsers();
      const files = await mongoDb.nbFiles();
      res.status(200).json({ users, files });
    } catch (error) {
      res.status(500).json({ users: 0, files: 0 });
    }
  }
}

module.exports = AppController;
