let dataTableGlobal = []; // Dữ liệu toàn bộ
let filteredData = dataTableGlobal; // Dữ liệu đã lọc (ban đầu bằng toàn bộ dữ liệu)

const pageSize = 30;
let currentPage = 1;

let exportFileName = null; // tên file Excel theo thư mục và tháng của lần import gần nhất
let searchIndex = null; // UC + tên (chữ thường) của từng dòng, tạo khi tìm kiếm lần đầu
let searchTimer = null;
// Bit các file nguồn được chọn (theo DATA_SOURCES): kênh không có doanh thu nhưng có trong các file
// này vẫn được giữ khi bật "Hide channels without revenue". Giữ nguyên qua các lần import.
let keepSourceMask = 0;
// Footer chỉ tính lại khi dữ liệu đã lọc thay đổi, không phải mỗi lần đổi trang
let footerData = null;

// Lọc dữ liệu với phân trang
const getDataPaginated = (data, page) => {
    const offset = (page - 1) * pageSize;
    const limit = page * pageSize;
    return data.slice(offset, limit);
};

// Hàm highlightText để làm nổi bật các từ khóa trùng khớp mà không phân biệt chữ hoa/thường
// Trả về HTML đã escape, an toàn để chèn vào bảng
const highlightText = (text, searchTerm) => {
    const raw = String(text ?? "");
    if (!searchTerm) return escapeHtml(raw); // Nếu không có từ khóa tìm kiếm, trả lại văn bản gốc
    const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, "gi"); // Tạo biểu thức chính quy không phân biệt hoa thường
    // split với capture group: phần tử lẻ là đoạn trùng khớp
    return raw
        .split(regex)
        .map((part, i) =>
            i % 2 === 1
                ? `<span class="highlight">${escapeHtml(part)}</span>`
                : escapeHtml(part),
        )
        .join("");
};

const renderTable = (data, searchTerm = "") => {
    const tableBody = $("#table-body");

    // Kiểm tra nếu không có dữ liệu sau khi lọc
    if (data.length <= 0) {
        // Hiển thị thông báo không có dữ liệu
        $("#no-data-message").show();
        tableBody.html(""); // Xóa dữ liệu trong bảng
        return;
    } else {
        // Ẩn thông báo khi có dữ liệu
        $("#no-data-message").hide();
    }

    const tableBodyContent = data.map((item) => {
        const uc = item[TABLE_COLUMNS.CHANNEL_ID];
        const link = escapeHtml(item[TABLE_COLUMNS.CHANNEL_LINK]);

        // Highlight the matching terms in each column (convert to lowercase for comparison)
        const name = highlightText(
            item[TABLE_COLUMNS.CHANNEL_NAME],
            searchTerm
        );
        const usRevenue = formatAmount(
            item[TABLE_COLUMNS.US_REVENUE]);
        const taxWithholdingRate = formatNumber(
            item[TABLE_COLUMNS.TAX_WITHHOLDING_RATE],
            searchTerm
        );
        const taxWithHeldAmount = formatAmount(
            item[TABLE_COLUMNS.TAX_WITHHELD_AMOUNT]);
        const revenue = formatAmount(item[TABLE_COLUMNS.REVENUE]);
        const deductionAmount = formatAmount(
            item[TABLE_COLUMNS.DEDUCTION_AMOUNT]);
        const totalRevenue = formatAmount(
            item[TABLE_COLUMNS.TOTAL_REVENUE]);
        const note = item[TABLE_COLUMNS.NOTE] || "";

        // Note có thể gồm nhiều loại điều chỉnh (kèm tiền tệ): MONETIZATION DISABLED được ưu tiên tô màu
        let className = "";
        if (note.includes(ADJUSTMENT_TYPES.MONETIZATION_DISABLED.VALUE)) {
            className = ADJUSTMENT_TYPES.MONETIZATION_DISABLED.CLASS_NAME;
        } else if (note.includes(ADJUSTMENT_TYPES.CREDIT_APPEAL.VALUE)) {
            className = ADJUSTMENT_TYPES.CREDIT_APPEAL.CLASS_NAME;
        }

        // Dòng doanh thu không có kênh (Shorts Music Dynamic Pool, Audio Tier chưa gắn kênh) không có link
        const nameCell = link
            ? `<a href="${link}" target="_blank" rel="noopener noreferrer">${name}</a>`
            : `<span class="fst-italic">${name}</span>`;

        return `<tr>
                <td data-field="Channel ID" title="${escapeHtml(uc)}" class="${className}">
                    ${highlightText(uc, searchTerm)}
                </td>
                <td data-field="Name" class="${className}">
                    ${nameCell}
                </td>
                <td data-field="US Revenue" class="${className}">
                    ${usRevenue}
                </td>
                <td data-field="Tax Withholding Rate" class="${className}">
                    ${taxWithholdingRate}
                </td>
                <td data-field="Tax Withheld Amount" class="${className}">
                    ${taxWithHeldAmount}
                </td>
                <td data-field="Revenue" class="${className}">
                    ${revenue}
                </td>
                <td data-field="Deduction Amount" title="${escapeHtml(note)}" class="${className}">
                    ${deductionAmount}
                </td>
                <td data-field="Total Revenue" class="${className}">
                    ${totalRevenue}
                </td>
                <td data-field="Note" class="${className}">
                    ${escapeHtml(note)}
                </td>
            </tr>`;
    });
    tableBody.html(tableBodyContent.join(""));
};

const renderPagination = (totalData, currentPage) => {
    const pagination = $("#pagination");
    const totalPages = Math.ceil(totalData / pageSize); // Calculate total pages

    // Calculate start and end rows for the current page
    const startRow = (currentPage - 1) * pageSize + 1;
    const endRow = Math.min(currentPage * pageSize, totalData);

    // Update the row info message
    $("#row-info").html(
        `Showing <span class="fw-medium">${startRow}</span> to <span class="fw-medium">${endRow}</span> of <span class="fw-medium">${totalData}</span> rows`
    );

    // Number of pages around the current page to show
    const maxPagesToShow = 5;

    // Clear existing pagination links except previous/next buttons
    pagination
        .find(".page-item")
        .not(function () {
            const link = $(this).find("a");
            return link.is("#previous-page, #next-page");
        })
        .remove();

    // Create "Previous" button
    let previousButton = pagination.find("#previous-page").parent();
    if (!previousButton.length) {
        previousButton = $('<li class="page-item"></li>');
        previousButton.html(
            '<a class="page-link" href="#" id="previous-page">Previous</a>'
        );
    }
    if (currentPage === 1) {
        previousButton.addClass("disabled");
    } else {
        previousButton.removeClass("disabled");
    }
    pagination.find(".page-item:first").before(previousButton);

    // Calculate start and end pages for the pagination
    let startPage = Math.max(1, currentPage - maxPagesToShow);
    let endPage = Math.min(totalPages, currentPage + maxPagesToShow);

    // Add first page if needed
    if (startPage > 2) {
        pagination
            .find("#previous-page")
            .parent()
            .after('<li class="page-item"><a class="page-link">...</a></li>');
        pagination
            .find("#previous-page")
            .parent()
            .after(
                '<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>'
            );
    } else if (startPage === 2) {
        pagination
            .find("#previous-page")
            .parent()
            .after(
                '<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>'
            );
    }

    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
        const pageItem = $(`
            <li class="page-item ${i === currentPage ? "active" : ""}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `);
        pagination.find("#next-page").parent().before(pageItem);
    }

    // Add last page if needed
    if (endPage < totalPages - 1) {
        pagination
            .find("#next-page")
            .parent()
            .before('<li class="page-item"><a class="page-link">...</a></li>');
        pagination
            .find("#next-page")
            .parent()
            .before(
                `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`
            );
    } else if (endPage === totalPages - 1) {
        pagination
            .find("#next-page")
            .parent()
            .before(
                `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`
            );
    }

    // Create "Next" button
    const nextButton = pagination.find("#next-page").parent();
    if (currentPage === totalPages) {
        nextButton.addClass("disabled");
    } else {
        nextButton.removeClass("disabled");
    }
};

const renderFooter = (data) => {
    const footer = $("#table-footer");
    let totalUsRevenue = 0;
    let totalTaxWithheldAmount = 0;
    let totalRevenue = 0;
    let totalDeductionAmount = 0;
    let totalFinalRevenue = 0;

    data.forEach((item) => {
        totalUsRevenue += Number(item[TABLE_COLUMNS.US_REVENUE]) || 0;
        totalTaxWithheldAmount += Number(item[TABLE_COLUMNS.TAX_WITHHELD_AMOUNT]) || 0;
        totalRevenue += Number(item[TABLE_COLUMNS.REVENUE]) || 0;
        totalDeductionAmount += Number(item[TABLE_COLUMNS.DEDUCTION_AMOUNT]) || 0;
        totalFinalRevenue += Number(item[TABLE_COLUMNS.TOTAL_REVENUE]) || 0;
    });

    const footerContent = `
        <td class="bg-dark-subtle">Total: ${data.length} channel(s)</td>
        <td class="bg-dark-subtle"></td>
        <td class="bg-dark-subtle">${formatAmount(totalUsRevenue)}</td>
        <td class="bg-dark-subtle"></td>
        <td class="bg-dark-subtle">${formatAmount(totalTaxWithheldAmount)}</td>
        <td class="bg-dark-subtle">${formatAmount(totalRevenue)}</td>
        <td class="bg-dark-subtle">${formatAmount(totalDeductionAmount)}</td>
        <td class="bg-dark-subtle">${formatAmount(totalFinalRevenue)}</td>
        <td class="bg-dark-subtle"></td>
        `;
    footer.html(footerContent);
};

// Bảng tổng doanh thu theo nguồn (để đối chiếu với Payment summary của YouTube)
// elapsedMs: thời gian xử lý lần import (hiển thị cạnh tiêu đề)
const renderRevenueSummary = (revenueSummary, monthKey, elapsedMs) => {
    const container = $("#revenue-summary");

    const rows = revenueSummary.items
        .map(
            (item) => `<tr>
                <td>${escapeHtml(item.label)}</td>
                <td class="text-secondary text-break">${escapeHtml(item.file.name)}</td>
                <td class="text-end text-nowrap">${formatAmount(item.amount)}</td>
            </tr>`,
        )
        .join("");

    container.html(`
        <details class="border rounded-2 px-3 py-2" open>
            <summary class="fw-medium">
                Revenue by source ${escapeHtml(formatMonthKey(monthKey) || "")}:
                ${formatAmount(revenueSummary.total)} USD
                ${elapsedMs ? `<span class="fw-normal text-secondary small ms-2">imported in ${formatDuration(elapsedMs)}</span>` : ""}
            </summary>
            <table class="table table-sm mb-0 mt-2">
                <thead>
                    <tr>
                        <th>Source</th>
                        <th>File</th>
                        <th class="text-end">Partner Revenue (USD)</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot class="fw-semibold">
                    <tr>
                        <td>Total</td>
                        <td></td>
                        <td class="text-end text-nowrap">${formatAmount(revenueSummary.total)}</td>
                    </tr>
                </tfoot>
            </table>
        </details>
    `);
    container.removeClass("d-none");
};

// Function to change page
const changePage = (page) => {
    const paginatedData = getDataPaginated(filteredData, page); // Use filtered data
    renderTable(paginatedData, $("#search").val()); // Use search term to highlight
    if (footerData !== filteredData) {
        renderFooter(filteredData); // Update footer with filtered data
        footerData = filteredData;
    }
    renderPagination(filteredData.length, page);
    currentPage = page;
};

// Event listeners for pagination
$("#pagination").on("click", "a", function (e) {
    e.preventDefault();

    if ($(this).attr("id") === "previous-page" && currentPage > 1) {
        changePage(currentPage - 1);
    } else if (
        $(this).attr("id") === "next-page" &&
        currentPage < Math.ceil(filteredData.length / pageSize)
    ) {
        changePage(currentPage + 1);
    } else if ($(this).data("page")) {
        changePage(parseInt($(this).data("page")));
    }
});

// Kênh không có doanh thu: Total Revenue = 0 (bỏ qua sai số khi cộng trừ)
const hasRevenue = (item) => Math.abs(item[TABLE_COLUMNS.TOTAL_REVENUE]) >= 1e-9;

// Search functionality + lọc kênh không có doanh thu (dữ liệu sau lọc dùng cho cả bảng và Excel)
const applySearch = () => {
    const searchTerm = $("#search").val().toLowerCase();
    const hideZeroRevenue = $("#hide-zero-revenue").is(":checked");
    if (!searchTerm && !hideZeroRevenue) {
        filteredData = dataTableGlobal;
    } else {
        if (searchTerm) {
            // "\n" ngăn cách UC và tên để từ khoá không khớp vắt qua hai cột
            searchIndex ??= dataTableGlobal.map((item) =>
                `${item[TABLE_COLUMNS.CHANNEL_ID]}\n${item[TABLE_COLUMNS.CHANNEL_NAME]}`.toLowerCase(),
            );
        }
        filteredData = dataTableGlobal.filter(
            (item, index) =>
                (!hideZeroRevenue ||
                    hasRevenue(item) ||
                    (item.sourceMask & keepSourceMask) !== 0) &&
                (!searchTerm || searchIndex[index].includes(searchTerm)),
        );
    }

    // Reset to page 1 when search is done
    currentPage = 1;
    changePage(currentPage);
};

// Lọc sau khi ngừng gõ 250ms (lọc hàng trăm nghìn kênh sau mỗi phím gõ làm giật giao diện)
$("#search").on("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applySearch, 250);
});

// Menu "Keep from files": các nguồn có dữ liệu trong lần import, đánh dấu những nguồn đang được chọn
const renderKeepSources = (sources) => {
    $("#keep-sources-menu").html(
        sources.length
            ? sources
                  .map(
                      (source) => `<div class="form-check">
                    <input class="form-check-input keep-source" type="checkbox" value="${source.bit}"
                        id="keep-source-${source.bit}" ${keepSourceMask & source.bit ? "checked" : ""}>
                    <label class="form-check-label" for="keep-source-${source.bit}">
                        ${escapeHtml(source.label)}
                        <span class="d-block small text-secondary text-break">${escapeHtml(source.fileName)}</span>
                    </label>
                </div>`,
                  )
                  .join("")
            : `<span class="small text-secondary">Import data first.</span>`,
    );
    updateKeepSourcesButton();
};

// Nút chỉ dùng được khi bật ẩn kênh không có doanh thu; hiện số nguồn đang được chọn
const updateKeepSourcesButton = () => {
    const selected = $("#keep-sources-menu .keep-source:checked").length;
    $("#keep-sources-button")
        .prop("disabled", !$("#hide-zero-revenue").is(":checked"))
        .text(selected ? `Keep from files (${selected})` : "Keep from files");
};

$("#keep-sources-menu").on("change", ".keep-source", function () {
    const bit = Number(this.value);
    keepSourceMask = this.checked ? keepSourceMask | bit : keepSourceMask & ~bit;
    updateKeepSourcesButton();
    applySearch();
});

$("#hide-zero-revenue").on("change", () => {
    updateKeepSourcesButton();
    applySearch();
});

// Initial render
changePage(currentPage);
renderKeepSources([]);

// Export
$("#export").on("click", async function () {
    const exportBtn = $(this);
    const label = exportBtn.html();
    // Tránh bấm nhiều lần khi đang xuất file lớn; hiện % tiến độ ngay trên nút
    exportBtn.prop("disabled", true).html(
        `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
         <span role="status">Exporting 0%</span>`,
    );
    const fileName =
        exportFileName && $("#search").val()
            ? `${exportFileName}_filtered`
            : exportFileName;
    try {
        await exportExcel(filteredData, fileName, (done, total) => {
            // Tạo xong dữ liệu sheet: còn chờ nén nốt phần cuối
            const text =
                done >= total
                    ? "Finishing..."
                    : `Exporting ${Math.floor((done / total) * 100)}%`;
            exportBtn.find("[role=status]").text(text);
        });
    } catch (error) {
        console.error("Export failed:", error);
        alert(`Export failed: ${error.message}`);
    }
    exportBtn.prop("disabled", false).html(label);
});

// Hàm đặt lại dữ liệu, tìm kiếm và phân trang
// options.exportFileName: tên file Excel (không gồm đuôi) cho dữ liệu này
// options.sources: các file nguồn của lần import (menu "Keep from files")
const resetData = (
    initialData,
    { exportFileName: fileName = null, sources = [] } = {},
) => {
    // Đặt lại dataTableGlobal về dữ liệu ban đầu
    dataTableGlobal = initialData;
    exportFileName = fileName;
    renderKeepSources(sources);
    searchIndex = null;

    // Đặt lại từ khóa tìm kiếm (clear input)
    clearTimeout(searchTimer);
    $("#search").val("");

    // Lọc lại theo checkbox "Hide channels without revenue", về trang 1 và hiển thị lại
    applySearch();

    // // Scroll đến phần tử có id "table-wrapper"
    // $("html, body").animate(
    //     {
    //         scrollTop: $("#table-wrapper").offset().top,
    //     },
    //     500
    // ); // Cuộn trang đến phần tử với hiệu ứng trong 500ms
};
