const Apify = require('apify');
const { google } = require('googleapis');
const { apifyGoogleAuth } = require('apify-google-auth');

const processMode = require('./modes.js');
const { loadFromApify, loadFromSpreadsheet } = require('./loaders.js');
const upload = require('./upload.js');
const { saveBackup, evalFunction } = require('./utils.js');
const { parseRawData } = require('./raw-data-parser.js');

const MAX_CELLS = 2 * 1000 * 1000;

Apify.main(async () => {
    let input = await Apify.getValue('INPUT');
    console.log('input');
    console.dir({ ...input, parsedData: "not diplayed, check input tab..." });

    console.log('\nPHASE - PARSING INPUT\n')

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
        rawData = [],
        deduplicateByField,
        deduplicateByEquality,
        createBackup,
        tokensStore,
        limit,
        offset,
        range,
        backupStore,
        transformFunction,
    } = input;

    // Input parsing
    const parsedRawData = await parseRawData({ mode, rawData })

    if (parsedRawData.length > 0 && datasetOrExecutionId) {
        throw new Error('WRONG INPUT! - Use only one of "rawData" and "datasetOrExecutionId"!')
    }

    if (
        ['replace', 'append'].includes(mode)
        && (typeof datasetOrExecutionId !== 'string' || datasetOrExecutionId.length !== 17)
        && parsedRawData.length === 0
    ) {
        throw new Error('WRONG INPUT! - datasetOrExecutionId field needs to be a string with 17 characters!')
    }
    if (mode !== 'load backup' && (typeof spreadsheetId !== 'string' || spreadsheetId.length !== 44)) {
        throw new Error('WRONG INPUT! - spreadsheetId field needs to be a string with 44 characters!')
    }

    console.log('Input parsed...')

    // Parsing stringified function
    let parsedTransformFunction
    if (transformFunction && transformFunction.trim()) {
        console.log('\nPHASE - PARSING TRANSFORM FUNCTION\n')
        parsedTransformFunction = await evalFunction(transformFunction);
        console.log('Transform function parsed...')
    }

    // Authenticate
    console.log('\nPHASE - AUTHORIZATION\n')
    const authOptions = {
        scope: "spreadsheets",
        tokensStore,
    };
    const auth = await apifyGoogleAuth(authOptions);
    console.log('Authorization completed...')

    // Load sheets metadata
    console.log('\nPHASE - LOADING SPREADSHEET METADATA\n')
    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
    const { title: firstSheetName, sheetId: firstSheetId } = spreadsheetMetadata.data.sheets[0].properties;
    console.log('name of the first sheet', firstSheetName);
    console.log('id of the first sheet', firstSheetId);

    const spreadsheetRange = range || firstSheetName;

    // Log info
    console.log(`\nPHASE - SPREADSHEET SETUP:\n`);
    console.log('Mode:', mode);
    console.log('Spreadsheet id:', spreadsheetId);
    console.log('Range:', spreadsheetRange);
    console.log('Deduplicate by field:', deduplicateByField || false);
    console.log('deduplicated by equality:', deduplicateByEquality || false, "\n");

    // Load data from Apify
    console.log('\nPHASE - LOADING DATA FROM APIFY\n')
    const newObjects = parsedRawData.length > 0
        ? parsedRawData
        : await loadFromApify({ mode, datasetOrExecutionId, limit, offset });
    console.log('Data loaded from Apify...')

    // Load data from spreadsheet
    console.log('\nPHASE - LOADING DATA FROM SPREADSHEET\n')
    const values = await loadFromSpreadsheet({ sheets, spreadsheetId, spreadsheetRange });
    console.log(`${values ? values.length : 0} rows loaded from spreadsheet`)

    // Processing data (different for each mode)
    console.log('\nPHASE - PROCESSING DATA\n')
    const rowsToInsert = await processMode({ mode, values, newObjects, deduplicateByField, deduplicateByEquality, transformFunction: parsedTransformFunction, backupStore });
    console.log('Data processed...')

    // Save backup
    if (createBackup) {
        console.log('\nPHASE - SAVING BACKUP\n')
        await saveBackup(createBackup, values);
        console.log('Backup saved...')
    }

    // Upload to spreadsheet
    console.log('\nPHASE - UPLOADING TO SPREADSHEET\n')
    await upload({ spreadsheetId, spreadsheetRange, rowsToInsert, values, sheets, firstSheetId, maxCells: MAX_CELLS });
    console.log('Data uploaded...')

    console.log('\nPHASE - ACTOR FINISHED\n')
    console.log('URL of the updated spreadsheet:');
    console.log(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
})

