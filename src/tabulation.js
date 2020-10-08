/* eslint-disable no-restricted-syntax */
// These functions are not yet fully used because we are getting CSV from dataset
// but it would be better to use internal tabulation everywhere

// only consider integers smaller than 1 billion, array indexes are not higher anyway
const REGEXP_NUM = /^[0-9]{1,9}$/;

/**
 * This function sorts an array with string property names using the following rules:
 * 1) "URL" is always first
 * 2) Multi-component strings with numberical components are sorted using numerical comparison, rather than string
 *    (e.g. "array/2/xxx" < "array/10")
 * 3) Otherwise, use normal string
 * Note that the implementation of this method has some unexpected consequences,
 * e.g. it will sort array as ["/", " /"], while Array.sort() would produce [" /", "/"]. But we can live with that.
 * @param propNames A string array
 */
exports.sortPropertyNames = function (propNames) {
    propNames.sort((a, b) => {
        // Lowering case so Capitals are not sorted before lowers
        a = String(a).toLowerCase();
        b = String(b).toLowerCase();

        // sort index numbers numerically (e.g. "array/2" < "array/10")
        const partsA = a.split('/');
        const partsB = b.split('/');

        // Check the parts that are contained in both keys
        const len = Math.min(partsA.length, partsB.length);
        for (let i = 0; i < len; i++) {
            const partA = partsA[i];
            const partB = partsB[i];

            // if parts are the same, go to next level
            if (partA !== partB) {
                // if both parts are numbers, compare their numeric values
                if (REGEXP_NUM.test(partA) && REGEXP_NUM.test(partB)) return parseInt(partA, 10) - parseInt(partB, 10);

                // at least one part is not a number, use normal string comparison
                return partA < partB ? -1 : 1;
            }
        }

        // if the common part of the string is equal in both strings then the shorter string is before longer string
        return partsA.length - partsB.length;
    });
};

const flattenObjectMut = function (srcObj, trgObj, path) {
    if (srcObj instanceof Date) srcObj = srcObj.toISOString();

    const type = typeof srcObj;

    if (type === 'number' || type === 'string' || type === 'boolean' || srcObj === null) {
        trgObj[path] = srcObj;
    } else if (type === 'object') {
        // srcObj is an object or array
        // eslint-disable-next-line guard-for-in
        for (const key in srcObj) {
            let subPath;
            if (key === '') subPath = path; // super-properties have the same path as the parent
            else if (path.length > 0) subPath = `${path}/${key}`;
            else subPath = key;
            flattenObjectMut(srcObj[key], trgObj, subPath);
        }
    }
};

const flattenObject = function (item) {
    const flattenedObject = {};
    flattenObjectMut(item, flattenedObject, '');
    return flattenedObject;
};

exports.flattenArrayOfObjectsAndGetKeys = function (data) {
    const flattenedData = [];
    const keySet = new Set();
    for (const item of data) {
        const flattenedObj = flattenObject(item);
        flattenedData.push(flattenedObj);
        for (const key of Object.keys(flattenedObj)) {
            keySet.add(key);
        }
    }
    return {
        flattenedData,
        keys: Array.from(keySet),
    };
};
