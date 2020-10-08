const Apify = require('apify');
const { backOff } = require('exponential-backoff');
const safeEval = require('safe-eval');

const { sortPropertyNames } = require('./tabulation');

const { log } = Apify.utils;

exports.handleRequestError = (e, action) => {
    log.exception(`${action} failed with error: ${e.message}`);
    throw new Error('Fail in the crucial request that cannot be retried');
};

exports.retryingRequest = async (request) => {
    return backOff(
        {
            fn: () => request,
            retry: (e, numberOfAttempts) => {
                const doRetry = e.message.includes('The service is currently unavailable');
                if (doRetry) {
                    log.warning(`Retrying API call to google with atempt n. ${numberOfAttempts} for error: ${e.message}`);
                    return true;
                }
            },
        },
        {
            numberOfAttempts: 6,
            timeMultiple: 3,
        },
    );
};

exports.countCells = (rows) => {
    if (!rows) return 0;
    if (!rows[0]) return 0;
    return rows[0].length * rows.length;
};

exports.trimSheetRequest = (height, width, sheetId) => {
    const payload = {
        requests: [],
    };
    if (height) {
        payload.requests.push({
            deleteDimension: {
                range: {
                    sheetId,
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
                    sheetId,
                    dimension: 'COLUMNS',
                    startIndex: width,
                },
            },
        });
    }
    return payload;
};

module.exports.createSheetRequest = (title) => {
    return {
        requests: [{
            addSheet: {
                properties: { title },
            },
        }],
    };
};

module.exports.saveBackup = async (createBackup, values) => {
    if (createBackup) {
        if (values) {
            log.info('Saving backup...');
            await Apify.setValue('backup', values);
        } else {
            log.warning('There are currently no rows in the spreadsheet so we will not save backup...');
        }
    }
};

module.exports.evalFunction = (transformFunction) => {
    let parsedTransformFunction;
    if (transformFunction) {
        try {
            parsedTransformFunction = safeEval(transformFunction); // eslint-disable-line
        } catch (e) {
            throw new Error('Evaluation of the tranform function failed with error. Please check if you inserted valid javascript code:', e);
        }
        // Undefined is allowed because I wanted to allow have commented code in the transform function
        if (typeof parsedTransformFunction !== 'function' && parsedTransformFunction !== undefined) {
            throw new Error('Transform function has to be a javascript function or it has to be undefined (in case the whole code is commented out)');
        }
        return parsedTransformFunction;
    }
};

// I know this is very inneficient way but so far didn't hit a performance bottleneck (on 3M items)
module.exports.sortObj = (obj, keys) => {
    const newObj = {};
    // First we add user-requested sorting
    for (const key of keys) {
        newObj[key] = obj[key];
    }
    // The we sort the rest with special algorithm
    // They are really only sorted mutably
    const sortedKeys = Object.keys(obj);
    sortPropertyNames(sortedKeys);

    for (const key of sortedKeys) {
        if (!keys.includes(key)) {
            newObj[key] = obj[key];
        }
    }
    return newObj;
};
