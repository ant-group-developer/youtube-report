const BUTTON_SUBMIT_MANUAL_ID = "button-submit-manual";
const BUTTON_SUBMIT_AUTO_ID = "button-submit-auto";

const MODAL_MANUAL_ID = "form-modal-manual";
const MODAL_AUTO_ID = "form-modal-auto";

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
        requiredAny: [/red_rawdata_video/i, /red_month_subscription_video/i],
        // Loại shorts và music
        forbidden: [
            /shorts/i,
            /red_music/i,
            /(?:^|[_-])week(?:[_-]|$)/i,
            /(?:^|[_-])day(?:[_-]|$)/i,
        ],
    },

    PAID_FEATURES: {
        requiredAny: [/paid_features[_-]m_/i], // khớp cả ...Ecommerce_paid_features_M_...
        forbidden: [, /(?:^|[_-])week(?:[_-]|$)/i, /(?:^|[_-])day(?:[_-]|$)/i],
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
};

const CSV_COLUMNS = {
    CHANNEL_ID: "Channel ID",
    CHANNEL_DISPLAY_NAME: "Channel Display Name",
    PARTNER_REVENUE: "Partner Revenue",
    EARNINGS: "Earnings (USD)",
    NET_PARTNER_REVENUE: "Net Partner Revenue (Post revshare)",
    ADJUSTMENT_TYPE: "Adjustment Type",
    DEDUCTION_AMOUNT: "Deduction Amount",
};

const MATH_OPERATIONS = {
    PLUS: "Plus",
    MINUS: "Minus",
};

const ADJUSTMENT_TYPES = {
    MONETIZATION_DISABLED: {
        VALUE: "MONETIZATION DISABLED",
        OPERATION: MATH_OPERATIONS.MINUS,
    },
    CREDIT_APPEAL: {
        VALUE: "CREDIT - APPEAL",
        OPERATION: MATH_OPERATIONS.PLUS,
    },
};

const TABLE_COLUMNS = {
    CHANNEL_ID: "UC",
    CHANNEL_NAME: "Name",
    CHANNEL_LINK: "Link",
    ADS_ADJUSTMENTS_REVENUE: "Ads Adjustments Revenue",
    ADS_REVENUE: "Ads Revenue",
    PAID_FEATURES: "Paid Features",
    SUBSCRIPTION_REVENUE_RED: "Subscription Revenue Red",
    SUBSCRIPTION_REVENUE_RED_MUSIC: "Subscription Revenue Red Music",
    YOUTUBE_SHORTS_ADS: "Youtube Shorts Ads",
    YOUTUBE_SHORTS_SUBSCRIPTION: "Youtube Shorts Subscription",
    TOTAL_REVENUE: "Total Revenue",
    ANT_SHARE: "ANT Share",
    NOTE: "Note",
    DEDUCTION: "Deduction Amount",
};

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
        name: TABLE_COLUMNS.ADS_ADJUSTMENTS_REVENUE,
        key: TABLE_COLUMNS.ADS_ADJUSTMENTS_REVENUE,
        width: 20,
        align: "right",
    },
    {
        name: TABLE_COLUMNS.ADS_REVENUE,
        key: TABLE_COLUMNS.ADS_REVENUE,
        width: 20,
        align: "right",
    },
    {
        name: TABLE_COLUMNS.PAID_FEATURES,
        key: TABLE_COLUMNS.PAID_FEATURES,
        width: 20,
        align: "right",
    },
    {
        name: TABLE_COLUMNS.SUBSCRIPTION_REVENUE_RED,
        key: TABLE_COLUMNS.SUBSCRIPTION_REVENUE_RED,
        width: 20,
        align: "right",
    },
    {
        name: TABLE_COLUMNS.SUBSCRIPTION_REVENUE_RED_MUSIC,
        key: TABLE_COLUMNS.SUBSCRIPTION_REVENUE_RED_MUSIC,
        width: 20,
        align: "right",
    },
    {
        name: TABLE_COLUMNS.YOUTUBE_SHORTS_ADS,
        key: TABLE_COLUMNS.YOUTUBE_SHORTS_ADS,
        width: 20,
        align: "right",
    },
    {
        name: TABLE_COLUMNS.YOUTUBE_SHORTS_SUBSCRIPTION,
        key: TABLE_COLUMNS.YOUTUBE_SHORTS_SUBSCRIPTION,
        width: 20,
        align: "right",
    },
    {
        name: TABLE_COLUMNS.DEDUCTION,
        key: TABLE_COLUMNS.DEDUCTION,
        width: 20,
        align: "right",
    },
    {
        name: TABLE_COLUMNS.TOTAL_REVENUE,
        key: TABLE_COLUMNS.TOTAL_REVENUE,
        width: 20,
        align: "right",
    },
    {
        name: TABLE_COLUMNS.NOTE,
        key: TABLE_COLUMNS.NOTE,
        width: 35,
        align: "left",
    },
    // {
    //     name: TABLE_COLUMNS.ANT_SHARE,
    //     key: TABLE_COLUMNS.ANT_SHARE,
    //     width: 20,
    //     align: "right",
    // },
];
