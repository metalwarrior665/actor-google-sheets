const { backOff } = require('exponential-backoff');
const Apify = require('apify');

const breakedFunction = async () => {
    console.log('failing');
    throw new Error('failed');
};

Apify.main(async () => {
    await backOff({ fn: breakedFunction }, { numberOfAttempts: 20 });
});
