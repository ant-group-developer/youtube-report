const getYouTubeChannelLink = (uc) => `https://www.youtube.com/channel/${uc}`;

const getSubmitBtn = () => $("#submit");

const showLoading = () => {
    const fieldset = $("form#csv-form fieldset");
    fieldset.attr("disabled", true);

    const submitBtn = $("#submit");
    submitBtn.html(`
        <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
        <span role="status">Loading...</span>   
    `);
};

const hideLoading = () => {
    const fieldset = $("form#csv-form fieldset");
    fieldset.removeAttr("disabled");

    const submitBtn = $("#submit");
    submitBtn.html("Export Excel");
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

const setTableData = (data) => {
    if (data.length <= 0) return;
    const tableWrapper = $("#table-wrapper");
    tableWrapper.removeClass("invisible");
    const $table = $("#table");
    $table.bootstrapTable({ data });
};

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

const getCsvData = (file, headerKey, headerDetector) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function (event) {
            const text = event.target.result;
            // split into rows, then each row by comma
            const rows = text.trim().split(/\r?\n/);
            const headerRowIndex = rows.findIndex((value) =>
                value.includes(headerDetector)
            );

            if (headerRowIndex === -1) {
                resolve([]);
            }

            const data = [];

            const headerRow = parsedRow(rows[headerRowIndex]);
            const channelIdIndex = headerRow.findIndex(
                (item) => item === headerKey.id
            );
            const channelNameIndex = headerRow.findIndex(
                (item) => item === headerKey.name
            );
            const channelRevIndex = headerRow.findIndex(
                (item) => item === headerKey.revenue
            );

            for (i = headerRowIndex + 1; i < rows.length; i++) {
                const row = parsedRow(rows[i]);
                const channelId = getCellData(row, channelIdIndex);
                const channelName = getCellData(row, channelNameIndex);
                const channelRev = getCellData(row, channelRevIndex);

                data.push({
                    channelId,
                    channelName,
                    channelRev: parseFloat(channelRev),
                });
            }

            resolve(data);
        };

        reader.readAsText(file);
    });
};
