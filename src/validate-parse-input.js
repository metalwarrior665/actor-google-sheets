const { parseRawData } = require('./raw-data-parser.js');
const { evalFunction } = require('./utils.js');

module.exports = async (input) => {
    const {
        spreadsheetId,
        publicSpreadsheet = false,
        mode,
        datasetId,
        rawData = [],
        deduplicateByField,
        deduplicateByEquality,
        transformFunction,
        googleCredentials,
        columnsOrder,
    } = input;

    const parsedRawData = await parseRawData({ mode, rawData });

    if (parsedRawData.length > 0 && datasetId) {
        throw new Error('WRONG INPUT! - Use only one of "rawData" and "datasetId"!');
    }

    if (
        ['replace', 'append'].includes(mode)
        && (typeof datasetId !== 'string' || datasetId.length !== 17)
        && parsedRawData.length === 0
    ) {
        throw new Error('WRONG INPUT! - datasetId field needs to be a string with 17 characters!');
    }
    if (mode !== 'load backup' && (typeof spreadsheetId !== 'string' || spreadsheetId.length !== 44)) {
        throw new Error('WRONG INPUT! - spreadsheetId field needs to be a string with 44 characters!');
    }
    if (deduplicateByEquality && deduplicateByField) {
        throw new Error('WRONG INPUT! - deduplicateByEquality and deduplicateByField cannot be used together!');
    }

    // Cannot write to public spreadsheet
    if (['replace', 'append', 'modify'].includes(mode) && publicSpreadsheet) {
        throw new Error('WRONG INPUT - Cannot use replace, append or modify mode for public spreadsheet. For write access, use authorization!')
    }

    // Check if googleCredentials have correct format
    if (googleCredentials) {
        if (typeof googleCredentials !== 'object' || !googleCredentials.client_id || !googleCredentials.client_secret || !googleCredentials.redirect_uri) {
            throw new Error('If you want to pass your own Google keys, it has to be an object with those properties: client_id, client_secret, redirect_uri');
        }
    }

    // Parsing stringified function
    let parsedTransformFunction;
    if (transformFunction && transformFunction.trim()) {
        console.log('\nPHASE - PARSING TRANSFORM FUNCTION\n');
        parsedTransformFunction = await evalFunction(transformFunction);
        if (typeof parsedTransformFunction === 'function' && (deduplicateByEquality || deduplicateByField)) {
            throw new Error('WRONG INPUT! - transformFunction cannot be used together with deduplicateByEquality or deduplicateByField!');
        }
        console.log('Transform function parsed...');
    }

    if (columnsOrder && !Array.isArray(columnsOrder)) {
        throw new Error('WRONG INPUT! - columnsOrder must be an array on of string values(keys)!')
    }

    return { transformFunction: parsedTransformFunction, rawData: parsedRawData };
}
