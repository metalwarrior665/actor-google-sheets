const assert = require('assert');

const { toObjects, toRows, updateRowsObjects, makeUniqueRows } = require('../src/utils.js');
// const { customTransform1, reconstructArray, pseudoDeepEquals, createKeys } = require('../src/transformFunctions');
// const { customObjectsNew, customObjectsOld, customObjFlat, customObjFlat2, transformedArray } = require('./mocks');

const rows = [['a', 'b', 'c'], [2, 2, 4], [3, 2, 5], [4, 2, 5]];
const objects = [{ a: 2, b: 2, c: 4 }, { a: 3, b: 2, c: 5 }, { a: 4, b: 2, c: 5 }];
const objects2 = [{ d: 4, b: 2, c: null }, { d: 3, b: 2, c: 6 }, { d: 4, b: null, c: 5 }];
const appendedBasic = [
    { a: 2, b: 2, c: 4, d: '' },
    { a: 3, b: 2, c: 5, d: '' },
    { a: 4, b: 2, c: 5, d: '' },
    { a: '', b: 2, c: '', d: 4 },
    { a: '', b: 2, c: 6, d: 3 },
    { a: '', b: '', c: 5, d: 4 },
];
const uniqueToAppend = [
    { a: 2, b: 2, c: 4, d: '' },
    { d: 4, b: '', c: 5, a: '' },
];
const appendedWithFilterField = [
    { a: 2, b: 2, c: 4, d: '' },
    // { a: 3, b: 2, c: 5, d: null },
    // { a: 4, b: 2, c: 5, d: null },
    { a: '', b: '', c: 5, d: 4 },
];
const replacedWithFilterField = [
    { d: 4, b: 2, c: '' },
    { d: 4, b: '', c: 5 },
];

// const keysToCompare = createKeys(customObjFlat2, customObjFlat);
// const promotionKeys = keysToCompare.filter((key) => key.startsWith('promotions/'));

/*
describe('pseudoDeepEquals', () => {
    it('works', () => {
        assert.deepEqual(pseudoDeepEquals(customObjFlat2, customObjFlat, keysToCompare, promotionKeys), true);
    });
});

describe('reconstructArray', () => {
    it('works', () => {
        assert.deepEqual(reconstructArray(customObjFlat, promotionKeys), transformedArray);
    });
});

describe('customTransform1', () => {
    const customTransform = customTransform1;
    const finalObjects = [];
    it('works', () => {
        assert.deepEqual(customTransform(customObjectsNew, customObjectsOld), finalObjects);
    });
});
*/

describe('toObjects', () => {
    it('works', () => {
        // console.log('to objects')
        // console.dir(objects)
        // console.dir(toObjects(rows))
        assert.deepEqual(objects, toObjects(rows));
    });
});

describe('toRows', () => {
    it('works', () => {
        // console.log('to rows')
        // console.dir(rows)
        // console.dir(toRows(objects))
        assert.deepEqual(rows, toRows(objects));
    });
});

describe('replace', () => {
    it('basic', () => {
        assert.deepEqual(objects2, updateRowsObjects({ oldObjects: [], newObjects: objects2 }));
    });
    it('with field filter', () => {
        assert.deepEqual(replacedWithFilterField, updateRowsObjects({ oldObjects: [], newObjects: objects2, filterByField: 'b' }));
    });
});

describe('append', () => {
    it('basic', () => {
        assert.deepEqual(appendedBasic, updateRowsObjects({ oldObjects: objects, newObjects: objects2 }));
    });
    it('with field filter', () => {
        assert.deepEqual(appendedWithFilterField, updateRowsObjects({ oldObjects: objects, newObjects: objects2, filterByField: 'b' }));
    });
});

describe('makeUniqueRows', () => {
    it('works', () => {
        assert.deepEqual(uniqueToAppend, makeUniqueRows(objects, objects2, 'b', null));
    });
});
