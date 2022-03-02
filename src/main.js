const Apify = require('apify');
const { google } = require('googleapis');
const { apifyGoogleAuth } = require('apify-google-auth');

const processMode = require('./modes.js');
const { loadFromApify, loadFromSpreadsheet } = require('./loaders.js');
const upload = require('./upload.js');
const { saveBackup, retryingRequest, createSheetRequest } = require('./utils.js');
const validateAndParseInput = require('./validate-parse-input.js');
const { CLIENT_ID, REDIRECT_URI, CLIENT_ID_2 } = require('./constants.js');

const { log } = Apify.utils;

const MAX_CELLS = 5 * 1000 * 1000;

Apify.main(async () => {
    const input = await Apify.getValue('INPUT');
    log.info('Input:', { ...input, parsedData: 'not displayed, check input tab directly...', googleCredentials: 'not diplayed, check input tab directly...' });

    log.info('\nPHASE - PARSING INPUT\n');

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
        columnsOrder = [],
        keepSheetColumnOrder = false,
        googleCredentials = {
            client_id: CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            // Unfortunately this is needed to hack around the 100 users limitation
            // because Google doesn't want to verify u
            additionalClients: [{
                client_id: CLIENT_ID_2,
                client_secret: process.env.CLIENT_SECRET_2,
            }],
        },
    } = input;

    // We have to do this to get rid of the global env var so it cannot be stolen in the user provided transform function
    const apiKey = process.env.API_KEY;
    delete process.env.API_KEY;
    delete process.env.CLIENT_SECRET;
    delete process.env.CLIENT_SECRET_2;

    const { rawData, transformFunction } = await validateAndParseInput(input);
    log.info('Input parsed...');

    let auth;
    if (!publicSpreadsheet) {
        // Authenticate
        log.info('\nPHASE - AUTHORIZATION\n');
        const authOptions = {
            scope: 'spreadsheets',
            tokensStore,
            credentials: googleCredentials,
        };

        try {
            auth = await apifyGoogleAuth(authOptions);
        } catch (e) {
            log.error('Authorization failed! Ensure that you are signing up with the same account where the spreadsheet is located!');
            throw e;
        }
        log.info('Authorization completed...');
    } else {
        log.info('\nPHASE - SKIPPING AUTHORIZATION (public spreadsheet)\n');
    }

    // Load sheets metadata
    log.info('\nPHASE - LOADING SPREADSHEET METADATA\n');
    const client = google.sheets({ version: 'v4', auth: auth || apiKey });

    const spreadsheetMetadata = await retryingRequest('Getting spreadsheet metadata', client.spreadsheets.get({ spreadsheetId }));
    const sheetsMetadata = spreadsheetMetadata.data.sheets.map((sheet) => sheet.properties);
    const { title: firstSheetName, sheetId: firstSheetId } = sheetsMetadata[0];
    log.info(`name of the first sheet: ${firstSheetName}`);
    log.info(`id of the first sheet: ${firstSheetId}`);

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
            // Sheet name is before ! or the whole range if no !
            const title = range.split('!')[0];
            log.warning('Cannot find target sheet. Creating new one.');
            const resp = await retryingRequest('Creating new sheet', client.spreadsheets.batchUpdate({
                spreadsheetId,
                resource: createSheetRequest(title),
            }));
            targetSheetId = resp.data.replies[0].addSheet.properties.sheetId;
        }
    }
    log.info(`Target sheet id: ${targetSheetId}`);

    // Log info
    log.info('\nPHASE - SPREADSHEET SETUP:\n');
    log.info(`Mode: ${mode}`);
    log.info(`Spreadsheet id: ${spreadsheetId}`);
    log.info(`Range: ${spreadsheetRange}`);
    log.info(`Deduplicate by field: ${deduplicateByField || false}`);
    log.info(`Deduplicated by equality: ${deduplicateByEquality || false}\n`);

    // Load data from Apify
    log.info('\nPHASE - LOADING DATA FROM APIFY\n');
    const newObjects = rawData.length > 0
        ? rawData
        : await loadFromApify({ mode, datasetId, limit, offset });
    log.info('Data loaded from Apify...');

    // Load data from spreadsheet
    log.info('\nPHASE - LOADING DATA FROM SPREADSHEET\n');
    const values = await loadFromSpreadsheet({ client, spreadsheetId, spreadsheetRange });
    log.info(`${values ? values.length : 0} rows loaded from spreadsheet`);

    // Processing data (different for each mode)
    log.info('\nPHASE - PROCESSING DATA\n');
    const rowsToInsert = await processMode({
        mode,
        values,
        newObjects,
        deduplicateByField,
        deduplicateByEquality,
        transformFunction,
        columnsOrder,
        keepSheetColumnOrder,
        backupStore,
    }); // eslint-disable-line
    log.info('Data processed...');

    // Save backup
    if (createBackup) {
        log.info('\nPHASE - SAVING BACKUP\n');
        await saveBackup(createBackup, values);
        log.info('Backup saved...');
    }

    // Upload to spreadsheet
    log.info('\nPHASE - UPLOADING TO SPREADSHEET\n');
    await upload({ spreadsheetId, spreadsheetRange, rowsToInsert, values, client, targetSheetId, maxCells: MAX_CELLS });
    log.info('Data uploaded...');

    log.info('\nPHASE - ACTOR FINISHED\n');
    log.info('URL of the updated spreadsheet:');
    log.info(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
});
