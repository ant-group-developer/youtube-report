// Scan files when a report folder is selected
let currentDirectoryHandle = null;
let allDiskFiles = [];
let folderFiles = [];

async function scanDirectory(dirHandle) {
    allDiskFiles = [];
    folderFiles = [];
    const allRules = Object.values(RULES);
    
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
            const lowerName = entry.name.toLowerCase();

            // Only csv/zip are report files; anything else (xlsx, pdf...) is never listed or deleted
            if (!lowerName.endsWith('.csv') && !lowerName.endsWith('.zip')) continue;

            // Track physical files to allow deleting completely unneeded ones (both csv and zip)
            const diskItem = { name: entry.name, handle: entry, isUsed: false };
            allDiskFiles.push(diskItem);

            if (lowerName.endsWith('.csv')) {
                if (allRules.some(rule => matchesRule(entry.name, rule))) {
                    diskItem.isUsed = true;
                    const file = await entry.getFile();
                    // We don't set file.handle anymore because deletion ignores folderFiles
                    folderFiles.push(file);
                }
            } else if (lowerName.endsWith('.zip')) {
                // Ultra-Optimization: Since YouTube delivers 'report.csv.zip', 
                // we check if the zip filename itself matches a rule (minus .zip).
                // If it doesn't match, we completely SKIP opening the zip, saving massive CPU/RAM.
                if (lowerName.endsWith('.csv.zip')) {
                    const possibleCsvName = entry.name.replace(/\.zip$/i, '');
                    if (!allRules.some(rule => matchesRule(possibleCsvName, rule))) {
                        continue; // Skip irrelevant files entirely, marking zip as completely unused
                    }
                }

                let zipUseful = false;
                try {
                    // Chỉ đọc danh sách file trong zip; nội dung được giải nén dần khi Submit (js/zip.js)
                    const zipFile = await entry.getFile();
                    const zipEntries = await readZipEntries(zipFile);

                    for (const zipEntry of zipEntries) {
                        if (!zipEntry.dir && zipEntry.name.toLowerCase().endsWith('.csv')) {

                            const isNeeded = allRules.some(rule => matchesRule(zipEntry.name, rule));

                            if (isNeeded) {
                                zipUseful = true;
                                folderFiles.push(await openZipEntry(zipFile, zipEntry));
                            }
                        }
                    }
                } catch (zipErr) {
                    console.error("Failed to extract zip:", entry.name, zipErr);
                }
                
                diskItem.isUsed = zipUseful;
            }
        }
    }
    
    $("#folder-path").text(`Selected folder: ${dirHandle.name} (${folderFiles.length} CSV files found)`);
    $("#file-list-error").text("");
    
    processFolderFiles(folderFiles);
}

$("#btn-select-folder").on("click", async function () {
    try {
        const dirHandle = await window.showDirectoryPicker({
            id: 'youtube-report-folder',
            mode: 'readwrite'
        });
        currentDirectoryHandle = dirHandle;
        
        await scanDirectory(currentDirectoryHandle);
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error(err);
            $("#file-list-error").text("Error accessing folder. Or browser does not support this feature.");
        }
    }
});

function processFolderFiles(files) {
    if (files.length === 0) {
        $("#import-file-details").addClass("d-none");
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
        $("#import-file-details").removeClass("d-none");
        monthSelect.trigger("change"); // Populates file list preview
    } else {
        $("#import-file-details").addClass("d-none");
    }
}

// Update preview list on month select
$("#month-select").on("change", function () {
    const selectedMonth = $(this).val();
    if (!selectedMonth) return;

    const filesObj = getImportFiles();

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
            label: "Shorts (Music Dynamic Pool)",
            file: filesObj.shortsPoolRevenueFile,
            rule: RULES.SHORTS_POOL_REVENUE,
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
            label: "Subscription Adjustments",
            file: filesObj.subscriptionAdjustmentsRevenueFile,
            rule: RULES.SUBSCRIPTION_ADJUSTMENTS_REVENUE,
        },
        {
            label: "Audio Tier",
            file: filesObj.audioTierRevenueFile,
            rule: RULES.AUDIO_TIER_REVENUE,
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
            label: "Affiliate Summary (Tax, Shopping, PfEdu)",
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
                `<li class="list-group-item text-success"><i class="bi bi-check-circle-fill me-2"></i><strong>${item.label}:</strong> <span class="text-dark">${escapeHtml(item.file.name)}</span>${ruleHtml}</li>`,
            );
        } else {
            processedList.append(
                `<li class="list-group-item text-danger text-opacity-50"><i class="bi bi-x-circle-fill me-2"></i><strong>${item.label}:</strong> <span class="fst-italic">Not found</span>${ruleHtml}</li>`,
            );
        }
    });

    $("#unused-files-header-text").text("Unused Report Files");
    // Determine universally unused files: files that DO NOT match ANY rule and produced no useful inner files
    const unusedFiles = allDiskFiles.filter(item => !item.isUsed);
    const unusedFilesListContainer = $("#unused-files-list");
    unusedFilesListContainer.empty();

    if (unusedFiles.length > 0) {
        $("#unused-files-section").removeClass("d-none");
        $("#unused-files-count").text(unusedFiles.length);
        unusedFiles.forEach(f => {
            const li = $(`<li class="list-group-item list-group-item-danger py-1 d-flex justify-content-between align-items-center" style="font-size: 0.85em;">
                <span>${escapeHtml(f.name)}</span>
                <button type="button" class="btn btn-danger btn-sm py-0 px-2 delete-single-file-btn" data-filename="${escapeHtml(f.name)}" title="Delete file">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </li>`);
            unusedFilesListContainer.append(li);
        });

        // Individual delete handlers
        unusedFilesListContainer.off("click", ".delete-single-file-btn").on("click", ".delete-single-file-btn", async function() {
            const fileName = $(this).attr("data-filename");
            if (!confirm(`Permanently delete '${fileName}' from your local folder? This cannot be undone.`)) {
                return;
            }
            const fileObj = unusedFiles.find(file => file.name === fileName);
            const $li = $(this).closest('li');
            
            if (fileObj && fileObj.handle && currentDirectoryHandle) {
                try {
                    await currentDirectoryHandle.removeEntry(fileName);
                    
                    // Remove from our internal array
                    allDiskFiles = allDiskFiles.filter(file => file.name !== fileName);
                    
                    // Remove the li from UI for immediate feedback
                    $li.remove();
                    
                    // Trigger a full reload of the folder to ensure internal states stay 100% in sync
                    if (currentDirectoryHandle) {
                        await scanDirectory(currentDirectoryHandle);
                    }
                } catch (e) {
                    if (e.name === "NotFoundError" || (e.message && e.message.toLowerCase().includes("not found"))) {
                        console.warn("File was already deleted or doesn't exist", fileName);
                        $li.remove();
                        if (currentDirectoryHandle) {
                            await scanDirectory(currentDirectoryHandle);
                        }
                    } else {
                        console.error("Failed to delete", fileName, e);
                        alert("Failed to delete file from disk. Ensure the file isn't open in another program.");
                    }
                }
            }
        });

        // Bulk delete handler
        $("#btn-delete-all-unused").off("click").on("click", async function() {
            if (!confirm(`Are you sure you want to permanently delete ALL ${unusedFilesListContainer.children().length} unused files from your local folder? This cannot be undone.`)) {
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
            
            // Reload folder fully to ensure UI and internal state reflects the new reality
            if (currentDirectoryHandle) {
                await scanDirectory(currentDirectoryHandle);
            }
        });
    } else {
        $("#unused-files-section").addClass("d-none");
    }
});

// Tổng doanh thu theo từng nguồn, để đối chiếu với Payment summary của YouTube.
// Chỉ liệt kê nguồn có file; nguồn lấy từ affiliate summary chỉ liệt kê khi có doanh thu.
const getRevenueSummary = (values, allCsvData) => {
    const sumRevenue = (data) =>
        data.reduce((sum, row) => sum + (row.channelRev || 0), 0);

    const sumCustomAdjustments = (data) =>
        data.reduce((sum, row) => {
            const amount = row.channelDeductionAmount || 0;
            return row.channelAdjustmentType ===
                ADJUSTMENT_TYPES.MONETIZATION_DISABLED.VALUE
                ? sum - amount
                : sum + amount;
        }, 0);

    const items = [
        {
            label: "Ads Revenue",
            file: values.adsRevenueFile,
            amount: sumRevenue(allCsvData.dataAdsRevenue),
        },
        {
            label: "Ads Adjustments",
            file: values.adsAdjustmentsRevenueFile,
            amount: sumRevenue(allCsvData.dataAdsAdjustmentsRevenue),
        },
        {
            label: "Subscription Red Music",
            file: values.subscriptionRevenueRedMusicFile,
            amount: sumRevenue(allCsvData.dataSubscriptionRevenueRedMusic),
        },
        {
            label: "Subscription Red",
            file: values.subscriptionRevenueRedFile,
            amount: sumRevenue(allCsvData.dataSubscriptionRevenueRed),
        },
        {
            label: "Subscription Adjustments",
            file: values.subscriptionAdjustmentsRevenueFile,
            amount: sumRevenue(allCsvData.dataSubscriptionAdjustmentsRevenue),
        },
        {
            label: "Audio Tier",
            file: values.audioTierRevenueFile,
            amount: sumRevenue(allCsvData.dataAudioTierRevenue),
        },
        {
            label: "Shorts Ads",
            file: values.youtubeShortsAdsFile,
            amount: sumRevenue(allCsvData.dataYoutubeShortsAds),
        },
        {
            label: "Shorts Subscription",
            file: values.youtubeShortsSubscriptionFile,
            amount: sumRevenue(allCsvData.dataYoutubeShortsSubscription),
        },
        {
            label: "Shorts (Music Dynamic Pool)",
            file: values.shortsPoolRevenueFile,
            amount: sumRevenue(allCsvData.dataShortsPoolRevenue),
        },
        {
            label: "Paid Features",
            file: values.paidFeaturesFile,
            amount: sumRevenue(allCsvData.dataPaidFeatures),
        },
        {
            label: AFFILIATE_ONLY_SOURCES.SHOPPING_AFFILIATE.LABEL,
            file: values.affiliatePaymentSummaryFile,
            amount: sumRevenue(allCsvData.dataShoppingAffiliateRevenue),
            optional: true,
        },
        {
            label: AFFILIATE_ONLY_SOURCES.PFEDU.LABEL,
            file: values.affiliatePaymentSummaryFile,
            amount: sumRevenue(allCsvData.dataPfEduRevenue),
            optional: true,
        },
        {
            label: AFFILIATE_ONLY_SOURCES.OTHER.LABEL,
            file: values.affiliatePaymentSummaryFile,
            amount: sumRevenue(allCsvData.dataOtherAffiliateRevenue),
            optional: true,
        },
        {
            label: "Channel Adjustments",
            file: values.customAdjustmentsFile,
            amount: sumCustomAdjustments(allCsvData.dataCustomAdjustments),
        },
    ].filter((item) => item.file && !(item.optional && item.amount === 0));

    return {
        items,
        total: items.reduce((sum, item) => sum + item.amount, 0),
    };
};

const logRevenueSummary = (revenueSummary) => {
    const format = (val) =>
        val.toLocaleString("en-US", { style: "currency", currency: "USD" });

    console.log("=== Import Revenue Summary ===");
    revenueSummary.items.forEach((item) =>
        console.log(`${item.label}:`, format(item.amount), `(${item.file.name})`),
    );
    console.log("---------------------------------------");
    console.log("TOTAL REVENUE:", format(revenueSummary.total));
    console.log("=======================================");
};

// Doanh thu của một nguồn chỉ có trong affiliate payment summary (Shopping Affiliate, PfEdu...)
const getAffiliateOnlyRevenue = (file, source) => {
    const fileMonth = file ? extractMonthKey(file.name) : null;
    return getCsvData(
        file,
        {
            id: CSV_COLUMNS.CHANNEL_ID,
            revenue: CSV_COLUMNS.TOTAL_REVENUE_BY_SOURCE,
        },
        CSV_COLUMNS.CHANNEL_ID,
        {
            filters: [
                { column: CSV_COLUMNS.REVENUE_SOURCE, test: source.test },
                // Chỉ lấy doanh thu của chính tháng báo cáo:
                // khoản của tháng trước được trả bù đã nằm trong CREDIT - APPEAL (Custom Adjustments)
                {
                    column: CSV_COLUMNS.ADSENSE_EARNINGS_MONTH,
                    test: (month) => month === fileMonth,
                },
            ],
        },
    );
};

const getAllCsvData = async (values) => {
    // Audio Tier không có Channel ID: đọc trước để lấy danh sách Video ID, kênh của từng video
    // được ghi lại khi đọc các report có cả Video ID và kênh bên dưới (Ads, Red...)
    const audioTierByVideo = await getCsvData(
        values.audioTierRevenueFile,
        {
            id: CSV_COLUMNS.VIDEO_ID,
            revenue: CSV_COLUMNS.PARTNER_REVENUE,
        },
        CSV_COLUMNS.VIDEO_ID,
        { rawId: true },
    );
    const videoChannels = new Map(
        audioTierByVideo
            .filter((item) => item.channelId)
            .map((item) => [item.channelId, null]),
    );
    const videoOptions = { videoChannels };

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
        videoOptions,
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
        videoOptions,
    );

    // File Red Music / điều chỉnh Red Music dạng "*_subscription_video_v1_1_*" không có "Channel ID"
    const redMusicChannelIdColumns = [
        CSV_COLUMNS.CHANNEL_ID,
        CSV_COLUMNS.VIDEO_CHANNEL_ID,
    ];
    const dataSubscriptionRevenueRedMusic = await getCsvData(
        values.subscriptionRevenueRedMusicFile,
        {
            id: redMusicChannelIdColumns,
            name: CSV_COLUMNS.CHANNEL_DISPLAY_NAME,
            revenue: CSV_COLUMNS.PARTNER_REVENUE,
        },
        redMusicChannelIdColumns,
        videoOptions,
    );

    const dataSubscriptionAdjustmentsRevenue = await getCsvData(
        values.subscriptionAdjustmentsRevenueFile,
        {
            id: redMusicChannelIdColumns,
            name: CSV_COLUMNS.CHANNEL_DISPLAY_NAME,
            revenue: CSV_COLUMNS.PARTNER_REVENUE,
        },
        redMusicChannelIdColumns,
        videoOptions,
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

    const shortsPoolByCountry = await getCsvData(
        values.shortsPoolRevenueFile,
        {
            id: CSV_COLUMNS.COUNTRY,
            revenue: CSV_COLUMNS.SHORTS_PARTNER_REVENUE,
        },
        CSV_COLUMNS.SHORTS_PARTNER_REVENUE,
        { rawId: true },
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

    const dataShoppingAffiliateRevenue = await getAffiliateOnlyRevenue(
        values.affiliatePaymentSummaryFile,
        AFFILIATE_ONLY_SOURCES.SHOPPING_AFFILIATE,
    );
    const dataPfEduRevenue = await getAffiliateOnlyRevenue(
        values.affiliatePaymentSummaryFile,
        AFFILIATE_ONLY_SOURCES.PFEDU,
    );
    const dataOtherAffiliateRevenue = await getAffiliateOnlyRevenue(
        values.affiliatePaymentSummaryFile,
        AFFILIATE_ONLY_SOURCES.OTHER,
    );

    // Gắn doanh thu Audio Tier vào kênh của video; video không tìm thấy kênh gom vào một dòng riêng
    const dataAudioTierRevenue = audioTierByVideo.map((item) => {
        const channelId = videoChannels.get(item.channelId);
        return channelId
            ? { ...item, channelId, channelName: channelId }
            : {
                  ...item,
                  channelId: NO_CHANNEL_ROWS.AUDIO_TIER.KEY,
                  channelName: NO_CHANNEL_ROWS.AUDIO_TIER.NAME,
              };
    });

    // Shorts Music Dynamic Pool chỉ có số theo quốc gia, không chia được theo kênh: gom thành một dòng riêng
    const dataShortsPoolRevenue = shortsPoolByCountry.map((item) => ({
        ...item,
        channelId: NO_CHANNEL_ROWS.SHORTS_POOL.KEY,
        channelName: NO_CHANNEL_ROWS.SHORTS_POOL.NAME,
    }));

    return {
        dataAdsAdjustmentsRevenue,
        dataAdsRevenue,
        dataPaidFeatures,
        dataSubscriptionRevenueRed,
        dataSubscriptionRevenueRedMusic,
        dataSubscriptionAdjustmentsRevenue,
        dataAudioTierRevenue,
        dataYoutubeShortsAds,
        dataYoutubeShortsSubscription,
        dataShortsPoolRevenue,
        dataCustomAdjustments,
        dataAffiliatePaymentSummary,
        dataShoppingAffiliateRevenue,
        dataPfEduRevenue,
        dataOtherAffiliateRevenue,
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
        dataSubscriptionAdjustmentsRevenue,
        dataAudioTierRevenue,
        dataYoutubeShortsAds,
        dataYoutubeShortsSubscription,
        dataShortsPoolRevenue,
        dataCustomAdjustments,
        dataAffiliatePaymentSummary,
        dataShoppingAffiliateRevenue,
        dataPfEduRevenue,
        dataOtherAffiliateRevenue,
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
                return `<li><strong>${escapeHtml(fName)}</strong> (Currency: ${escapeHtml(currency)})</li>`;
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

    // Subscription Adjustments (điều chỉnh Red Music)
    processRevenueData(
        dataSubscriptionAdjustmentsRevenue,
        TABLE_COLUMNS.REVENUE,
        tableData,
    );

    // Audio Tier (đã gắn kênh theo Video ID)
    processRevenueData(dataAudioTierRevenue, TABLE_COLUMNS.REVENUE, tableData);

    // YouTube Shorts Ads
    processRevenueData(dataYoutubeShortsAds, TABLE_COLUMNS.REVENUE, tableData);

    // YouTube Shorts Subscription
    processRevenueData(
        dataYoutubeShortsSubscription,
        TABLE_COLUMNS.REVENUE,
        tableData,
    );

    // YouTube Shorts Music Dynamic Pool (dòng riêng, không có kênh)
    processRevenueData(dataShortsPoolRevenue, TABLE_COLUMNS.REVENUE, tableData);

    // Shopping Affiliate, PfEdu và khoản thưởng (affiliate payment summary)
    processRevenueData(
        dataShoppingAffiliateRevenue,
        TABLE_COLUMNS.REVENUE,
        tableData,
    );
    processRevenueData(dataPfEduRevenue, TABLE_COLUMNS.REVENUE, tableData);
    processRevenueData(
        dataOtherAffiliateRevenue,
        TABLE_COLUMNS.REVENUE,
        tableData,
    );

    // Custom Adjustments - Deduction Amount
    processDeductionData(dataCustomAdjustments, tableData);

    // Affiliate Payment Summary
    processAffiliatePaymentData(dataAffiliatePaymentSummary, tableData);

    const noChannelKeys = Object.values(NO_CHANNEL_ROWS).map((row) => row.KEY);

    // Giữ nguyên số tiền (không làm tròn từng kênh): làm tròn 2 chữ số cho hàng trăm nghìn kênh
    // có doanh thu rất nhỏ sẽ làm tổng lệch hàng chục USD. Chỉ làm tròn khi hiển thị (formatAmount).
    const result = Array.from(tableData, ([_, value]) => {
        // Dòng doanh thu không có kênh: không có Channel ID / link
        const hasChannel = !noChannelKeys.includes(
            value[TABLE_COLUMNS.CHANNEL_ID],
        );

        return {
            ...value,
            [TABLE_COLUMNS.CHANNEL_ID]: hasChannel
                ? value[TABLE_COLUMNS.CHANNEL_ID]
                : "",
            [TABLE_COLUMNS.CHANNEL_LINK]: hasChannel
                ? getYouTubeChannelLink(value[TABLE_COLUMNS.CHANNEL_ID])
                : "",
        };
    });
    return result.toSorted(
        (a, b) =>
            b[TABLE_COLUMNS.TOTAL_REVENUE] - a[TABLE_COLUMNS.TOTAL_REVENUE],
    );
};

const getImportFiles = () => {
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
    const shortsPoolRevenueFile = pickBestByRule(
        fileList,
        RULES.SHORTS_POOL_REVENUE,
    );
    const subscriptionRevenueRedMusicFile = pickBestByRule(
        fileList,
        RULES.SUBSCRIPTION_REVENUE_RED_MUSIC,
    );
    const subscriptionRevenueRedFile = pickBestByRule(
        fileList,
        RULES.SUBSCRIPTION_REVENUE_RED,
    );
    const subscriptionAdjustmentsRevenueFile = pickBestByRule(
        fileList,
        RULES.SUBSCRIPTION_ADJUSTMENTS_REVENUE,
    );
    const audioTierRevenueFile = pickBestByRule(
        fileList,
        RULES.AUDIO_TIER_REVENUE,
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
        subscriptionAdjustmentsRevenueFile,
        audioTierRevenueFile,
        youtubeShortsAdsFile,
        youtubeShortsSubscriptionFile,
        shortsPoolRevenueFile,
        customAdjustmentsFile,
        affiliatePaymentSummaryFile,
    };
};

const onSubmitImport = async (e) => {
    e.preventDefault(); // Prevent the form from submitting

    $("#alert-container").empty(); // Clear old alerts
    showLoading(BUTTON_SUBMIT_IMPORT_ID);

    try {
        const values = getImportFiles();
        console.log("Import Files:", values);
        if (!values) {
            hideLoading(BUTTON_SUBMIT_IMPORT_ID);
            return;
        }

        const allCsvData = await getAllCsvData(values);
        const revenueSummary = getRevenueSummary(values, allCsvData);
        logRevenueSummary(revenueSummary);

        const tableData = convertTableData(allCsvData);

        resetData(tableData);
        renderRevenueSummary(revenueSummary, $("#month-select").val());

        // Đóng modal sau khi xử lý thành công
        $(`#${MODAL_IMPORT_ID}`).modal("hide");
    } catch (error) {
        console.log("error:", error);
    }

    hideLoading(BUTTON_SUBMIT_IMPORT_ID);
};

const submitImportBtn = getSubmitBtn(BUTTON_SUBMIT_IMPORT_ID);
submitImportBtn.on("click", onSubmitImport);
