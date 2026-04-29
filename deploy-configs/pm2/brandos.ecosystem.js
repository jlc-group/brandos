// BrandOS PM2 Configuration
// Add this block to D:\Server\ecosystem.config.js

// ============================================
// BrandOS - Content & Ads Operating System (Port 40200)
// ============================================
module.exports = {
  apps: [
    {
      name: "brandos",
      cwd: "./deploy/brandos",
      script: "dist/index.js",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "600M",
      env: {
        NODE_ENV: "production",
        PORT: 40200,
      },
      error_file: "./logs/brandos/pm2-error.log",
      out_file: "./logs/brandos/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};

// ============================================
// INSTRUCTIONS: Add to D:\Server\ecosystem.config.js
// ============================================
// 1. Open D:\Server\ecosystem.config.js
// 2. Find the apps array
// 3. Add the following block before the closing bracket:
//
//    // BrandOS - Content & Ads Operating System (Port 40200)
//    {
//      name: "brandos",
//      cwd: "./deploy/brandos",
//      script: "dist/index.js",
//      interpreter: "node",
//      instances: 1,
//      exec_mode: "fork",
//      autorestart: true,
//      watch: false,
//      max_memory_restart: "600M",
//      env: {
//        NODE_ENV: "production",
//        PORT: 40200,
//      },
//      error_file: "./logs/brandos/pm2-error.log",
//      out_file: "./logs/brandos/pm2-out.log",
//      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
//    },
