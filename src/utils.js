const Apify = require('apify');
const { backOff } = require('exponential-backoff');

exports.handleRequestError = (e, action) => {
    console.log(`${action} failed with error: ${e.message}`);
    console.dir(e);
    throw new Error('Fail in the crucial request');
};

exports.retryingRequest = async (request) => {
    return backOff(
        {
            fn: () => request,
            retry: (e, numberOfAttempts) => {
                console.log(`retrying API call to google with atempt n. ${numberOfAttempts}`)
                return e.message.includes('The service is currently unavailable')
            },
        },
        {
            numberOfAttempts: 6,
            timeMultiple: 3,
        },
    );
};

exports.countCells = (rows) => rows[0].length * rows.length;

exports.trimSheetRequest = (height, width, firstSheetId) => {
    const payload = {
        requests: [],
    };
    if (height) {
        payload.requests.push({
            deleteDimension: {
                range: {
                    sheetId: firstSheetId,
                    dimension: 'ROWS',
                    startIndex: height,
                },
            },
        });
    }
    if (width) {
        payload.requests.push({
            deleteDimension: {
                range: {
                    sheetId: firstSheetId,
                    dimension: 'COLUMNS',
                    startIndex: width,
                },
            },
        });
    }
    return payload;
};

module.exports.saveBackup = async (createBackup, values) => {
    if (createBackup) {
        if (values) {
            console.log('Saving backup...')
            await Apify.setValue('backup', values);
        } else {
            console.log('There are currently no rows in the spreadsheet so we will not save backup...');
        }
    }
};

module.exports.evalFunction = (transformFunction) => {
    let parsedTransformFunction;
    if (transformFunction) {
        try {
            parsedTransformFunction = eval(transformFunction);
        } catch (e) {
            console.log('Evaluation of the tranform function failed with error:', e);
        }
        if (typeof parsedTransformFunction !== 'function') {
            throw new Error('We were not able to parse transform function from input, therefore we cannot continue');
        }
        return parsedTransformFunction;
    }
};
