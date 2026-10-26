const getYouTubeChannelLink = (uc) => `https://www.youtube.com/channel/${uc}`;

// Escape dữ liệu từ CSV / tên file trước khi chèn vào HTML
const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

// Escape ký tự đặc biệt để dùng chuỗi người dùng nhập trong RegExp
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

// Header của báo cáo YouTube luôn nằm trong vài dòng đầu (sau các dòng tiêu đề/metadata).
// Quá số dòng này mà chưa thấy header thì file không đúng định dạng => dừng đọc sớm.
const MAX_HEADER_SEARCH_ROWS = 50;

// Chuỗi Papa trả về là chuỗi "cắt" từ chunk đang đọc; lưu giữ nó sẽ giữ luôn cả chunk
// trong bộ nhớ. Tạo bản sao độc lập cho các chuỗi được lưu lại sau khi đọc xong dòng.
const detachString = (value) =>
    typeof value === "string" ? (" " + value).slice(1) : value;

// Bọc ReadableStream (byte) của trình duyệt thành object kiểu Node stream mà Papa đọc được.
// - Giải mã UTF-8 bằng TextDecoderStream nên ký tự nhiều byte không bị cắt đôi giữa các chunk.
// - Papa xử lý xong mỗi đoạn ngay trong lúc emit "data", chỉ sau đó mới đọc đoạn tiếp theo,
//   nên dữ liệu không bị dồn lại trong RAM (đọc được cả file nằm trong zip, xem js/zip.js).
const toPapaStream = (byteStream) => {
    const listeners = { data: [], end: [], error: [] };
    const emit = (event, value) =>
        listeners[event].slice().forEach((listener) => listener(value));
    const reader = byteStream.pipeThrough(new TextDecoderStream()).getReader();
    let started = false;
    let cancelled = false;

    const pump = async () => {
        try {
            for (;;) {
                const { done, value } = await reader.read();
                if (cancelled) return;
                if (done) {
                    emit("end");
                    return;
                }
                emit("data", value);
            }
        } catch (err) {
            if (!cancelled) emit("error", err);
        }
    };

    return {
        readable: true,
        read() {},
        pause() {},
        resume() {},
        on(event, listener) {
            listeners[event]?.push(listener);
            // Papa gắn đủ listener ngay trong Papa.parse, bắt đầu đọc sau đó
            if (!started) {
                started = true;
                setTimeout(pump, 0);
            }
            return this;
        },
        removeListener(event, listener) {
            listeners[event] = (listeners[event] || []).filter((l) => l !== listener);
            return this;
        },
        cancel() {
            cancelled = true;
            reader.cancel().catch(() => {});
        },
    };
};

const getHeaderIndexes = (headerRow, headerKey) => {
    // name có thể là một tên cột hoặc danh sách tên thay thế (ưu tiên theo thứ tự)
    const indexOf = (name) => {
        for (const candidate of [].concat(name)) {
            const index = headerRow.findIndex((item) => item === candidate);
            if (index !== -1) return index;
        }
        return -1;
    };
    return {
        channelId: indexOf(headerKey.id),
        channelName: indexOf(headerKey.name),
        revenue: indexOf(headerKey.revenue),
        deductionAmount: indexOf(headerKey.deductionAmount),
        adjustmentType: indexOf(headerKey.adjustmentType),
        usSourcedRevenue: indexOf(headerKey.usSourcedRevenue),
        taxWithholdingRate: indexOf(headerKey.taxWithholdingRate),
        taxWithheldAmount: indexOf(headerKey.taxWithheldAmount),
        localCurrency: headerRow.findIndex(
            (item) =>
                item === (headerKey && headerKey.localCurrency) ||
                item === CSV_COLUMNS.LOCAL_CURRENCY,
        ),
    };
};

// Đọc CSV dạng stream và cộng dồn ngay trong lúc đọc, KHÔNG giữ lại từng dòng:
// file báo cáo có thể nặng hàng GB, giữ toàn bộ dòng sẽ gây "out of memory".
// Các dòng được gộp theo (kênh, loại điều chỉnh, thuế suất, tiền tệ) nên kết quả trả về
// vẫn có dạng như từng dòng trước đây và các hàm process* cho ra cùng kết quả.
// file: File, hoặc file nằm trong zip (openZipEntry) - chỉ cần có name và stream().
const getCsvData = (file, headerKey, headerDetector) => {
    if (!file) {
        return Promise.resolve([]);
    }

    return new Promise((resolve, reject) => {
        const channels = new Map(); // uc -> { order, name } theo lần xuất hiện đầu tiên
        const groups = new Map();
        let indexes = null;
        let rowNumber = 0;
        const source = toPapaStream(file.stream());

        Papa.parse(source, {
            skipEmptyLines: true,
            dynamicTyping: true, // Auto-converts data types like number, boolean
            step: (results, parser) => {
                const row = results.data;
                rowNumber++;

                if (!indexes) {
                    if ([].concat(headerDetector).some((name) => row.includes(name))) {
                        indexes = getHeaderIndexes(row, headerKey);
                    } else if (rowNumber >= MAX_HEADER_SEARCH_ROWS) {
                        parser.abort();
                        source.cancel();
                    }
                    return;
                }

                const channelId = getCellData(row, indexes.channelId) || "";
                const channelAdjustmentType = getCellData(row, indexes.adjustmentType);
                const channelTaxWithholdingRate = getCellData(
                    row,
                    indexes.taxWithholdingRate,
                );
                const channelLocalCurrency = getCellData(row, indexes.localCurrency);

                const uc = ensureUcPrefix(channelId);

                let channel = channels.get(uc);
                if (!channel) {
                    channel = {
                        order: channels.size,
                        name: detachString(
                            getCellData(row, indexes.channelName) || uc,
                        ),
                    };
                    channels.set(detachString(uc), channel);
                }

                const key = `${uc}\u0000${channelAdjustmentType}\u0000${channelTaxWithholdingRate}\u0000${channelLocalCurrency}`;
                let group = groups.get(key);
                if (!group) {
                    group = {
                        channel,
                        lastRow: 0,
                        channelId: detachString(uc),
                        channelRev: 0,
                        channelDeductionAmount: 0,
                        channelAdjustmentType: detachString(channelAdjustmentType),
                        channelUsSourcedRevenue: 0,
                        channelTaxWithheldAmount: 0,
                        channelTaxWithholdingRate: detachString(
                            channelTaxWithholdingRate,
                        ),
                        channelLocalCurrency: detachString(channelLocalCurrency),
                    };
                    groups.set(detachString(key), group);
                }

                group.lastRow = rowNumber;
                group.channelRev += parseFloat(
                    getCellData(row, indexes.revenue) || "0",
                );
                group.channelDeductionAmount += parseFloat(
                    getCellData(row, indexes.deductionAmount) || "0",
                );
                group.channelUsSourcedRevenue += parseFloat(
                    getCellData(row, indexes.usSourcedRevenue) || "0",
                );
                group.channelTaxWithheldAmount += parseFloat(
                    getCellData(row, indexes.taxWithheldAmount) || "0",
                );
            },
            complete: () => {
                // Giữ thứ tự kênh theo lần xuất hiện đầu tiên; trong cùng một kênh, nhóm chứa
                // dòng cuối cùng đứng sau cùng để các giá trị "dòng sau ghi đè" (Note, thuế suất)
                // giống như khi xử lý từng dòng.
                const data = Array.from(groups.values())
                    .sort(
                        (a, b) =>
                            a.channel.order - b.channel.order ||
                            a.lastRow - b.lastRow,
                    )
                    .map(({ channel, lastRow, ...group }) => ({
                        ...group,
                        channelName: channel.name,
                        fileName: file.name,
                    }));
                resolve(data);
            },
            error: (err) => {
                reject(err); // Reject on error
            },
        });
    });
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

    const files = fileInput.files;
    if (!files || files.length === 0) {
        return false;
    }

    let isValid = true;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
            isValid = false;
            break;
        }
    }

    if (!isValid) {
        errorMessage.textContent = "Please select valid CSV files only.";
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
    // Bắt mọi cụm YYYYMMDD (8 chữ số) và lấy lớn nhất
    const dates8 = name.match(/20\d{6}/g) || [];

    // Bắt cụm YYYYMM (6 chữ số) đứng giữa dấu _ hoặc đầu/cuối,
    // nhưng KHÔNG phải là phần đầu của cụm 8 chữ số đã bắt ở trên.
    // Ví dụ: "202606" trong YouTube_BugTV_2_M_202606_affiliate_...
    const dates6 = [];
    const re6 = /(?:^|_)(20\d{4})(?=_|$)/g;
    let m;
    while ((m = re6.exec(name)) !== null) {
        const candidate = m[1];
        // Bỏ qua nếu đây thực ra là phần đầu của cụm YYYYMMDD
        if (!dates8.some((d8) => d8.startsWith(candidate) && d8 !== candidate)) {
            dates6.push(candidate + "01"); // Chuyển YYYYMM → YYYYMM01
        }
    }

    const allDates = [...dates8, ...dates6];
    if (allDates.length === 0) return -1;
    return Math.max(...allDates.map((d) => parseInt(d, 10)));
};

const extractMonthKey = (name) => {
    const maxDate = parseNewestDateKey(name);
    if (maxDate === -1) return null;
    return maxDate.toString().substring(0, 6); // Extract YYYYMM
};

const formatMonthKey = (monthKey) => {
    if (!monthKey || monthKey.length !== 6) return monthKey;
    const year = monthKey.substring(0, 4);
    const month = monthKey.substring(4, 6);
    return `${year}-${month}`; // Format as YYYY-MM
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
