const Apify = require('apify');
const { google } = require('googleapis');
const csvParser =require('csvtojson');
const { apifyGoogleAuth } = require('apify-google-auth');

const { toRows, toObjects, updateRowsObjects, countCells, trimSheetRequest, retryingRequest, handleRequestError } = require('./utils');

const MAX_CELLS = 2 * 1000 * 1000;

Apify.main(async () => {
    let input = await Apify.getValue('INPUT');
    console.log('input');
    console.dir(input);

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
    let transformFunction;
    if (input.customFilterFunction) {
        console.log('We will use cutom filter function with name:', input.customFilterFunction);
        transformFunction = require('./customFilterFunctions.js')[input.customFilterFunction];
    }
    if (input.transformFunction && !transformFunction) {
        try {
            transformFunction = eval(input.transformFunction);
        } catch(e) {
            console.log('Evaluation of the tranform function failed with error:', e);
        }
        if (!transformFunction) {
            throw new Error ('We were not able to parse transform function from input, therefore we cannot continue');
        }
    }

    const {
        spreadsheetId,
        mode,
        filterByField,
        filterByEquality,
        createBackup,
        tokensStore,
        limit,
        offset,
        range,
        backupStore,
    } = input;

    // AUTH
    const authOptions = {
        scope: "spreadsheets",
        tokensStore,
    };
    const auth = await apifyGoogleAuth(authOptions);

    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
    const { title: firstSheetName, sheetId: firstSheetId } = spreadsheetMetadata.data.sheets[0].properties;
    console.log('name of the first sheet', firstSheetName);
    console.log('id of the first sheet', firstSheetId, "\n");

    const spreadsheetRange = range || firstSheetName;

    console.log(`Spreadsheets setup:`);
    console.log('Mode:', mode);
    console.log('Spreadsheet id:', spreadsheetId);
    console.log('Range:', spreadsheetRange);
    console.log('Filter by field:', filterByField);
    console.log('Filter by equality:', filterByEquality, "\n");

    // LOAD DATA
    const defaultOptions = {
        format: 'csv',
        limit,
        offset,
    };

    let newObjects;

    if (mode === 'replace' || mode === 'append') {
        let csv;

        csv = await Apify.client.datasets.getItems({
            datasetId: input.datasetOrExecutionId,
            ...defaultOptions,
        }).then((res) => res.items).catch((_) => console.log('could not load data from dataset, will try crawler execution'));

        if (!csv) {
            csv = await Apify.client.crawlers.getExecutionResults({
                executionId: input.datasetOrExecutionId,
                simplified: 1,
                ...defaultOptions,
            }).then((res) => res.items).catch((_) => console.log('could not load data from crawler'));
        }

        if (!csv) {
            throw new Error (`We didn't find any dataset or crawler execution with provided datasetOrExecutionId: ${input.datasetOrExecutionId}`);
        }

        console.log('Data loaded from Apify storage');

        newObjects = await csvParser().fromString(csv);

        console.log('Data parsed from CSV');

        if (newObjects.length === 0){
            throw new Error('We loaded 0 items from the dataset or crawler execution, finishing...');
        }

        console.log(`We loaded ${newObjects.length} items from Apify storage \n`);
    }

    // we load previous rows if mode is append or backup is on
    const rowsResponse = await retryingRequest(sheets.spreadsheets.values.get({
        spreadsheetId,
        range: spreadsheetRange,
    })).catch((e) => handleRequestError(e, 'Getting current rows'));
    if (!rowsResponse || !rowsResponse.data) {
        throw new Error(`We couldn't load current data from the spreadsheet so we cannot continue!!`);
    }

    let rowsToInsert;

    if (mode === 'replace') {
        const replacedObjects = updateRowsObjects({oldObjects: [], newObjects, filterByField, filterByEquality, transformFunction});
        rowsToInsert = toRows(replacedObjects);
    }
    if (mode === 'modify' || mode === 'read') {
        if (!rowsResponse.data.values|| rowsResponse.data.values.length <= 1) {
            throw new Error('There are either no data in the sheet or only one header row so it cannot be modified!');
        }
        const oldObjects = toObjects(rowsResponse.data.values);
        const replacedObjects = updateRowsObjects({oldObjects, newObjects: [], filterByField, filterByEquality, transformFunction});
        rowsToInsert = toRows(replacedObjects);

        if (mode === 'read') {
            await Apify.setValue('OUTPUT', replacedObjects);
            console.log('Data were read, processed and saved as OUTPUT to the default key-value store');
            return;
        }
    }
    if (mode === 'append') {
        if (!rowsResponse.data.values || rowsResponse.data.values.length <= 1) {
            const replacedObjects = updateRowsObjects({ oldObjects: [], newObjects, filterByField, filterByEquality, transformFunction });
            rowsToInsert = toRows(replacedObjects);
        } else {
            const oldObjects = toObjects(rowsResponse.data.values);
            const appendedObjects = updateRowsObjects({ oldObjects, newObjects, filterByField, filterByEquality, transformFunction });
            rowsToInsert = toRows(appendedObjects);
        }
    }
    if (mode === 'load backup') {
        const store = await Apify.openKeyValueStore(backupStore);
        if (!store) {
            throw new Error('Backup store not found under id/name:', backupStore);
        }
        rowsToInsert = await store.getValue('backup');
        if (!rowsToInsert) {
            throw new Error('We did not find any record called "backup" in this store:', backupStore);
        }
    }

    // maybe backup
    if (createBackup) {
        if (rowsResponse.data.values) {
            console.log('Saving backup...')
            await Apify.setValue('backup', rowsResponse.data.values);
        } else {
            console.log('There are currently no rows in the spreadsheet so we will not save backup...');
        }
    }

    // ensuring max cells limit
    const cellsToInsert = countCells(rowsToInsert);
    console.log(`Total rows: ${rowsToInsert.length}, total cells: ${cellsToInsert}`);
    if (cellsToInsert > MAX_CELLS) {
        throw new Error (`You reached the max limit of ${MAX_CELLS} cells. Try inserting less rows.`);
    }

    // inserting cells
    console.log('Inserting new cells');
    await retryingRequest(sheets.spreadsheets.values.update({
        spreadsheetId,
        range: spreadsheetRange,
        valueInputOption: 'RAW',
        resource: { values: rowsToInsert },
    })).catch((e) => handleRequestError(e, 'Inserting new rows'));
    console.log('Items inserted...');

    // trimming cells
    console.log('Maybe deleting unused cells');
    const height = rowsResponse.data.values && rowsResponse.data.values.length > rowsToInsert.length
        ? rowsToInsert.length
        : null
    const width = rowsResponse.data.values && rowsResponse.data.values[0].length > rowsToInsert[0].length
        ? rowsToInsert[0].length
        : null
    if (height || width) {
        if (height) console.log('Will delete unused rows');
        if (width) console.log('Will delete unused columns');
        await retryingRequest(sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: trimSheetRequest(height, width, firstSheetId),
        })).catch((e) => handleRequestError(e, 'Trimming excessive cells'));
    } else {
        console.log('No need to delete any rows or columns');
    }

    console.log('Finishing actor...');
    console.log('URL of the updated spreadsheet:');
    console.log(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
})

