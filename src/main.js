const Apify = require('apify');
const { google } = require('googleapis');
const { apifyGoogleAuth } = require('apify-google-auth');

const processMode = require('./modes.js');
const { loadFromApify, loadFromSpreadsheet } = require('./loaders.js');
const upload = require('./upload.js');
const { saveBackup, evalFunction } = require('./utils.js');

const MAX_CELLS = 2 * 1000 * 1000;

Apify.main(async () => {
    let input = await Apify.getValue('INPUT');
    console.log('input');
    console.dir(input);

    // Hack to handle crawler webhooks
    if (input.data) {
        let parsedData;
        try {
            parsedData = JSON.parse(input.data);
        } catch(e) {
            throw new Error('Data from crawler webhook could not be parsed with error:',e);
        }
        input = { ...parsedData, datasetOrExecutionId: input._id };
        console.log('We parsed the data into input:');
        console.dir(input);
    }

    const {
        spreadsheetId,
        mode,
        datasetOrExecutionId,
        filterByField,
        filterByEquality,
        createBackup,
        tokensStore,
        limit,
        offset,
        range,
        backupStore,
        transformFunction,
    } = input;

    // Parsing stringified function
    const parsedTransformFunction = await evalFunction(transformFunction);

    // Authenticate
    const authOptions = {
        scope: "spreadsheets",
        tokensStore,
    };
    const auth = await apifyGoogleAuth(authOptions);

    // Load sheets metadata
    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
    const { title: firstSheetName, sheetId: firstSheetId } = spreadsheetMetadata.data.sheets[0].properties;
    console.log('name of the first sheet', firstSheetName);
    console.log('id of the first sheet', firstSheetId, "\n");

    const spreadsheetRange = range || firstSheetName;

    // Log info
    console.log(`Spreadsheets setup:`);
    console.log('Mode:', mode);
    console.log('Spreadsheet id:', spreadsheetId);
    console.log('Range:', spreadsheetRange);
    console.log('Filter by field:', filterByField);
    console.log('Filter by equality:', filterByEquality, "\n");

    // Load data from Apify
    const newObjects = await loadFromApify({ mode, datasetOrExecutionId, limit, offset });

    // Load data from spreadsheet
    const values = await loadFromSpreadsheet({ sheets, spreadsheetId, spreadsheetRange });

    // Processing data (different for each mode)
    const rowsToInsert = await processMode({ mode, values, newObjects, filterByField, filterByEquality, transformFunction: parsedTransformFunction, backupStore });

    // Save backup
    await saveBackup(createBackup, values);

    // Upload to spreadsheet
    await upload({ spreadsheetId, spreadsheetRange, rowsToInsert, values, sheets, firstSheetId, maxCells: MAX_CELLS });

    console.log('Finishing actor...');
    console.log('URL of the updated spreadsheet:');
    console.log(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
})

