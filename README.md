# YouTube Report Analytic

A client-side web application for importing, aggregating, and analyzing YouTube revenue CSV reports.

## Quick Start

1. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/ant-group-developer/youtube-report.git
   ```
2. Open the `index.html` file in any modern web browser.
3. No server setup, Node.js, or database is required as the app runs entirely in your browser.

## Features

- **Import Data**: Select a folder containing YouTube reports and a month. The system automatically scans for `.csv` files and assigns them to the correct report type based on our parsing rules. While importing, a progress bar shows the file being read, MB read and elapsed time, and the import can be cancelled; errors are shown in the dialog.
- **In-Memory ZIP Extraction**: Automatically detects `.zip` and `.csv.zip` packages provided by YouTube. It efficiently evaluates their internal files, reads matching reports directly into memory, and instantly skips irrelevant large files—all without unzipping anything to your disk.
- **Unused File Management**: Detects duplicate or junk `.csv` and `.zip` files sitting unused in your local folder, allowing you to individually or bulk delete them straight from the UI to free up space.
- **Revenue Aggregation**: Aggregates Partner Revenue per channel from every revenue source YouTube reports: Ads, Ads Adjustments, Subscription (Red / Red Music) and its adjustments, Audio Tier, Shorts (Ads, Subscription, Music Dynamic Pool), Paid Features, Shopping Affiliate and PfEdu (from the affiliate payment summary), plus channel adjustments (monetization disabled / credit appeal), US-sourced revenue and tax withholdings.
  - Audio Tier reports have no Channel ID: revenue is matched to channels by Video ID using the Ads / Subscription reports; unmatched videos are grouped into one row.
  - The Shorts Music Dynamic Pool report only has totals per country, no channel breakdown: it is shown as its own row.
- **Revenue by Source**: Shows the total of each revenue source and the file it came from, to reconcile with the Payment summary in YouTube Studio.
- **Amounts**: Shown with 2 decimal places in the table; the Excel export keeps full-precision values (displayed as `#,##0.00`), so totals and Excel `SUM` match the source reports.
- **Search and Pagination**: Quickly find specific channels using the search bar (filters after you stop typing) and navigate through large datasets with built-in pagination.
- **Excel Export**: Export the aggregated report table (or the current search results) to an `.xlsx` file named after the report folder and month, with progress shown on the button.

## Configuration

Since this is a vanilla JS application running locally, there are no environment variables or server ports to configure. You can customize the table structure or logic by editing the following files:

| File / Folder | Description |
|----------|-------------|
| `css/style.css` | Custom layout and UI styling |
| `js/constant.js` | CSV column mappings and file matching rules |
| `js/utils.js` | Streaming CSV parsing and file matching helpers |
| `js/index.js` | Folder scanning, import flow and revenue aggregation |
| `js/table.js` | Table, revenue by source, search, pagination and export |

## Documentation

- **Dependencies included**: 
  - [Bootstrap 5.3.7](https://getbootstrap.com/docs/5.3/getting-started/introduction/) for styling.
  - [jQuery 3.7.1](https://jquery.com/) for DOM manipulation.
  - [PapaParse 5.4.1](https://www.papaparse.com/) for fast CSV parsing in-browser.
- **Built-in streaming helpers** (no extra libraries, using the browser's native `CompressionStream` / `DecompressionStream`):
  - `js/zip.js` reads YouTube's zip packages entry by entry and writes zip files, without loading whole files into memory.
  - `js/excel.js` generates the `.xlsx` export row block by row block, so reports with hundreds of thousands of channels export without running out of memory.

## License

MIT
