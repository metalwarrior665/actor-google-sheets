const Apify = require('apify');
const csvParser = require('csvtojson');

const { retryingRequest, handleRequestError } = require('./utils.js');

module.exports.loadFromApify = async ({ mode, datasetId, limit, offset }) => {
    if (mode !== 'append' && mode !== 'replace') {
        return;
    }

    const defaultOptions = {
        format: 'csv',
        limit,
        offset,
        clean: true,
    };

    const datasetInfo = await Apify.client.datasets.getDataset({ datasetId }).catch(() => console.log('Did not find a dataset with this ID'));
    const simplified = datasetInfo && datasetInfo.actId === 'YPh5JENjSSR6vBf2E';

    if (simplified) {
        console.log('Will load simplifed results');
    }

    const csv = await Apify.client.datasets.getItems({
        datasetId,
        ...defaultOptions,
        simplified,
    }).then((res) => res.items).catch(() => console.log('could not load data from dataset, will try crawler execution'));

    if (!csv) {
        throw new Error(`We didn't find any dataset with provided datasetId: ${datasetId}`);
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

module.exports.loadFromSpreadsheet = async ({ client, spreadsheetId, spreadsheetRange }) => {
    const rowsResponse = await retryingRequest(client.spreadsheets.values.get({
        spreadsheetId,
        range: spreadsheetRange,
    })).catch((e) => handleRequestError(e, 'Getting current rows'));
    if (!rowsResponse || !rowsResponse.data) {
        throw new Error('We couldn\'t load current data from the spreadsheet so we cannot continue!!');
    }
    console.dir(rowsResponse.data.values);
    return rowsResponse.data.values;
};
