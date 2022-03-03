const Apify = require('apify');
const csvParser = require('csvtojson');

const { retryingRequest } = require('./utils.js');

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

    const datasetClient = Apify.newClient().dataset(datasetId);

    const csv = await datasetClient.listItems({
        ...defaultOptions,
    }).then((res) => res.items)
    .catch(() => console.log('could not load data from dataset. Perhaps wrong ID?'));

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
    const rowsResponse = await retryingRequest('Getting spreadsheet rows', async () => client.spreadsheets.values.get({
        spreadsheetId,
        range: spreadsheetRange,
    }));
    if (!rowsResponse || !rowsResponse.data) {
        throw new Error('We couldn\'t load current data from the spreadsheet so we cannot continue!!');
    }
    // console.dir(rowsResponse.data.values);
    return rowsResponse.data.values;
};
