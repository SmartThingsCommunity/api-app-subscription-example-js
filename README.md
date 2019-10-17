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

## Key files and directories 

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
- [Node.js](https://nodejs.org/en/) and [npm](https://www.npmjs.com/) installed
- [ngrok](https://ngrok.com/) or similar tool to create a secure tunnel to a publically available URL
- [AWS Account](https://aws.amazon.com) for hosting 
[DynamoDB](https://docs.aws.amazon.com/dynamodb/index.html) database or 
[local DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html) instance 
(though that option has not been tested with this app)

## Instructions

- Re-mix this Glitch Project (or deploy the server in some other publicly accessible web server supporting HTTPS). 

- Edit the `.env` file and add an `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` and restart the server (Glitch
will do that automatically by default). When the server starts make note of the URLs printed out in the log.

- Go to the [SmartThings Developer Workspace](https://smartthings.developer.samsung.com/workspace) and create an new
[API Access](https://smartthings.developer.samsung.com/workspace/projects/new?type=CPT-OAUTH) project in your organization.
If the previous link doesn't work and you don't see an option for creating an API access project, then your access
has not yet been approved.

- Get a personal token with at least `w:apps` scope from [https://account.smartthings.com/tokens](https://account.smartthings.com/tokens)

- Register the app by replacing the `Authorization` header, `appName`, `targetUrl` and `redirectUris` fields and running 
the following command and saving the response. You may also want to change the `displayName` and `clientName` fields.

```bash
curl -X POST -H "Authorization: Bearer {REPLACE-WITH-YOUR-PAT-TOKEN}" \
"https://api.smartthings.com/apps" \
-d '{
  "appName": "{REPLACE-WITH-YOUR-UNIQUE-APP-NAME}",
  "displayName": "API App Subscription Example",
  "description": "API app that allows logging into SmartThings to control and see the status of switches",
  "singleInstance": true,
  "appType": "API_ONLY",
  "classifications": [
    "CONNECTED_SERVICE"
  ],
  "apiOnly": {
    "targetUrl": "{REPLACE-WITH-WEBSITE-URL-FROM-SERVER-LOG}"
  },
  "oauth": {
    "clientName": "API App Subscription Example",
    "scope": [
      "r:locations:*",
      "r:devices:*",
      "x:devices:*"
    ],
    "redirectUris": ["{REPLACE-WITH-REDIRECT-URI-FROM-SERVER-LOG"]
  }
}'
```
- If everything worked you should get a response that looks like the following example. 
```json
{
  "app": {
    "appName": "{YOUR-UNIQUE-APP-NAME}",
    "appId": "aaaaaaaa-fe8a-495f-ba68-xxxxxxxxxxxx",
    "appType": "API_ONLY",
    "principalType": "LOCATION",
    "classifications": [
      "CONNECTED_SERVICE"
    ],
    "displayName": "API App Subscription Example",
    "description": "API app that allows logging into SmartThings to control and see the status of switches",
    "singleInstance": true,
    "installMetadata": {},
    "owner": {
      "ownerType": "USER",
      "ownerId": "aaaaaaaa-332b-d60d-808d-xxxxxxxxxxxx"
    },
    "createdDate": "2019-10-14T14:44:31Z",
    "lastUpdatedDate": "2019-10-14T14:44:31Z",
    "apiOnly": {
      "subscription": {
        "targetUrl": "{WEBSITE-URL-YOU-SPECIFIED-IN-THE-COMMAND}",
        "targetStatus": "PENDING"
      }
    }
  },
  "oauthClientId": "aaaaaaaa-a425-4dd6-98f3-xxxxxxxxxxxx",
  "oauthClientSecret": "aaaaaaaa-10fb-4de8-8aec-xxxxxxxxxxxx"
}
```
- Copy the _appId_, _oauthClientId_, and _oauthClientSecret_ fields from the response into the corresponding fields in 
your `.env` file and restart the server.

- Click on the _Website URL_ link in the log (or use the Show menu in Glitch) to visit your web page and click on the 
_"Connect to SmartThings"_ link to log into your account, choose a location, and install the app.
