let currentYearId = null;

const setCurrentYearId = yearId => {
    currentYearId = yearId || null;
};

const getCurrentYearId = () => currentYearId;

module.exports = { setCurrentYearId, getCurrentYearId };
