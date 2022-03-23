
# Google Sheets Import & Export Data

- [Why use Google Sheets Import & Export](#why-use-google-sheets-import-and-export)
- [How to use Google Sheets Import & Export](#how-to-use-google-sheets-import-and-export)
- [Input settings](#input-settings)
- [Limits](#limits)
- [Authentication and authorization](#authentication-and-authorization)
- [Public spreadsheet (no authorization)](#public-spreadsheet-no-authorization)
- [Local usage](#local-usage)
- [Important tips](#important-tips)
- [Modes](#modes)
- [Raw data import](#raw-data-import)
- [Raw data table format (array of arrays)](#raw-data-table-format-array-of-arrays)
- [Dataset format (array of objects)](#dataset-format-array-of-objects)
- [Further reading](#further-reading)
- [Changelog](#changelog)

## Why use Google Sheets Import and Export?
If you're looking for an easy way to import and export data from datasets across multiple Google sheets, Google Sheets Import & Export is the Apify automation tool for you. 

It can process data in your current spreadsheet, import new data from [Apify datasets](https://www.apify.com/docs/storage#dataset), or a raw JSON file. It can be run both on the Apify platform or locally.

You can use this actor with any programming language of your choice by calling [Apify API](https://www.apify.com/docs/api/v2).

## How to use Google Sheets Import and Export
We have an in-depth [tutorial](https://blog.apify.com/google-sheets-import-data/) on how to use this tool.

## Input settings
You can specify the following settings:
- Mode
- Spreadsheet id
- Public spreadsheet (read-only)
- Dataset ID
- Raw data
- Limit items
- Offset items
- Deduplicate by field
- Deduplicate by equality
- Transform function
- Range
- Columns order
- Keep column order from sheet
- Google OAuth tokens store
- Create backup
- Backup store id
- Google Developer Console credentials

For a complete description of all settings, see [input specification](https://apify.com/lukaskrivka/google-sheets/input-schema).

## Limits
If you exceed these limits, the actor run will fail, and no data will be imported.
- **Maximum runs (imports) per 100 seconds: 100**

## Authentication and authorization
If you are using this actor for the first time, you have to log in with the Google account where the spreadsheet is located. You then need to authorize Apify to work with your spreadsheets. Internally at Apify, we use our small npm package [apify-google-auth](https://www.npmjs.com/package/apify-google-auth). Please check this [article](https://help.apify.com/en/articles/2424053-google-integration) on how to handle the authorization process.

After authorization, tokens are stored in your key-value store, and you don't need to authorize again. So, after the first usage, you can fully automate the actor.

## Public spreadsheet (no authorization)
If you don't mind publishing your spreadsheet, you can use this actor without authorization for **read mode**. 
Simply set the input **publicSpreadsheet** to **"true"**. 

To protect against the abuse of Apify's unofficial Google API, a public spreadsheet without authorization will only work on the Apify platform by using a secret environment variable. 

If you want to run the public mode locally, you have to create your project in the Google console and pass an API_KEY environment variable to your actor process. 

Example:
**API_KEY=AIzaSyAPijSDFsdfSSf3kvGVsdfsdfsdsdnAVbcZb5Y apify run -p**

## Local usage
The official actor relies on the CLIENT_SECRET environment variable being set. This assures that official API integration is used. 

If you want to use this actor locally or fork the source code, you will need to create your own project in [Google Developer Console](https://console.developers.google.com/), create your own credentials, and pass them correctly to the **googleCredentials** input variable. This is explained further in the [Apify Google Auth library](https://www.npmjs.com/package/apify-google-auth).

## Important tips
* The maximum number of cells in the whole spreadsheet is 2 million! If the actor ever tries to import data over this limit, it will just throw an error, finish and not import anything. In this case, use more spreadsheets.

* No matter which mode you choose, the actor recalculates how the data should be positioned in the sheet, updates all the cells, and then trims the exceeding rows and columns. This ensures that the sheet always has the optimal number of rows and columns and there is enough space for the newly generated data.

* The actor parsing follows the default [Google Sheets parsing](https://developers.google.com/sheets/api/reference/rest/v4/ValueInputOption). Therefore, depending on the configuration of your system, constructions such as `"1.1"` and `"1,1"` can be interpreted either as a number or a string (text). For this reason, it is recommended that you always use valid JSON numbers (e.g. `1.1`).

## Modes
This actor can be run in multiple different modes. Each run must have only one specific mode. _Mode_ also affects how other options work (details are explained in the specific options).

-  **replace:** If there's any old data in the sheet, it is cleaned, and then new data is imported.

-  **append:** This mode adds new data as additional rows below the old rows already present in the sheet. Keep in mind that the columns are recalculated so some of them may move to different cells if new columns are added in the middle.

-  **modify:** This mode doesn't import anything. It only loads the data from your sheets and applies any of the processing you set in the options.

-  **read:** This mode simply loads the data from the spreadsheet, optionally can process them, and saves them as 'OUTPUT' JSON file to the default key-value store.

-  **load backup:** This mode simply loads any backup rows from previous runs (look at the backup option for details) and imports it to a sheet in the replace mode.

## Raw data import
If you want to send data in raw JSON format, you need to pass the data to the `rawData` input parameter. You will also need to have an Apify account so we can properly store your Google authentication tokens (you can opt out at anytime).

> **Important!** - Raw data cannot exceed 9MB, as this the default limit for Apify actor inputs. If you want to upload more data, you can easily split it into more runs (they're fast and cheap).

#### Raw data table format (array of arrays)
`rawData` should be an array of arrays where each of the arrays represents one row in the sheet. The first row should be a header row where the field names are defined. Every other row is a data row.

It is important to have a proper order in each array. If the field is null for any row, the array should contain an empty string in that index. Data rows can have a smaller length than the header row but if they are longer the extra data will be trimmed off.

Arrays **cannot** contain nested structures like objects or other arrays! You have to flatten them in a format where `/` is a delimiter. E.g. `personal/hobbies/0`.

```
"rawData": [
  ["name", "occupation", "email", "hobbies/0", "hobbies/1"],
  ["John Doe", "developer", "john@google.com", "sport", "movies with Leonardo"],
  ["Leonardo DiCaprio", "actor", "leonardo@google.com", "being rich", "climate change activism"]
]

```

#### Dataset format (array of objects)
`rawData` should be an array of objects where each object represents one row in the sheet. The keys of the objects will be transformed to a header row and the values will be inserted into the data rows. Objects don't need to have the same keys. If an object doesn't have a key that another object has, the row will have an empty cell in that field.

The object **can** contain nested structures (objects and arrays) but in that case, it will call Apify API to flatten the data which can take a little more time on large uploads so try to prefer flattened data.

_Nested_:

```
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

_Flattened_:

```
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
## Further reading
If you want a much deeper understanding of how this actor works, consult [Google Sheets for developers](https://developers.google.com/sheets/api/).


## Changelog
A detailed list of changes is in the [CHANGELOG.md](https://github.com/metalwarrior665/actor-google-sheets/blob/master/CHANGELOG.md) file.

