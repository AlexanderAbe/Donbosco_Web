module.exports = {
  apps: [
    {
      name: 'thieu-nhi-tan-thai-son-app',
      script: './app.js',
      cwd: '/var/www/Donbosco_Web', // <--- THÊM DÒNG NÀY ĐỂ PM2 ĐỨNG ĐÚNG THƯ MỤC DỰ ÁN
      instances: 'max', 
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