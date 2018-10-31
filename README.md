# google-spreadsheet

- [Overview](#overview)
- [Usage](#usage)
- [Authentication and authorization](#authentication-and-authorization)
- [Modes](#modes)
- [Inner workings](#inner-workings)
- [Input](#input)
- [Crawler webhook](#crawler-webhook)
- [Filter options and transform function](#filter-options-and-transform-function)

## Overview

**google-spreadsheet** is an [Apify actor](https://www.apify.com/docs/actor) that can be used to either process data in your current spreadsheet or import new data from [Apify datasets](https://www.apify.com/docs/storage#dataset) or [crawler executions](https://www.apify.com/docs/crawler). It can be run both on Apify platform or locally. It is built with [Apify SDK](https://sdk.apify.com/), [apify-google-auth](https://kb.apify.com/integration/google-integration) and [googleapis](https://github.com/googleapis/google-api-nodejs-client) npm packages.

## Usage

If you want to run the actor on **Apify platform** you need to open the the [actor's page in the library](https://www.apify.com/lukaskrivka/google-spreadsheet) (unless you are already here) and then "copy" it to your account. When using public actors, you don't need to build them since everything is done by the author. You only need to provide an input and run them. But keep in mind that usage is always charged towards the one who runs the actor. You can also run it [automatically after every crawler run](#crawler-webhook).

If on the other side you want to run the actor **locally**, you need to open the actor's [github page](https://github.com/metalwarrior665/actor-google-spreadsheet) (unless you are already here) and clone it to your computer.

## Authentication and authorization

If you use this actor for the first time, you have to login with the same Google account where the spreadhseet is located, authorize and allow Apify to work with your spreadsheet. Internally we use our small npm package [`apify-google-auth`](https://www.npmjs.com/package/apify-google-auth). Please check this [article](https://kb.apify.com/integration/google-integration) how to authorize.

After you authorize for the first time, tokens are stored in your key-value store (option `tokensStore` by default `google-oauth-tokens`) and you don't need to authorize again. So after the first usage, you can fully automate the actor.

If you want to use more Google accounts inside one Apify account or locally then each Google account needs to have a different `tokensStore` for each user and you need to track which tokens belong to which user by naming the store properly.

## Modes

This actor can be run in multiple different modes. Each run has to have only one specific mode. Mode also affects how other options work (details are explained in the specific options).

- `replace`: If there are any old data in the sheet, they are all cleaned and then new data are imported.
- `append`: This mode adds new data as additional rows after the old rows already present in the sheet. Keep in mind that no old values are removed or changed but the columns are recalculated so some of the cells may move to the right.
- `modify`: This mode doesn't import anything. It only loads the data from your sheets and applies any of the processing you set in the options.
- `load backup`: This mode simply loads any backup rows from previous runs (look at backup option for details) and imports it to a sheet in replace style.

## Inner workings

> Important! - The maximum number of total cells in one spreadsheet is 2 millions! If you exceed this, the actor will throw an error and will not do anything!

> Important! - No matter which mode you choose, the actor always trims the rows and columns, then clears them, recalculates all the positions of the data and repaints the rows. There are 2 main reasons for this. First is to be maximally efficient with the number of rows and columns so any unused rows/columns are trimmed of. The second reason is that if the new data have new fields (like bigger arrays) we need to insert columns in the middle of current columns so everything needs to be recalculated and moved.

## Input

Most of our actors require a JSON input and this one is no exception. The input consists of one object with multiple options:

- **`options`**<[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>
    - `mode` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Any of "replace", "append", "modify", "load backup". Explained above. **Required**
    - `spreadsheetId` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Id of your spreadsheet. It is the long hash in your spreadsheet URL. **Required**
    - `datasetOrExecutionId` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Id of the dataset or crawler execution where the data you want to import are located. **This option is mandatory for "replace" and "append" modes and not usable in other modes.**
    - `backupStore` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Id of the store where the previous backup was saved. It is id of thr default key value store of the run from which you want to load the backup. **This option is mandatory for "load backup" mode and not usable in other modes.**
    - `limit` <[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type)> Defines how many items (rows) you want to import. **Default**: Maximum (currently 250k).
    - `offset` <[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type)> Defines how many items you want to skip from the beginning. **Default**: `0`.
    - `range` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Defines on which part of your spreadsheet will be impacted by the actor. It is specified in [A1 notation](https://developers.google.com/sheets/api/guides/concepts#a1_notation). **Default**: Name of the first sheet in the spreadsheet.
    - `tokensStore` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Defines in which key value store are authorization tokens stored. This applies to both where they are initialy stored and when they are loaded from on each subsequent run. **Default**: `"google-oauth-tokens"`.
    - `filterByEquality` <[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)> If true, only unique items(rows) are imported. Equality means that all fields are equal (deep equality). Only one of `filterByEquality`, `transformFunction` and  `transformFunction` can be specified! **Default**: `false`.
    - `filterByField` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Similar to previous but uniqueness is checked only by one specified field which means the rest of fields maybe different but the items will still not be imported. Only one of `filterByEquality`, `transformFunction` and  `transformFunction` can be specified! **Default**: `null`.
    - `transformFunction` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Custom function that decide which items are imported and can modify the items in any way. Its requirements and behaviour differs for each mode. Only one of `filterByEquality`, `transformFunction` and  `transformFunction` can be specified! **Default**: `null`
    - `createBackup` <[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)> If true then after obtaining the data from the spreadsheet and before any manipulation, data are stored into the default key value store under key "backup". Can be loaded in other run with "load backup" mode. Useful when you are not sure what you are doing and have valuable data. **Default**: `false`.

## Filter options and transform function
By default the behaviour of the import is straightforward. `replace` modes simply replaces the content, `append` simply adds new rows and `modify` doesn't do anything (it is only usable when). But for more complicated imports that require importing only unique items or any custom functionality, you need to use one of the following options: `filterByField`, `filterByEquality` or `transformFunction`. Behaviour of each of these options is specific to each of the modes so if you need to do some more complicated workflow it is important to understand the interaction.

- **`filterByField`**: Items are evaluated to be equal if the provided field is equal between them.
    - `append`: New items are checked for equal field with the old ones. If the field is equal, new item is is not appended. If more new files have the same field, only the last one is appended. The old items are not deduplicated between themselves.
    - `replace`: Works like `append` but all items are deduplicated so only the last item is imported.
    - `modify`: Works exactly like `replace` only on old items instead of new.
- **`filterByEquality`**: This options behaves very similarly to `filterByField` only the items are evaluated to be equal if all of their fields are the same. So if any the item has any unique field, it will be imported.

### Transform function
If you need more complicated filtering abillities or just do whatever you want with the data you can use `transformFunction` option. You should provide a stringified javascript function that will get the data as parameters and return transformed data. The data format is very similar to the JSON format of the datasets or crawler results only all the nested objects (objects and arrays) are flattened. It is basically an array of objects (items) with flattend fields, let's call it `row-object` format.

```
[{
    "sku": "234234234",
    "country": "US",
    "price": 20.99,
    "sizes/0": "S",
    "sizes/1": "M",
    "sizes/2": "L",
    "sizes/3": "XL"
},
{
    "sku": "123123123",
    "country": "UK",
    "price": 48.49,
    "sizes/0": "M",
    "sizes/2": "XL"
}]
```

The function should always return array in the `row-object` format which is what will be first converted to `rows` format and then imported to the sheet. The parameters differ based on the mode:

- `append`: The function will get exactly 2 parameters. First is a `row-object` array of the items from dataset or crawler execution and second is `row-object` array from the data you already have in the spreadsheet.
- `replace`: The function will get exactly 1 parameter. It is a `row-object` array of the items from dataset or crawler execution.
- `modify`: The function will get exactly 1 parameter. It is a `row-object` array from the data you already have in the spreadsheet.

Example of usage with the `append` mode (let's imagine we want always only the cheapest product for each country):

```
(newData, oldData) => {
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
}
```

## Crawler webhook
If you are using [Apify crawlers](https://www.apify.com/docs/crawler), you can add the finish webhook to the crawler so that data will be imported to the spreadsheet each time a crawler run finish. For the first time you need to run this actor manually so you properly [authorize and authenticate](#authentication-and-authorization).

To set up the webhook, you need to go to advanced settings of your crawler, find **Finish webhook URL** field and paste there API URL that runs the actor. Use this URL and simply change the token to your Apify token that you can find in your Account => Integrations tab.

`https://api.apify.com/v2/acts/lukaskrivka~google-spreadsheet/runs?token=<YOUR_API_TOKEN>`

Then you need to add an input for the actor to the **Finish webhook data**. It should a standard JSON input as specified here just without the `datasetOrExecutionId` field because that is automatically loaded from the webhook. Simple example can look like this:

`{"mode": "append", "spreadsheetId": "1oz8YzfE5gVw84qWAywlugH0ddrkc1FyAe1aEO4TFTjA"}`


