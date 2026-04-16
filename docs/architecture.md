# Data Mapping & Application Logic Architecture

This document explains the core logic, CSV mapping processes, and how data flows through the **YouTube Report Analytic** application.

## 1. System Overview

The app entirely lives in the browser (Vanilla JS, HTML, CSS) and uses:
- **PapaParse**: To parse incoming CSV files locally on the client machine.
- **ExcelJS**: To export the aggregated data back into an `.xlsx` format.
- A central map to track each channel by its `Channel ID` taking into account various revenue and deduction types.

## 2. CSV File Types & Auto-Detection Logic

The system categorizes uploaded files into different revenue types to map them correctly. The `RULES` object in `js/constant.js` handles auto-detection via Regular Expressions.

| Revenue Type | Regex Rules / Expected Naming |
|---|---|
| **YouTube Shorts Subscription** | `youtube_shorts_subscription...` or `monthly_shorts_...` |
| **YouTube Shorts Ads** | `youtube_shorts_ads...` |
| **Subscription Revenue Red Music** | `red_music_rawdata_video...` or `red_month_subscription_video...` *(Excludes non-music/shorts)* |
| **Subscription Revenue Red** | `red_rawdata_video...` or `red_month_subscription_video...` *(Excludes music/shorts)* |
| **Paid Features** | `paid_features_month_paid_features...` or `...paid_features_m_...` |
| **Ads Adjustments Revenue** | `adj_video_summary...` |
| **Ads Revenue** | `ads_partner_revenue...` |
| **Custom Adjustments** | `custom_month_channel_adjustments...` |
| **Affiliate Payment Summary** | `_affiliate_payment_summary_...` |

> **Note**: For edge cases where files overlap in names, the `forbidden` regex ensures a file isn't incorrectly bucketed (e.g., stopping an `Ads Revenue` file from being classified as an `Ads Adjustment`).

### File Handling & ZIP Extraction Logic

When using the **Select Folder** (Auto Import) mode:
1. **File System Access API**: Reads all files natively from the chosen local directory. This enables accurate disk-level tracking, identifying any `.csv` or `.zip` files that yielded no matching reports so users can bulk-delete "junk" files directly from the browser UI.
2. **In-Memory Decompression**: Uses `JSZip` to process `.zip` and `.csv.zip` files. It evaluates the inner filenames, matches them against the regex `RULES`, and unpacks necessary reports transparently into memory as virtual `File` objects.
3. **Ultra-Optimization**: Since YouTube analytics sometimes downloads immense video-level reports (up to ~750MB unpacked), the system leverages string-matching on `.csv.zip` outer filenames. Huge irrelevant packages are completely skipped by `JSZip`, drastically saving client CPU and Memory.

## 3. CSV Columns Mapping

The app extracts specific fields from the CSV files using exact column headers `CSV_COLUMNS` defined in `constant.js`:

| Extracted Field | Mapped From CSV Column Header |
|---|---|
| Channel ID | `Channel ID` |
| Channel Display Name | `Channel Display Name` |
| Revenue / Target Amount | `Partner Revenue`, `Earnings (USD)`, `Net Partner Revenue...` |
| Adjustment Type | `Adjustment Type` (For custom adjustments) |
| Deduction Amount | `Deduction Amount` |
| US Sourced Revenue | `US Sourced Revenue` |
| Tax Withholding Rate | `Tax Withholding Rate` |
| Tax Withheld Amount | `Tax Withheld Amount` |

## 4. Aggregation Logic

The data aggregation relies on mapping all incoming rows from all uploaded files into an aggregated structure grouped by `Channel ID` (the unique identifier).

### Rules for Processing

1. **New Channels**: When a new `Channel ID` is observed, an initial data shell is created:
   ```js
   {
       "UC": <ChannelId>,
       "Name": <ChannelName>,
       "US Revenue": 0,
       "Tax Withholding Rate": 0,
       "Tax Withheld Amount": 0,
       "Revenue": 0,
       "Adjustment Amount": 0,
       "Total Revenue": 0,
       "Note": ""
   }
   ```
2. **Revenue Addition** (`processRevenueData`): 
   All streams of revenue (Ads, Red Subscription, Shorts, Paid Features, etc.) increment the `Revenue` attribute and sequentially stack onto the `Total Revenue`.
3. **Deductions & Adjustments** (`processDeductionData`):
    - **`MONETIZATION DISABLED`**: The amount is treated as a penalty (amount is multiplied by `-1`).
    - **`CREDIT - APPEAL`**: Treated as positive revenue matching.
    - These specific adjustments alter the `Total Revenue`.
4. **Affiliate Payments/Taxes** (`processAffiliatePaymentData`):
   - Mapped over onto `US Revenue`, `Tax Withheld Amount`, and updating the `Tax Withholding Rate`.

## 5. View vs. Excel Format

After aggregation, the logic converts numerical data using `.toFixed(2)` for standardized UI rendering and calculates the final `Total Revenue`.

The exact list of columns available dynamically in the DOM and Export `EXCEL_COLUMNS` are:
1. `UC` (Channel ID)
2. `Name`
3. `Link` (Auto-generated using YouTube's channel URL logic)
4. `US Revenue`
5. `Tax Withholding Rate`
6. `Tax Withheld Amount`
7. `Revenue`
8. `Adjustment Amount`
9. `Total Revenue`
10. `Note` (captures details like adjustment type tags)
