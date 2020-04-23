const sortObj = require('sort-object');
const md5 = require('md5');

exports.toObjects = (rows) => {
    if (!rows || rows.length <= 1) return [];
    const keys = rows[0];
    return rows.slice(1).map((row) => {
        const obj = {};
        keys.forEach((key, i) => {
            if (typeof row[i] === 'object') {
                throw new Error('TRANSFORMING ERROR - Cannot convert nested objects to rows');
            }
            obj[key] = row[i];
        });
        return obj;
    });
};

exports.toRows = (objects) => {
    if (!objects || objects.length === 0) return [];
    const header = Object.keys(objects[0]);
    const values = objects.map((object) => Object.values(object));
    return [header, ...values];
};

const union = (setA, setB) => {
    const unioned = new Set(setA);
    for (const elem of setB) {
        unioned.add(elem);
    }
    return Array.from(unioned);
};

const makeUniqueRows = (oldObjects, newObjects, field, equality) => {
    const countHash = (row) => md5(Object.values(row).join(''));
    const rowIntoKey = (row) => {
        if (field) return row[field];
        if (equality) return countHash(row);
        throw new Error('Nor field or equality was provided to filterUniqueRows function');
    };
    if (!field && !equality) return oldObjects.concat(newObjects);

    const tempObj = {};
    oldObjects.concat(newObjects).forEach((row) => {
        const key = rowIntoKey(row);
        if (!tempObj[key]) {
            tempObj[key] = row;
        }
    });
    const filteredRows = Object.values(tempObj).filter((row) => !!row);
    return filteredRows;
};

// export to test
exports.makeUniqueRows = makeUniqueRows;

// works only if all objects in one array have the same keys
exports.updateRowsObjects = ({ oldObjects = [], newObjects = [], deduplicateByField, deduplicateByEquality, transformFunction, columnsOrder }) => {
    const oldKeys = oldObjects.length > 0 ? Object.keys(oldObjects[0]) : [];
    const newKeys = newObjects.length > 0 ? Object.keys(newObjects[0]) : [];
    const keys = union(oldKeys, newKeys);
    // if no field or equality - this is simple concat
    const allObjects = transformFunction
        ? transformFunction({ datasetData: newObjects, spreadsheetData: oldObjects })
        : makeUniqueRows(oldObjects, newObjects, deduplicateByField, deduplicateByEquality);
    // const concated = oldObjects.concat(toConcat);
    const updatedObjects = allObjects.map((object) => {
        const updatedObj = object;
        keys.forEach((key) => {
            if (!updatedObj[key]) updatedObj[key] = '';
        });
        return sortObj(updatedObj, columnsOrder.length > 0 ? columnsOrder : null);
    });
    return updatedObjects;
};
