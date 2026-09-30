const mongoose = require('mongoose');
const env = require('./env');
const seedInitialData = require('./seed');

let memoryServerInstance = null;

/**
 * Connect to MongoDB database
 * Attempts connection to env.MONGO_URI first.
 * If connection fails in development mode (e.g. DNS failure, ECONNREFUSED),
 * automatically spins up a local MongoMemoryServer so the app runs out of the box.
 * @returns {Promise<typeof mongoose>}
 */
const connectDB = async () => {
  // Option to explicitly bypass or try remote first
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 3500,
    });

    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    await seedInitialData();
    return conn;
  } catch (primaryError) {
    if (env.NODE_ENV === 'production') {
      console.error(`[MongoDB] Primary connection failed: ${primaryError.message}`);
      process.exit(1);
    }

    console.warn(`\n⚠️  [MongoDB] Could not connect to primary URI (${primaryError.message}).`);
    console.log(`🚀 [MongoDB] Launching embedded in-memory MongoDB instance for local development & testing...`);

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServerInstance = await MongoMemoryServer.create();
      const inMemoryUri = memoryServerInstance.getUri();

      const conn = await mongoose.connect(inMemoryUri, {
        autoIndex: true,
      });

      console.log(`✅ [MongoDB] Connected successfully to in-memory instance: ${inMemoryUri}`);
      await seedInitialData();
      return conn;
    } catch (fallbackError) {
      console.error(`[MongoDB] In-memory fallback failed: ${fallbackError.message}`);
      process.exit(1);
    }
  }
};

/**
 * Disconnect DB and stop memory server if active
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
    }
  } catch (err) {
    console.error(`[MongoDB Disconnect Error]: ${err.message}`);
  }
};

module.exports = connectDB;
module.exports.disconnectDB = disconnectDB;

