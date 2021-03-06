# Google Sheets Import & Export Data

- [Overview](#overview)
- [Usage](#usage)
- [Authentication and authorization](#authentication-and-authorization)
- [Modes](#modes)
- [Inner workings](#inner-workings)
- [Input](#input)
- [Importing data](#importing-data)
- [Loading from Spreadsheet](#loading-from-spreadsheet)
- [Webhooks](#Webhooks)
- [Deduplication options and transform function](#deduplication-options-and-transform-function)
- [Raw data import](#raw-data-import)
- [Changelog](#changelog)

## Overview

**Google Sheets** is an [Apify actor](https://www.apify.com/docs/actor) that can be used to either process data in your current spreadsheet or import new data from [Apify datasets](https://www.apify.com/docs/storage#dataset) or from a raw JSON. It can be run both on the Apify platform or locally. It is built with [Apify SDK](https://sdk.apify.com/), [apify-google-auth](https://help.apify.com/en/articles/2424053-google-integration) and [googleapis](https://github.com/googleapis/google-api-nodejs-client) npm packages.

If official Google Sheets API is too complicated for you and you need to just import and export data, then use this Google Sheets actor for import from another sheet or import datasets if you scrape websites using actors.

For a quick start, see our [tutorial](https://medium.com/p/43536b719029) for Google Sheets actor.

You can use this actor with any programming language (Javascript, Python, PHP) by calling [Apify API](https://www.apify.com/docs/api/v2).

For a deeper understanding how the actor works inside, look at the [Google Sheets referrence](https://developers.google.com/sheets/api/).

## Limits

If you exceed these limits, the actor run will fail and no data will be imported.

- Maximum runs (imports) per 100 seconds: `100`

## Usage

If you want to run the actor on **Apify platform** you need to open the [actor's page in the library](https://www.apify.com/lukaskrivka/google-sheets) and then click on `Try for free`. That will create a task (actor configuration) on your account. When using public actors, you don't need to build them since everything is done by the author. You only need to provide input and then you can run them. But keep in mind that usage is always charged towards the one who runs the actor. You can also use [webhooks](#webhooks) to let it run automatically after any actor or task.

If on the other side you want to run the actor **locally**, you need to open the actor's [github page](https://github.com/metalwarrior665/actor-google-sheets) and clone it to your computer.

## Authentication and authorization

If you use this actor for the first time, you have to login with the same Google account where the spreadsheet is located, authorize and allow Apify to work with your spreadsheets. Internally we use our small npm package [`apify-google-auth`](https://www.npmjs.com/package/apify-google-auth). Please check this [article](https://help.apify.com/en/articles/2424053-google-integration) how to authorize.

After you authorize for the first time, tokens are stored in your key-value store (option `tokensStore` which is by default `google-oauth-tokens`) and you don't need to authorize again. So after the first usage, you can fully automate the actor.

If you want to use more Google accounts inside one Apify account then each Google account needs to have a different `tokensStore` and you need to track which tokens belong to which account by naming the store properly.

#### Public spreadsheet (no authorization)
If you don't mind publishing your spreadsheet, you can use this actor without authorization for `read` mode. Just pass `publicSpreadsheet: true` to the input. To limit the possibility to abuse our google API, a public spreadsheet without authorization will work out of the box only on the Apify platform using the secret environment variable. If you want to run public mode locally, you have to create your own project in Google console and pass an API_KEY environment variable to your actor process like `API_KEY=AIzaSyAPijSDFsdfSSf3kvGVsdfsdfsdsdnAVbcZb5Y apify run -p` (replace with real API key from Google console)

#### Local or non-official usage
The official actor relies on the `CLIENT_SECRET` environment variable being set. This assures that official API integration is used. If you want to use this actor locally or copy the source code, you will need to create your own project in [Google Developer Console](https://console.developers.google.com/), create your own credentials and pass them correctly to the `googleCredentials` input variable. More explained in the [Apify Google Auth library](https://www.npmjs.com/package/apify-google-auth).

## Modes

This actor can be run in multiple different modes. Each run has to have only one specific mode. Mode also affects how other options work (details are explained in the specific options).

- `replace`: If there are any old data in the sheet, they are all cleaned and then new data are imported.
- `append`: This mode adds new data as additional rows below the old rows already present in the sheet. Keep in mind that the columns are recalculated so some of them may move to different cells if new columns are added in the middle.
- `modify`: This mode doesn't import anything. It only loads the data from your sheets and applies any of the processing you set in the options.
- `read`: This mode simply loads the data from the spreadsheet, optionally can process them and saves them as 'OUTPUT' JSON file to the default key-value store.
- `load backup`: This mode simply loads any backup rows from previous runs (look at the backup option for details) and imports it to a sheet in the `replace` mode.

## Inner workings

> **Important!** - The maximum number of cells in the whole spreadsheet is 2 million! If the actor would ever need to import data that would exceed this limit, it will just throw an error, finish and not import anything. In this case, use more spreadsheets.

> **Important!** - No matter which mode you choose, the actor recalculates how the data should be positioned in the sheet, then updates all the cells and then trims the exceeding rows and columns. There are 2 main reasons for this. First is to be maximally efficient with the number of rows and columns so any unused rows/columns are trimmed of. The second reason is that if the new data have new fields, we need to insert columns in the middle of the current columns so everything needs to be recalculated and moved.

## Input

Most of Apify actors require a JSON input and this one is no exception. The input consists of one object with multiple options:

- **`options`**<[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>
    - `mode` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Any of `replace`, `append`, `modify`, `read`, `load backup`. Explained above. **Required**
    - `spreadsheetId` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Id of your spreadsheet. It is the long hash in your spreadsheet URL. **Required**
    - `publicSpreadsheet` <[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)> If true, you don't need to authorize. You have to publish your spreadsheet and it works only in read mode. More in [authorization](#authentication-and-authorization).
    - `datasetId` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Id of the dataset where the data you want to import are located. **This option or `rawData` is mandatory for `replace` and `append` modes and cannot be used in other modes.**
    - `rawData` <[array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Indexed_collections_Arrays_and_typed_Arrays)> Array of raw JSON data. Can be either in table format (array of arrays) or in the usual dataset format (array of objects). Objects can be nested, arrays not. Raw data cannot exceed 9MB.**This option or `datasetId` is mandatory for `replace` and `append` modes and cannot be used in other modes.**
    - `backupStore` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Id of the store where the previous backup was saved. It is the id of the default key-value store of the run from which you want to load the backup. **This option is mandatory for "load backup" mode and not usable in other modes.**
    - `limit` <[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type)> Defines how many items (rows) you want to import. **Default**: `250000`.
    - `offset` <[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type)> Defines how many items you want to skip from the beginning. **Default**: `0`.
    - `range` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Defines  which part of your spreadsheet will be impacted by the actor. It is specified in [A1 notation](https://developers.google.com/sheets/api/guides/concepts#a1_notation). Usually, you want to just add a sheet name. **Default**: Name of the first sheet in the spreadsheet.
    - `columnsOrder` <[array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Indexed_collections_Arrays_and_typed_Arrays)> Array of keys. First sorts the columns by provided keys. The rest is sorted alphabetically. **Default**: Alphabetical sorting
    - `keepSheetColumnOrder` <[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)> If true, keeps the order of columns as they are in the sheet. If there is no sheet data yet, this does nothing. **Default: `false`**
    - `tokensStore` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Defines in which key-value store authorization tokens are stored. This applies to both where they are initially stored and where they are loaded from on each subsequent run. **Default**: `"google-oauth-tokens"`.
    - `deduplicateByEquality` <[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)> If true, only unique items(rows) are imported. Items are unique between each other if any of their fields are not equal (deep equality). Only one of `deduplicateByEquality`, `deduplicateByField` and  `transformFunction` can be specified! **Default**: `false`.
    - `deduplicateByField` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Similar to `deduplicateByEquality` but uniqueness is checked only by the one specified field which means the rest of the fields maybe different but the item will still not be imported. Only one of `deduplicateByEquality`, `deduplicateByField` and  `transformFunction` can be specified! **Default**: `null`.
    - `transformFunction` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Custom function that can filter or modify the items in any way. It's requirements and behaviour [differs for each mode](#deduplication-options-and-transform-function). Only one of `deduplicateByEquality`, `deduplicateByField` and  `transformFunction` can be specified! **Default**: `null`
    - `createBackup` <[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)> If true then after obtaining the data from the spreadsheet and before any manipulation, data are stored into the default key-value store under the key `backup`. Can be loaded in the future run using `load backup` mode. Useful when you are not sure what you are doing and have valuable data in the spreadsheet already. **Default**: `false`.
    - `googleCredentials` <[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)> Only pass this for usage of outside the official actor (local or elsewhere). This should contain installed type of credentials and you need to pass it as an object with these fields `{ client_id, client_secret, redirect_uri }`.

## Importing data

You have two options how you can import data with this actor:

- From Apify storage - This option is useful for upload data from finished actors and tasks. Simply provide an id of the dataset.
- In [raw JSON form](#raw-data-import) - This option is useful if you want to use this actor as a standalone API to import data to your spreadsheet.

Both these options behave exactly the same in every other means e.g. in modes, `transformFunction`, deduplication etc.

### Google Sheets value parser
The import is using the default [Google Sheets parsing](https://developers.google.com/sheets/api/reference/rest/v4/ValueInputOption). Basically, it should work exactly the same as if you write the value to the sheet manually. This has important ramifications because it will use a localized version of the parser in your spreadsheet. This means that (probably depending on the country) for some users `"1.1"` will be interpreted as a number but for others it might be a string. The same goes for `"1,1"`. That is why for numbers it is always recommended to use valid JSON numbers, e.g. `1.1`.

## Loading from Spreadsheet

With `read` mode, you can use this actor to load data from your spreadsheet into the actor.

From an actor, [Puppeteer Scraper](https://apify.com/apify/puppeteer-scraper), [Cheerio Scraper](https://apify.com/apify/cheerio-scraper) or any Node.js program you can use the [`Apify.call`](https://sdk.apify.com/docs/api/apify#apifycallactid-input-options) or [`Apify.callTask`](https://sdk.apify.com/docs/api/apify#apifycalltasktaskid-input-options) (if you want to preset your other input) functions.

```javascript
const sheetsInput = {
    mode: 'read',
    spreadsheetId: '1anU4EeWKxHEj2mAnB0tA2xGnkTdqXBSB76a7-FRLytr', // update to your ID
};
const myData = await Apify.call('lukaskrivka/google-sheets', sheetsInput);
```

When calling from other programming languages, from a browser or from [Web Scraper](https://apify.com/apify/web-scraper) you have to use regular run-sync API. Here is an example from browser/Web Scraper using native browser [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) call.

```javascript
const runUrl = `https://api.apify.com/v2/acts/lukaskrivka~google-sheets/run-sync?token=<YOUR_API_TOKEN>`
const sheetsInput = {
    mode: 'read',
    spreadsheetId: '1anU4EeWKxHEj2mAnB0tA2xGnkTdqXBSB76a7-FRLytr', // update to your ID
};
const fetchOptions = {
    body: JSON.stringify(sheetsInput),
    headers: { 'Content-Type': 'application/json' },
};
const myData = await fetch(runUrl, fetchOptions).then((response) => response.json());
```

`myData` has a `row-object` format which means it is an array where each row is represented by an object of fields and values:

```javascript
[
    { name: 'Alan', surname: 'Turing' },
    { name: 'Steve', surname: 'Jobs'},
    // ...
]
```

## Webhooks
Very often you want to run a spreadsheet update after every run of your scraping/automation actor. [Webhooks](https://apify.com/docs/webhooks) are the solution for this. The default `datasetId` will be passed automatically to the `Google Sheets` run so you don't need to set it up in the payload template (internally the actor transforms the `resource.defaultDatasetId` from the webhook into just `datasetId` for its own input).

The webhook from your scraping/automation run can either call the `Google Sheets` actor directly or as a task. If you call the **actor directly**, you have to fill up the payload template with appropriate input and add this as a URL:
`https://api.apify.com/v2/acts/lukaskrivka~google-spreadsheet/runs?token=<YOUR_API_TOKEN>`

Usually it is more convenient to **create a task** with predefined input that will not change in every run - the only changing part is usually `datasetId`. You will not need to fill up the payload template and your webhook URL will then look like:
`https://api.apify.com/v2/actor-tasks/<YOUR-TASK-ID>/runs?token=<YOUR_API_TOKEN>`

Don't forget that for the first time you need to run this actor manually so you properly [authorize and authenticate](#authentication-and-authorization).


## Deduplication options and transform function

By default the behaviour of the import is straightforward. `replace` mode simply replaces the old content with new rows, `append` simply adds new rows below the old ones, `modify` doesn't do anything (it is only usable with filter options or transform function) and `read` saves the data as they are to the key-value store. But for more complicated imports that require importing only unique items or any other custom functionality, you need to use one of the following options: `deduplicateByField`, `deduplicateByEquality` or `transformFunction`. The behaviour of each of these options is specific to each of the modes so if you need to do some more complicated workflow it is important to understand the interaction.

- **`deduplicateByEquality`**: Only unique items(rows) are kept in the data. If two items have all fields the same, their are considered duplicates and are removed from the data.
- **`deduplicateByField`**: Similar to `deduplicateByEquality` but the uniqueness of items is compared only with one field. So if one item has a certain value in this field, all other items with this value are considered duplicates and are removed from the data.
    - `append`: Old and new data is put together and checked for duplicates. Only the first item is kept if duplicates are found.
    - `replace`: Works like `append` but cares only about new data.
    - `modify`: Works like `replace` but cares only about old data.
    - `read`: Works the same as `modify`

### Transform function
If you need more complicated filtering abilities or just do whatever you want with the data you can use `transformFunction` option. You should provide a stringified javascript function that will get the data as parameters and return transformed data. The data format is very similar to the JSON format of the datasets, only all the nested objects (objects and arrays) are flattened. It is basically an array of objects (items) with flattened fields, let's call it `row-object` format.

```json
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

The function should always return an array in the `row-object` format which is what will be first converted to `rows` format and then imported to the sheet. The parameters differ based on the mode:

- `append`: The function will receive an object with `spreadsheetData` and `datasetData` properties as a parameter. `spreadsheetData` is `row-object` is an array from the data you already have in the spreadsheet. `datasetData` is a `row-object` array of the items from dataset.
- `replace`: The function will receive an object with `datasetData` properties as a parameter. It is a `row-object` array of the items from the dataset.
- `modify`: The function will receive an object with `spreadsheetData` properties as a parameter. It is a `row-object` array from the data you already have in the spreadsheet.
- `read`: Works the same as `modify`.

Example of usage with `append` mode (let's imagine we want always only the cheapest product for each country):

```javascript
({ datasetData, spreadsheetData }) => {
    // First we put the data together into one array
    const allData = datasetData.concat(spreadsheetData);

    // We define an object that will hold a state about which item is the cheapest for each country
    const stateObject = {};

    // Now let's loop over the data and update the object
    allData.forEach((item) => {
        // If the item doesn't have price or country field, we will throw it away
        if (!item.price || !item.country) return;

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

## Raw data import

If you want to send the data in a raw JSON format, you need to pass these data to the `rawData` input parameter. You will also need to have an account on Apify so we can properly store your Google authentication tokens(you can opt-out anytime).

Raw data can be supplied in two formats. Only depends on your needs which you will use.

> **Important!** - Raw data cannot exceed 9MB which is a default limit for Apify actor inputs. If you want to upload more data, you can easily split it into more runs (they are fast and cheap).

#### Table format (array of arrays)
`rawData` should be an array of arrays where each of the arrays represents one row in the sheet. The first row should be a header row where the field names are defined. Every other row is a data row. It is important to have a proper order in each array. If the field is null for some row, the array should contain an empty string in that index. Data rows can have a smaller length than the header row but if they are longer the extra data will be trimmed off. Arrays **cannot** contain other nested structures like objects or arrays! You have to flatten them in a format where `/` is a delimiter. E.g. `personal/hobbies/0`.

```json
"rawData": [
    ["name", "occupation", "email", "hobbies/0", "hobbies/1"],
    ["John Doe", "developer", "john@google.com", "sport", "movies with Leonardo"],
    ["Leonardo DiCaprio", "actor", "leonardo@google.com", "being rich", "climate change activism"]
]
```

#### Dataset format (array of objects)
`rawData` should be an array of objects where each object represents one row in the sheet. The keys of the objects will be transformed to a header row and the values will be inserted to the data rows. Objects don't need to have the same keys. If an object doesn't have a key that another object has, the row will have an empty cell in that field.

The object **can** contain nested structures (objects and arrays) but in that case it will call Apify API to flatten the data which can take a little more time on large uploads so try to prefer flattened data.

*Nested*:
```json
"rawData": [
    {
        "name": "John Doe",
        "email": "john@google.com",
        "hobbies": ["sport", "movies with Leonardo", "dog walking"]
    },
    {
        "name": "Leonardo DiCaprio",
        "email": "leonardo@google.com",
        "hobbies": ["being rich", "climate change activism"]
    }
]
```

*Flattened*:
```json
"rawData": [
    {
        "name": "John Doe",
        "email": "john@google.com",
        "hobbies/0": "sport",
        "hobbies/1": "movies with Leonardo",
        "hobbies/2": "dog walking"
    },
    {
        "name": "Leonardo DiCaprio",
        "email": "leonardo@google.com",
        "hobbies/0": "being rich",
        "hobbies/1": "climate change activism"
    }
]
```

## Changelog
A detailed list of changes is in the [CHANGELOG.md](https://github.com/metalwarrior665/actor-google-sheets/blob/master/CHANGELOG.md) file

Latest update - Version 2 (2020-10-08)

