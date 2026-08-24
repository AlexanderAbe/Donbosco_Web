const { getCurrentYearId } = require('./current-year-state');

const getCurrentYear = (years, session) => {
    const sharedYearId = Number.parseInt(getCurrentYearId(), 10);
    const sessionYearId = Number.parseInt(session.current_year_id, 10);
    const currentYearId = sharedYearId || sessionYearId;
    const currentYear = years.find(year => year.id_cau_hinh_nam_hoc === currentYearId);
    const selectedYearId = currentYear?.id_cau_hinh_nam_hoc || years[0]?.id_cau_hinh_nam_hoc || null;

    if (selectedYearId && session.current_year_id !== selectedYearId) {
        session.current_year_id = selectedYearId;
    }

    return {
        selectedYearId,
        selectedYear: years.find(year => year.id_cau_hinh_nam_hoc === selectedYearId) || null
    };
};

module.exports = { getCurrentYear };
