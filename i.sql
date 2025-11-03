PartnerRevenueByTable = 
UNION (
    ROW ( "Table Name", "YouTube_BugTV_Ecommerce_paid_features_M_20250801_20250831_v1-1", "Partner Revenue", CALCULATE ( SUM ( 'YouTube_BugTV_Ecommerce_paid_features_M_20250801_20250831_v1-1'[Earnings (USD)] ) ) ),
    ROW ( "Table Name", "YouTube_BugTV_M_202508_channel_adjustments_summary_v1-0 (1)", "Partner Revenue", CALCULATE ( SUM ( 'YouTube_BugTV_M_202508_channel_adjustments_summary_v1-0 (1)'[Deduction Amount] ) ) ),
    ROW ( "Table Name", "YouTube_BugTV_M_20250801_20250831_monthly_shorts_non_music_ads_video_summary_v1-", "Partner Revenue", CALCULATE ( SUM ( 'YouTube_BugTV_M_20250801_20250831_monthly_shorts_non_music_ads_video_summary_v1-'[Net Partner Revenue (Post revshare)] ) ) ),
    ROW ( "Table Name", "YouTube_BugTV_M_20250801_20250831_monthly_shorts_non_music_subscription_video_su", "Partner Revenue", CALCULATE ( SUM ( 'YouTube_BugTV_M_20250801_20250831_monthly_shorts_non_music_subscription_video_su'[Partner Revenue] ) ) ),
    ROW ( "Table Name", "YouTube_BugTV_M_20250801_20250831_red_music_rawdata_video_v1-1", "Partner Revenue", CALCULATE ( SUM ( 'YouTube_BugTV_M_20250801_20250831_red_music_rawdata_video_v1-1'[Partner Revenue] ) ) ),
    ROW ( "Table Name", "YouTube_BugTV_M_20250801_ADJ_video_summary_v1-1", "Partner Revenue", CALCULATE ( SUM ( 'YouTube_BugTV_M_20250801_ADJ_video_summary_v1-1'[Partner Revenue] ) ) ),
    ROW ( "Table Name", "YouTube_BugTV_M_20250801_video_summary_v1-1", "Partner Revenue", CALCULATE ( SUM ( 'YouTube_BugTV_M_20250801_video_summary_v1-1'[Partner Revenue] ) ) )
)

PartnerRevenueByTable = 
UNION (
    ROW ( "Table Name", "YouTube_Tourn_International_AB_Ecommerce_paid_features_M_20250701_20250731_v1-1", "Partner Revenue", CALCULATE ( SUM ( 'YouTube_Tourn_International_AB_Ecommerce_paid_features_M_20250701_20250731_v1-1'[Earnings (USD)] ) ) ),
    ROW ( "Table Name", "youtube_shorts_subscription_revenue_month_youtube_shorts_subscription_video_summ", "Partner Revenue", CALCULATE ( SUM ( 'youtube_shorts_subscription_revenue_month_youtube_shorts_subscription_video_summ'[Partner Revenue] ) ) ),
    ROW ( "Table Name", "youtube_shorts_ads_revenue_month_youtube_shorts_ads_video_summary_v1_0_20250701", "Partner Revenue", CALCULATE ( SUM ( 'youtube_shorts_ads_revenue_month_youtube_shorts_ads_video_summary_v1_0_20250701'[Net Partner Revenue (Post revshare)] ) ) ),
    ROW ( "Table Name", "red_month_subscription_asset_v1_1_20250701", "Partner Revenue", CALCULATE ( SUM ( 'red_month_subscription_asset_v1_1_20250701'[Partner Revenue] ) ) ),
    ROW ( "Table Name", "red_month_subscription_asset_non_music_v1_1_20250701", "Partner Revenue", CALCULATE ( SUM ( 'red_month_subscription_asset_non_music_v1_1_20250701'[Partner Revenue] ) ) ),
    ROW ( "Table Name", "ads_partner_revenue_month_asset_summary_v1_1_20250701", "Partner Revenue", CALCULATE ( SUM ( 'ads_partner_revenue_month_asset_summary_v1_1_20250701'[Partner Revenue] ) ) ),
    ROW ( "Table Name", "adjustment_month_asset_summary_v1_1_20250701", "Partner Revenue", CALCULATE ( SUM ( 'adjustment_month_asset_summary_v1_1_20250701'[Partner Revenue] ) ) )
)