# google-spreadsheet

- [Overview](#overview)
- [Usage](#usage)
- [Authentication and authorization](#authentication-and-authorization)
- [Modes](#modes)
- [Inner workings](#inner-workings)
- [Input](#input)
- [Crawler webhook](#crawler-webhook)
- [Filter options and filter function](#filter-options-and-filter-function)

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

* replace - If there are any old data in the sheet, they are all cleaned and then new data are imported.
* append - This mode adds new data as additional rows after the old rows already present in the sheet. Keep in mind that no old values are removed or changed but the columns are recalculated so some of the cells may move to the right.
* modify - This mode doesn't import anything. It only loads the data from your sheets and applies any of the processing you set in the options.
* load backup - This mode simply loads any backup rows from previous runs (look at backup option for details) and imports it to a sheet in replace style.

## Inner workings

> Important! - The maximum number of total cells in one spreadsheet is 2 millions! If you exceed this, the actor will throw an error and will not do anything!

> Important! - No matter which mode you choose, the actor always trims the rows and columns, then clears them, recalculates all the positions of the data and repaints the rows. There are 2 main reasons for this. First is to be maximally efficient with the number of rows and columns so any unused rows/columns are trimmed of. The second reason is that if the new data have new fields (like bigger arrays) we need to insert columns in the middle of current columns so everything needs to be recalculated and moved.

## Input

Most of actors take a JSON input and this one is no exception. The input consist of one object with multiple options:

- **`options`**<[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>
    - `mode` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Any of "replace", "append", "modify", "load backup". Explained above. **Required**
    - `spreadsheetId` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Id of your spreadsheet. It is the long hash in your spreadsheet URL. **Required**
    - `datasetOrExecutionId` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Id of the dataset or crawler execution where the data you want to import are located. **This option is mandatory for "replace" and "append" modes and not usable in other modes.**
    - `backupStore` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Id of the store where the previous backup was saved. It is id of thr default key value store of the run from which you want to load the backup. **This option is mandatory for "load backup" mode and not usable in other modes.**
    - `limit` <[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type)> Defines how many items (rows) you want to import. **Default**: Maximum (currently 250k).
    - `offset` <[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type)> Defines how many items you want to skip from the beginning. **Default**: `0`.
    - `range` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Defines on which part of your spreadsheet will be impacted by the actor. It is specified in [A1 notation](https://developers.google.com/sheets/api/guides/concepts#a1_notation). **Default**: Name of the first sheet in the spreadsheet.
    - `tokensStore` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Defines in which key value store are authorization tokens stored. This applies to both where they are initialy stored and when they are loaded from on each subsequent run. **Default**: `"google-oauth-tokens"`.
    - `filterByEquality` <[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)> If true, only unique items(rows) are imported. Equality means that all fields are equal (deep equality). Only one filter option can be used! **Default**: `false`.
    - `filterByField` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Similar to previous but uniqueness is checked only by one specified field which means the rest of fields maybe different but the items will still not be imported. Only one filter option can be used! **Default**: `null`.
    - `filterFunction` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Custom function that decide which items are imported and can modify the items in any way. Its requirements and behaviour differs for each mode.  Only one filter option can be used! **Default**: `null`
    - `createBackup` <[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)> If true then after obtaining the data from the spreadsheet and before any manipulation, data are stored into the default key value store under key "backup". Can be loaded in other run with "load backup" mode. Useful when you are not sure what you are doing and have valuable data. **Default**: `false`.

## Filter options and filter function
Will be added soon...

## Crawler webhook
If you are using [Apify crawlers](https://www.apify.com/docs/crawler), you can add the finish webhook to the crawler so that data will be imported to the spreadsheet each time a crawler run finish. For the first time you need to run this actor manually so you properly [authorize and authenticate](#authentication-and-authorization).

To set up the webhook, you need to go to advanced settings of your crawler, find **Finish webhook URL** field and paste there API URL that runs the actor. Use this URL and simply change the token to your Apify token that you can find in your Account => Integrations tab.

`https://api.apify.com/v2/acts/lukaskrivka~google-spreadsheet/runs?token=<YOUR_API_TOKEN>`

Then you need to add an input for the actor to the **Finish webhook data**. It should a standard JSON input as specified here just without the `datasetOrExecutionId`


