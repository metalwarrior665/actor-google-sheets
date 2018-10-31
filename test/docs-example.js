const func = (newData, oldData) => {
    // First we put the data together into one array
    const allData = newData.concat(oldData);

    // We define an object that will hold a state about which item is the cheapest for each country
    const stateObject = {};

    // Now let's loop over the data and update the object
    allData.forEach((item) => {
        // If the item doesn't have price field, we will throw it away
        if (!item.price) return;

        // If the state doesn't hold the country, we will add the first item there to hold the current position of cheapest item
        if (!stateObject[item.country]) {
            stateObject[item.country] = item;
        } else if (item.price < stateObject[item.country].price) {
            // If the state already holds the country, lets compare if the new item is cheaper than the old and if so, replace them
            stateObject[item.country] = item;
        }
    });

    // Once we went through all the item, let's convert our state object back to the right array format
    const finalData = Object.values(stateObject);
    return finalData;
};

const oldData = [{
    sku: '234234234',
    country: 'US',
    price: 20.99,
    'sizes/0': 'S',
    'sizes/1': 'M',
    'sizes/2': 'L',
    'sizes/3': 'XL',
},
{
    sku: '123123123',
    country: 'UK',
    price: 48.49,
    'sizes/0': 'M',
    'sizes/2': 'XL',
}];

const newData = [{
    sku: '234234234',
    country: 'US',
    price: 29.99,
    'sizes/0': 'S',
    'sizes/1': 'M',
    'sizes/2': 'L',
    'sizes/3': 'XL',
},
{
    sku: '123123123',
    country: 'UK',
    price: 44.49,
    'sizes/0': 'M',
    'sizes/2': 'XL',
}];

console.dir(func(oldData, newData));
