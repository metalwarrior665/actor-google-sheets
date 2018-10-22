const createKeys = (obj1, obj2) => {
    const unioned = union(Object.keys(obj1), Object.keys(obj2))
    return unioned.filter(key => key.startsWith('promotions/') || key === 'price' || key === 'stock') 
}

const isNotEmpty = (obj) => {
    if(!obj) return false
    const nonemptyValues = Object.values(obj).filter(val => val !== '' &&  val !== undefined)
    return nonemptyValues.length > 0
}

const reconstructArray = (rowObject, keys) => {
    let arr = []
    keys.forEach(key => {
        const [_, i, field] = key.match(/promotions\/(\d+)\/(.+)/)
        const index = parseInt(i)
        if(!arr[index]) arr[index] = {}
        arr[index][field] = rowObject[key]
    })
    return arr.filter(isNotEmpty)
}

// only one level deep
const deepEqualsArray = (arr1, arr2, promotionKeys) => {
    // by default they are equal
    if(arr1.length !== arr2.length) return false
    for(let i = 0; i < arr1.length; i++){
        for(const key of promotionKeys){
            if(arr1[key] !== arr2[key]) return false
        } 
    }
    return true
}
const pseudoDeepEquals = (rowObject1, rowObject2, keysToCompare, promotionKeys) => {
    const promotionsEquals = deepEqualsArray(reconstructArray(rowObject1, promotionKeys), reconstructArray(rowObject2, promotionKeys), promotionKeys)
    const bool = keysToCompare.reduce((accBool, key)=>{
        if(accBool) {
            if(promotionKeys.includes(key)){
                return promotionsEquals
            }
            else return rowObject1[key] === rowObject2[key]
        }
        return false
    }, true)
    return bool
}

function union(setA, setB) {
    var _union = new Set(setA);
    for (const elem of setB) {
        _union.add(elem);
    }
    return Array.from(_union);
}

exports.createKeys = createKeys
exports.reconstructArray = reconstructArray
exports.pseudoDeepEquals = pseudoDeepEquals



const customTransform1 = (newObjects, oldObjects) => {
 
    // We put new rows into temp object and then overwrite them with null if we find a match
    let tempObj = {}
    const keysToCompare = createKeys(newObjects[0], oldObjects[0])
    const promotionKeys = keysToCompare.filter(key => key.startsWith('promotions/'))
    console.log('keys to compare', keysToCompare)
    console.log('newObjects.length', newObjects.length)
    console.log('oldObjects.length', oldObjects.length)
    newObjects.forEach(row => tempObj[row.product_id] = row)
    oldObjects.forEach(row => {
        const maybeRow = tempObj[row.product_id]
        //console.log(`comparing rows ids: old row: ${row? row.product_id: null}, new row: ${maybeRow ? maybeRow.product_id: null}`)
        
        if(maybeRow && pseudoDeepEquals(maybeRow, row, keysToCompare, promotionKeys)){
            //console.log(`new row with id ${row.product_id} will not be imported`)
            tempObj[row.product_id] = null
        } 
    })
    const filteredRows = Object.values(tempObj).filter(row => !!row)
    console.log('transformed rows length:', filteredRows.length)
    console.log('sliced rows:')
    console.dir(filteredRows.slice(0,5))
    return filteredRows
}

//exports.customTransform1 = customTransform1

exports.customTransform1 = `(newObjects, oldObjects) => {
      
    const createKeys = (obj1, obj2) => {
        const unioned = union(Object.keys(obj1), Object.keys(obj2))
        return unioned.filter(key => key.startsWith('promotions/') || key === 'price' || key === 'stock') 
    }
    
    const isNotEmpty = (obj) => {
        if(!obj) return false
        const nonemptyValues = Object.values(obj).filter(val => val !== '' &&  val !== undefined)
        return nonemptyValues.length > 0
    }
    
    const reconstructArray = (rowObject, keys) => {
        let arr = []
        keys.forEach(key => {
            const [_, i, field] = key.match(/promotions\\/(\\d+)\\/(.+)/)
            const index = parseInt(i)
            if(!arr[index]) arr[index] = {}
            arr[index][field] = rowObject[key]
        })
        return arr.filter(isNotEmpty)
    }
    // only one level deep
    const deepEqualsArray = (arr1, arr2, promotionKeys) => {
        // by default they are equal
        //console.log('arr1', arr1)
        //console.log('arr2', arr2)
        if(arr1.length !== arr2.length) return false
        for(let i = 0; i < arr1.length; i++){
            for(const key of promotionKeys){
                if(arr1[key] !== arr2[key]) return false
            } 
        }
        return true
    }
    const pseudoDeepEquals = (rowObject1, rowObject2, keysToCompare, promotionKeys) => {
        const promotionsEquals = deepEqualsArray(reconstructArray(rowObject1, promotionKeys), reconstructArray(rowObject2, promotionKeys), promotionKeys)
        const bool = keysToCompare.reduce((accBool, key)=>{
            if(accBool) {
                if(promotionKeys.includes(key)){
                    return promotionsEquals
                }
                else return rowObject1[key] === rowObject2[key]
            }
            return false
        }, true)
        return bool
    }
    
    function union(setA, setB) {
        var _union = new Set(setA);
        for (const elem of setB) {
            _union.add(elem);
        }
        return Array.from(_union);
    }
 
    const customTransform1 = (newObjects, oldObjects) => {
 
        // We put new rows into temp object and then overwrite them with null if we find a match
        let tempObj = {}
        const keysToCompare = createKeys(newObjects[0], oldObjects[0])
        const promotionKeys = keysToCompare.filter(key => key.startsWith('promotions/'))
        console.log('keys to compare', keysToCompare)
        console.log('newObjects.length', newObjects.length)
        console.log('oldObjects.length', oldObjects.length)
        newObjects.forEach(row => tempObj[row.product_id] = row)
        oldObjects.forEach(row => {
            const maybeRow = tempObj[row.product_id]
            
            if(maybeRow && pseudoDeepEquals(maybeRow, row, keysToCompare, promotionKeys)){
                tempObj[row.product_id] = null
            } 
        })
        const filteredRows = Object.values(tempObj).filter(row => !!row)
        console.log('transformed rows length:', filteredRows.length)
        console.log('sliced rows:')
        console.dir(filteredRows.slice(0,5))
        return filteredRows
    }
    
    return customTransform1(newObjects, oldObjects)
}`