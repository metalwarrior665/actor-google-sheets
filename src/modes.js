const Apify = require('apify');

const { toRows, toObjects, updateRowsObjects } = require('./transformers.js');

module.exports = async ({ mode, values, newObjects, deduplicateByField, deduplicateByEquality, transformFunction, columnsOrder, backupStore }) => {
    if (mode === 'replace') {
        const replacedObjects = updateRowsObjects({ newObjects, deduplicateByField, deduplicateByEquality, transformFunction, columnsOrder });
        return toRows(replacedObjects);
    }
    if (mode === 'modify' || mode === 'read') {
        if (!values || values.length <= 1) {
            throw new Error('There are either no data in the sheet or only one header row so it cannot be modified!');
        }
        const oldObjects = toObjects(values);
        const replacedObjects = updateRowsObjects({ oldObjects, deduplicateByField, deduplicateByEquality, transformFunction, columnsOrder });

        if (mode === 'read') {
            await Apify.setValue('OUTPUT', replacedObjects);
            console.log('Data were read, processed and saved as OUTPUT to the default key-value store');
            process.exit(0);
        }
        return toRows(replacedObjects);
    }
    if (mode === 'append') {
        const oldObjects = toObjects(values); // [] if zero or one rows
        const appendedObjects = updateRowsObjects({ oldObjects, newObjects, deduplicateByField, deduplicateByEquality, transformFunction, columnsOrder });
        return toRows(appendedObjects);
    }
    if (mode === 'load backup') {
        const store = await Apify.openKeyValueStore(backupStore);
        if (!store) {
            throw new Error('Backup store not found under id/name:', backupStore);
        }
        const rows = await store.getValue('backup');
        if (!rows) {
            throw new Error('We did not find any record called "backup" in this store:', backupStore);
        }
        return rows;
    }
};
