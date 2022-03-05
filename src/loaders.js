const Apify = require('apify');
const csvParser = require('csvtojson');

const { log } = Apify.utils;

const { retryingRequest } = require('./utils.js');

module.exports.loadFromApify = async ({ mode, datasetId, limit, offset }) => {
    if (mode !== 'append' && mode !== 'replace') {
        return;
    }

    const defaultOptions = {
        limit,
        offset,
        clean: true,
    };

    const datasetClient = Apify.newClient().dataset(datasetId);
    let datasetInfo;
    try {
        datasetInfo = await datasetClient.get();
    } catch (e) {
        throw `Could not find dataset with ID ${datasetId}. Perhaps you provided a wrong ID? Got error: ${e}`;
    }

    // Unfortunately, simplified parameter is no longer supported by the client so we have to do raw HTTP
    const isLegacyPhantom = datasetInfo.actId === 'YPh5JENjSSR6vBf2E';
    let csv;
    if (isLegacyPhantom) {
        log.warning(`Requesting dataset of deprecated phantom legacy actor. Please report if the format is not correct`);
        const limitStr = limit ? `&limit=${limit}` : '';
        const offsetStr = offset ? `&offset=${offset}` : '';
        const url = `https://api.apify.com/v2/datasets/${datasetId}/items?format=csv&simplified=true&clean=true${limitStr}${offsetStr}`;
        csv = await Apify.utils.requestAsBrowser({ url }).then((res) => res.body.toString());
    } else {
        csv = await datasetClient.downloadItems('csv', {
            ...defaultOptions,
        }).then((res) => res.toString());
    }

    if (!csv) {
        throw new Error(`We didn't find any dataset with provided datasetId: ${datasetId}`);
    }

    console.log('Data loaded from Apify storage');

    // TODO: Client now provides sorted list of fields so we should be able to get rid of this whole CSV business
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
