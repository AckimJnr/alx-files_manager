const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mongodb = require('mongodb');
const mongoDb = require('../utils/db');
const redisClient = require('../utils/redis');

class FilesController {
  static async postUpload(req, res) {
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

      const {
        name, type, parentId = '0', isPublic = false, data,
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Missing name' });
      }

      if (!type || !['folder', 'file', 'image'].includes(type)) {
        return res.status(400).json({ error: 'Missing type' });
      }

      if (type !== 'folder' && !data) {
        return res.status(400).json({ error: 'Missing data' });
      }

      const FilesCollection = mongoDb.client.db().collection('files');

      if (parentId !== '0') {
        const parentFile = await FilesCollection.findOne({ _id: new mongodb.ObjectId(parentId) });

        if (!parentFile) {
          return res.status(400).json({ error: 'Parent not found' });
        }

        if (parentFile.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }

      const newFile = {
        userId: new mongodb.ObjectId(userId),
        name,
        type,
        isPublic,
        parentId: parentId === '0' ? '0' : new mongodb.ObjectId(parentId),
      };

      if (type === 'folder') {
        const result = await FilesCollection.insertOne(newFile);
        return res.status(201).json({
          id: result.insertedId,
          ...newFile,
        });
      }
      const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
      if (!fs.existsSync(FOLDER_PATH)) {
        fs.mkdirSync(FOLDER_PATH, { recursive: true });
      }

      const localPath = path.join(FOLDER_PATH, uuidv4());
      fs.writeFileSync(localPath, Buffer.from(data, 'base64'));

      newFile.localPath = localPath;
      const result = await FilesCollection.insertOne(newFile);

      return res.status(201).json({
        id: result.insertedId,
        ...newFile,
      });
    } catch (error) {
      return res.status(500).json({ error: `Internal Server Error: ${error}` });
    }
  }
}

module.exports = FilesController;
