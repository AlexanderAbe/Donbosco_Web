module.exports = {
  apps: [
    {
      name: 'thieu-nhi-tan-thai-son-app', // Tên ứng dụng của bạn trên PM2 (đặt gì cũng được)
      script: './app.js', 
      instances: 'max', // Tự động dùng hết số nhân CPU của VPS
      exec_mode: 'cluster', // Chạy chế độ đa luồng để tăng hiệu suất
      max_memory_restart: '400M', // Nếu app bị tràn RAM vượt quá 400MB, PM2 sẽ tự restart để chống sập VPS
      node_args: '--max-old-space-size=512', // Giới hạn cứng dung lượng V8 engine được dùng tối đa 512MB RAM
      env: {
        NODE_ENV: 'production', // Chuyển sang môi trường chạy thực tế
        PORT: 3000, // Cổng nội bộ mà ứng dụng Node.js của bạn sẽ lắng nghe
      },
    },
  ],
};