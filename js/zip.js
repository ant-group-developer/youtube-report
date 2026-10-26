// Đọc / ghi file ZIP dạng stream bằng CompressionStream / DecompressionStream có sẵn của trình duyệt.
// Không nạp cả file zip hay nội dung đã giải nén vào RAM (file báo cáo YouTube có thể nặng hàng GB).

const ZIP_SIGNATURE = {
    LOCAL_FILE: 0x04034b50,
    CENTRAL_DIRECTORY: 0x02014b50,
    END_OF_CENTRAL_DIRECTORY: 0x06054b50,
    ZIP64_END_OF_CENTRAL_DIRECTORY: 0x06064b50,
    ZIP64_LOCATOR: 0x07064b50,
};
const ZIP_METHOD = { STORE: 0, DEFLATE: 8 };
const ZIP_UINT32_MAX = 0xffffffff;

// Header gzip (RFC 1952): 10 byte cố định + các trường tuỳ chọn theo cờ FLG
const GZIP_FLAGS = { FHCRC: 2, FEXTRA: 4, FNAME: 8, FCOMMENT: 16 };
const GZIP_TRAILER_LENGTH = 8; // CRC32 + kích thước gốc (little-endian)

const getGzipHeaderLength = (header) => {
    if (header[0] !== 0x1f || header[1] !== 0x8b || header[2] !== 8) {
        throw new Error("Unexpected gzip output from CompressionStream.");
    }
    const flags = header[3];
    let length = 10;
    if (flags & GZIP_FLAGS.FEXTRA) length += 2 + (header[length] | (header[length + 1] << 8));
    if (flags & GZIP_FLAGS.FNAME) while (header[length++] !== 0);
    if (flags & GZIP_FLAGS.FCOMMENT) while (header[length++] !== 0);
    if (flags & GZIP_FLAGS.FHCRC) length += 2;
    return length;
};

const readBlobView = async (blob, start, end) =>
    new DataView(await blob.slice(start, end).arrayBuffer());

// ---- Đọc ZIP ---------------------------------------------------------------

// Đọc danh sách file trong zip từ Central Directory ở cuối file (chỉ vài KB),
// không đọc phần dữ liệu nén.
const readZipEntries = async (file) => {
    // End of Central Directory nằm trong 22 byte + tối đa 64KB comment ở cuối file
    const tailStart = Math.max(0, file.size - (22 + 0xffff));
    const tail = await readBlobView(file, tailStart, file.size);
    let eocd = -1;
    for (let i = tail.byteLength - 22; i >= 0; i--) {
        if (tail.getUint32(i, true) === ZIP_SIGNATURE.END_OF_CENTRAL_DIRECTORY) {
            eocd = i;
            break;
        }
    }
    if (eocd === -1) {
        throw new Error(`Not a zip file: ${file.name}`);
    }

    let entryCount = tail.getUint16(eocd + 10, true);
    let directorySize = tail.getUint32(eocd + 12, true);
    let directoryOffset = tail.getUint32(eocd + 16, true);

    // ZIP64: các giá trị thật nằm ở bản ghi ZIP64 End of Central Directory
    const locator = eocd - 20;
    if (
        locator >= 0 &&
        tail.getUint32(locator, true) === ZIP_SIGNATURE.ZIP64_LOCATOR
    ) {
        const zip64Offset = Number(tail.getBigUint64(locator + 8, true));
        const zip64 = await readBlobView(file, zip64Offset, zip64Offset + 56);
        if (zip64.getUint32(0, true) === ZIP_SIGNATURE.ZIP64_END_OF_CENTRAL_DIRECTORY) {
            entryCount = Number(zip64.getBigUint64(32, true));
            directorySize = Number(zip64.getBigUint64(40, true));
            directoryOffset = Number(zip64.getBigUint64(48, true));
        }
    }

    const directory = await readBlobView(
        file,
        directoryOffset,
        directoryOffset + directorySize,
    );
    const decoder = new TextDecoder();
    const entries = [];
    let p = 0;
    for (let i = 0; i < entryCount && p + 46 <= directory.byteLength; i++) {
        if (directory.getUint32(p, true) !== ZIP_SIGNATURE.CENTRAL_DIRECTORY) break;

        const method = directory.getUint16(p + 10, true);
        let compressedSize = directory.getUint32(p + 20, true);
        let size = directory.getUint32(p + 24, true);
        const nameLength = directory.getUint16(p + 28, true);
        const extraLength = directory.getUint16(p + 30, true);
        const commentLength = directory.getUint16(p + 32, true);
        let localHeaderOffset = directory.getUint32(p + 42, true);
        const name = decoder.decode(
            new Uint8Array(
                directory.buffer,
                directory.byteOffset + p + 46,
                nameLength,
            ),
        );

        // ZIP64 extra field (id 0x0001): chỉ chứa các giá trị bị đặt 0xFFFFFFFF, theo thứ tự cố định
        const extraEnd = p + 46 + nameLength + extraLength;
        for (let e = p + 46 + nameLength; e + 4 <= extraEnd; ) {
            const id = directory.getUint16(e, true);
            const length = directory.getUint16(e + 2, true);
            if (id === 0x0001) {
                let q = e + 4;
                const next = () => {
                    const value = Number(directory.getBigUint64(q, true));
                    q += 8;
                    return value;
                };
                if (size === ZIP_UINT32_MAX) size = next();
                if (compressedSize === ZIP_UINT32_MAX) compressedSize = next();
                if (localHeaderOffset === ZIP_UINT32_MAX) localHeaderOffset = next();
            }
            e += 4 + length;
        }

        entries.push({
            name,
            dir: name.endsWith("/"),
            method,
            compressedSize,
            size,
            localHeaderOffset,
        });
        p = extraEnd + commentLength;
    }
    return entries;
};

// Tạo object giống File cho một file nằm trong zip: có name, size và stream() trả về
// ReadableStream đã giải nén (giải nén dần khi đọc, không giữ toàn bộ nội dung).
const openZipEntry = async (zipFile, entry) => {
    if (entry.method !== ZIP_METHOD.STORE && entry.method !== ZIP_METHOD.DEFLATE) {
        throw new Error(
            `Unsupported zip compression method ${entry.method}: ${entry.name}`,
        );
    }

    // Vị trí dữ liệu = sau Local File Header (độ dài tên/extra ở đây có thể khác Central Directory)
    const header = await readBlobView(
        zipFile,
        entry.localHeaderOffset,
        entry.localHeaderOffset + 30,
    );
    if (header.getUint32(0, true) !== ZIP_SIGNATURE.LOCAL_FILE) {
        throw new Error(`Invalid zip entry header: ${entry.name}`);
    }
    const dataStart =
        entry.localHeaderOffset +
        30 +
        header.getUint16(26, true) +
        header.getUint16(28, true);
    const compressed = zipFile.slice(dataStart, dataStart + entry.compressedSize);

    return {
        name: entry.name,
        size: entry.size,
        stream: () =>
            entry.method === ZIP_METHOD.STORE
                ? compressed.stream()
                : compressed
                      .stream()
                      .pipeThrough(new DecompressionStream("deflate-raw")),
    };
};

// ---- Ghi ZIP ---------------------------------------------------------------

// Nén một entry: chunks là danh sách / async iterable các chuỗi; chuỗi được mã hoá UTF-8 và nén dần
// nên chỉ phần dữ liệu đã nén được giữ trong RAM.
// Nén dạng gzip để trình duyệt tính luôn CRC32 (nằm ở cuối dữ liệu gzip) thay vì tính bằng JS;
// phần nằm giữa header và trailer gzip chính là dữ liệu deflate cần ghi vào file zip.
const deflateZipEntry = async (chunks) => {
    const encoder = new TextEncoder();
    const compressor = new CompressionStream("gzip");
    const writer = compressor.writable.getWriter();
    const compressedParts = [];

    const reading = (async () => {
        const reader = compressor.readable.getReader();
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            compressedParts.push(value);
        }
    })();

    let size = 0;
    for await (const chunk of chunks) {
        const bytes = encoder.encode(chunk);
        size += bytes.length;
        await writer.write(bytes);
    }
    await writer.close();
    await reading;

    const gzip = new Blob(compressedParts);
    const headerLength = getGzipHeaderLength(
        new Uint8Array(await gzip.slice(0, 64 * 1024).arrayBuffer()),
    );
    const trailer = await readBlobView(
        gzip,
        gzip.size - GZIP_TRAILER_LENGTH,
        gzip.size,
    );
    const data = gzip.slice(headerLength, gzip.size - GZIP_TRAILER_LENGTH);

    return { crc: trailer.getUint32(0, true), size, compressedSize: data.size, data };
};

const getDosDateTime = (date) => ({
    time:
        (date.getHours() << 11) |
        (date.getMinutes() << 5) |
        Math.floor(date.getSeconds() / 2),
    date:
        ((date.getFullYear() - 1980) << 9) |
        ((date.getMonth() + 1) << 5) |
        date.getDate(),
});

// entries: [{ name, chunks }] => Blob của file zip
const createZipBlob = async (entries, type = "application/zip") => {
    const encoder = new TextEncoder();
    const { time, date } = getDosDateTime(new Date());
    const UTF8_NAME_FLAG = 0x0800;

    const parts = [];
    const directory = [];
    let offset = 0;

    for (const entry of entries) {
        const name = encoder.encode(entry.name);
        const { crc, size, compressedSize, data } = await deflateZipEntry(
            entry.chunks,
        );
        if (size >= ZIP_UINT32_MAX || offset + compressedSize >= ZIP_UINT32_MAX) {
            throw new Error("Export file is too large (over 4GB).");
        }

        const local = new DataView(new ArrayBuffer(30));
        local.setUint32(0, ZIP_SIGNATURE.LOCAL_FILE, true);
        local.setUint16(4, 20, true); // version needed
        local.setUint16(6, UTF8_NAME_FLAG, true);
        local.setUint16(8, ZIP_METHOD.DEFLATE, true);
        local.setUint16(10, time, true);
        local.setUint16(12, date, true);
        local.setUint32(14, crc, true);
        local.setUint32(18, compressedSize, true);
        local.setUint32(22, size, true);
        local.setUint16(26, name.length, true);
        local.setUint16(28, 0, true);
        parts.push(local, name, data);

        const central = new DataView(new ArrayBuffer(46));
        central.setUint32(0, ZIP_SIGNATURE.CENTRAL_DIRECTORY, true);
        central.setUint16(4, 20, true); // version made by
        central.setUint16(6, 20, true); // version needed
        central.setUint16(8, UTF8_NAME_FLAG, true);
        central.setUint16(10, ZIP_METHOD.DEFLATE, true);
        central.setUint16(12, time, true);
        central.setUint16(14, date, true);
        central.setUint32(16, crc, true);
        central.setUint32(20, compressedSize, true);
        central.setUint32(24, size, true);
        central.setUint16(28, name.length, true);
        central.setUint32(42, offset, true);
        directory.push(central, name);

        offset += 30 + name.length + compressedSize;
    }

    const directorySize = directory.reduce((sum, part) => sum + part.byteLength, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, ZIP_SIGNATURE.END_OF_CENTRAL_DIRECTORY, true);
    end.setUint16(8, entries.length, true);
    end.setUint16(10, entries.length, true);
    end.setUint32(12, directorySize, true);
    end.setUint32(16, offset, true);

    return new Blob([...parts, ...directory, end], { type });
};
