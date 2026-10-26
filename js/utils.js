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

// Chờ trình duyệt vẽ lại giao diện (gọi trước một bước tính toán dài chạy liền một mạch)
const nextPaint = () =>
    new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

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
// Nhường luồng chính cho trình duyệt (vẽ lại, xử lý sự kiện) rồi chạy tiếp ngay.
// scheduler.yield (Chrome 129+) hoặc MessageChannel: không bị giới hạn tối thiểu 4ms như setTimeout.
const YIELD_INTERVAL_MS = 50;
const yieldToBrowser = () =>
    globalThis.scheduler?.yield
        ? globalThis.scheduler.yield()
        : new Promise((resolve) => {
              const channel = new MessageChannel();
              channel.port1.onmessage = () => {
                  channel.port1.close();
                  resolve();
              };
              channel.port2.postMessage(null);
          });

// onBytes(n): gọi sau mỗi đoạn byte đọc được (để báo tiến độ theo dung lượng file).
const toPapaStream = (byteStream, onBytes) => {
    const listeners = { data: [], end: [], error: [] };
    const emit = (event, value) =>
        listeners[event].slice().forEach((listener) => listener(value));
    const countedStream = onBytes
        ? byteStream.pipeThrough(
              new TransformStream({
                  transform(chunk, controller) {
                      onBytes(chunk.byteLength);
                      controller.enqueue(chunk);
                  },
              }),
          )
        : byteStream;
    const reader = countedStream.pipeThrough(new TextDecoderStream()).getReader();
    let started = false;
    let cancelled = false;

    const pump = async () => {
        let lastYieldAt = performance.now();
        try {
            for (;;) {
                const { done, value } = await reader.read();
                if (cancelled) return;
                if (done) {
                    emit("end");
                    return;
                }
                emit("data", value);
                // Đọc Blob chỉ chờ microtask nên vòng lặp chạy liền một mạch: nhường luồng chính
                // định kỳ để trình duyệt vẽ lại tiến độ và nhận thao tác (vd. nút Cancel)
                if (performance.now() - lastYieldAt >= YIELD_INTERVAL_MS) {
                    await yieldToBrowser();
                    lastYieldAt = performance.now();
                }
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
// options:
// - rawId: giữ nguyên giá trị cột id (vd. Video ID, Country), không thêm tiền tố "UC"
// - filters: [{ column, test }] - chỉ cộng các dòng mà giá trị (chuỗi) của mọi cột lọc thoả test
// - videoChannels: Map Video ID -> Channel ID; các video có trong Map (giá trị null) được điền kênh
//   khi file có cả cột "Video ID" và cột kênh
// - onProgress(bytes): gọi sau mỗi đoạn byte đọc được
// - signal: AbortSignal để dừng đọc giữa chừng (Promise bị reject với AbortError)
const getCsvData = (file, headerKey, headerDetector, options = {}) => {
    if (!file) {
        return Promise.resolve([]);
    }

    const { rawId = false, filters = [], videoChannels, onProgress, signal } = options;

    return new Promise((resolve, reject) => {
        // uc -> { order, name, group, groups } theo lần xuất hiện đầu tiên
        const channels = new Map();
        const allGroups = [];
        let indexes = null;
        let filterIndexes = [];
        let videoIdIndex = -1;
        // File có cột loại điều chỉnh / thuế suất / tiền tệ thì mỗi kênh có thể có nhiều nhóm;
        // file doanh thu thường không có các cột này nên mỗi kênh chỉ có một nhóm (không cần tạo khoá).
        let hasGroupKey = false;
        let rowNumber = 0;
        const source = toPapaStream(file.stream(), onProgress);

        const createGroup = (channel, uc, row) => {
            const group = {
                channel,
                lastRow: 0,
                channelId: detachString(uc),
                channelRev: 0,
                channelDeductionAmount: 0,
                channelAdjustmentType: detachString(
                    getCellData(row, indexes.adjustmentType),
                ),
                channelUsSourcedRevenue: 0,
                channelTaxWithheldAmount: 0,
                channelTaxWithholdingRate: detachString(
                    getCellData(row, indexes.taxWithholdingRate),
                ),
                channelLocalCurrency: detachString(
                    getCellData(row, indexes.localCurrency),
                ),
            };
            allGroups.push(group);
            return group;
        };

        Papa.parse(source, {
            skipEmptyLines: true,
            // Giữ mọi ô dạng chuỗi: tự đổi kiểu cho mọi ô (dynamicTyping) rất chậm trong khi
            // chỉ vài cột tiền cần là số (đổi bằng parseFloat bên dưới)
            dynamicTyping: false,
            step: (results, parser) => {
                if (signal?.aborted) {
                    parser.abort();
                    source.cancel();
                    return;
                }

                const row = results.data;
                rowNumber++;

                if (!indexes) {
                    if ([].concat(headerDetector).some((name) => row.includes(name))) {
                        indexes = getHeaderIndexes(row, headerKey);
                        hasGroupKey =
                            indexes.adjustmentType !== -1 ||
                            indexes.taxWithholdingRate !== -1 ||
                            indexes.localCurrency !== -1;
                        filterIndexes = filters.map(({ column, test }) => ({
                            index: row.indexOf(column),
                            test,
                        }));
                        if (videoChannels) {
                            videoIdIndex = row.indexOf(CSV_COLUMNS.VIDEO_ID);
                        }
                    } else if (rowNumber >= MAX_HEADER_SEARCH_ROWS) {
                        parser.abort();
                        source.cancel();
                    }
                    return;
                }

                // Cột lọc không có trong file => không dòng nào thoả
                if (
                    filterIndexes.length > 0 &&
                    filterIndexes.some(
                        ({ index, test }) =>
                            index === -1 || !test(row[index] ?? ""),
                    )
                ) {
                    return;
                }

                const channelId =
                    indexes.channelId === -1 ? "" : row[indexes.channelId] || "";
                const uc = rawId ? channelId : ensureUcPrefix(channelId);

                if (videoIdIndex !== -1 && channelId) {
                    const videoId = row[videoIdIndex] ?? "";
                    if (videoChannels.get(videoId) === null) {
                        videoChannels.set(videoId, detachString(uc));
                    }
                }

                let channel = channels.get(uc);
                if (!channel) {
                    channel = {
                        order: channels.size,
                        name: detachString(
                            getCellData(row, indexes.channelName) || uc,
                        ),
                        group: null, // nhóm duy nhất khi file không có cột tạo khoá nhóm
                        groups: null, // khoá nhóm -> nhóm
                    };
                    channels.set(detachString(uc), channel);
                }

                let group;
                if (hasGroupKey) {
                    const key = `${row[indexes.adjustmentType]}\u0000${row[indexes.taxWithholdingRate]}\u0000${row[indexes.localCurrency]}`;
                    channel.groups ??= new Map();
                    group = channel.groups.get(key);
                    if (!group) {
                        group = createGroup(channel, uc, row);
                        channel.groups.set(detachString(key), group);
                    }
                } else {
                    group = channel.group ??= createGroup(channel, uc, row);
                }

                group.lastRow = rowNumber;
                if (indexes.revenue !== -1) {
                    group.channelRev += parseFloat(row[indexes.revenue] || "0");
                }
                if (indexes.deductionAmount !== -1) {
                    group.channelDeductionAmount += parseFloat(
                        row[indexes.deductionAmount] || "0",
                    );
                }
                if (indexes.usSourcedRevenue !== -1) {
                    group.channelUsSourcedRevenue += parseFloat(
                        row[indexes.usSourcedRevenue] || "0",
                    );
                }
                if (indexes.taxWithheldAmount !== -1) {
                    group.channelTaxWithheldAmount += parseFloat(
                        row[indexes.taxWithheldAmount] || "0",
                    );
                }
            },
            complete: () => {
                if (signal?.aborted) {
                    reject(new DOMException("Import cancelled", "AbortError"));
                    return;
                }
                // Giữ thứ tự kênh theo lần xuất hiện đầu tiên; trong cùng một kênh, nhóm chứa
                // dòng cuối cùng đứng sau cùng để các giá trị "dòng sau ghi đè" (Note, thuế suất)
                // giống như khi xử lý từng dòng.
                const data = allGroups
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
    // Kiểm tra 2 ký tự đầu, không phân biệt hoa thường ("| 32" đổi chữ hoa A-Z thành chữ thường)
    const isUc =
        (channelId.charCodeAt(0) | 32) === 117 && // u
        (channelId.charCodeAt(1) | 32) === 99; // c
    return isUc ? channelId : "UC" + channelId;
};

const formatNumber = (number) => {
    return new Intl.NumberFormat("en-US").format(number);
};

// Số tiền: làm tròn 2 chữ số khi hiển thị (dữ liệu vẫn giữ đủ độ chính xác)
const AMOUNT_FORMAT = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "negative",
});
// |giá trị| < 1e-9 là sai số khi cộng trừ (vd. doanh thu bị khấu trừ hết) => hiển thị 0
const formatAmount = (number) =>
    AMOUNT_FORMAT.format(Math.abs(number) < 1e-9 ? 0 : number);

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
