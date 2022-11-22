# Event Subscription API App Example

## Overview

This NodeJS Express application illustrates how to create an _API Access_ SmartApp that connects to your SmartThings
account with OAuth2 to control devices and subscribe to device events. The application uses the 
[SmartThings SmartApp](https://www.npmjs.com/package/@smartthings/smartapp) SDK NPM module for making the
API calls to control switch devices and subscribe to switch events. The app creates a web page that displays
the state of all switches in a location and allows those switches to be turned on and off.

API access tokens and web session state are stored local files. This storage mechanism is not suitable for
production use. There are alternative storage mechanisms for DynamoDB and Firebase.

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
- .env -- file you create with app credentials
- package.json -- The Node.js package file

## Getting Started

### Prerequisites
- A [SmartThings](https://smartthings.com) account
- The [SmartThings CLI](https://github.com/SmartThingsCommunity/smartthings-cli#readme) installed
- [Node.js](https://nodejs.org/en/) and [npm](https://www.npmjs.com/) installed
- [ngrok](https://ngrok.com/) or similar tool to create a secure tunnel to a publicly available URL

Note that as an alternative to running the app locally you can use [Glitch](glitch.com) to host your app.
## Instructions

### 1. Set up your server

#### If running locally and tunneling using ngrok or similar tool
Clone [this GitHub repository](https://github.com/SmartThingsCommunity/api-app-subscription-example-js), cd into the
directory, and install the Node modules with NPM:
```
git clone https://github.com/SmartThingsCommunity/api-app-subscription-example-js.git
cd api-app-subscription-example-js
npm install
```

Create a file named `.env` in the project directory and set the base URL of the server to your ngrok URL,
For example:
```
SERVER_URL=https://your-subdomain-name.ngrok.io
```

Start your server and make note of the information it prints out:
```
node server.js
```

#### If using Glitch

Remix this Glitch project: [midnight-cloudy-sceptre](https://glitch.com/edit/#!/midnight-cloudy-sceptre) and wait for
the server to start.

### 2. Register your SmartThings app

Look at the log output of your local server or Glitch app. You should see something like this:
```
Target URL -- Copy this value into the targetUrl field of you app creation request:
https://node-st.ngrok.io

Redirect URI -- Copy this value into redirectUris field of your app creation request:
https://node-st.ngrok.io/oauth/callback

Website URL -- Visit this URL in your browser to log into SmartThings and connect your account:
https://node-st.ngrok.io
```

Create a file like this one, replacing the specified information in double curly brackets {{}}. 
The `appName` needs to be some unique name with lower-case letters, numbers, and dashes and no spaces.
```json
{
  "appName": "{{SOME UNIQUE NAME YOU CHOOSE}}",
  "appType": "API_ONLY",
  "classifications": [
    "CONNECTED_SERVICE"
  ],
  "displayName": "{{THE NAME OF YOUR APP}}",
  "description": "{{A DESCRIPTION OF YOUR APP}}",
  "singleInstance": true,
  "apiOnly": {
    "targetUrl": "{{TARGET URL FROM THE ABOVE LOG OUTPUT}}"
  },
  "oauth": {
    "clientName": "{{THE NAME OF YOUR APP ON THE OAUTH PAGE}}",
    "scope": [
      "r:locations:*",
      "r:devices:*",
      "x:devices:*"
    ],
    "redirectUris": ["{{REDIRECT URL FROM ABOVE LOG OUTPUT}}"]
  }
}
```

Create the app using the SmartThings CLI. For example, if your file is named `app.json` run this command:
```
smartthings apps:create -i app.json
```

Save the output of the create command for later use. It contains the client ID and secret of your app. You
won't be able to see those values again.

After running the create command look at your server logs for a line similar to this one:
```
CONFIRMATION request for app f9a665e7-5a76-4b1e-bdfe-31135eccc2f3, to enable events visit 
https://api.smartthings.com/apps/f9a665e7-5a76-4b1e-bdfe-31135eccc2f3/confirm-registration?token=fd95...
```

Paste the URL into a browser or request it with a utility like curl to enable callbacks to your app. 
The response should contain the
_targetURL_ value from your app creation request, for example:
```
{
    targetUrl: "https://your-subdomain-name.ngrok.io"
}
```

### 3. Update and restart your server

Add the _APP_ID_, _CLIENT_ID_ and _CLIENT_SECRET_ properties from `apps:create` command 
response to your `.env` file:
```
APP_ID={{RESPONSE appId FIELD VALUE}}
CLIENT_ID={{RESPONSE oauthClientId FIELD VALUE}}
CLIENT_SECRET={{RESPONSE oauthClientSecret FIELD VALUE}}
```

Restart your server:
```
node server.js
```

Note that if you are using Glitch your server will restart automatically when you edit the `.env` file.

### 4. Log into SmartThings

Go to Website URL from the server log in a browser, log in with your SmartThings account credentials, and 
choose a location. You should see a page listing all devices in that location with the _switch_
capability. Tapping the device on the page should turn the switch on and off. You should also see
the states of the switches on the page change when you turn them on and off with the SmartThings
mobile app.
