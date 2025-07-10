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
        const revenue = formatNumber(
            item[TABLE_COLUMNS.ADS_ADJUSTMENTS_REVENUE],
            searchTerm
        );
        const adsRevenue = formatNumber(
            item[TABLE_COLUMNS.ADS_REVENUE],
            searchTerm
        );
        const paidFeatures = formatNumber(
            item[TABLE_COLUMNS.PAID_FEATURES],
            searchTerm
        );
        const subscriptionRed = formatNumber(
            item[TABLE_COLUMNS.SUBSCRIPTION_REVENUE_RED],
            searchTerm
        );
        const subscriptionRedMusic = formatNumber(
            item[TABLE_COLUMNS.SUBSCRIPTION_REVENUE_RED_MUSIC],
            searchTerm
        );
        const youtubeShortsAds = formatNumber(
            item[TABLE_COLUMNS.YOUTUBE_SHORTS_ADS],
            searchTerm
        );
        const youtubeShortsSubscription = formatNumber(
            item[TABLE_COLUMNS.YOUTUBE_SHORTS_SUBSCRIPTION],
            searchTerm
        );
        const totalRevenue = formatNumber(
            item[TABLE_COLUMNS.TOTAL_REVENUE],
            searchTerm
        );

        return `<tr>
                <td data-field="Channel ID" data-width="300" title="${uc}">
                    ${highlightText(uc, searchTerm)}
                </td>
                <td data-field="Name" data-width="300">
                    <a href="${link}" target="_blank">
                        ${name}
                    </a>
                </td>
                <td data-field="Ads Adjustments Revenue" data-width="200">
                    ${revenue}
                </td>
                <td data-field="Ads Revenue" data-width="200">
                    ${adsRevenue}
                </td>
                <td data-field="Paid Features" data-width="200">
                    ${paidFeatures}
                </td>
                <td data-field="Subscription Revenue Red" data-width="200">
                    ${subscriptionRed}
                </td>
                <td
                    data-field="Subscription Revenue Red Music"
                    data-width="200"
                >
                    ${subscriptionRedMusic}
                </td>
                <td data-field="Youtube Shorts Ads" data-width="200">
                    ${youtubeShortsAds}
                </td>
                <td data-field="Youtube Shorts Subscription" data-width="200">
                    ${youtubeShortsSubscription}
                </td>
                <td data-field="Total Revenue" data-width="200">
                    ${totalRevenue}
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

// Function to change page
const changePage = (page) => {
    const paginatedData = getDataPaginated(filteredData, page); // Use filtered data
    renderTable(paginatedData, $("#search").val()); // Use search term to highlight
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
