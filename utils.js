const sortObj = require('sort-object')
const md5 = require('md5')

exports.countCells = (rows) => rows[0].length * rows.length

exports.toObjects = (rows) => {
    if(row.length === 0) return []
    const keys = rows[0]
    return rows.slice(1).map(row => {
        let obj = {}
        keys.forEach((key, i ) => obj[key] = row[i])
        return obj
    })
}

exports.toRows = (objects) => {
    if(objects.length === 0) return []
    const header = Object.keys(objects[0])
    const values = objects.map(object => Object.values(object))
    return [header, ...values]
}

// works only if all objects in one array have the same keys
exports.append = ({oldObjects, newObjects, filterByField, filterByEquality, transformFunction}) => {
    const oldKeys = oldObjects.length > 0 ? Object.keys(oldObjects[0]) : []
    const newKeys = newObject.length > 0 ? Object.keys(newObjects[0]) : []
    let keys = union(oldKeys, newKeys)
    // if no field or equality - this is simple concat
    const toConcat = transformFunction
        ? transformFunction(newObjects, oldObjects)
        : makeUniqueRows( oldObjects, newObjects, filterByField, filterByEquality)
    const concated = oldObjects.concat(toConcat)
    const updatedObjects = concated.map(objects => {
        let updatedObj = objects
        keys.forEach(key=>{
            if(!updatedObj[key]) updatedObj[key] = null
        })
        return sortObj(updatedObj)
    })
    return updatedObjects
}

exports.replace = ({newObjects, filterByField, filterByEquality, transformFunction}) => {
    if(transformFunction){
        return transformFunction(newObjects)
    }
    return makeUniqueRows([], newObjects, filterByField, filterByEquality)
}

exports.trimSheetRequest = (height, width, firstSheetId) => {
    let payload = {
        requests: []
    }
    if(height){
        payload.requests.push({
            deleteDimension:{
                range: {
                    sheetId:firstSheetId,
                    dimension: 'ROWS',
                    startIndex: height
                }
            }
        })
    }
    if(width){
        payload.requests.push({
            deleteDimension:{
                range: {
                    sheetId:firstSheetId,
                    dimension: 'COLUMNS',
                    startIndex: width
                }
            }
        })
    }
    return payload
}

function union(setA, setB) {
    var _union = new Set(setA);
    for (const elem of setB) {
        _union.add(elem);
    }
    return Array.from(_union);
}

function makeUniqueRows (oldObjects, newObjects, field, equality){
    const countHash = (row) => md5(Object.values(row).join(''))
    const rowIntoKey = (row) => {
        if(field) return row[field]
        else if (equality) return countHash(row)
        else throw ('Nor field or equality was provided to filterUniqueRows function')
    }
    if(!field && !equality)  return newObjects

    let tempObj = {}
    newObjects.forEach(row => tempObj[rowIntoKey(row)] = row)
    oldObjects.forEach(row => tempObj[rowIntoKey(row)] = null)
    const filteredRows = Object.values(tempObj).filter(row => !!row)
    return filteredRows
}

// export to test
exports.makeUniqueRows = makeUniqueRows