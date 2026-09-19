module.exports = {
  apps: [
    {
      name: 'thieu-nhi-tan-thai-son-app',
      script: './app.js',
      cwd: '/var/www/Donbosco_Web',
      instances: 1,         
      exec_mode: 'fork',
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};