let dataTableGlobal = []; // Dữ liệu toàn bộ
let filteredData = dataTableGlobal; // Dữ liệu đã lọc (ban đầu bằng toàn bộ dữ liệu)

const pageSize = 30;
let currentPage = 1;

// Lọc dữ liệu với phân trang
const getDataPaginated = (data, page) => {
    const offset = (page - 1) * pageSize;
    const limit = page * pageSize;
    return data.slice(offset, limit);
};

// Hàm highlightText để làm nổi bật các từ khóa trùng khớp mà không phân biệt chữ hoa/thường
const highlightText = (text, searchTerm) => {
    if (!searchTerm) return text; // Nếu không có từ khóa tìm kiếm, trả lại văn bản gốc
    const regex = new RegExp(`(${searchTerm})`, "gi"); // Tạo biểu thức chính quy không phân biệt hoa thường
    return text.replace(regex, '<span class="highlight">$1</span>'); // Bao quanh từ trùng khớp với thẻ <span>
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
        const link = item[TABLE_COLUMNS.CHANNEL_LINK];

        // Highlight the matching terms in each column (convert to lowercase for comparison)
        const name = highlightText(
            item[TABLE_COLUMNS.CHANNEL_NAME],
            searchTerm
        );
        const usRevenue = formatNumber(
            item[TABLE_COLUMNS.US_REVENUE],
            searchTerm
        );
        const taxWithholdingRate = formatNumber(
            item[TABLE_COLUMNS.TAX_WITHHOLDING_RATE],
            searchTerm
        );
        const taxWithHeldAmount = formatNumber(
            item[TABLE_COLUMNS.TAX_WITHHELD_AMOUNT],
            searchTerm
        );
        const revenue = formatNumber(item[TABLE_COLUMNS.REVENUE], searchTerm);
        const deductionAmount = formatNumber(
            item[TABLE_COLUMNS.DEDUCTION_AMOUNT],
            searchTerm
        );
        const totalRevenue = formatNumber(
            item[TABLE_COLUMNS.TOTAL_REVENUE],
            searchTerm
        );
        const note = item[TABLE_COLUMNS.NOTE] || "";

        let className = "";

        switch (note) {
            case ADJUSTMENT_TYPES.MONETIZATION_DISABLED.VALUE:
                className = ADJUSTMENT_TYPES.MONETIZATION_DISABLED.CLASS_NAME;
                break;
            case ADJUSTMENT_TYPES.CREDIT_APPEAL.VALUE:
                className = ADJUSTMENT_TYPES.CREDIT_APPEAL.CLASS_NAME;
                break;
            default:
                className = "";
        }

        return `<tr>
                <td data-field="Channel ID" title="${uc}" class="${className}">
                    ${highlightText(uc, searchTerm)}
                </td>
                <td data-field="Name" class="${className}">
                    <a href="${link}" target="_blank">
                        ${name}
                    </a>
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
                <td data-field="Deduction Amount" title="${note}" class="${className}">
                    ${deductionAmount}
                </td>
                <td data-field="Total Revenue" class="${className}">
                    ${totalRevenue}
                </td>
                <td data-field="Note" class="${className}">
                    ${note}
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
        totalTaxWithheldAmount +=
            Number(item[TABLE_COLUMNS.TAX_WITHHELD_AMOUNT]) || 0;
        totalTaxWithheldAmount +=
            Number(item[TABLE_COLUMNS.TAX_WITHHELD_AMOUNT]) || 0;
        totalTaxWithheldAmount +=
            Number(item[TABLE_COLUMNS.TAX_WITHHELD_AMOUNT]) || 0;
        totalDeductionAmount +=
            Number(item[TABLE_COLUMNS.DEDUCTION_AMOUNT]) || 0;
        totalFinalRevenue += Number(item[TABLE_COLUMNS.TOTAL_REVENUE]) || 0;
    });

    const footerContent = `
        <td class="bg-dark-subtle">Total: ${data.length} channel(s)</td>
        <td class="bg-dark-subtle"></td>
        <td class="bg-dark-subtle">${formatNumber(totalUsRevenue)}</td>
        <td class="bg-dark-subtle"></td>
        <td class="bg-dark-subtle">${formatNumber(totalTaxWithheldAmount)}</td>
        <td class="bg-dark-subtle">${formatNumber(totalRevenue)}</td>
        <td class="bg-dark-subtle">${formatNumber(totalDeductionAmount)}</td>
        <td class="bg-dark-subtle">${formatNumber(totalFinalRevenue)}</td>
        <td class="bg-dark-subtle"></td>
        `;
    footer.html(footerContent);
};

// Function to change page
const changePage = (page) => {
    const paginatedData = getDataPaginated(filteredData, page); // Use filtered data
    renderTable(paginatedData, $("#search").val()); // Use search term to highlight
    renderFooter(filteredData); // Update footer with filtered data
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

// Search functionality
$("#search").on("input", function () {
    const searchTerm = $(this).val().toLowerCase();
    filteredData = dataTableGlobal.filter((item) => {
        const valUc = item[TABLE_COLUMNS.CHANNEL_ID];
        const valName = item[TABLE_COLUMNS.CHANNEL_NAME];
        return (
            String(valUc).toLowerCase().includes(searchTerm) ||
            String(valName).toLowerCase().includes(searchTerm)
        );
    });

    // Reset to page 1 when search is done
    currentPage = 1;
    changePage(currentPage);
});

// Initial render
changePage(currentPage);

// Export
$("#export").on("click", function () {
    exportExcel(filteredData);
});

// Hàm đặt lại dữ liệu, tìm kiếm và phân trang
const resetData = (initialData) => {
    // Đặt lại dataTableGlobal về dữ liệu ban đầu
    dataTableGlobal = initialData;

    // Đặt lại từ khóa tìm kiếm (clear input)
    $("#search").val("");

    // Đặt lại filteredData bằng dữ liệu ban đầu
    filteredData = dataTableGlobal;

    // Đặt lại trang hiện tại về 1
    currentPage = 1;

    // Hiển thị lại dữ liệu và phân trang
    changePage(currentPage);

    // // Scroll đến phần tử có id "table-wrapper"
    // $("html, body").animate(
    //     {
    //         scrollTop: $("#table-wrapper").offset().top,
    //     },
    //     500
    // ); // Cuộn trang đến phần tử với hiệu ứng trong 500ms
};
