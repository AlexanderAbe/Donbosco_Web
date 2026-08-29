module.exports = {
  apps: [
    {
      name: 'thieu-nhi-tan-thai-son-app',
      script: './app.js',
      cwd: '/var/www/Donbosco_Web',
      instances: 2,         
      exec_mode: 'cluster',
      max_memory_restart: '400M',
      node_args: '--max-old-space-size=512',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};