$("#revenue-share-ratio")[0].defaultValue = 100;

const getFormFiles = () => {
    $("#ads-adjustments-revenue-error").text("");
    $("#ads-revenue-error").text("");
    $("#paid-features-error").text("");
    $("#subscription-revenue-red-error").text("");
    $("#subscription-revenue-red-music-error").text("");
    $("#youtube-shorts-ads-error").text("");
    $("#youtube-shorts-subscription-error").text("");

    let validateSuccess = true;

    const adsAdjustmentsRevenueFile = $("#ads-adjustments-revenue")[0].files[0];
    if (!adsAdjustmentsRevenueFile) {
        $("#ads-adjustments-revenue-error").text("Please select file.");
        validateSuccess = false;
    }

    const adsRevenueFile = $("#ads-revenue")[0].files[0];
    if (!adsRevenueFile) {
        $("#ads-revenue-error").text("Please select file.");
        validateSuccess = false;
    }

    const paidFeaturesFile = $("#paid-features")[0].files[0];
    if (!paidFeaturesFile) {
        $("#paid-features-error").text("Please select file.");
        validateSuccess = false;
    }

    const subscriptionRevenueRedFile = $("#subscription-revenue-red")[0]
        .files[0];
    if (!subscriptionRevenueRedFile) {
        $("#subscription-revenue-red-error").text("Please select file.");
        validateSuccess = false;
    }

    const subscriptionRevenueRedMusicFile = $(
        "#subscription-revenue-red-music"
    )[0].files[0];
    if (!subscriptionRevenueRedMusicFile) {
        $("#subscription-revenue-red-music-error").text("Please select file.");
        validateSuccess = false;
    }

    const youtubeShortsAdsFile = $("#youtube-shorts-ads")[0].files[0];
    if (!youtubeShortsAdsFile) {
        $("#youtube-shorts-ads-error").text("Please select file.");
        validateSuccess = false;
    }

    const youtubeShortsSubscriptionFile = $("#youtube-shorts-subscription")[0]
        .files[0];
    if (!youtubeShortsSubscriptionFile) {
        $("#youtube-shorts-subscription-error").text("Please select file.");
        validateSuccess = false;
    }

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

const processRevenueData = (
    data,
    revenueColumn,
    tableData,
    revenueShareRatio
) => {
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
                [TABLE_COLUMNS.ANT_SHARE]: 0,
            };
        }

        value[revenueColumn] += channelRev;
        value[TABLE_COLUMNS.TOTAL_REVENUE] += channelRev;
        value[TABLE_COLUMNS.ANT_SHARE] += channelRev * revenueShareRatio;

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

    const revenueShareRatio = ($("#revenue-share-ratio")[0].value || 100) / 100;

    // Ads Adjustments Revenue
    processRevenueData(
        dataAdsAdjustmentsRevenue,
        TABLE_COLUMNS.ADS_ADJUSTMENTS_REVENUE,
        tableData,
        revenueShareRatio
    );

    // Ads Revenue
    processRevenueData(
        dataAdsRevenue,
        TABLE_COLUMNS.ADS_REVENUE,
        tableData,
        revenueShareRatio
    );

    // Paid Features
    processRevenueData(
        dataPaidFeatures,
        TABLE_COLUMNS.PAID_FEATURES,
        tableData,
        revenueShareRatio
    );

    // Subscription Revenue Red
    processRevenueData(
        dataSubscriptionRevenueRed,
        TABLE_COLUMNS.SUBSCRIPTION_REVENUE_RED,
        tableData,
        revenueShareRatio
    );

    // Subscription Revenue Red Music
    processRevenueData(
        dataSubscriptionRevenueRedMusic,
        TABLE_COLUMNS.SUBSCRIPTION_REVENUE_RED_MUSIC,
        tableData,
        revenueShareRatio
    );

    // YouTube Shorts Ads
    processRevenueData(
        dataYoutubeShortsAds,
        TABLE_COLUMNS.YOUTUBE_SHORTS_ADS,
        tableData,
        revenueShareRatio
    );

    // YouTube Shorts Subscription
    processRevenueData(
        dataYoutubeShortsSubscription,
        TABLE_COLUMNS.YOUTUBE_SHORTS_SUBSCRIPTION,
        tableData,
        revenueShareRatio
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
        value[TABLE_COLUMNS.ANT_SHARE] =
            value[TABLE_COLUMNS.ANT_SHARE].toFixed(2);

        return {
            ...value,
            [TABLE_COLUMNS.CHANNEL_LINK]: getYouTubeChannelLink(
                value[TABLE_COLUMNS.CHANNEL_ID]
            ),
        };
    });
    return result;
};

const onSubmit = async (e) => {
    e.preventDefault(); // Prevent the form from submitting

    showLoading();

    try {
        const values = getFormFiles();
        if (!values) {
            hideLoading();
            return;
        }
        // console.log("values:", values);

        const allCsvData = await getAllCsvData(values);
        // console.log("allCsvData:", allCsvData);

        const tableData = convertTableData(allCsvData);
        // console.log("tableData", tableData);

        exportExcel(tableData);
        // setTableData(dataTable);
    } catch (error) {
        console.log("error:", error);
    }

    hideLoading();
};

const submitBtn = getSubmitBtn();
submitBtn.on("click", onSubmit);
