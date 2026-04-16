// Store current files to prevent clearing on cancel
const currentFiles = {};
$(document).on("click", 'input[type="file"]', function () {
    currentFiles[this.id] = this.files;
});

// Trigger validation on file change and form submit
$("#csv-form").on("change", 'input[type="file"]', function () {
    if (
        this.files.length === 0 &&
        currentFiles[this.id] &&
        currentFiles[this.id].length > 0
    ) {
        this.files = currentFiles[this.id];
    }

    const inputId = $(this).attr("id");
    const errorId = inputId + "-error"; // Error element id is based on input id
    validateCsvFile(inputId, errorId);
    // validateFileInput(inputId, errorId);
});

// Scan files when selected for Auto Import
let currentDirectoryHandle = null;
let folderFileHandles = [];
let folderFiles = [];

$("#btn-select-folder").on("click", async function () {
    try {
        const dirHandle = await window.showDirectoryPicker({
            id: 'youtube-report-folder',
            mode: 'readwrite'
        });
        currentDirectoryHandle = dirHandle;
        
        folderFileHandles = [];
        folderFiles = [];
        
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.csv')) {
                folderFileHandles.push(entry);
                const file = await entry.getFile();
                file.handle = entry; // Store handle to allow deletion
                folderFiles.push(file);
            }
        }
        
        $("#folder-path").text(`Selected folder: ${dirHandle.name} (${folderFiles.length} CSV files found)`);
        $("#file-list-error").text("");
        
        processFolderFiles(folderFiles);
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error(err);
            $("#file-list-error").text("Error accessing folder. Or browser does not support this feature.");
        }
    }
});

function processFolderFiles(files) {
    if (files.length === 0) {
        $("#auto-file-details").addClass("d-none");
        return;
    }

    // Extract unique months only from files that match at least one rule
    const allRules = Object.values(RULES);
    const months = new Set();
    files.forEach((f) => {
        const matchesAnyRule = allRules.some((rule) =>
            matchesRule(f.name, rule),
        );
        if (!matchesAnyRule) return;
        const key = extractMonthKey(f.name);
        if (key) months.add(key);
    });

    const monthSelect = $("#month-select");
    monthSelect.empty();

    // Sort descending
    const sortedMonths = Array.from(months).sort().reverse();

    sortedMonths.forEach((m) => {
        monthSelect.append(
            `<option value="${m}">${formatMonthKey(m)}</option>`,
        );
    });

    if (sortedMonths.length > 0) {
        $("#auto-file-details").removeClass("d-none");
        monthSelect.trigger("change"); // Populates file list preview
    } else {
        $("#auto-file-details").addClass("d-none");
    }
}

// Update preview list on month select
$("#month-select").on("change", function () {
    const selectedMonth = $(this).val();
    if (!selectedMonth) return;

    const filesObj = getFormAutoFiles();

    const processedList = $("#processed-files-list");
    processedList.empty();

    if (!filesObj) return;

    const items = [
        {
            label: "Shorts Subscription",
            file: filesObj.youtubeShortsSubscriptionFile,
            rule: RULES.YOUTUBE_SHORTS_SUBSCRIPTION,
        },
        {
            label: "Shorts Ads",
            file: filesObj.youtubeShortsAdsFile,
            rule: RULES.YOUTUBE_SHORTS_ADS,
        },
        {
            label: "Subscription Red Music",
            file: filesObj.subscriptionRevenueRedMusicFile,
            rule: RULES.SUBSCRIPTION_REVENUE_RED_MUSIC,
        },
        {
            label: "Subscription Red",
            file: filesObj.subscriptionRevenueRedFile,
            rule: RULES.SUBSCRIPTION_REVENUE_RED,
        },
        {
            label: "Paid Features",
            file: filesObj.paidFeaturesFile,
            rule: RULES.PAID_FEATURES,
        },
        {
            label: "Ads Adjustments",
            file: filesObj.adsAdjustmentsRevenueFile,
            rule: RULES.ADS_ADJUSTMENTS_REVENUE,
        },
        {
            label: "Ads Revenue",
            file: filesObj.adsRevenueFile,
            rule: RULES.ADS_REVENUE,
        },
        {
            label: "Custom Adjustments",
            file: filesObj.customAdjustmentsFile,
            rule: RULES.CUSTOM_ADJUSMENTS,
        },
        {
            label: "Affiliate Summary",
            file: filesObj.affiliatePaymentSummaryFile,
            rule: RULES.AFFILIATE_PAYMENT_SUMMARY,
        },
    ];

    items.forEach((item) => {
        let ruleHtml = "";
        if (item.rule) {
            // Convert regex array to readable strings
            const req = (item.rule.requiredAny || [])
                .filter(Boolean)
                .map((r) =>
                    String(r).replace(/</g, "&lt;").replace(/>/g, "&gt;"),
                )
                .join(" <span class='text-primary fw-bold'>OR</span> ");
            const forbidden = (item.rule.forbidden || [])
                .filter(Boolean)
                .map((r) =>
                    String(r).replace(/</g, "&lt;").replace(/>/g, "&gt;"),
                )
                .join(", ");
            ruleHtml = `<details class="mt-2" style="font-size: 0.75rem; line-height: 1.2;">
                <summary class="text-secondary opacity-75 fw-medium user-select-none text-decoration-underline" style="cursor: pointer;">View matching rules</summary>
                <div class="mt-1 ms-2 p-2 bg-light border rounded">
                    <div class="text-muted"><strong class="text-secondary">Match:</strong> ${req}</div>
                    ${forbidden ? `<div class="text-muted mt-1"><strong class="text-secondary">Exclude:</strong> ${forbidden}</div>` : ""}
                </div>
            </details>`;
        }

        if (item.file) {
            processedList.append(
                `<li class="list-group-item text-success"><i class="bi bi-check-circle-fill me-2"></i><strong>${item.label}:</strong> <span class="text-dark">${item.file.name}</span>${ruleHtml}</li>`,
            );
        } else {
            processedList.append(
                `<li class="list-group-item text-danger text-opacity-50"><i class="bi bi-x-circle-fill me-2"></i><strong>${item.label}:</strong> <span class="fst-italic">Not found</span>${ruleHtml}</li>`,
            );
        }
    });

    // Determine universally unused files: files that DO NOT match ANY rule in our configuration
    const allRules = Object.values(RULES);
    const unusedFiles = folderFiles.filter(f => !allRules.some(rule => matchesRule(f.name, rule)));
    const unusedFilesListContainer = $("#unused-files-list");
    unusedFilesListContainer.empty();

    if (unusedFiles.length > 0) {
        $("#unused-files-section").removeClass("d-none");
        $("#unused-files-count").text(unusedFiles.length);
        unusedFiles.forEach(f => {
            const li = $(`<li class="list-group-item list-group-item-danger py-1 d-flex justify-content-between align-items-center" style="font-size: 0.85em;">
                <span>${f.name}</span>
                <button type="button" class="btn btn-danger btn-sm py-0 px-2 delete-single-file-btn" data-filename="${f.name}" title="Delete file">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </li>`);
            unusedFilesListContainer.append(li);
        });

        // Individual delete handlers
        unusedFilesListContainer.off("click", ".delete-single-file-btn").on("click", ".delete-single-file-btn", async function() {
            const fileName = $(this).data("filename");
            if (!confirm(`Permanently delete '${fileName}' from your local folder? This cannot be undone.`)) {
                return;
            }
            const fileObj = unusedFiles.find(file => file.name === fileName);
            if (fileObj && fileObj.handle && currentDirectoryHandle) {
                try {
                    await currentDirectoryHandle.removeEntry(fileName);
                    
                    // Remove from our internal array
                    folderFiles = folderFiles.filter(file => file.name !== fileName);
                    
                    // Remove the li from UI
                    $(this).closest('li').remove();
                    
                    // Update count
                    $("#unused-files-count").text(unusedFilesListContainer.children().length);

                    // If no more unused files, hide section
                    if (unusedFilesListContainer.children().length === 0) {
                        $("#unused-files-section").addClass("d-none");
                    }
                } catch (e) {
                    console.error("Failed to delete", fileName, e);
                    alert("Failed to delete file from disk. Ensure the file isn't open in another program.");
                }
            }
        });

        // Bulk delete handler
        $("#btn-delete-all-unused").off("click").on("click", async function() {
            if (!confirm(`Are you sure you want to permanently delete ALL ${unusedFiles.length} unused CSV files from your local folder? This cannot be undone.`)) {
                return;
            }
            let deletedCount = 0;
            for (const f of unusedFiles) {
                if (f.handle && currentDirectoryHandle) {
                    try {
                        await currentDirectoryHandle.removeEntry(f.name);
                        deletedCount++;
                    } catch (e) {
                        console.error("Failed to delete", f.name, e);
                    }
                }
            }
            alert(`Successfully deleted ${deletedCount} file(s).`);
            
            // Remove deleted files from our internal state
            const unusedFileNames = unusedFiles.map(f => f.name);
            folderFiles = folderFiles.filter(file => !unusedFileNames.includes(file.name));
            
            // Trigger UI update
            $("#unused-files-section").addClass("d-none");
            processFolderFiles(folderFiles);
        });
    } else {
        $("#unused-files-section").addClass("d-none");
    }
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
        "ads-adjustments-revenue-error",
    );
    const adsRevenueFile = validateFile("ads-revenue", "ads-revenue-error");
    const paidFeaturesFile = validateFile(
        "paid-features",
        "paid-features-error",
    );
    const subscriptionRevenueRedFile = validateFile(
        "subscription-revenue-red",
        "subscription-revenue-red-error",
    );
    const subscriptionRevenueRedMusicFile = validateFile(
        "subscription-revenue-red-music",
        "subscription-revenue-red-music-error",
    );
    const youtubeShortsAdsFile = validateFile(
        "youtube-shorts-ads",
        "youtube-shorts-ads-error",
    );
    const youtubeShortsSubscriptionFile = validateFile(
        "youtube-shorts-subscription",
        "youtube-shorts-subscription-error",
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

const logRevenueSummary = (prefix, allCsvData) => {
    const sumRaw = (arr, key) => {
        if (!arr) return 0;
        return arr.reduce((sum, row) => sum + (row[key] || 0), 0);
    };

    const sumCustomAdj = (arr) => {
        if (!arr) return 0;
        return arr.reduce((sum, row) => {
            let amount = row.channelDeductionAmount || 0;
            if (
                row.channelAdjustmentType ===
                ADJUSTMENT_TYPES.MONETIZATION_DISABLED.VALUE
            ) {
                amount *= -1;
            }
            return sum + amount;
        }, 0);
    };

    const format = (val) =>
        val.toLocaleString("en-US", { style: "currency", currency: "USD" });

    const adsAdj = sumRaw(allCsvData.dataAdsAdjustmentsRevenue, "channelRev");
    const adsRev = sumRaw(allCsvData.dataAdsRevenue, "channelRev");
    const paidFeat = sumRaw(allCsvData.dataPaidFeatures, "channelRev");
    const subRed = sumRaw(allCsvData.dataSubscriptionRevenueRed, "channelRev");
    const subRedMusic = sumRaw(
        allCsvData.dataSubscriptionRevenueRedMusic,
        "channelRev",
    );
    const shortsAds = sumRaw(allCsvData.dataYoutubeShortsAds, "channelRev");
    const shortsSub = sumRaw(
        allCsvData.dataYoutubeShortsSubscription,
        "channelRev",
    );
    const customAdj = sumCustomAdj(allCsvData.dataCustomAdjustments);
    const taxWithheld = sumRaw(
        allCsvData.dataAffiliatePaymentSummary,
        "channelTaxWithheldAmount",
    );

    const totalRevenue =
        adsAdj +
        adsRev +
        paidFeat +
        subRed +
        subRedMusic +
        shortsAds +
        shortsSub +
        customAdj;

    console.log(`=== ${prefix} Import Revenue Summary ===`);
    console.log(`Ads Adjustments Revenue:`, format(adsAdj));
    console.log(`Ads Revenue:`, format(adsRev));
    console.log(`Paid Features:`, format(paidFeat));
    console.log(`Subscription Red:`, format(subRed));
    console.log(`Subscription Red Music:`, format(subRedMusic));
    console.log(`Shorts Ads:`, format(shortsAds));
    console.log(`Shorts Subscription:`, format(shortsSub));
    console.log(`Custom Adjustments (Deductions):`, format(customAdj));
    console.log(`Affiliate Payment (Tax Withheld):`, format(taxWithheld));
    console.log(`---------------------------------------`);
    console.log(`TOTAL REVENUE:`, format(totalRevenue));
    console.log("=======================================");
};

const getAllCsvData = async (values) => {
    const dataAdsAdjustmentsRevenue = await getCsvData(
        values.adsAdjustmentsRevenueFile,
        {
            id: CSV_COLUMNS.CHANNEL_ID,
            name: CSV_COLUMNS.CHANNEL_DISPLAY_NAME,
            revenue: CSV_COLUMNS.PARTNER_REVENUE,
        },
        CSV_COLUMNS.CHANNEL_ID,
    );

    const dataAdsRevenue = await getCsvData(
        values.adsRevenueFile,
        {
            id: CSV_COLUMNS.CHANNEL_ID,
            name: CSV_COLUMNS.CHANNEL_DISPLAY_NAME,
            revenue: CSV_COLUMNS.PARTNER_REVENUE,
        },
        CSV_COLUMNS.CHANNEL_ID,
    );

    const dataPaidFeatures = await getCsvData(
        values.paidFeaturesFile,
        {
            id: CSV_COLUMNS.CHANNEL_ID,
            name: CSV_COLUMNS.CHANNEL_DISPLAY_NAME,
            revenue: CSV_COLUMNS.EARNINGS,
        },
        CSV_COLUMNS.CHANNEL_ID,
    );

    const dataSubscriptionRevenueRed = await getCsvData(
        values.subscriptionRevenueRedFile,
        {
            id: CSV_COLUMNS.CHANNEL_ID,
            name: CSV_COLUMNS.CHANNEL_DISPLAY_NAME,
            revenue: CSV_COLUMNS.PARTNER_REVENUE,
        },
        CSV_COLUMNS.CHANNEL_ID,
    );

    const dataSubscriptionRevenueRedMusic = await getCsvData(
        values.subscriptionRevenueRedMusicFile,
        {
            id: CSV_COLUMNS.CHANNEL_ID,
            name: CSV_COLUMNS.CHANNEL_DISPLAY_NAME,
            revenue: CSV_COLUMNS.PARTNER_REVENUE,
        },
        CSV_COLUMNS.CHANNEL_ID,
    );

    const dataYoutubeShortsAds = await getCsvData(
        values.youtubeShortsAdsFile,
        {
            id: CSV_COLUMNS.CHANNEL_ID,
            name: CSV_COLUMNS.CHANNEL_DISPLAY_NAME,
            revenue: CSV_COLUMNS.NET_PARTNER_REVENUE,
        },
        CSV_COLUMNS.CHANNEL_ID,
    );

    const dataYoutubeShortsSubscription = await getCsvData(
        values.youtubeShortsSubscriptionFile,
        {
            id: CSV_COLUMNS.CHANNEL_ID,
            name: CSV_COLUMNS.CHANNEL_DISPLAY_NAME,
            revenue: CSV_COLUMNS.PARTNER_REVENUE,
        },
        CSV_COLUMNS.CHANNEL_ID,
    );

    const dataCustomAdjustments = await getCsvData(
        values.customAdjustmentsFile,
        {
            id: CSV_COLUMNS.CHANNEL_ID,
            adjustmentType: CSV_COLUMNS.ADJUSTMENT_TYPE,
            deductionAmount: CSV_COLUMNS.DEDUCTION_AMOUNT,
        },
        CSV_COLUMNS.CHANNEL_ID,
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
        CSV_COLUMNS.CHANNEL_ID,
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
        const { channelId, channelName, channelAdjustmentType, channelDeductionAmount } =
            item;
        let value = tableData.get(channelId);
        let deductionAmount = channelDeductionAmount;

        if (!value) {
            value = getNewCellData(channelId, channelName);
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

        tableData.set(channelId, value);
    });
};

const processAffiliatePaymentData = (data, tableData) => {
    data.forEach((item) => {
        const {
            channelId,
            channelName,
            channelUsSourcedRevenue,
            channelTaxWithholdingRate,
            channelTaxWithheldAmount,
            channelLocalCurrency,
            fileName,
        } = item;
        let value = tableData.get(channelId);

        if (!value) {
            value = getNewCellData(channelId, channelName);
        }

        value[TABLE_COLUMNS.US_REVENUE] += channelUsSourcedRevenue;
        value[TABLE_COLUMNS.TAX_WITHHOLDING_RATE] = channelTaxWithholdingRate;
        value[TABLE_COLUMNS.TAX_WITHHELD_AMOUNT] += channelTaxWithheldAmount;

        tableData.set(channelId, value);
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
    Object.values(allCsvData).forEach((dataset) => {
        if (!dataset) return;
        dataset.forEach((row) => {
            if (
                row.channelLocalCurrency &&
                row.channelLocalCurrency !== "USD"
            ) {
                nonUsdFiles.set(row.fileName, row.channelLocalCurrency);
            }
        });
    });

    if (nonUsdFiles.size > 0) {
        const fileAlerts = Array.from(nonUsdFiles.entries())
            .map(([fName, currency]) => {
                return `<li><strong>${fName}</strong> (Currency: ${currency})</li>`;
            })
            .join("");

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
        tableData,
    );

    // Ads Revenue
    processRevenueData(dataAdsRevenue, TABLE_COLUMNS.REVENUE, tableData);

    // Paid Features
    processRevenueData(dataPaidFeatures, TABLE_COLUMNS.REVENUE, tableData);

    // Subscription Revenue Red
    processRevenueData(
        dataSubscriptionRevenueRed,
        TABLE_COLUMNS.REVENUE,
        tableData,
    );

    // Subscription Revenue Red Music
    processRevenueData(
        dataSubscriptionRevenueRedMusic,
        TABLE_COLUMNS.REVENUE,
        tableData,
    );

    // YouTube Shorts Ads
    processRevenueData(dataYoutubeShortsAds, TABLE_COLUMNS.REVENUE, tableData);

    // YouTube Shorts Subscription
    processRevenueData(
        dataYoutubeShortsSubscription,
        TABLE_COLUMNS.REVENUE,
        tableData,
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
                value[TABLE_COLUMNS.CHANNEL_ID],
            ),
        };
    });
    return result.toSorted(
        (a, b) =>
            b[TABLE_COLUMNS.TOTAL_REVENUE] - a[TABLE_COLUMNS.TOTAL_REVENUE],
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
        console.log("Manual Import Files:", values);
        logRevenueSummary("Manual", allCsvData);

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
    if (!folderFiles || folderFiles.length === 0) return;

    let fileList = folderFiles;

    const selectedMonth = $("#month-select").val();
    if (selectedMonth) {
        fileList = fileList.filter(
            (f) => extractMonthKey(f.name) === selectedMonth,
        );
    }

    const youtubeShortsSubscriptionFile = pickBestByRule(
        fileList,
        RULES.YOUTUBE_SHORTS_SUBSCRIPTION,
    );
    const youtubeShortsAdsFile = pickBestByRule(
        fileList,
        RULES.YOUTUBE_SHORTS_ADS,
    );
    const subscriptionRevenueRedMusicFile = pickBestByRule(
        fileList,
        RULES.SUBSCRIPTION_REVENUE_RED_MUSIC,
    );
    const subscriptionRevenueRedFile = pickBestByRule(
        fileList,
        RULES.SUBSCRIPTION_REVENUE_RED,
    );
    const paidFeaturesFile = pickBestByRule(fileList, RULES.PAID_FEATURES);
    const adsAdjustmentsRevenueFile = pickBestByRule(
        fileList,
        RULES.ADS_ADJUSTMENTS_REVENUE,
    );
    const adsRevenueFile = pickBestByRule(fileList, RULES.ADS_REVENUE);
    const customAdjustmentsFile = pickBestByRule(
        fileList,
        RULES.CUSTOM_ADJUSMENTS,
    );
    const affiliatePaymentSummaryFile = pickBestByRule(
        fileList,
        RULES.AFFILIATE_PAYMENT_SUMMARY,
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
        console.log("Auto Import Files:", values);
        logRevenueSummary("Auto", allCsvData);

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
