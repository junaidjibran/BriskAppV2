// // utils/excel.js
// import XLSX from 'xlsx';

// export function generateExcel(data, sheetName = 'Sheet1') {
//     console.log("data", data)
//     const worksheet = XLSX.utils.aoa_to_sheet(data);
//     console.log("worksheet", worksheet)
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

//     const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
//     console.log("excelBuffer", excelBuffer)
//     return new Blob([excelBuffer], { type: 'application/octet-stream' });
// }