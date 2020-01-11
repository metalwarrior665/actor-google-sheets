## Version 2
#### 2019-11-17
- Removed support for Apify Crawler (this product has been removed)
- Webhooks work out of the box without need to change payload template (for tasks).
- Input - `datasetOrExecutionId` changed to `datasetId`.
- Added sections to input (only visual change)

#### 2019-12-31
- Fixed: Excess rows/columns were wrongly trimmed if the range was not the first sheet. May have caused removal of data in the first sheet.

#### 2020-01-11
- **Warning!**: For running this actor's code outside of `lukaskrivka/google-sheets` official version, you will need to create your own Google Dev Console project and provide your own keys to the input! This change will apply to older versions as well!
- Added: Option to read from public spreadsheets without authorization (pass `publicSpreadsheet: true` to the input).
