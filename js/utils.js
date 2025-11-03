const getYouTubeChannelLink = (uc) => `https://www.youtube.com/channel/${uc}`;

const getSubmitBtn = (buttonId) => $(`#${buttonId}`);

const showLoading = (buttonId) => {
    const fieldset = $("form#csv-form fieldset");
    fieldset.attr("disabled", true);

    const submitBtn = getSubmitBtn(buttonId);
    submitBtn.html(`
        <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
        <span role="status">Loading...</span>   
    `);
};

const hideLoading = (buttonId) => {
    const fieldset = $("form#csv-form fieldset");
    fieldset.removeAttr("disabled");

    const submitBtn = getSubmitBtn(buttonId);
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
    console.log("file:", file);
    if (!file) {
        return [];
    }

    const rows = await readFile(file);
    console.log("rows:", rows);
    const headerRowIndex = rows.findIndex((value) =>
        value.includes(headerDetector)
    );

    if (headerRowIndex === -1) {
        return [];
    }

    const data = [];

    const headerRow = rows[headerRowIndex];
    const channelIdIndex = headerRow.findIndex((item) => item === headerKey.id);
    console.log("channelIdIndex:", channelIdIndex);
    const channelNameIndex = headerRow.findIndex(
        (item) => item === headerKey.name
    );
    const channelRevIndex = headerRow.findIndex(
        (item) => item === headerKey.revenue
    );

    const deductionAmountIndex = headerRow.findIndex(
        (item) => item === headerKey.deductionAmount
    );
    const adjustmentTypeIndex = headerRow.findIndex(
        (item) => item === headerKey.adjustmentType
    );

    const usSourcedRevenueIndex = headerRow.findIndex(
        (item) => item === headerKey.usSourcedRevenue
    );
    const taxWithholdingRateIndex = headerRow.findIndex(
        (item) => item === headerKey.taxWithholdingRate
    );
    const taxWithheldAmountIndex = headerRow.findIndex(
        (item) => item === headerKey.taxWithheldAmount
    );

    for (i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        const channelId = getCellData(row, channelIdIndex) || "";
        const channelName = getCellData(row, channelNameIndex);
        const channelRev = getCellData(row, channelRevIndex);
        const channelDeductionAmount = getCellData(row, deductionAmountIndex);
        const channelAdjustmentType = getCellData(row, adjustmentTypeIndex);
        const channelUsSourcedRevenue = getCellData(row, usSourcedRevenueIndex);
        const channelTaxWithholdingRate = getCellData(
            row,
            taxWithholdingRateIndex
        );
        const channelTaxWithheldAmount = getCellData(
            row,
            taxWithheldAmountIndex
        );

        const uc = ensureUcPrefix(channelId);

        data.push({
            channelId: uc,
            channelName: channelName || uc,
            channelRev: parseFloat(channelRev || "0"),
            channelDeductionAmount: parseFloat(channelDeductionAmount || "0"),
            channelAdjustmentType,
            channelUsSourcedRevenue: parseFloat(channelUsSourcedRevenue || "0"),
            channelTaxWithheldAmount: parseFloat(
                channelTaxWithheldAmount || "0"
            ),
            channelTaxWithholdingRate,
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

// ---- Helpers ---------------------------------------------------------------
const parseVersionWeight = (name) => {
    // v1-1 | v1_1 | v2 | v10-0 ...
    const s = name.toLowerCase();
    const m = s.match(/v(\d+)[-_](\d+)/) || s.match(/v(\d+)/);
    if (!m) return -1; // không thấy version => ưu tiên thấp
    const major = parseInt(m[1], 10);
    const minor = m[2] ? parseInt(m[2], 10) : 0;
    return major * 100 + minor; // v1-1 = 101 > v1-0 = 100
};

const parseNewestDateKey = (name) => {
    // Bắt mọi cụm YYYYMMDD và lấy lớn nhất (ví dụ: 20250531, 20250701)
    const dates = name.match(/20\d{6}/g);
    if (!dates) return -1;
    return Math.max(...dates.map((d) => parseInt(d, 10)));
};

const matchesRule = (name, rule) => {
    const s = name.toLowerCase();
    if (rule.forbidden?.some((re) => re.test(s))) return false;

    if (rule.requiredAll && !rule.requiredAll.every((re) => re.test(s))) {
        return false;
    }
    if (rule.requiredAny && !rule.requiredAny.some((re) => re.test(s))) {
        return false;
    }
    return true;
};

const pickBestByRule = (fileList, rule) => {
    const candidates = fileList.filter((f) => matchesRule(f.name, rule));
    if (candidates.length === 0) return undefined;

    // Ưu tiên: version > ngày > tên (ổn định)
    candidates.sort((a, b) => {
        const va = parseVersionWeight(a.name);
        const vb = parseVersionWeight(b.name);
        if (vb !== va) return vb - va;

        const da = parseNewestDateKey(a.name);
        const db = parseNewestDateKey(b.name);
        if (db !== da) return db - da;

        return a.name.localeCompare(b.name); // tie-break
    });

    return candidates[0];
};
