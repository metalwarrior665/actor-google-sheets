## Version 2
#### 2022-03-03
- Migrated to new SDK version which caused crashes for one day until hotfixed.
- Better error messages

#### 2020-10-08
- Fixed: A bug that prevented loading big amount of data from the spreadsheets (by upgrading `googleapis` version)
- Fixed: `transformFunction` was adding extra columns from the dataset even if they were renamed
- Fixed: Sub-array default sorting
- Feature: Added `keepSheetColumnOrder` option to input to prevent re-sorting data in your sheet

#### 2019-11-17
- Removed support for Apify Crawler (this product has been removed)
- Webhooks work out of the box without a need to change the payload template (for tasks).
- Input - `datasetOrExecutionId` changed to `datasetId`.
- Added sections to input (only visual change)

#### 2019-12-31
- Fixed: Excess rows/columns were wrongly trimmed if the range was not the first sheet. May have caused a removal of data in the first sheet.

#### 2020-01-11
- **Warning!**: For running this actor's code outside of `lukaskrivka/google-sheets` official version, you will need to create your own Google Dev Console project and provide your own keys to the input! This change will apply to older versions as well!
- Added: Option to read from public spreadsheets without authorization (pass `publicSpreadsheet: true` to the input).

#### 2020-04-24
- Added `columnsOrder` field so the user can define the order of columns

#### 2020-04-29
- New sheets (via `range` input) are now automatically created by the actor, no need to pre-create them anymore
