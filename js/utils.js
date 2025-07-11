const getYouTubeChannelLink = (uc) => `https://www.youtube.com/channel/${uc}`;

const getSubmitBtn = () => $("#submit");

const showLoading = () => {
    const fieldset = $("form#csv-form fieldset");
    fieldset.attr("disabled", true);

    const submitBtn = getSubmitBtn();
    submitBtn.html(`
        <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
        <span role="status">Loading...</span>   
    `);
};

const hideLoading = () => {
    const fieldset = $("form#csv-form fieldset");
    fieldset.removeAttr("disabled");

    const submitBtn = getSubmitBtn();
    submitBtn.html("Submit");
};

const exportExcel = (data) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet 1", {
        views: [{ state: "frozen", ySplit: 1, xSplit: 2 }],
    });

    // === 1. KHAI BÁO CỘT ===
    worksheet.columns = EXCEL_COLUMNS.map((col) => ({
        header: col.name,
        key: col.key,
        width: col.width ?? 20,
    }));
    const columnAlignMap = Object.fromEntries(
        EXCEL_COLUMNS.map((col) => [col.key, col.align ?? "left"])
    );

    const headerRowNumber = 1;

    // === HEADER ===
    const headerRow = worksheet.getRow(headerRowNumber);
    headerRow.values = worksheet.columns.map((col) => col.header ?? "");
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF305496" },
        };
        cell.font = {
            color: { argb: "FFFFFFFF" },
            bold: true,
            size: 12,
        };
        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };
        cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
        };
    });

    // === DỮ LIỆU ===
    const startDataRow = headerRowNumber + 1;
    data.forEach((record, index) => {
        const rowData = { stt: index + 1 };
        EXCEL_COLUMNS.forEach((col) => {
            const rawValue = record[col.key];
            rowData[col.key] = col.format
                ? col.format(rawValue, record)
                : rawValue;
        });
        worksheet.insertRow(index + startDataRow, rowData);
    });

    // === FONT & BORDER ===
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber <= headerRowNumber) return; // Bỏ dòng trước Header

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.font = cell.font ?? { name: "Arial", size: 13 };
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };

            const key = worksheet.getColumn(colNumber).key?.toString();
            if (key && columnAlignMap[key]) {
                cell.alignment = {
                    vertical: "middle",
                    horizontal: columnAlignMap[key],
                };
            }
        });
    });

    // Tạo tệp Excel và cho phép tải xuống
    workbook.xlsx.writeBuffer().then(function (buffer) {
        const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = Date.now() + ".xlsx";
        link.click(); // Trình duyệt sẽ tự động tải xuống tệp
    });
};

// const setTableData = (data) => {
//     if (data.length <= 0) return;
//     const tableWrapper = $("#table-wrapper");
//     tableWrapper.removeClass("invisible");
//     const $table = $("#table");
//     $table.bootstrapTable({ data });
// };

const parsedRow = (value) => {
    // This regex will split the string by commas, but it will not split if the comma is inside quotes
    const regex = /,(?=(?:[^"]*"[^"]*")*[^"]*$)/;
    return value.split(regex);
};

const getCellData = (row, cellIndex) => {
    if (cellIndex === -1) {
        return null;
    }
    return row[cellIndex];
};

const readFile = (file) => {
    return new Promise((resolve, reject) => {
        const results = [];
        Papa.parse(file, {
            skipEmptyLines: true,
            dynamicTyping: true, // Auto-converts data types like number, boolean
            step: (row) => {
                // Process each row here and push to results
                results.push(row.data); // Store data incrementally
            },
            complete: () => {
                resolve(results); // Resolve after complete processing
            },
            error: (err) => {
                reject(err); // Reject on error
            },
        });
    });
};

const getCsvData = async (file, headerKey, headerDetector) => {
    if (!file) {
        return [];
    }

    const rows = await readFile(file);
    const headerRowIndex = rows.findIndex((value) =>
        value.includes(headerDetector)
    );

    if (headerRowIndex === -1) {
        return [];
    }

    const data = [];

    const headerRow = rows[headerRowIndex];
    const channelIdIndex = headerRow.findIndex((item) => item === headerKey.id);
    const channelNameIndex = headerRow.findIndex(
        (item) => item === headerKey.name
    );
    const channelRevIndex = headerRow.findIndex(
        (item) => item === headerKey.revenue
    );

    for (i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        const channelId = getCellData(row, channelIdIndex);
        const channelName = getCellData(row, channelNameIndex);
        const channelRev = getCellData(row, channelRevIndex);

        const uc = ensureUcPrefix(channelId);

        data.push({
            channelId: uc,
            channelName: channelName || uc,
            channelRev: parseFloat(channelRev),
        });
    }

    return data;
};

const ensureUcPrefix = (channelId) => {
    // Kiểm tra 2 ký tự đầu, không phân biệt hoa thường
    if (!channelId.slice(0, 2).toLowerCase().startsWith("uc")) {
        return "UC" + channelId;
    }
    return channelId;
};

// Validate function to check if the selected file is a CSV
function validateFileInput(inputId, errorId) {
    const fileInput = document.getElementById(inputId);
    const errorMessage = document.getElementById(errorId);

    const file = fileInput.files[0]; // Get the selected file
    if (!file) {
        errorMessage.textContent = "Please select a CSV file.";
        fileInput.classList.add("is-invalid");
        fileInput.classList.remove("is-valid");
        return false;
    }

    const fileType = file.type;
    if (fileType !== "text/csv" && !file.name.endsWith(".csv")) {
        errorMessage.textContent = "Please select a valid CSV file.";
        fileInput.classList.add("is-invalid");
        fileInput.classList.remove("is-valid");
        return false;
    }

    // If file is valid
    errorMessage.textContent = ""; // Clear error message
    fileInput.classList.remove("is-invalid");
    fileInput.classList.add("is-valid");
    return true;
}

const validateCsvFile = (inputId, errorId) => {
    const fileInput = document.getElementById(inputId);
    const errorMessage = document.getElementById(errorId);

    const file = fileInput.files[0]; // Get the selected file
    if (!file) {
        return false;
    }

    const fileType = file.type;
    if (fileType !== "text/csv" && !file.name.endsWith(".csv")) {
        errorMessage.textContent = "Please select a valid CSV file.";
        fileInput.classList.add("is-invalid");
        fileInput.classList.remove("is-valid");
        return false;
    }

    // If file is valid
    errorMessage.textContent = ""; // Clear error message
    fileInput.classList.remove("is-invalid");
    fileInput.classList.add("is-valid");
    return true;
};

const formatNumber = (number) => {
    return new Intl.NumberFormat("en-US").format(number);
};
