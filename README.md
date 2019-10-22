# Event Subscription API App Example

## Overview

This NodeJS Express application illustrates how to create an _API Access_ SmartApp that connects to your SmartThings
account with OAuth2 to control devices and subscribe to device events. The application uses the 
[SmartThings SmartApp](https://www.npmjs.com/package/@smartthings/smartapp) SDK NPM module for making the
API calls to control switch devices and subscribe to switch events. The app create a web page that displays
the state of all switches in a location and allows those switches to be turned on and off.

API access tokens and web session state are stored in [AWS DynamoDB](https://aws.amazon.com/dynamodb/), so you will
need an AWS account to run the app as it is written. The app uses the 
SmartThings [dynamodb-context-store](https://www.npmjs.com/package/@smartthings/dynamodb-context-store) to store
the API tokens and the [dynamodb-store)](https://www.npmjs.com/package/dynamodb-store) for storing session state.

## Files and directories 

- public
  - images -- image assets used by the web pages
  - javascript -- javascript used by the web page for rendering and controlling devices
  - stylesheets -- stylesheets used by the web pages
- views
  - devices.ejs -- page that displays switch devices and allows them to be controlled
  - error.ejs -- error page
  - index.ejs -- initial page with link to connect to SmartThings
- server.js -- the Express server and SmartApp
- .env -- file you create with AWS and app credentials

## Getting Started

### Prerequisites
- A [Samsung Developer Workspace account](https://smartthings.developer.samsung.com/workspace/) with _API Access_ app approval. 
Submit requests for approval using
[this form](https://smartthings.developer.samsung.com/oauth-request)

- [Node.js](https://nodejs.org/en/) and [npm](https://www.npmjs.com/) installed

- [ngrok](https://ngrok.com/) or similar tool to create a secure tunnel to a publically available URL

- [AWS Account](https://aws.amazon.com) for hosting 
[DynamoDB](https://docs.aws.amazon.com/dynamodb/index.html) database or 
[local DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html) instance 
(though that option has not been tested with this app)

## Instructions
- Clone [this GitHub repository](https://github.com/SmartThingsCommunity/api-app-minimal-example-js), cd into the
directory, and install the Node modules with NPM:
```$bash
git clone https://github.com/SmartThingsCommunity/api-app-minimal-example-js.git
cd api-app-minimal-example-js
npm install
```

- Create a file named `.env` in the project directory and set the base URL of the server to your ngrok URL 
(or the URL you configured in your local hosts file):
```$bash
SERVER_URL=https://your-subdomain-name.ngrok.io
```

- Start your server and make note of the :
```$bash
node server.js

Website URL -- Use this URL to log into SmartThings and connect this app to your account:
https://your-subdomain-name.ngrok.io

Redirect URI -- Copy this value into the "Redirection URI(s)" field in the Developer Workspace:
https://your-subdomain-name.ngrok.io/oauth/callback
```

- Go to the [SmartThings Developer Workspace](https://smartthings.developer.samsung.com/workspace) and create an new
[API Access](https://smartthings.developer.samsung.com/workspace/projects/new?type=CPT-OAUTH) project in your organization.
If the previous link doesn't work and you don't see an option for creating an API access project, then your access
has not yet been approved. 

- After creating the project click the Use the _Register an Application_ link and fill in the fields, and click _Save_. 
Use the _Redirect URI_ value printed out in the server log and specify the 
`r:locations:*`, `r:devices:*`, and `x:devices:*` scopes.

- Since this app will be subscribing to device event callback from the SmartThings platform, you need to define a URL 
to receive those callbacks. The Developer Workspace currently doesn't have that functionality, but you set that URL using
the SmartThings API. To do so:

  - Get a personal token with at least `r:apps` and`w:apps` scope from [https://account.smartthings.com/tokens](https://account.smartthings.com/tokens)
  
  - Save the current definition for you app by running the following command, substituting your PAT_TOKEN and APP_ID. You can
    get your APP_ID from the Developer Workspace
    ```$bash
        curl -H "Authorization: Bearer {PAT_TOKEN}" \
             https://api.smartthings.com/apps/{APP_ID} > app.json
    ```
    
    - Edit the `app.json` file to add the `targetUrl` property with the value `https://your-subdomain-name.ngrok.io` 
    to the `apiOnly` section. The result should look something like this:
    ```$bash
    {
      "appName": "api-app-subscription-test-1571704633875-935",
      "appId": "c5a19a9b-2d88-40e6-9c55-ad177c5db73d",
      "appType": "API_ONLY",
      "principalType": "LOCATION",
      "classifications": [
        "CONNECTED_SERVICE"
      ],
      "displayName": "api-app-subscription-test",
      "description": "Description",
      "singleInstance": false,
      "installMetadata": {
        "certified": "false",
        "maxInstalls": "50"
      },
      "owner": {
        "ownerType": "USER",
        "ownerId": "c257d2c7-332b-d60d-808d-12345678abcd"
      },
      "createdDate": "2019-10-22T00:37:14Z",
      "lastUpdatedDate": "2019-10-22T00:37:15Z",
      "apiOnly": {
        "targetUrl": "https://your-subdomain-name.ngrok.io"
      },
      "ui": {
        "pluginUri": "",
        "dashboardCardsEnabled": false,
        "preInstallDashboardCardsEnabled": false
      }
    }
    ```
- Add the _APP_ID_, _CLIENT_ID_ and _CLIENT_SECRET_ properties from the Developer Workspace to your `.env` file. 
For example:
```$bash
APP_ID=aaaaaaaa-aaaa-aaaa-aaaaaaaaaaaa
CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxxxxxxxxxx
CLIENT_SECRET=xxxxxxxx-xxxx-xxxx-xxxxxxxxxxxx
```

- Restart your server:
```$bash
node server.js
```

- Go to webside URL from the server log, log in with your SmartThings account credentials, and 
choose a location. You should see a page listing all devices in that location with the _switch_
capability. Tapping the device on the page should turn the switch on and off. You should also see
the states of the switches on the page change when you turn them on and off with the SmartThings
mobile app.
