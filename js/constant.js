const BUTTON_SUBMIT_IMPORT_ID = "button-submit-import";

const MODAL_IMPORT_ID = "form-modal-import";

// ---- Rules (regex rõ ràng, tránh “_video_summary_” đụng hàng) --------------
// Lưu ý: dùng case-insensitive, chặn nhầm bằng forbidden.
const RULES = {
    YOUTUBE_SHORTS_SUBSCRIPTION: {
        requiredAny: [
            /youtube_shorts_subscription_revenue_month_youtube_shorts_subscription_video_summary/i,
            /monthly_shorts_non_music_subscription_video_summary/i,
        ],
        forbidden: [, /(?:^|[_-])week(?:[_-]|$)/i, /(?:^|[_-])day(?:[_-]|$)/i],
    },

    YOUTUBE_SHORTS_ADS: {
        requiredAny: [
            /youtube_shorts_ads_revenue_month_youtube_shorts_ads_video_summary/i,
            /monthly_shorts_non_music_ads_video_summary/i,
        ],
        forbidden: [, /(?:^|[_-])week(?:[_-]|$)/i, /(?:^|[_-])day(?:[_-]|$)/i],
    },

    SUBSCRIPTION_REVENUE_RED_MUSIC: {
        // Khớp cả định dạng "red_music_rawdata_video_*"
        // và định dạng "red_month_subscription_video_v1_1_YYYYMMDD"
        requiredAny: [
            /red_music_rawdata_video/i,
            /red_month_subscription_video/i,
        ],
        // Loại non-music + shorts
        forbidden: [
            /non[_-]?music/i,
            /shorts/i,
            /(?:^|[_-])week(?:[_-]|$)/i,
            /(?:^|[_-])day(?:[_-]|$)/i,
        ],
    },

    SUBSCRIPTION_REVENUE_RED: {
        // Red thường: rawdata hoặc month_subscription (non_music)
        // Bắt buộc có "non_music", vì "red_month_subscription_video_v1_1_*" là file Music
        requiredAny: [
            /red_rawdata_video/i,
            /red_month_subscription_video_non[_-]?music/i,
        ],
        // Loại shorts và music
        forbidden: [
            /shorts/i,
            /red_music/i,
            /(?:^|[_-])week(?:[_-]|$)/i,
            /(?:^|[_-])day(?:[_-]|$)/i,
        ],
    },

    SUBSCRIPTION_ADJUSTMENTS_REVENUE: {
        // Điều chỉnh doanh thu Red Music: "adjustment_subscription_month_subscription_video_*"
        // (cùng cấu trúc với file Red Music, kênh nằm ở cột "Video Channel ID")
        requiredAny: [
            /adjustment[_-]?subscription[_-]?month[_-]?subscription[_-]?video/i,
        ],
        forbidden: [
            /non[_-]?music/i,
            /(?:^|[_-])week(?:[_-]|$)/i,
            /(?:^|[_-])day(?:[_-]|$)/i,
        ],
    },

    AUDIO_TIER_REVENUE: {
        // YouTube Music trên thiết bị: file chi tiết có "Video ID" nhưng không có "Channel ID"
        requiredAny: [/audio[_-]?tier[_-]?partner[_-]?revenue[_-]?month.*detailed/i],
        forbidden: [/(?:^|[_-])week(?:[_-]|$)/i, /(?:^|[_-])day(?:[_-]|$)/i],
    },

    SHORTS_POOL_REVENUE: {
        // Shorts Music Dynamic Pool (tên trong Payment summary), số theo quốc gia:
        // "shorts_partner_revenue_month_shorts_summary_*", không có "Channel ID"
        requiredAny: [/(?:^|[_-])shorts[_-]?partner[_-]?revenue[_-]?month[_-]?shorts[_-]?summary/i],
        forbidden: [/(?:^|[_-])week(?:[_-]|$)/i, /(?:^|[_-])day(?:[_-]|$)/i],
    },

    PAID_FEATURES: {
        requiredAny: [/paid_features_month_paid_features/i, /paid_features[_-]m_/i],
        forbidden: [/(?:^|[_-])week(?:[_-]|$)/i, /(?:^|[_-])day(?:[_-]|$)/i],
    },

    ADS_ADJUSTMENTS_REVENUE: {
        requiredAny: [
            // match "..._ADJ_video_summary_..." hoặc "...-ADJ-video-summary-..."
            /(?:^|[_-])adj[_-]?video[_-]?summary(?:[_-]|$)/i,
            /adjustment[_-]?month[_-]?video[_-]?summary/i,
        ],
        // pattern đã chứa "video_summary" nên không cần requiredAll
        forbidden: [
            /shorts/i,
            /subscription/i,
            /red[_-]?music/i,
            /red[_-]?raw?data/i,
            /(?:^|[_-])week(?:[_-]|$)/i,
            /(?:^|[_-])day(?:[_-]|$)/i,
        ],
    },

    ADS_REVENUE: {
        requiredAny: [
            /ads[_-]?partner[_-]?revenue[_-]?month[_-]?video[_-]?summary/i,
            // match "..._video_summary_..." nhưng không ăn nhầm ADJ vì đã có forbidden
            /(?:^|[_-])video[_-]?summary(?:[_-]|$)/i,
        ],
        // chặn nhầm sang Adjustments và các nhóm khác
        forbidden: [
            /adj/i,
            /adjustment/i,
            /shorts/i,
            /subscription/i,
            /red[_-]?music/i,
            /red[_-]?raw?data/i,
            /(?:^|[_-])week(?:[_-]|$)/i,
            /(?:^|[_-])day(?:[_-]|$)/i,
        ],
    },

    CUSTOM_ADJUSMENTS: {
        requiredAny: [
            /custom_month_channel_adjustments_/i,
            /channel_adjustments_summary_/i,
        ],
    },

    AFFILIATE_PAYMENT_SUMMARY: {
        requiredAny: [
            /_affiliate_payment_summary_/i,
            /custom_month_affiliate_tax_summary_/i,
        ],
    },
};

const CSV_COLUMNS = {
    CHANNEL_ID: "Channel ID",
    // File Red Music dạng "red_month_subscription_video_v1_1_*" không có "Channel ID"
    VIDEO_CHANNEL_ID: "Video Channel ID",
    CHANNEL_DISPLAY_NAME: "Channel Display Name",
    PARTNER_REVENUE: "Partner Revenue",
    EARNINGS: "Earnings (USD)",
    NET_PARTNER_REVENUE: "Net Partner Revenue (Post revshare)",
    ADJUSTMENT_TYPE: "Adjustment Type",
    DEDUCTION_AMOUNT: "Deduction Amount",
    US_SOURECED_REVENUE: "US Sourced Revenue",
    TAX_WITHHOLDING_RATE: "Tax Withholding Rate",
    TAX_WITHHELD_AMOUNT: "Tax Withheld Amount",
    LOCAL_CURRENCY: "Local Currency",
    VIDEO_ID: "Video ID",
    COUNTRY: "Country",
    SHORTS_PARTNER_REVENUE: "Shorts Partner Revenue (USD)",
    REVENUE_SOURCE: "Revenue Source",
    ADSENSE_EARNINGS_MONTH: "AdSense Earnings Month",
    TOTAL_REVENUE_BY_SOURCE: "Total Revenue By Source",
};

// Nguồn doanh thu chỉ có trong affiliate payment summary (không có report doanh thu riêng).
// Các nguồn còn lại của file này (Ads, Premium, Shorts, Paid Features...) đã được tính từ report tương ứng.
// Revenue Source để trống là khoản thưởng (vd. "Shopping Affiliate Bonus" trong Payment summary).
const AFFILIATE_ONLY_SOURCES = {
    SHOPPING_AFFILIATE: {
        LABEL: "Shopping Affiliate",
        test: (source) => /shopping/i.test(source),
    },
    PFEDU: {
        LABEL: "YouTube PfEdu",
        test: (source) => /pfedu/i.test(source),
    },
    OTHER: {
        LABEL: "Other (no revenue source)",
        test: (source) => source === "",
    },
};

// Các nguồn dữ liệu của một lần import, theo thứ tự hiển thị trong bảng tổng theo nguồn.
// dataKey: dữ liệu trong getAllCsvData; fileKey: file trong getImportFiles;
// type: "revenue" (cộng Partner Revenue), "deduction" (khấu trừ / cộng lại của kênh), "tax" (chỉ thông tin thuế);
// optional: chỉ liệt kê trong bảng tổng khi có doanh thu.
// Vị trí trong danh sách là bit đánh dấu kênh có trong nguồn đó (lọc "giữ kênh của file nguồn").
const DATA_SOURCES = [
    { dataKey: "dataAdsRevenue", fileKey: "adsRevenueFile", label: "Ads Revenue", type: "revenue" },
    { dataKey: "dataAdsAdjustmentsRevenue", fileKey: "adsAdjustmentsRevenueFile", label: "Ads Adjustments", type: "revenue" },
    { dataKey: "dataSubscriptionRevenueRedMusic", fileKey: "subscriptionRevenueRedMusicFile", label: "Subscription Red Music", type: "revenue" },
    { dataKey: "dataSubscriptionRevenueRed", fileKey: "subscriptionRevenueRedFile", label: "Subscription Red", type: "revenue" },
    { dataKey: "dataSubscriptionAdjustmentsRevenue", fileKey: "subscriptionAdjustmentsRevenueFile", label: "Subscription Adjustments", type: "revenue" },
    { dataKey: "dataAudioTierRevenue", fileKey: "audioTierRevenueFile", label: "Audio Tier", type: "revenue" },
    { dataKey: "dataYoutubeShortsAds", fileKey: "youtubeShortsAdsFile", label: "Shorts Ads", type: "revenue" },
    { dataKey: "dataYoutubeShortsSubscription", fileKey: "youtubeShortsSubscriptionFile", label: "Shorts Subscription", type: "revenue" },
    { dataKey: "dataShortsPoolRevenue", fileKey: "shortsPoolRevenueFile", label: "Shorts (Music Dynamic Pool)", type: "revenue" },
    { dataKey: "dataPaidFeatures", fileKey: "paidFeaturesFile", label: "Paid Features", type: "revenue" },
    { dataKey: "dataShoppingAffiliateRevenue", fileKey: "affiliatePaymentSummaryFile", label: AFFILIATE_ONLY_SOURCES.SHOPPING_AFFILIATE.LABEL, type: "revenue", optional: true },
    { dataKey: "dataPfEduRevenue", fileKey: "affiliatePaymentSummaryFile", label: AFFILIATE_ONLY_SOURCES.PFEDU.LABEL, type: "revenue", optional: true },
    { dataKey: "dataOtherAffiliateRevenue", fileKey: "affiliatePaymentSummaryFile", label: AFFILIATE_ONLY_SOURCES.OTHER.LABEL, type: "revenue", optional: true },
    { dataKey: "dataCustomAdjustments", fileKey: "customAdjustmentsFile", label: "Channel Adjustments", type: "deduction" },
    { dataKey: "dataAffiliatePaymentSummary", fileKey: "affiliatePaymentSummaryFile", label: "Affiliate Summary (Tax)", type: "tax" },
];

// Doanh thu không gắn được vào kênh (report không có Channel ID) được gom thành dòng riêng trong bảng
const NO_CHANNEL_ROWS = {
    SHORTS_POOL: {
        KEY: "no-channel:shorts-pool",
        NAME: "YouTube Shorts revenue (Music Dynamic Pool, no channel breakdown)",
    },
    AUDIO_TIER: {
        KEY: "no-channel:audio-tier",
        NAME: "Audio Tier revenue (video not matched to a channel)",
    },
};

const MATH_OPERATIONS = {
    PLUS: "Plus",
    MINUS: "Minus",
};

const ADJUSTMENT_TYPES = {
    MONETIZATION_DISABLED: {
        VALUE: "MONETIZATION DISABLED",
        OPERATION: MATH_OPERATIONS.MINUS,
        CLASS_NAME: "bg-danger-subtle text-danger-emphasis",
    },
    CREDIT_APPEAL: {
        VALUE: "CREDIT - APPEAL",
        OPERATION: MATH_OPERATIONS.PLUS,
        CLASS_NAME: "bg-success-subtle text-success-emphasis",
    },
};

const TABLE_COLUMNS = {
    CHANNEL_ID: "UC",
    CHANNEL_NAME: "Name",
    CHANNEL_LINK: "Link",
    US_REVENUE: "US Revenue",
    TAX_WITHHOLDING_RATE: "Tax Withholding Rate",
    TAX_WITHHELD_AMOUNT: "Tax Withheld Amount",
    REVENUE: "Revenue",
    DEDUCTION_AMOUNT: "Adjustment Amount",
    TOTAL_REVENUE: "Total Revenue",
    NOTE: "Note",
};

// numFmt: "Amount" = số tiền (hiển thị 2 chữ số thập phân, ô vẫn giữ giá trị gốc); "General" = giữ nguyên
const EXCEL_COLUMNS = [
    {
        name: TABLE_COLUMNS.CHANNEL_ID,
        key: TABLE_COLUMNS.CHANNEL_ID,
        width: 35,
        align: "left",
    },
    {
        name: TABLE_COLUMNS.CHANNEL_NAME,
        key: TABLE_COLUMNS.CHANNEL_NAME,
        width: 45,
        align: "left",
    },
    {
        name: TABLE_COLUMNS.CHANNEL_LINK,
        key: TABLE_COLUMNS.CHANNEL_LINK,
        width: 45,
        align: "left",
    },
    {
        name: TABLE_COLUMNS.US_REVENUE,
        key: TABLE_COLUMNS.US_REVENUE,
        width: 20,
        align: "right",
        numFmt: "Amount",
    },
    {
        name: TABLE_COLUMNS.TAX_WITHHOLDING_RATE,
        key: TABLE_COLUMNS.TAX_WITHHOLDING_RATE,
        width: 20,
        align: "right",
        numFmt: "General",
    },
    {
        name: TABLE_COLUMNS.TAX_WITHHELD_AMOUNT,
        key: TABLE_COLUMNS.TAX_WITHHELD_AMOUNT,
        width: 20,
        align: "right",
        numFmt: "Amount",
    },
    {
        name: TABLE_COLUMNS.REVENUE,
        key: TABLE_COLUMNS.REVENUE,
        width: 20,
        align: "right",
        numFmt: "Amount",
    },
    {
        name: TABLE_COLUMNS.DEDUCTION_AMOUNT,
        key: TABLE_COLUMNS.DEDUCTION_AMOUNT,
        width: 20,
        align: "right",
        numFmt: "Amount",
    },
    {
        name: TABLE_COLUMNS.TOTAL_REVENUE,
        key: TABLE_COLUMNS.TOTAL_REVENUE,
        width: 20,
        align: "right",
        numFmt: "Amount",
    },
    {
        name: TABLE_COLUMNS.NOTE,
        key: TABLE_COLUMNS.NOTE,
        width: 35,
        align: "left",
    },
];
