module.exports = {
  apps: [{
    name: 'discoverylens',
    script: 'npm',
    args: 'run dev',
    cwd: './',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000,
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
  }]
};
