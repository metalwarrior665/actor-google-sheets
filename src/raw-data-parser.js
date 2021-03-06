const Apify = require('apify');
const csvParser = require('csvtojson');

const { toObjects } = require('./transformers.js');
const { loadFromApify } = require('./loaders');
const { sortObj } = require('./utils');

module.exports.parseRawData = async ({ mode, rawData }) => {
    if (!Array.isArray(rawData)) {
        throw new Error('WRONG INPUT! - rawData has to be an array!');
    }

    if (rawData.length === 0) {
        return rawData;
    }

    if (!['append', 'replace'].includes(mode)) {
        throw new Error('WRONG INPUT! - Can use rawData only with "replace" or "append" mode!');
    }

    const hasOnlyObjects = rawData.reduce((acc, item) => {
        if (!acc) {
            return false;
        }
        if (Array.isArray(item) || typeof item !== 'object') {
            return false;
        }
        return true;
    }, true);

    const hasOnlyArrays = rawData.reduce((acc, item) => {
        if (!acc) {
            return false;
        }
        if (!Array.isArray(item)) {
            return false;
        }
        return true;
    }, true);

    if (!hasOnlyObjects && !hasOnlyArrays) {
        throw new Error('WRONG INPUT - rawData needs to be either an array of objects or array of arrays!');
    }

    if (hasOnlyArrays) {
        try {
            return toObjects(rawData);
        } catch (e) {
            throw new Error(`WRONG INPUT - rawData array of arrays cannot contain nested objects! Error: ${e.message}`);
        }
    }
    if (hasOnlyObjects) {
        const isNested = rawData.reduce((acc, item) => {
            if (acc) {
                return true;
            }
            for (const value of Object.values(item)) {
                if (typeof value === 'object') {
                    return true;
                }
            }
            return false;
        }, false);

        if (!isNested) {
            const keysObject = rawData.reduce((acc, item) => {
                for (const key of Object.keys(item)) {
                    acc[key] = true;
                }
                return acc;
            }, {});
            const keys = Object.keys(keysObject);
            const updatedData = rawData.map((item) => {
                keys.forEach((key) => {
                    if (!item[key]) item[key] = '';
                });
                return sortObj(item, []);
            });
            return updatedData;
        }

        console.log('Raw data have nested structures. We need to use Apify API to flatten them, this may take a while on large structures. If you don\'t have Apify account, this will not work'); // eslint-disable-line

        if (Apify.isAtHome()) {
            await Apify.pushData(rawData);
            return loadFromApify({ mode, datasetId: process.env.APIFY_DEFAULT_DATASET_ID });
        }

        const { datasets } = Apify.client;

        let { id, itemCount } = await datasets.getOrCreateDataset({ // eslint-disable-line
            datasetName: 'spreadsheet-temporary-container',
        });
        if (itemCount > 0) {
            await datasets.deleteDataset({ datasetId: id });
            id = await datasets.getOrCreateDataset({
                datasetName: 'spreadsheet-temporary-container',
            }).then((res) => res.id);
        }
        await datasets.putItems({
            datasetId: id,
            data: rawData,
        });

        const csv = await datasets.getItems({
            format: 'csv',
            datasetId: id,
        }).then((res) => res.items);

        return csvParser().fromString(csv);
    }
};
