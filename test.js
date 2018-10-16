const {toObjects, toRows, append, replace, makeUniqueRows} = require('./utils.js')
const assert = require('assert')

const rows = [['a', 'b', 'c'], [2, 2, 4], [3, 2, 5], [4, 2, 5]]
const objects = [{a:2, b:2, c:4}, {a:3, b:2, c:5}, {a:4, b:2, c:5}]
const objects2 = [{d: 4, b: 2, c:null}, {d: 3, b: 2, c:6}, {d: 4, b: null, c:5}]
const appendedBasic = [
    {a:2, b:2, c:4, d: null},
    {a:3, b:2, c:5, d: null}, 
    {a:4, b:2, c:5, d: null},
    {a:null, b:2, c:null, d: 4},
    {a:null, b:2, c:6, d: 3},
    {a:null, b:null, c:5, d: 4}
]
const uniqueToAppend = [
    {d: 4, b: null, c:5, a: null}
]
const appendedWithFilterField = [
    {a:2, b:2, c:4, d: null},
    {a:3, b:2, c:5, d: null}, 
    {a:4, b:2, c:5, d: null},
    {a:null, b:null, c:5, d: 4}
]

const replacedWithFilterField = [ 
    {d: 3, b: 2, c:6},
    {d: 4, b: null, c:5}
]

describe('toObjects', ()=>{
    it('works', ()=>{
        //console.log('to objects')
        //console.dir(objects)
        //console.dir(toObjects(rows))
        assert.deepEqual(objects, toObjects(rows))
    })
})

describe('toRows', ()=>{
    it('works', ()=>{
        //console.log('to rows')
        //console.dir(rows)
        //console.dir(toRows(objects))
        assert.deepEqual(rows, toRows(objects))
    })
})

describe('replace', () => {
    it('basic', ()=>{
        assert.deepEqual(objects2, replace({newObjects: objects2}))
    })
    it('with field filter', () => {
        assert.deepEqual(replacedWithFilterField, replace({newObjects: objects2, filterByField:'b'}))
    })
})

describe('append', () => {
    it('basic', ()=>{
        assert.deepEqual(appendedBasic, append({oldObjects: objects, newObjects: objects2}))
    })
    it('with field filter', () => {
        assert.deepEqual(appendedWithFilterField, append({oldObjects:objects, newObjects:objects2, filterByField: 'b'}))
    })
})

describe('makeUniqueRows', () => {
    it('works', ()=> {
        assert.deepEqual(uniqueToAppend, makeUniqueRows( objects, objects2, 'b', null))
    })
})