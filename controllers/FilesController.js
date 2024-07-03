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

    static async getShow(req, res) {
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

            const fileId = req.params.id;
            const FilesCollection = mongoDb.client.db().collection('files');
            const file = await FilesCollection.findOne({
                _id: new mongodb.ObjectId(fileId),
                userId: new mongodb.ObjectId(userId),
            });

            if (!file) {
                return res.status(404).json({ error: 'Not found' });
            }

            return res.status(200).json({
                id: file._id,
                userId: file.userId,
                name: file.name,
                type: file.type,
                isPublic: file.isPublic,
                parentId: file.parentId,
                localPath: file.localPath,
            });
        } catch (error) {
            return res.status(500).json({ error: `Internal Server Error: ${error}` });
        }
    }

    static async getIndex(req, res) {
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

            const { parentId = '0', page = 0 } = req.query;
            const FilesCollection = mongoDb.client.db().collection('files');

            const query = {
                userId: new mongodb.ObjectId(userId),
                parentId: parentId === '0' ? '0' : new mongodb.ObjectId(parentId),
            };

            const files = await FilesCollection.find(query)
                .skip(parseInt(page, 10) * 20)
                .limit(20)
                .toArray();

            return res.status(200).json(files.map((file) => ({
                id: file._id,
                userId: file.userId,
                name: file.name,
                type: file.type,
                isPublic: file.isPublic,
                parentId: file.parentId,
                localPath: file.localPath,
            })));
        } catch (error) {
            return res.status(500).json({ error: `Internal Server Error: ${error}` });
        }
    }

    static async putPublish(req, res) {
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

            const fileId = req.params.id;
            const FilesCollection = mongoDb.client.db().collection('files');
            const file = await FilesCollection.findOne({
                _id: new mongodb.ObjectId(fileId),
                userId: new mongodb.ObjectId(userId),
            });

            if (!file) {
                return res.status(404).json({ error: 'Not found' });
            }

            await FilesCollection.updateOne(
                { _id: new mongodb.ObjectId(fileId) },
                { $set: { isPublic: true } },
            );

            return res.status(200).json({
                id: file._id,
                userId: file.userId,
                name: file.name,
                type: file.type,
                isPublic: true,
                parentId: file.parentId,
                localPath: file.localPath,
            });
        } catch (error) {
            return res.status(500).json({ error: `Internal Server Error: ${error}` });
        }
    }

    static async putUnpublish(req, res) {
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

            const fileId = req.params.id;
            const FilesCollection = mongoDb.client.db().collection('files');
            const file = await FilesCollection.findOne({
                _id: new mongodb.ObjectId(fileId),
                userId: new mongodb.ObjectId(userId),
            });

            if (!file) {
                return res.status(404).json({ error: 'Not found' });
            }

            await FilesCollection.updateOne(
                { _id: new mongodb.ObjectId(fileId) },
                { $set: { isPublic: false } },
            );

            return res.status(200).json({
                id: file._id,
                userId: file.userId,
                name: file.name,
                type: file.type,
                isPublic: false,
                parentId: file.parentId,
                localPath: file.localPath,
            });
        } catch (error) {
            return res.status(500).json({ error: `Internal Server Error: ${error}` });
        }
    }

    static async getFile(req, res) {
        const fileId = req.params.id;
        const token = req.headers['x-token'];

        try {
            const FilesCollection = mongoDb.client.db().collection('files');
            const file = await FilesCollection.findOne({
                _id: new mongodb.ObjectId(fileId),
            });

            if (!file) {
                return res.status(404).json({ error: 'Not found' });
            }

            if (!file.isPublic) {
                if (!token) {
                    return res.status(404).json({ error: 'Not found' });
                }

                const key = `auth_${token}`;
                const userId = await redisClient.get(key);

                if (!userId || userId !== file.userId.toString()) {
                    return res.status(404).json({ error: 'Not found' });
                }
            }

            if (file.type === 'folder') {
                return res.status(400).json({ error: "A folder doesn't have content" });
            }

            if (!fs.existsSync(file.localPath)) {
                return res.status(404).json({ error: 'Not found' });
            }

            const mimeType = mime.lookup(file.name);
            res.setHeader('Content-Type', mimeType);

            const fileContent = fs.readFileSync(file.localPath);
            return res.send(fileContent);
        } catch (error) {
            return res.status(500).json({ error: `Internal Server Error: ${error}` });
        }
    }
}

module.exports = FilesController;
