const compareStudentNames = (a, b) => {
    const nameA = (a.ten || '').trim().toLowerCase();
    const nameB = (b.ten || '').trim().toLowerCase();
    if (nameA !== nameB) return nameA.localeCompare(nameB, 'vi');

    const hoA = (a.ho_va_ten_lot || '').trim().toLowerCase();
    const hoB = (b.ho_va_ten_lot || '').trim().toLowerCase();
    return hoA.localeCompare(hoB, 'vi');
};

const sortStudentsByName = (students = []) => [...students].sort(compareStudentNames);

module.exports = { compareStudentNames, sortStudentsByName };
