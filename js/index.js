// Trigger validation on file change and form submit
$("#csv-form").on("change", 'input[type="file"]', function () {
    const inputId = $(this).attr("id");
    const errorId = inputId + "-error"; // Error element id is based on input id
    validateCsvFile(inputId, errorId);
    // validateFileInput(inputId, errorId);
});

// Scan files when selected for Auto Import
$("#file-list").on("change", function () {
    const files = Array.from(this.files);
    if (files.length === 0) {
        $("#auto-file-details").addClass("d-none");
        return;
    }

    // Extract unique months
    const months = new Set();
    files.forEach((f) => {
        const key = extractMonthKey(f.name);
        if (key) months.add(key);
    });

    const monthSelect = $("#month-select");
    monthSelect.empty();
    
    // Sort descending
    const sortedMonths = Array.from(months).sort().reverse();
    
    sortedMonths.forEach((m) => {
        monthSelect.append(`<option value="${m}">${formatMonthKey(m)}</option>`);
    });

    if (sortedMonths.length > 0) {
        $("#auto-file-details").removeClass("d-none");
        monthSelect.trigger("change"); // Populates file list preview
    } else {
        $("#auto-file-details").addClass("d-none");
    }
});

// Update preview list on month select
$("#month-select").on("change", function () {
    const selectedMonth = $(this).val();
    if (!selectedMonth) return;

    const filesObj = getFormAutoFiles();

    const processedList = $("#processed-files-list");
    processedList.empty();

    if (!filesObj) return;

    const items = [
        { label: "Shorts Subscription", file: filesObj.youtubeShortsSubscriptionFile, rule: RULES.YOUTUBE_SHORTS_SUBSCRIPTION },
        { label: "Shorts Ads", file: filesObj.youtubeShortsAdsFile, rule: RULES.YOUTUBE_SHORTS_ADS },
        { label: "Subscription Red Music", file: filesObj.subscriptionRevenueRedMusicFile, rule: RULES.SUBSCRIPTION_REVENUE_RED_MUSIC },
        { label: "Subscription Red", file: filesObj.subscriptionRevenueRedFile, rule: RULES.SUBSCRIPTION_REVENUE_RED },
        { label: "Paid Features", file: filesObj.paidFeaturesFile, rule: RULES.PAID_FEATURES },
        { label: "Ads Adjustments", file: filesObj.adsAdjustmentsRevenueFile, rule: RULES.ADS_ADJUSTMENTS_REVENUE },
        { label: "Ads Revenue", file: filesObj.adsRevenueFile, rule: RULES.ADS_REVENUE },
        { label: "Custom Adjustments", file: filesObj.customAdjustmentsFile, rule: RULES.CUSTOM_ADJUSMENTS },
        { label: "Affiliate Summary", file: filesObj.affiliatePaymentSummaryFile, rule: RULES.AFFILIATE_PAYMENT_SUMMARY }
    ];

    items.forEach((item) => {
        let ruleHtml = '';
        if (item.rule) {
            // Convert regex array to readable strings
            const req = (item.rule.requiredAny || []).filter(Boolean).map(r => String(r).replace(/</g, "&lt;").replace(/>/g, "&gt;")).join(" <span class='text-primary fw-bold'>OR</span> ");
            const forbidden = (item.rule.forbidden || []).filter(Boolean).map(r => String(r).replace(/</g, "&lt;").replace(/>/g, "&gt;")).join(", ");
            ruleHtml = `<details class="mt-2" style="font-size: 0.75rem; line-height: 1.2;">
                <summary class="text-secondary opacity-75 fw-medium user-select-none text-decoration-underline" style="cursor: pointer;">View matching rules</summary>
                <div class="mt-1 ms-2 p-2 bg-light border rounded">
                    <div class="text-muted"><strong class="text-secondary">Match:</strong> ${req}</div>
                    ${forbidden ? `<div class="text-muted mt-1"><strong class="text-secondary">Exclude:</strong> ${forbidden}</div>` : ''}
                </div>
            </details>`;
        }

        if (item.file) {
             processedList.append(`<li class="list-group-item text-success"><i class="bi bi-check-circle-fill me-2"></i><strong>${item.label}:</strong> <span class="text-dark">${item.file.name}</span>${ruleHtml}</li>`);
        } else {
             processedList.append(`<li class="list-group-item text-danger text-opacity-50"><i class="bi bi-x-circle-fill me-2"></i><strong>${item.label}:</strong> <span class="fst-italic">Not found</span>${ruleHtml}</li>`);
        }
    });
});

const getFormManualFiles = () => {
    // Reset lỗi trước khi kiểm tra
    $(".error-message").text("");
    $("input[type='file']").removeClass("is-invalid is-valid");

    let validateSuccess = true;

    const validateFile = (fileInputId, errorMessageId) => {
        const file = $("#" + fileInputId)[0].files[0];
        const errorMessage = $("#" + errorMessageId);
        const fileInput = $("#" + fileInputId);

        if (file && !file.name.endsWith(".csv")) {
            errorMessage.text("Please select a valid csv file.");
            fileInput.addClass("is-invalid");
            validateSuccess = false;
        }

        // if (!file) {
        //     errorMessage.text("Please select a csv file.");
        //     fileInput.addClass("is-invalid");
        //     validateSuccess = false;
        // } else if (!file.name.endsWith(".csv")) {
        //     errorMessage.text("Please select a valid csv file.");
        //     fileInput.addClass("is-invalid");
        //     validateSuccess = false;
        // } else {
        //     errorMessage.text("");
        //     fileInput.removeClass("is-invalid").addClass("is-valid");
        // }

        return file;
    };

    const adsAdjustmentsRevenueFile = validateFile(
        "ads-adjustments-revenue",
        "ads-adjustments-revenue-error"
    );
    const adsRevenueFile = validateFile("ads-revenue", "ads-revenue-error");
    const paidFeaturesFile = validateFile(
        "paid-features",
        "paid-features-error"
    );
    const subscriptionRevenueRedFile = validateFile(
        "subscription-revenue-red",
        "subscription-revenue-red-error"
    );
    const subscriptionRevenueRedMusicFile = validateFile(
        "subscription-revenue-red-music",
        "subscription-revenue-red-music-error"
    );
    const youtubeShortsAdsFile = validateFile(
        "youtube-shorts-ads",
        "youtube-shorts-ads-error"
    );
    const youtubeShortsSubscriptionFile = validateFile(
        "youtube-shorts-subscription",
        "youtube-shorts-subscription-error"
    );

    if (!validateSuccess) {
        return;
    }

    return {
        adsAdjustmentsRevenueFile,
        adsRevenueFile,
        paidFeaturesFile,
        subscriptionRevenueRedFile,
        subscriptionRevenueRedMusicFile,
        youtubeShortsAdsFile,
        youtubeShortsSubscriptionFile,
    };
};

const getAllCsvData = async (values) => {
    const dataAdsAdjustmentsRevenue = await getCsvData(
        values.adsAdjustmentsRevenueFile,
        {
            id: CSV_COLUMNS.CHANNEL_ID,
            name: CSV_COLUMNS.CHANNEL_DISPLAY_NAME,
            revenue: CSV_COLUMNS.PARTNER_REVENUE,
        },
        CSV_COLUMNS.CHANNEL_ID
    );

    const dataAdsRevenue = await getCsvData(
        values.adsRevenueFile,
        {
            id: CSV_COLUMNS.CHANNEL_ID,
            name: CSV_COLUMNS.CHANNEL_DISPLAY_NAME,
            revenue: CSV_COLUMNS.PARTNER_REVENUE,
        },
        CSV_COLUMNS.CHANNEL_ID
    );

    const dataPaidFeatures = await getCsvData(
        values.paidFeaturesFile,
        {
            id: CSV_COLUMNS.CHANNEL_ID,
            name: CSV_COLUMNS.CHANNEL_DISPLAY_NAME,
            revenue: CSV_COLUMNS.EARNINGS,
        },
        CSV_COLUMNS.CHANNEL_ID
    );

    const dataSubscriptionRevenueRed = await getCsvData(
        values.subscriptionRevenueRedFile,
        {
            id: CSV_COLUMNS.CHANNEL_ID,
            name: CSV_COLUMNS.CHANNEL_DISPLAY_NAME,
            revenue: CSV_COLUMNS.PARTNER_REVENUE,
        },
        CSV_COLUMNS.CHANNEL_ID
    );

    const dataSubscriptionRevenueRedMusic = await getCsvData(
        values.subscriptionRevenueRedMusicFile,
        {
            id: CSV_COLUMNS.CHANNEL_ID,
            name: CSV_COLUMNS.CHANNEL_DISPLAY_NAME,
            revenue: CSV_COLUMNS.PARTNER_REVENUE,
        },
        CSV_COLUMNS.CHANNEL_ID
    );

    const dataYoutubeShortsAds = await getCsvData(
        values.youtubeShortsAdsFile,
        {
            id: CSV_COLUMNS.CHANNEL_ID,
            name: CSV_COLUMNS.CHANNEL_DISPLAY_NAME,
            revenue: CSV_COLUMNS.NET_PARTNER_REVENUE,
        },
        CSV_COLUMNS.CHANNEL_ID
    );

    const dataYoutubeShortsSubscription = await getCsvData(
        values.youtubeShortsSubscriptionFile,
        {
            id: CSV_COLUMNS.CHANNEL_ID,
            name: CSV_COLUMNS.CHANNEL_DISPLAY_NAME,
            revenue: CSV_COLUMNS.PARTNER_REVENUE,
        },
        CSV_COLUMNS.CHANNEL_ID
    );

    const dataCustomAdjustments = await getCsvData(
        values.customAdjustmentsFile,
        {
            id: CSV_COLUMNS.CHANNEL_ID,
            adjustmentType: CSV_COLUMNS.ADJUSTMENT_TYPE,
            deductionAmount: CSV_COLUMNS.DEDUCTION_AMOUNT,
        },
        CSV_COLUMNS.CHANNEL_ID
    );

    const dataAffiliatePaymentSummary = await getCsvData(
        values.affiliatePaymentSummaryFile,
        {
            id: CSV_COLUMNS.CHANNEL_ID,
            usSourcedRevenue: CSV_COLUMNS.US_SOURECED_REVENUE,
            taxWithholdingRate: CSV_COLUMNS.TAX_WITHHOLDING_RATE,
            taxWithheldAmount: CSV_COLUMNS.TAX_WITHHELD_AMOUNT,
            localCurrency: CSV_COLUMNS.LOCAL_CURRENCY,
        },
        CSV_COLUMNS.CHANNEL_ID
    );

    return {
        dataAdsAdjustmentsRevenue,
        dataAdsRevenue,
        dataPaidFeatures,
        dataSubscriptionRevenueRed,
        dataSubscriptionRevenueRedMusic,
        dataYoutubeShortsAds,
        dataYoutubeShortsSubscription,
        dataCustomAdjustments,
        dataAffiliatePaymentSummary,
    };
};

const getNewCellData = (channelId, channelName) => {
    return {
        [TABLE_COLUMNS.CHANNEL_ID]: channelId,
        [TABLE_COLUMNS.CHANNEL_NAME]: channelName,
        [TABLE_COLUMNS.US_REVENUE]: 0,
        [TABLE_COLUMNS.TAX_WITHHOLDING_RATE]: 0,
        [TABLE_COLUMNS.TAX_WITHHELD_AMOUNT]: 0,
        [TABLE_COLUMNS.REVENUE]: 0,
        [TABLE_COLUMNS.DEDUCTION_AMOUNT]: 0,
        [TABLE_COLUMNS.TOTAL_REVENUE]: 0,
        [TABLE_COLUMNS.NOTE]: "",
    };
};

const processRevenueData = (data, revenueColumn, tableData) => {
    data.forEach((item) => {
        const { channelId, channelName, channelRev } = item;
        let value = tableData.get(channelId);

        if (!value) {
            value = getNewCellData(channelId, channelName);
        }

        value[revenueColumn] += channelRev;
        value[TABLE_COLUMNS.TOTAL_REVENUE] += channelRev;

        tableData.set(channelId, value);
    });
};

const processDeductionData = (data, tableData) => {
    data.forEach((item) => {
        const { channelId, channelAdjustmentType, channelDeductionAmount } =
            item;
        let value = tableData.get(channelId);
        let deductionAmount = channelDeductionAmount;

        if (!value) {
            value = getNewCellData(channelId, "");
        }

        if (
            channelAdjustmentType ===
            ADJUSTMENT_TYPES.MONETIZATION_DISABLED.VALUE
        ) {
            deductionAmount = channelDeductionAmount * -1;
        }
        // if (channelAdjustmentType === ADJUSTMENT_TYPES.CREDIT_APPEAL.VALUE) {
        value[TABLE_COLUMNS.TOTAL_REVENUE] += deductionAmount;
        // }

        value[TABLE_COLUMNS.NOTE] = channelAdjustmentType;
        value[TABLE_COLUMNS.DEDUCTION_AMOUNT] += deductionAmount;
    });
};

const processAffiliatePaymentData = (data, tableData) => {
    data.forEach((item) => {
        const {
            channelId,
            channelUsSourcedRevenue,
            channelTaxWithholdingRate,
            channelTaxWithheldAmount,
            channelLocalCurrency,
            fileName,
        } = item;
        let value = tableData.get(channelId);

        if (!value) {
            value = getNewCellData(channelId, "");
        }

        value[TABLE_COLUMNS.US_REVENUE] += channelUsSourcedRevenue;
        value[TABLE_COLUMNS.TAX_WITHHOLDING_RATE] = channelTaxWithholdingRate;
        value[TABLE_COLUMNS.TAX_WITHHELD_AMOUNT] += channelTaxWithheldAmount;
    });
};

const convertTableData = (allCsvData) => {
    const {
        dataAdsAdjustmentsRevenue,
        dataAdsRevenue,
        dataPaidFeatures,
        dataSubscriptionRevenueRed,
        dataSubscriptionRevenueRedMusic,
        dataYoutubeShortsAds,
        dataYoutubeShortsSubscription,
        dataCustomAdjustments,
        dataAffiliatePaymentSummary,
    } = allCsvData;

    // Check for Local Currency mismatches across all files
    const nonUsdFiles = new Map(); // using map to avoid duplicates and store currency
    Object.values(allCsvData).forEach(dataset => {
        if (!dataset) return;
        dataset.forEach(row => {
            if (row.channelLocalCurrency && row.channelLocalCurrency !== "USD") {
                nonUsdFiles.set(row.fileName, row.channelLocalCurrency);
            }
        });
    });

    if (nonUsdFiles.size > 0) {
        const fileAlerts = Array.from(nonUsdFiles.entries()).map(([fName, currency]) => {
            return `<li><strong>${fName}</strong> (Currency: ${currency})</li>`;
        }).join('');

        const alertHtml = `
            <div class="alert alert-warning alert-dismissible fade show mb-0" role="alert">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>Currency Mismatch Detected:</strong> The following processing files contain a Local Currency different from USD. Resulting amounts might be inaccurate:
                <ul class="mt-2 mb-0">${fileAlerts}</ul>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        $("#alert-container").append(alertHtml);
    }

    const tableData = new Map();

    // Ads Adjustments Revenue
    processRevenueData(
        dataAdsAdjustmentsRevenue,
        TABLE_COLUMNS.REVENUE,
        tableData
    );

    // Ads Revenue
    processRevenueData(dataAdsRevenue, TABLE_COLUMNS.REVENUE, tableData);

    // Paid Features
    processRevenueData(dataPaidFeatures, TABLE_COLUMNS.REVENUE, tableData);

    // Subscription Revenue Red
    processRevenueData(
        dataSubscriptionRevenueRed,
        TABLE_COLUMNS.REVENUE,
        tableData
    );

    // Subscription Revenue Red Music
    processRevenueData(
        dataSubscriptionRevenueRedMusic,
        TABLE_COLUMNS.REVENUE,
        tableData
    );

    // YouTube Shorts Ads
    processRevenueData(dataYoutubeShortsAds, TABLE_COLUMNS.REVENUE, tableData);

    // YouTube Shorts Subscription
    processRevenueData(
        dataYoutubeShortsSubscription,
        TABLE_COLUMNS.REVENUE,
        tableData
    );

    // Custom Adjustments - Deduction Amount
    processDeductionData(dataCustomAdjustments, tableData);

    // Affiliate Payment Summary
    processAffiliatePaymentData(dataAffiliatePaymentSummary, tableData);

    const result = Array.from(tableData, ([_, value]) => {
        value[TABLE_COLUMNS.US_REVENUE] =
            value[TABLE_COLUMNS.US_REVENUE].toFixed(2);
        value[TABLE_COLUMNS.TAX_WITHHELD_AMOUNT] =
            value[TABLE_COLUMNS.TAX_WITHHELD_AMOUNT].toFixed(2);
        value[TABLE_COLUMNS.REVENUE] = value[TABLE_COLUMNS.REVENUE].toFixed(2);
        value[TABLE_COLUMNS.DEDUCTION_AMOUNT] =
            value[TABLE_COLUMNS.DEDUCTION_AMOUNT].toFixed(2);
        value[TABLE_COLUMNS.TOTAL_REVENUE] =
            value[TABLE_COLUMNS.TOTAL_REVENUE].toFixed(2);

        return {
            ...value,
            [TABLE_COLUMNS.CHANNEL_LINK]: getYouTubeChannelLink(
                value[TABLE_COLUMNS.CHANNEL_ID]
            ),
        };
    });
    return result.toSorted(
        (a, b) =>
            b[TABLE_COLUMNS.TOTAL_REVENUE] - a[TABLE_COLUMNS.TOTAL_REVENUE]
    );
};

const onSubmitManual = async (e) => {
    e.preventDefault(); // Prevent the form from submitting

    $("#alert-container").empty(); // Clear old alerts
    showLoading(BUTTON_SUBMIT_MANUAL_ID);

    try {
        const values = getFormManualFiles();
        if (!values) {
            hideLoading(BUTTON_SUBMIT_MANUAL_ID);
            return;
        }

        const allCsvData = await getAllCsvData(values);
        console.log("allCsvData:", allCsvData);
        const tableData = convertTableData(allCsvData);

        resetData(tableData);
        // resetData(dataTable);

        // Đóng modal sau khi xử lý thành công
        $(`#${MODAL_MANUAL_ID}`).modal("hide");
    } catch (error) {
        console.log("error:", error);
    }

    hideLoading(BUTTON_SUBMIT_MANUAL_ID);
};

const submitManualBtn = getSubmitBtn(BUTTON_SUBMIT_MANUAL_ID);
submitManualBtn.on("click", onSubmitManual);

// Auto Submit
const getFormAutoFiles = () => {
    const input = $("#file-list")[0];
    if (!input || !input.files || input.files.length === 0) return;

    let fileList = Array.from(input.files);

    const selectedMonth = $("#month-select").val();
    if (selectedMonth) {
        fileList = fileList.filter((f) => extractMonthKey(f.name) === selectedMonth);
    }

    const youtubeShortsSubscriptionFile = pickBestByRule(
        fileList,
        RULES.YOUTUBE_SHORTS_SUBSCRIPTION
    );
    const youtubeShortsAdsFile = pickBestByRule(
        fileList,
        RULES.YOUTUBE_SHORTS_ADS
    );
    const subscriptionRevenueRedMusicFile = pickBestByRule(
        fileList,
        RULES.SUBSCRIPTION_REVENUE_RED_MUSIC
    );
    const subscriptionRevenueRedFile = pickBestByRule(
        fileList,
        RULES.SUBSCRIPTION_REVENUE_RED
    );
    const paidFeaturesFile = pickBestByRule(fileList, RULES.PAID_FEATURES);
    const adsAdjustmentsRevenueFile = pickBestByRule(
        fileList,
        RULES.ADS_ADJUSTMENTS_REVENUE
    );
    const adsRevenueFile = pickBestByRule(fileList, RULES.ADS_REVENUE);
    const customAdjustmentsFile = pickBestByRule(
        fileList,
        RULES.CUSTOM_ADJUSMENTS
    );
    const affiliatePaymentSummaryFile = pickBestByRule(
        fileList,
        RULES.AFFILIATE_PAYMENT_SUMMARY
    );

    return {
        adsAdjustmentsRevenueFile,
        adsRevenueFile,
        paidFeaturesFile,
        subscriptionRevenueRedFile,
        subscriptionRevenueRedMusicFile,
        youtubeShortsAdsFile,
        youtubeShortsSubscriptionFile,
        customAdjustmentsFile,
        affiliatePaymentSummaryFile,
    };
};

const onSubmitAuto = async (e) => {
    e.preventDefault(); // Prevent the form from submitting

    $("#alert-container").empty(); // Clear old alerts
    showLoading(BUTTON_SUBMIT_AUTO_ID);

    try {
        const values = getFormAutoFiles();
        console.log("File list:", values);
        if (!values) {
            hideLoading(BUTTON_SUBMIT_AUTO_ID);
            return;
        }

        const allCsvData = await getAllCsvData(values);
        console.log("allCsvData:", allCsvData);
        const tableData = convertTableData(allCsvData);

        resetData(tableData);
        // resetData(dataTable);

        // Đóng modal sau khi xử lý thành công
        $(`#${MODAL_AUTO_ID}`).modal("hide");
    } catch (error) {
        console.log("error:", error);
    }

    hideLoading(BUTTON_SUBMIT_AUTO_ID);
};

const submitAutoBtn = getSubmitBtn(BUTTON_SUBMIT_AUTO_ID);
submitAutoBtn.on("click", onSubmitAuto);
