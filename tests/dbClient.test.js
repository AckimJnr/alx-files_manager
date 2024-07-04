const { expect } = require('chai');
const dbClient = require('../utils/db');

describe('DBClient', () => {
  before(async () => {
    await dbClient.client.connect();
  });

  it('should be alive', async () => {
    const isAlive = await dbClient.isAlive();
    expect(isAlive).to.be.true;
  });

  it('should return the number of users', async () => {
    const nbUsers = await dbClient.nbUsers();
    expect(nbUsers).to.be.a('number');
  });

  it('should return the number of files', async () => {
    const nbFiles = await dbClient.nbFiles();
    expect(nbFiles).to.be.a('number');
  });

  after(async () => {
    await dbClient.client.close();
  });
});
