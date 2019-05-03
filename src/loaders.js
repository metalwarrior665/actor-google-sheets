const Apify = require('apify');
const csvParser = require('csvtojson');

const { retryingRequest, handleRequestError } = require('./utils.js');

module.exports.loadFromApify = async ({ mode, datasetOrExecutionId, limit, offset }) => {
    if (mode !== 'append' && mode !== 'replace') {
        return;
    }

    const defaultOptions = {
        format: 'csv',
        limit,
        offset,
        clean: true,
    };
    let csv;

    csv = await Apify.client.datasets.getItems({
        datasetId: datasetOrExecutionId,
        ...defaultOptions,
    }).then((res) => res.items).catch(() => console.log('could not load data from dataset, will try crawler execution'));

    if (!csv) {
        csv = await Apify.client.crawlers.getExecutionResults({
            executionId: datasetOrExecutionId,
            simplified: 1,
            ...defaultOptions,
        }).then((res) => res.items.toString()).catch(() => console.log('could not load data from crawler'));
    }

    if (!csv) {
        throw new Error(`We didn't find any dataset or crawler execution with provided datasetOrExecutionId: ${datasetOrExecutionId}`);
    }

    console.log('Data loaded from Apify storage');

    const newObjects = await csvParser().fromString(csv);

    console.log('Data parsed from CSV');

    if (newObjects.length === 0) {
        throw new Error('We loaded 0 items from the dataset or crawler execution, finishing...');
    }

    console.log(`We loaded ${newObjects.length} items from Apify storage \n`);

    return newObjects;
};

module.exports.loadFromSpreadsheet = async ({ sheets, spreadsheetId, spreadsheetRange }) => {
    const rowsResponse = await retryingRequest(sheets.spreadsheets.values.get({
        spreadsheetId,
        range: spreadsheetRange,
    })).catch((e) => handleRequestError(e, 'Getting current rows'));
    if (!rowsResponse || !rowsResponse.data) {
        throw new Error('We couldn\'t load current data from the spreadsheet so we cannot continue!!');
    }
    return rowsResponse.data.values;
};
