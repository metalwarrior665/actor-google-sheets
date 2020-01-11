const Apify = require('apify');
const { google } = require('googleapis');
const { apifyGoogleAuth } = require('apify-google-auth');

const processMode = require('./modes.js');
const { loadFromApify, loadFromSpreadsheet } = require('./loaders.js');
const upload = require('./upload.js');
const { saveBackup, retryingRequest, handleRequestError } = require('./utils.js');
const validateAndParseInput = require('./validate-parse-input.js');

const MAX_CELLS = 2 * 1000 * 1000;

Apify.main(async () => {
    const input = await Apify.getValue('INPUT');
    console.log('input');
    console.dir({ ...input, parsedData: 'not diplayed, check input tab directly...' });

    console.log('\nPHASE - PARSING INPUT\n');

    // We automatically make a webhook to work
    if (input.resource && input.resource.defaultDatasetId && !input.datasetId) {
        input.datasetId = input.resource.defaultDatasetId;
    }

    const {
        spreadsheetId,
        publicSpreadsheet = false,
        mode,
        datasetId,
        deduplicateByField,
        deduplicateByEquality,
        createBackup,
        tokensStore,
        limit,
        offset,
        range,
        backupStore,
    } = input;

    const { rawData, transformFunction } = await validateAndParseInput(input);
    console.log('Input parsed...');

    // We have to do this to get rid of the global env var so it cannot be stolen in the user functions
    const apiKey = process.env.API_KEY;
    delete process.env.API_KEY;

    let auth;
    if (!publicSpreadsheet) {
        // Authenticate
        console.log('\nPHASE - AUTHORIZATION\n');
        const authOptions = {
            scope: 'spreadsheets',
            tokensStore,
        };

        // I have to reviews security of our internal tokens. Right now, they are opened in my KV. So probably save to secret env var?
        auth = await apifyGoogleAuth(authOptions);
        console.log('Authorization completed...');
    } else {
        console.log('\nPHASE - SKIPPING AUTHORIZATION (public spreadsheet)\n');
    }

    // Load sheets metadata
    console.log('\nPHASE - LOADING SPREADSHEET METADATA\n');
    const sheets = google.sheets({ version: 'v4', auth: auth || apiKey });

    const spreadsheetMetadata = await retryingRequest(sheets.spreadsheets.get({ spreadsheetId })).catch((e) => handleRequestError(e, 'Getting spreadsheet metadata'));
    const sheetsMetadata = spreadsheetMetadata.data.sheets.map((sheet) => sheet.properties);
    const { title: firstSheetName, sheetId: firstSheetId } = sheetsMetadata[0];
    console.log('name of the first sheet:', firstSheetName);
    console.log('id of the first sheet:', firstSheetId);

    const spreadsheetRange = range || firstSheetName;

    // This is important for trimming excess rows/columns
    let targetSheetId;
    if (!range) {
        targetSheetId = firstSheetId;
    } else {
        const maybeTargetSheet = sheetsMetadata.find((sheet) => range.startsWith(sheet.title));
        if (maybeTargetSheet) {
            targetSheetId = maybeTargetSheet.sheetId;
        } else {
            console.log('ERROR: Cannot find target sheet! Excess cells will not be trimmed.');
        }
    }
    console.log('Target sheet id:', targetSheetId);

    // Log info
    console.log('\nPHASE - SPREADSHEET SETUP:\n');
    console.log('Mode:', mode);
    console.log('Spreadsheet id:', spreadsheetId);
    console.log('Range:', spreadsheetRange);
    console.log('Deduplicate by field:', deduplicateByField || false);
    console.log('deduplicated by equality:', deduplicateByEquality || false, '\n');

    // Load data from Apify
    console.log('\nPHASE - LOADING DATA FROM APIFY\n');
    const newObjects = rawData.length > 0
        ? rawData
        : await loadFromApify({ mode, datasetId, limit, offset });
    console.log('Data loaded from Apify...');

    // Load data from spreadsheet
    console.log('\nPHASE - LOADING DATA FROM SPREADSHEET\n');
    const values = await loadFromSpreadsheet({ sheets, spreadsheetId, spreadsheetRange });
    console.log(`${values ? values.length : 0} rows loaded from spreadsheet`);

    // Processing data (different for each mode)
    console.log('\nPHASE - PROCESSING DATA\n');
    const rowsToInsert = await processMode({ mode, values, newObjects, deduplicateByField, deduplicateByEquality, transformFunction, backupStore }); // eslint-disable-line
    console.log('Data processed...');

    // Save backup
    if (createBackup) {
        console.log('\nPHASE - SAVING BACKUP\n');
        await saveBackup(createBackup, values);
        console.log('Backup saved...');
    }

    // Upload to spreadsheet
    console.log('\nPHASE - UPLOADING TO SPREADSHEET\n');
    await upload({ spreadsheetId, spreadsheetRange, rowsToInsert, values, sheets, targetSheetId, maxCells: MAX_CELLS });
    console.log('Data uploaded...');

    console.log('\nPHASE - ACTOR FINISHED\n');
    console.log('URL of the updated spreadsheet:');
    console.log(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
});
