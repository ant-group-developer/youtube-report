// Xuất Excel (.xlsx) dạng stream: tự sinh XML của sheet theo từng khối dòng và nén dần (js/zip.js),
// thay vì dựng toàn bộ workbook trong RAM như ExcelJS (tràn RAM với vài trăm nghìn kênh).

const XLSX_MIME =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const XLSX_SHEET_NAME = "Sheet 1";
const XLSX_MAX_ROWS = 1048576; // giới hạn số dòng của một sheet Excel (gồm cả header)
const XLSX_ROWS_PER_CHUNK = 2000;

const XLSX_COLORS = {
    HEADER_FILL: "FF305496",
    HEADER_FONT: "FFFFFFFF",
    CREDIT_APPEAL_FILL: "FF198754",
    MONETIZATION_DISABLED_FILL: "FFDC3545",
    HIGHLIGHT_FONT: "FFFFFFFF",
};

// Kiểu dòng dữ liệu: thường / CREDIT - APPEAL (xanh) / MONETIZATION DISABLED (đỏ)
const XLSX_ROW_VARIANTS = [
    { fontId: 2, fillId: 0 },
    { fontId: 3, fillId: 3 },
    { fontId: 3, fillId: 4 },
];
const XLSX_ALIGNS = ["left", "right"];
const XLSX_NUM_FMTS = { General: 0, "#,##0.00": 4 }; // numFmtId có sẵn của Excel
const XLSX_HEADER_STYLE = 1;

const getXlsxStyle = (variant, align, numFmtId) =>
    2 +
    variant * XLSX_ALIGNS.length * 2 +
    XLSX_ALIGNS.indexOf(align) * 2 +
    (numFmtId === XLSX_NUM_FMTS["#,##0.00"] ? 1 : 0);

const buildXlsxStyles = () => {
    const dataXfs = XLSX_ROW_VARIANTS.flatMap(({ fontId, fillId }) =>
        XLSX_ALIGNS.flatMap((align) =>
            [XLSX_NUM_FMTS.General, XLSX_NUM_FMTS["#,##0.00"]].map(
                (numFmtId) =>
                    `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="${align}" vertical="center"/></xf>`,
            ),
        ),
    );
    const solidFill = (rgb) =>
        `<fill><patternFill patternType="solid"><fgColor rgb="${rgb}"/><bgColor indexed="64"/></patternFill></fill>`;
    const thin = (side) => `<${side} style="thin"><color indexed="64"/></${side}>`;

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4">
<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="12"/><color rgb="${XLSX_COLORS.HEADER_FONT}"/></font>
<font><sz val="12"/><name val="Arial"/><family val="2"/></font>
<font><sz val="12"/><color rgb="${XLSX_COLORS.HIGHLIGHT_FONT}"/><name val="Arial"/><family val="2"/></font>
</fonts>
<fills count="5">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
${solidFill(XLSX_COLORS.HEADER_FILL)}
${solidFill(XLSX_COLORS.CREDIT_APPEAL_FILL)}
${solidFill(XLSX_COLORS.MONETIZATION_DISABLED_FILL)}
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border>${thin("left")}${thin("right")}${thin("top")}${thin("bottom")}<diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${2 + dataXfs.length}">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
${dataXfs.join("\n")}
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
};

const getXlsxColumnName = (index) => {
    let name = "";
    for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
        name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
    }
    return name;
};

// Bỏ ký tự không hợp lệ trong XML (ký tự điều khiển, surrogate lẻ) để file không bị lỗi khi mở
const escapeXml = (value) =>
    String(value)
        .replace(
            /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
            "",
        )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

const getXlsxCell = (ref, style, value) => {
    if (value === null || value === undefined) {
        return `<c r="${ref}" s="${style}"/>`;
    }
    if (value === "") {
        // Chuỗi rỗng là ô có giá trị "" (khác ô trống), dùng shared string 0 = ""
        return `<c r="${ref}" s="${style}" t="s"><v>0</v></c>`;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
    }
    if (typeof value === "boolean") {
        return `<c r="${ref}" s="${style}" t="b"><v>${value ? 1 : 0}</v></c>`;
    }
    return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
};

const getXlsxRowVariant = (values) => {
    if (values.includes(ADJUSTMENT_TYPES.CREDIT_APPEAL.VALUE)) return 1;
    if (values.includes(ADJUSTMENT_TYPES.MONETIZATION_DISABLED.VALUE)) return 2;
    return 0;
};

async function* generateXlsxSheet(data, columns) {
    const columnNames = columns.map((_, index) => getXlsxColumnName(index));
    const lastColumn = columnNames[columnNames.length - 1];

    yield `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<dimension ref="A1:${lastColumn}${data.length + 1}"/>
<sheetViews><sheetView workbookViewId="0"><pane xSplit="2" ySplit="1" topLeftCell="C2" activePane="bottomRight" state="frozen"/><selection pane="topRight"/><selection pane="bottomLeft"/><selection pane="bottomRight" activeCell="C2" sqref="C2"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${columns
        .map(
            (col, index) =>
                `<col min="${index + 1}" max="${index + 1}" width="${col.width ?? 20}" customWidth="1"/>`,
        )
        .join("")}</cols>
<sheetData>
<row r="1">${columns
        .map((col, index) =>
            getXlsxCell(`${columnNames[index]}1`, XLSX_HEADER_STYLE, col.name),
        )
        .join("")}</row>
`;

    let xml = "";
    for (let i = 0; i < data.length; i++) {
        const record = data[i];
        const rowNumber = i + 2;
        const values = columns.map((col) => {
            const rawValue = record[col.key];
            let value = col.format ? col.format(rawValue, record) : rawValue;
            // Cột số: ghi dạng number (kể cả giá trị là chuỗi số, vd. thuế suất từ CSV) để Excel tính toán được
            if (col.numFmt && value !== "" && value !== null && !isNaN(Number(value))) {
                value = Number(value);
            }
            return value;
        });
        const variant = getXlsxRowVariant(values);

        xml += `<row r="${rowNumber}">`;
        values.forEach((value, index) => {
            const col = columns[index];
            const numFmtId =
                typeof value === "number" ? XLSX_NUM_FMTS[col.numFmt] ?? 0 : 0;
            const style = getXlsxStyle(variant, col.align ?? "left", numFmtId);
            xml += getXlsxCell(`${columnNames[index]}${rowNumber}`, style, value);
        });
        xml += "</row>\n";

        if ((i + 1) % XLSX_ROWS_PER_CHUNK === 0) {
            yield xml;
            xml = "";
        }
    }

    yield `${xml}</sheetData>\n</worksheet>`;
}

const buildXlsxBlob = (data, columns = EXCEL_COLUMNS) => {
    if (data.length + 1 > XLSX_MAX_ROWS) {
        throw new Error(
            `Too many rows for one Excel sheet (${data.length}, max ${XLSX_MAX_ROWS - 1}).`,
        );
    }

    const NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    const NS_PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships";
    const NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    const XML_HEAD = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;

    return createZipBlob(
        [
            {
                name: "[Content_Types].xml",
                chunks: [
                    `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`,
                ],
            },
            {
                name: "_rels/.rels",
                chunks: [
                    `${XML_HEAD}<Relationships xmlns="${NS_PKG_REL}"><Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
                ],
            },
            {
                name: "xl/workbook.xml",
                chunks: [
                    `${XML_HEAD}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}"><bookViews><workbookView/></bookViews><sheets><sheet name="${escapeXml(XLSX_SHEET_NAME)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
                ],
            },
            {
                name: "xl/_rels/workbook.xml.rels",
                chunks: [
                    `${XML_HEAD}<Relationships xmlns="${NS_PKG_REL}"><Relationship Id="rId1" Type="${NS_REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${NS_REL}/styles" Target="styles.xml"/><Relationship Id="rId3" Type="${NS_REL}/sharedStrings" Target="sharedStrings.xml"/></Relationships>`,
                ],
            },
            { name: "xl/styles.xml", chunks: [buildXlsxStyles()] },
            {
                name: "xl/sharedStrings.xml",
                chunks: [
                    `${XML_HEAD}<sst xmlns="${NS_MAIN}" count="1" uniqueCount="1"><si><t></t></si></sst>`,
                ],
            },
            {
                name: "xl/worksheets/sheet1.xml",
                chunks: generateXlsxSheet(data, columns),
            },
        ],
        XLSX_MIME,
    );
};

const exportExcel = async (data) => {
    const blob = await buildXlsxBlob(data);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = Date.now() + ".xlsx";
    link.click(); // Trình duyệt sẽ tự động tải xuống tệp
    setTimeout(() => URL.revokeObjectURL(url), 60000);
};
