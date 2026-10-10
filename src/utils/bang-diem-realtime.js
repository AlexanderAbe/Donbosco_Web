const broadcastBangDiemRefresh = (req, yearId) => {
    const io = req.app.get('io');
    if (io) {
        io.to(`bang_diem_${yearId}`).emit('bang_diem_scores_updated', { yearId });
    }
};

module.exports = { broadcastBangDiemRefresh };
