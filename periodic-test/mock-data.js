module.exports.mock1 = [
    {
        name: 'Lukas',
        job: 'developer',
        'dogs/0': 'Lara',
        hobby: '',
    },
    {
        name: 'Adam',
        job: 'seller',
        hobby: 'alcohol',
        'dogs/0': '',
    },
];

module.exports.mock2 = [
    {
        name: 'Sena',
        job: 'developer',
        hobby: 'music',
        'dogs/0': '',
    },
    {
        name: 'Hout',
        job: 'none',
        hobby: 'tabletop games',
        'dogs/0': '',
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
