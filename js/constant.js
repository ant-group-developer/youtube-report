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

    AFFILIATE_PAYMENT_SUMMARY: {
        requiredAny: [/_affiliate_payment_summary_/i],
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
    US_SOURECED_REVENUE: "US Sourced Revenue",
    TAX_WITHHOLDING_RATE: "Tax Withholding Rate",
    TAX_WITHHELD_AMOUNT: "Tax Withheld Amount",
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
    },
    {
        name: TABLE_COLUMNS.TAX_WITHHOLDING_RATE,
        key: TABLE_COLUMNS.TAX_WITHHOLDING_RATE,
        width: 20,
        align: "right",
    },
    {
        name: TABLE_COLUMNS.TAX_WITHHELD_AMOUNT,
        key: TABLE_COLUMNS.TAX_WITHHELD_AMOUNT,
        width: 20,
        align: "right",
    },
    {
        name: TABLE_COLUMNS.REVENUE,
        key: TABLE_COLUMNS.REVENUE,
        width: 20,
        align: "right",
    },
    {
        name: TABLE_COLUMNS.DEDUCTION_AMOUNT,
        key: TABLE_COLUMNS.DEDUCTION_AMOUNT,
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
];
