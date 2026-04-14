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

- **Auto Import Data**: Upload a batch of YouTube report CSVs and let the system automatically detect file types based on naming rules.
- **Manual Import Data**: Manually classify and upload specific CSVs (Ads Revenue, Paid Features, Subscription Red, YouTube Shorts, etc.).
- **Revenue Aggregation**: Automatically aggregates channel earnings, US-sourced revenue, tax withholdings, adjustments, and deductions.
- **Search and Pagination**: Quickly find specific channels using the search bar and navigate through large datasets with built-in pagination.
- **Excel Export**: Export the aggregated report table seamlessly to an `.xlsx` file for offline use.

## Configuration

Since this is a vanilla JS application running locally, there are no environment variables or server ports to configure. You can customize the table structure or logic by editing the following files:

| File / Folder | Description |
|----------|-------------|
| `css/style.css` | Custom layout and UI styling |
| `js/constant.js` | CSV column mappings and file matching rules |
| `js/data.js` | Data processing and CSV parsing logic |
| `js/index.js` | Modal handling and main functional flows |

## Documentation

- **Dependencies included**: 
  - [Bootstrap 5.3.7](https://getbootstrap.com/docs/5.3/getting-started/introduction/) for styling.
  - [jQuery 3.7.1](https://jquery.com/) for DOM manipulation.
  - [PapaParse 5.4.1](https://www.papaparse.com/) for fast CSV parsing in-browser.
  - [ExcelJS 4.4.0](https://github.com/exceljs/exceljs) for generating Excel export files.

## License

MIT
