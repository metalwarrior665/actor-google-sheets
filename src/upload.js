const { countCells, trimSheetRequest, retryingRequest, handleRequestError } = require('./utils');

module.exports = async ({ maxCells, rowsToInsert, spreadsheetId, spreadsheetRange, values, sheets, targetSheetId }) => {
    // ensuring max cells limit
    const cellsToInsert = countCells(rowsToInsert);
    console.log(`Total rows: ${rowsToInsert.length}, total cells: ${cellsToInsert}`);
    if (cellsToInsert > maxCells) {
        throw new Error(`You reached the max limit of ${maxCells} cells. Try inserting less rows.`);
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
    const height = values && values.length > rowsToInsert.length
        ? rowsToInsert.length
        : null;
    const width = values && values[0].length > rowsToInsert[0].length
        ? rowsToInsert[0].length
        : null;
    if (height || width) {
        if (height) console.log('Will delete unused rows');
        if (width) console.log('Will delete unused columns');
        await retryingRequest(sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: trimSheetRequest(height, width, targetSheetId),
        })).catch((e) => handleRequestError(e, 'Trimming excessive cells'));
    } else {
        console.log('No need to delete any rows or columns');
    }
};
