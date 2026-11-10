/**
 * Xuất bảng ra file Excel (.xlsx) — dùng chung cho tab Khách xác nhận và Lời chúc.
 *
 * Thư viện chỉ được nạp lúc bấm nút (import động), nên không làm nặng trang
 * admin, càng không đụng tới trang khách.
 *
 * `columns`: [{ header, width, wrap? }] — width tính bằng số ký tự.
 * `rows`: mảng các hàng, mỗi hàng là mảng giá trị theo đúng thứ tự cột.
 * Giá trị số giữ là số (Excel cộng tổng được); null/'' là ô trống.
 */
export async function downloadExcel(fileName, sheet, columns, rows) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');

  const header = columns.map((c) => ({ value: c.header, fontWeight: 'bold' }));
  const body = rows.map((row) => row.map((value, i) => {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return { value, type: Date, format: 'dd/mm/yyyy hh:mm' };
    return columns[i].wrap ? { value, wrap: true } : value;
  }));

  await writeExcelFile([header, ...body], {
    sheet,
    columns: columns.map((c) => ({ width: c.width })),
    stickyRowsCount: 1,   // dòng tiêu đề đứng yên khi cuộn
  }).toFile(fileName);
}

/**
 * Ô ngày giờ THẬT của Excel (sắp xếp, lọc theo ngày được), hiện theo giờ Việt Nam.
 *
 * write-excel-file quy đổi ngày bằng `date.getTime()`, tức là theo giờ UTC, và file
 * Excel không lưu múi giờ. Cộng sẵn 7 tiếng thì ô hiện đúng giờ Hà Nội, bất kể máy
 * xuất file đặt múi giờ nào.
 */
export function excelDateVN(iso) {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? null : new Date(t + 7 * 60 * 60 * 1000);
}

/** Tên file kèm ngày hôm nay theo giờ Việt Nam */
export function datedName(prefix) {
  const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });   // 2026-11-10
  return `${prefix}-${day}.xlsx`;
}
