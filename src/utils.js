const Apify = require('apify');

const { sortPropertyNames } = require('./tabulation');

const { log } = Apify.utils;

const ERRORS_TO_RETRY = [
    'The service is currently unavailable',
]

const getNiceErrorMessage = (type, errorMessage) => {
    const baseErrorMessage = `Request ${type} failed with error ${errorMessage}`;
    const wrongAccountText = `Perhaps you used a wrong Google account?\n`
        + `If you want to use a different Google account or use multiple Google accounts, please follow the guide here:\n`
        + `https://apify.com/lukaskrivka/google-sheets#authentication-and-authorization\n`
    if (errorMessage.includes('invalid_grant')) {
        return `${baseErrorMessage}\n${wrongAccountText}`;
    } else if (errorMessage.includes('The caller does not have permission')) {
        return `${baseErrorMessage}\n${wrongAccountText}`;
    } else {
        return baseErrorMessage;
    }
}

exports.retryingRequest = async (type, request) => {
    const MAX_ATTEMPTS = 6;
    const SLEEP_MULTIPLIER = 3;
    let sleepMs = 1000;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        let response;
        try {
            response = await request();
            return response;
        } catch (e) {
            const willRetry = ERRORS_TO_RETRY.some((errorMessage) => e.message.includes(errorMessage));
            if (willRetry) {
                log.warning(`Retrying API call for ${type} to google with attempt n. ${i + 1} for error: ${e.message}`);
                await Apify.utils.sleep(sleepMs);
                sleepMs *= SLEEP_MULTIPLIER;
            } else {
                const error = getNiceErrorMessage(type, e.message);
                throw error;
            }
        }
    }
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
            // Safe eval stopped working with commented code
            parsedTransformFunction = eval(transformFunction); // eslint-disable-line
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
