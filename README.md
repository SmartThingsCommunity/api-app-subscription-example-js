# Simple API App Example

## Overview

This simple NodeJS Express app illustrates how to create an "API Only" application that connects to your SmartThings
account with OAuth2 and allows you to execute scenes. It's a very simple app that stores the access and refresh tokens
in session state. By default it uses the 
[express-session](https://www.npmjs.com/package/express-session#compatible-session-stores) in-memory session store, 
so you will lose your session data
when you restart the server, but you can use another 
[compatible session store](https://www.npmjs.com/package/express-session#compatible-session-stores)
to make the session persist between server
restarts. This example uses the 
[@SmartThings/SmartApp](https://www.npmjs.com/package/@smartthings/smartapp) SDK NPM module for making the
API calls to list and execute scenes.

## Quickstart

### Register your app

- Get a personal token with at least `w:apps` scope from [https://account.smartthings.com/tokens](https://account.smartthings.com/tokens)

- Register the app by replacing the `Authorization` header, `appName`, `targetUrl` and `redirectUris` fields and running 
the following command :

```bash
curl -X POST -H "Authorization: Bearer {REPLACE-WITH-YOUR-PAT-TOKEN}" \
"https://api.smartthings.com/apps" \
-d '{
  "appName": "{REPLACE-WITH-YOUR-APP-NAME}",
  "displayName": "Simple API App Example",
  "description": "Demonstrates basics of a SmartThings API app which authenticates with the SmartThings platform using OAuth2",
  "singleInstance": false,
  "appType": "API_ONLY",
  "classifications": [
    "AUTOMATION"
  ],
  "oauth": {
    "clientName": "Simple API App Example",
    "scope": [
      "r:locations:*",
      "r:scenes:*",
      "x:scenes:*"
    ],
    "redirectUris": ["{REPLACE-WITH-YOUR-TUNNEL-URL}/oauth/callback"]
  }
}'
```

Save the response somewhere. Put the `oauthClientId` and `oauthClientSecret` fields from that response in the `.env` 
file as `CLIENT_ID` and `CLIENT_SECRET`.

### Start the server
```bash
node server.js
```

### Authenticate with SmartThings and execute scenes

1. Open a browser to your your public server tunnel URL
2. Click the "Connect to SmartThings" link on the page
3. Log in to your SmartThings account
4. Select a location and authorize the app

You will then see a page with all the scenes defined for that location. Clicking on a scene name should make an API call 
to execute the scene.
