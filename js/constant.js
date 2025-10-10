const BUTTON_SUBMIT_MANUAL_ID = "button-submit-manual";
const BUTTON_SUBMIT_AUTO_ID = "button-submit-auto";

const MODAL_MANUAL_ID = "form-modal-manual";
const MODAL_AUTO_ID = "form-modal-auto";

const FILE_NAME_TEMPLATES = {
    ADS_ADJUSTMENTS_REVENUE: [
        "adjustment_month_video_summary_",
        "_ADJ_video_summary_",
    ],
    ADS_REVENUE: [
        "ads_partner_revenue_month_video_summary_",
        "_video_summary_",
    ],
    PAID_FEATURES: ["paid_features_M_"],
    SUBSCRIPTION_REVENUE_RED: [
        "red_month_subscription_video_non_music_v",
        "red_rawdata_video_",
    ],
    SUBSCRIPTION_REVENUE_RED_MUSIC: [
        "red_month_subscription_video_v",
        "red_music_rawdata_video_",
    ],
    YOUTUBE_SHORTS_ADS: [
        "youtube_shorts_ads_revenue_month_youtube_shorts_ads_video_summary_",
        "monthly_shorts_non_music_ads_video_summary_",
    ],
    YOUTUBE_SHORTS_SUBSCRIPTION: [
        "youtube_shorts_subscription_revenue_month_youtube_shorts_subscription_video_summary_",
        "monthly_shorts_non_music_subscription_video_summary_",
    ],
};

const CSV_COLUMNS = {
    CHANNEL_ID: "Channel ID",
    CHANNEL_DISPLAY_NAME: "Channel Display Name",
    PARTNER_REVENUE: "Partner Revenue",
    EARNINGS: "Earnings (USD)",
    NET_PARTNER_REVENUE: "Net Partner Revenue (Post revshare)",
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
        name: TABLE_COLUMNS.TOTAL_REVENUE,
        key: TABLE_COLUMNS.TOTAL_REVENUE,
        width: 20,
        align: "right",
    },
    // {
    //     name: TABLE_COLUMNS.ANT_SHARE,
    //     key: TABLE_COLUMNS.ANT_SHARE,
    //     width: 20,
    //     align: "right",
    // },
];
