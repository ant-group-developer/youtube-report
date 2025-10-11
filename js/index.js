// Trigger validation on file change and form submit
$("#csv-form").on("change", 'input[type="file"]', function () {
    const inputId = $(this).attr("id");
    const errorId = inputId + "-error"; // Error element id is based on input id
    validateCsvFile(inputId, errorId);
    // validateFileInput(inputId, errorId);
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

    return {
        dataAdsAdjustmentsRevenue,
        dataAdsRevenue,
        dataPaidFeatures,
        dataSubscriptionRevenueRed,
        dataSubscriptionRevenueRedMusic,
        dataYoutubeShortsAds,
        dataYoutubeShortsSubscription,
    };
};

const processRevenueData = (data, revenueColumn, tableData) => {
    data.forEach((item) => {
        const { channelId, channelName, channelRev } = item;
        let value = tableData.get(channelId);

        if (!value) {
            value = {
                [TABLE_COLUMNS.CHANNEL_ID]: channelId,
                [TABLE_COLUMNS.CHANNEL_NAME]: channelName,
                [TABLE_COLUMNS.ADS_ADJUSTMENTS_REVENUE]: 0,
                [TABLE_COLUMNS.ADS_REVENUE]: 0,
                [TABLE_COLUMNS.PAID_FEATURES]: 0,
                [TABLE_COLUMNS.SUBSCRIPTION_REVENUE_RED]: 0,
                [TABLE_COLUMNS.SUBSCRIPTION_REVENUE_RED_MUSIC]: 0,
                [TABLE_COLUMNS.YOUTUBE_SHORTS_ADS]: 0,
                [TABLE_COLUMNS.YOUTUBE_SHORTS_SUBSCRIPTION]: 0,
                [TABLE_COLUMNS.TOTAL_REVENUE]: 0,
            };
        }

        value[revenueColumn] += channelRev;
        value[TABLE_COLUMNS.TOTAL_REVENUE] += channelRev;

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
    } = allCsvData;

    const tableData = new Map();

    // Ads Adjustments Revenue
    processRevenueData(
        dataAdsAdjustmentsRevenue,
        TABLE_COLUMNS.ADS_ADJUSTMENTS_REVENUE,
        tableData
    );

    // Ads Revenue
    processRevenueData(dataAdsRevenue, TABLE_COLUMNS.ADS_REVENUE, tableData);

    // Paid Features
    processRevenueData(
        dataPaidFeatures,
        TABLE_COLUMNS.PAID_FEATURES,
        tableData
    );

    // Subscription Revenue Red
    processRevenueData(
        dataSubscriptionRevenueRed,
        TABLE_COLUMNS.SUBSCRIPTION_REVENUE_RED,
        tableData
    );

    // Subscription Revenue Red Music
    processRevenueData(
        dataSubscriptionRevenueRedMusic,
        TABLE_COLUMNS.SUBSCRIPTION_REVENUE_RED_MUSIC,
        tableData
    );

    // YouTube Shorts Ads
    processRevenueData(
        dataYoutubeShortsAds,
        TABLE_COLUMNS.YOUTUBE_SHORTS_ADS,
        tableData
    );

    // YouTube Shorts Subscription
    processRevenueData(
        dataYoutubeShortsSubscription,
        TABLE_COLUMNS.YOUTUBE_SHORTS_SUBSCRIPTION,
        tableData
    );

    const result = Array.from(tableData, ([_, value]) => {
        value[TABLE_COLUMNS.ADS_ADJUSTMENTS_REVENUE] =
            value[TABLE_COLUMNS.ADS_ADJUSTMENTS_REVENUE].toFixed(2);
        value[TABLE_COLUMNS.ADS_REVENUE] =
            value[TABLE_COLUMNS.ADS_REVENUE].toFixed(2);
        value[TABLE_COLUMNS.PAID_FEATURES] =
            value[TABLE_COLUMNS.PAID_FEATURES].toFixed(2);
        value[TABLE_COLUMNS.SUBSCRIPTION_REVENUE_RED] =
            value[TABLE_COLUMNS.SUBSCRIPTION_REVENUE_RED].toFixed(2);
        value[TABLE_COLUMNS.SUBSCRIPTION_REVENUE_RED_MUSIC] =
            value[TABLE_COLUMNS.SUBSCRIPTION_REVENUE_RED_MUSIC].toFixed(2);
        value[TABLE_COLUMNS.YOUTUBE_SHORTS_ADS] =
            value[TABLE_COLUMNS.YOUTUBE_SHORTS_ADS].toFixed(2);
        value[TABLE_COLUMNS.YOUTUBE_SHORTS_SUBSCRIPTION] =
            value[TABLE_COLUMNS.YOUTUBE_SHORTS_SUBSCRIPTION].toFixed(2);
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

    const fileList = Array.from(input.files);

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

const onSubmitAuto = async (e) => {
    e.preventDefault(); // Prevent the form from submitting

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
