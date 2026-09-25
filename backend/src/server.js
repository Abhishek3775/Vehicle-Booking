const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/database');

/**
 * Bootstrap and start the backend HTTP server
 */
const startServer = async () => {
  try {
    // 1. Establish database connection
    await connectDB();

    // 2. Start Express HTTP server
    const server = app.listen(env.PORT, () => {
      console.log(`\n=================================================`);
      console.log(`🚀 Vehicle Booking API running on port ${env.PORT}`);
      console.log(`📡 Environment: ${env.NODE_ENV}`);
      console.log(`🔑 Auth Endpoints mounted at: /api/auth`);
      console.log(`👤 User Endpoints mounted at: /api/users`);
      console.log(`🚗 Vehicle Endpoints mounted at: /api/vehicles`);
      console.log(`🏠 Address Endpoints mounted at: /api/addresses`);
      console.log(`🛠️ Service Endpoints mounted at: /api/services`);
      console.log(`=================================================\n`);
    });

    // 3. Graceful shutdown handler
    const gracefulShutdown = (signal) => {
      console.log(`\n[Server] Received ${signal}. Closing HTTP server and database connections...`);
      server.close(() => {
        console.log('[Server] HTTP server closed gracefully.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    console.error(`[Server Bootstrap Error]: ${error.message}`);
    process.exit(1);
  }
};

startServer();
