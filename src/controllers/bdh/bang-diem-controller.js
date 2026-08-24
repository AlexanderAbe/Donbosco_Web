const BangDiemModel = require('../../models/bdh/bang-diem');
const { getBdhBaseData } = require('../../utils/base-data-helper');
const pool = require('../../../config/database');
const PDFDocument = require('pdfkit');
const path = require('path');
const { logAction } = require('../../utils/logger'); 

const PDF_LEFT = 30;
const PDF_TABLE_WIDTH = 535;
const PDF_RIGHT = PDF_LEFT + PDF_TABLE_WIDTH;
const PDF_HEADER_HEIGHT = 25;

const drawScoreTableHeader = (doc, columns, y) => {
    let x = PDF_LEFT;
    doc.rect(PDF_LEFT, y, PDF_TABLE_WIDTH, PDF_HEADER_HEIGHT).fillAndStroke('#e5e7eb', '#000000');
    doc.fillColor('#000000').font('Roboto-Bold').fontSize(9);

    columns.forEach(column => {
        doc.text(column.title, x + 3, y + 8, {
            width: column.width - 6,
            align: 'center'
        });
        x += column.width;
        if (x < PDF_RIGHT) {
            doc.moveTo(x, y).lineTo(x, y + PDF_HEADER_HEIGHT).stroke('#000000');
        }
    });
};

const PDF_ROW_MIN_HEIGHT = 22;
const PDF_CELL_PADDING = 8;

const drawScoreRow = (doc, columns, student, number, y) => {
    const values = columns.map(column =>
        String(column.value(student, number) || '')
    );

    doc.font('Roboto').fontSize(9);

    const rowHeight = Math.max(
        PDF_ROW_MIN_HEIGHT,
        ...values.map((value, index) =>
            doc.heightOfString(value, {
                width: columns[index].width - 6,
                lineGap: 2
            }) + PDF_CELL_PADDING
        )
    );

    let x = PDF_LEFT;

    doc.rect(PDF_LEFT, y, PDF_TABLE_WIDTH, rowHeight).stroke('#000000');

    columns.forEach((column, index) => {
        doc.text(values[index], x + 3, y + 4, {
            width: column.width - 6,
            align: column.align,
            lineGap: 2
        });

        x += column.width;

        if (x < PDF_RIGHT) {
            doc.moveTo(x, y)
                .lineTo(x, y + rowHeight)
                .stroke('#000000');
        }
    });

    return rowHeight;
};

const BangDiemController = {
    async getBangDiemPage(req, res) {
        try {
            const academicYears = await BangDiemModel.getAcademicYears();
            const requestedYearId = req.query.nien_khoa;
            const selectedYearId = requestedYearId || academicYears[0]?.id_cau_hinh_nam_hoc;
            const selectedYear = academicYears.find(
                year => String(year.id_cau_hinh_nam_hoc) === String(selectedYearId)
            );
            const summary = selectedYearId
                ? await BangDiemModel.getSummaryByYear(selectedYearId)
                : [];

            return res.render('bdh/bang-diem', {
                ...getBdhBaseData(req, 'Bảng điểm tổng kết'),
                academicYears,
                selectedYearId,
                selectedYear,
                summary
            });
        } catch (error) {
            console.error('❌ Lỗi tải bảng điểm tổng kết:', error);
            return res.status(500).send('Đã xảy ra lỗi khi tải bảng điểm tổng kết.');
        }
    },

    async tongKetDiem(req, res) {
        const yearId = Number(req.body.nien_khoa);
        if (!Number.isInteger(yearId)) {
            // Ghi audit thất bại do dữ liệu không hợp lệ
            await logAction(req, `Tổng kết điểm năm học (ID: ${req.body.nien_khoa}) thất bại: Niên khóa không hợp lệ`, 'Thất bại');
            return res.status(400).send('Niên khóa không hợp lệ.');
        }

        const client = await pool.connect();
        let transactionStarted = false;
        try {
            const yearResult = await client.query(
                'SELECT nien_khoa FROM CAU_HINH_NAM_HOC WHERE id_cau_hinh_nam_hoc = $1',
                [yearId]
            );
            if (yearResult.rows.length === 0) {
                await logAction(req, `Tổng kết điểm năm học (ID: ${yearId}) thất bại: Không tìm thấy niên khóa`, 'Thất bại');
                return res.status(404).send('Không tìm thấy niên khóa.');
            }

            const classes = await BangDiemModel.getClassesByYear(yearId);
            if (classes.length === 0) {
                await logAction(req, `Tổng kết điểm năm học ${yearResult.rows[0].nien_khoa} thất bại: Niên khóa chưa có lớp`, 'Thất bại');
                return res.status(400).send('Niên khóa chưa có lớp để tổng kết.');
            }

            await client.query('BEGIN');
            transactionStarted = true;
            for (const classItem of classes) {
                await client.query('CALL sp_tinh_tong_ket_nam_hoc($1, $2)', [yearId, classItem.id_lop]);
            }
            await client.query('COMMIT');

            // Ghi audit thành công
            await logAction(req, `Tổng kết điểm thành công cho năm học: ${yearResult.rows[0].nien_khoa}`, 'Thành công');

            return res.redirect(`/bdh/bang-diem?nien_khoa=${yearId}`);
        } catch (error) {
            if (transactionStarted) {
                await client.query('ROLLBACK');
            }
            console.error('❌ Lỗi tổng kết điểm:', error);
            
            // Ghi audit thất bại khi xảy ra lỗi hệ thống / database
            await logAction(req, `Tổng kết điểm năm học (ID: ${yearId}) thất bại do lỗi hệ thống`, 'Thất bại');

            return res.status(500).send('Đã xảy ra lỗi khi tổng kết điểm.');
        } finally {
            client.release();
        }
    },

    async exportBangDiem(req, res) {
        try {
            const academicYears = await BangDiemModel.getAcademicYears();
            const requestedYearId = req.query.nien_khoa;
            const selectedYearId = requestedYearId || academicYears[0]?.id_cau_hinh_nam_hoc;
            const selectedYear = academicYears.find(
                year => String(year.id_cau_hinh_nam_hoc) === String(selectedYearId)
            );

            if (!selectedYear) {
                await logAction(req, `Xuất PDF bảng điểm thất bại: Không tìm thấy niên khóa`, 'Thất bại');
                return res.status(404).send('Không tìm thấy niên khóa.');
            }

            const summary = await BangDiemModel.getSummaryByYear(selectedYearId);
            if (summary.length === 0) {
                await logAction(req, `Xuất PDF bảng điểm thất bại: Niên khóa ${selectedYear.nien_khoa} chưa có dữ liệu`, 'Thất bại');
                return res.status(404).send('Niên khóa chưa có dữ liệu bảng điểm.');
            }

            const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 0 });
            const fontPath = path.join(__dirname, '../../../public/fonts');
            doc.registerFont('Roboto', path.join(fontPath, 'Roboto-Regular.ttf'));
            doc.registerFont('Roboto-Bold', path.join(fontPath, 'Roboto-Bold.ttf'));
            doc.registerFont('Roboto-Condensed', path.join(fontPath, 'Roboto_Condensed-Regular.ttf'));

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=Bang_Diem_Tong_Ket_${selectedYear.nien_khoa.replace(/\s+/g, '_')}.pdf`
            );
            doc.pipe(res);

            const columns = [
                { title: 'STT', width: 24, align: 'center', value: (_, number) => String(number) },
                { title: 'MSTN', width: 43, align: 'center', value: student => student.mstn || '' },
                { title: 'TÊN THÁNH', width: 59, align: 'left', value: student => student.ten_thanh || '' },
                { title: 'HỌ VÀ TÊN LÓT', width: 85, align: 'left', value: student => student.ho_va_ten_lot || '' },
                { title: 'TÊN', width: 43, align: 'left', value: student => student.ten || '' },
                { title: 'Học tập', width: 40, align: 'center', value: student => String(student.diem_hoc_tap ?? '') },
                { title: 'Chuyên cần', width: 55, align: 'center', value: student => String(student.diem_chuyen_can ?? '') },
                { title: 'Kỷ luật', width: 40, align: 'center', value: student => String(student.diem_ky_luat ?? '') },
                { title: 'TỔNG', width: 34, align: 'center', value: student => String(student.diem_tong ?? '') },
                { title: 'XẾP LOẠI', width: 51, align: 'center', value: student => student.ten_xep_loai || '' },
                {
                    title: 'TÌNH TRẠNG',
                    width: 63,
                    align: 'center',
                    value: student => student.trang_thai_tn === 'Đang học'
                        ? (student.tinh_trang || '')
                        : (student.trang_thai_tn || '')
                }
            ];

            const classes = [];
            summary.forEach(student => {
                let group = classes.find(item => item.idLop === student.id_lop);
                if (!group) {
                    group = {
                        idLop: student.id_lop,
                        tenLop: student.ten_lop,
                        tenKhoi: student.ten_khoi,
                        students: []
                    };
                    classes.push(group);
                }
                group.students.push(student);
            });

            classes.forEach((group, classIndex) => {
                if (classIndex > 0) {
                    doc.addPage({ size: 'A4', layout: 'portrait', margin: 0 });
                }

                doc.font('Roboto-Bold').fontSize(10).text('GIÁO XỨ TÂN THÁI SƠN', PDF_LEFT, 28);
                doc.font('Roboto').fontSize(9).text('Xứ đoàn Don Bosco', PDF_LEFT, 43);
                doc.font('Roboto').fontSize(9).text(`Niên khóa: ${selectedYear.nien_khoa}`, PDF_LEFT, 58);
                doc.font('Roboto-Bold').fontSize(14).text('BẢNG ĐIỂM TỔNG KẾT NĂM HỌC', 0, 78, { align: 'center' });
                doc.font('Roboto-Bold').fontSize(11).text(`Khối: ${group.tenKhoi} - Lớp: ${group.tenLop}`, 0, 98, { align: 'center' });

                let tableY = 125;
                let studentNumber = 0;
                drawScoreTableHeader(doc, columns, tableY);
                tableY += PDF_HEADER_HEIGHT;

                group.students.forEach(student => {
                    const estimatedRowHeight = 38;

                    if (tableY + estimatedRowHeight > 750) {
                        doc.addPage({ size: 'A4', layout: 'portrait', margin: 0 });
                        tableY = 35;
                        drawScoreTableHeader(doc, columns, tableY);
                        tableY += PDF_HEADER_HEIGHT;
                    }

                    studentNumber += 1;

                    const rowHeight = drawScoreRow(
                        doc,
                        columns,
                        student,
                        studentNumber,
                        tableY
                    );

                    tableY += rowHeight;
                });

                doc.font('Roboto').fontSize(8).fillColor('#667085')
                    .text(`Tổng số: ${group.students.length} học sinh`, PDF_LEFT, 800);
            });

            doc.end();

            // Ghi audit thành công sau khi xuất PDF thành công
            await logAction(req, `Xuất file PDF bảng điểm tổng kết niên khóa: ${selectedYear.nien_khoa}`, 'Thành công');

        } catch (error) {
            console.error('❌ Lỗi xuất bảng điểm PDF:', error);
            
            // Ghi audit thất bại nếu lỗi xuất file
            await logAction(req, `Xuất PDF bảng điểm tổng kết thất bại do lỗi hệ thống`, 'Thất bại');

            if (!res.headersSent) {
                return res.status(500).send('Đã xảy ra lỗi khi xuất bảng điểm.');
            }
        }
    }
};

module.exports = BangDiemController;