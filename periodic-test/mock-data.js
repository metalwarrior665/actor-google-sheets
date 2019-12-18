module.exports.mock1 = [
    {
        'dogs/0': 'Lara',
        hobby: '',
        job: 'developer',
        name: 'Lukas',
    },
    {
        'dogs/0': '',
        hobby: 'alcohol',
        job: 'seller',
        name: 'Adam',
    },
];

module.exports.mock1Dataset = [
    {
        dogs: ['Lara'],
        job: 'developer',
        name: 'Lukas',
    },
    {
        hobby: 'alcohol',
        job: 'seller',
        name: 'Adam',
    },
];

module.exports.mock2 = [
    {
        'dogs/0': '',
        hobby: 'music',
        job: 'developer',
        name: 'Sena',
    },
    {
        'dogs/0': '',
        hobby: 'tabletop games',
        job: 'none',
        name: 'Hout',
    },
];

module.exports.mock2Dataset = [
    {
        hobby: 'music',
        job: 'developer',
        name: 'Sena',
    },
    {
        hobby: 'tabletop games',
        job: 'none',
        name: 'Hout',
    },
];

module.exports.backupMock = [
    ['dogs/0', 'hobby', 'job', 'name'],
    ['', 'alcohol', 'seller', 'Adam'],
    ['', 'music', 'developer', 'Sena'],
    ['', 'tabletop games', 'none', 'Hout'],
    ['Lara', '', 'developer', 'Lukas'],
];

module.exports.mockTransform = ({ spreadsheetData, datasetData }) => {
    const all = spreadsheetData.concat(datasetData);
    const nonDogs = all.reduce((acc, item) => {
        if (!item['dogs/0']) {
            acc.push(item);
        }
        return acc;
    }, []);
    return nonDogs;
};
