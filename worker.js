const Bull = require('bull');
const fs = require('fs');
const imageThumbnail = require('image-thumbnail');
const mongoDb = require('./utils/db');
const { ObjectId } = require('mongodb');

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job) => {
    const { fileId, userId } = job.data;

    if (!fileId) throw new Error('Missing fileId');
    if (!userId) throw new Error('Missing userId');

    try {
        const FilesCollection = mongoDb.client.db().collection('files');
        const file = await FilesCollection.findOne({
            _id: new ObjectId(fileId),
            userId: new ObjectId(userId),
        });

        if (!file) throw new Error('File not found');
        if (file.type !== 'image') throw new Error('File is not an image');

        const thumbnailSizes = [500, 250, 100];
        await Promise.all(
            thumbnailSizes.map(async (size) => {
                const options = { width: size };
                const thumbnail = await imageThumbnail(file.localPath, options);
                const thumbnailPath = `${file.localPath}_${size}`;
                fs.writeFileSync(thumbnailPath, thumbnail);
            })
        );
    } catch (error) {
        throw new Error(`Processing failed: ${error.message}`);
    }
});

console.log('Worker is running...');