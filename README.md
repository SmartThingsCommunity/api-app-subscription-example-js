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
- A [SmartThings](https://smartthings.com) account with at least one location and device with the switch capability
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

Start ngrok or similar tool to create a secure tunnel to your local server. Note that the free version of ngrok will
change the subdomain part of the URL every time you restart it, so you will need to update the server URL in the `.env`. 
Alternately, you can use the paid version which supports reserved subdomains:
```
ngrok http 3000
```

Create a file named `.env` in the project directory and set the base URL of the server to your ngrok URL,
For example:
```
SERVER_URL=https://315e5367357f.ngrok.app
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
https://315e5367357f.ngrok.app

Redirect URI -- Copy this value into redirectUris field of your app creation request:
https://315e5367357f.ngrok.app/oauth/callback

Website URL -- Visit this URL in your browser to log into SmartThings and connect your account:
https://315e5367357f.ngrok.app
```

Run the `smartthings apps:create` command to create a new app. You will be prompted for the required
information. The following is an example of the output from the command:

```bash
~ % smartthings apps:create
? What kind of app do you want to create? (Currently, only OAuth-In apps are supported.) OAuth-In App

More information on writing SmartApps can be found at
  https://developer.smartthings.com/docs/connected-services/smartapp-basics

? Display Name My API Subscription App
? Description Allows control of SmartThings devices
? Icon Image URL (optional) 
? Target URL (optional) https://315e5367357f.ngrok.app

More information on OAuth 2 Scopes can be found at:
  https://www.oauth.com/oauth2-servers/scope/

To determine which scopes you need for the application, see documentation for the individual endpoints you will use in your app:
  https://developer.smartthings.com/docs/api/public/

? Select Scopes. r:devices:*, x:devices:*, r:locations:*
? Add or edit Redirect URIs. Add Redirect URI.
? Redirect URI (? for help) https://315e5367357f.ngrok.app/oauth/callback
? Add or edit Redirect URIs. Finish editing Redirect URIs.
? Choose an action. Finish and create OAuth-In SmartApp.
Basic App Data:
─────────────────────────────────────────────────────────────────────────────
 Display Name     My API Subscription App                                    
 App Id           3275eef3-xxxx-xxxx-xxxx-xxxxxxxxxxxx                       
 App Name         amyapisubscriptionapp-aaea18b1-xxxx-xxxx-xxxx-xxxxxxxxxxxx 
 Description      Allows control of SmartThings devices                      
 Single Instance  true                                                       
 Classifications  CONNECTED_SERVICE                                          
 App Type         API_ONLY                                                   
 Target URL       https://315e5367357f.ngrok.app                             
 Target Status    PENDING                                                    
─────────────────────────────────────────────────────────────────────────────


OAuth Info (you will not be able to see the OAuth info again so please save it now!):
───────────────────────────────────────────────────────────
 OAuth Client Id      7a850484-xxxx-xxxx-xxxx-xxxxxxxxxxxx 
 OAuth Client Secret  3581f317-xxxx-xxxx-xxxx-xxxxxxxxxxxx 
───────────────────────────────────────────────────────────
```

Save the output of the create command for later use. It contains the client ID and secret of your app. You
won't be able to see those values again.

After running the create command look at your server logs for a line similar to this one:
```
2024-09-03T14:24:14.967Z warn: Unexpected CONFIRMATION request for app 3275eef3-c18c-4c0c-bbe6-1fbd36739b5c, 
received {"messageType":"CONFIRMATION","confirmationData":{"appId":"3275eef3-c18c-4c0c-bbe6-1fbd36739b5c",
"confirmationUrl":"https://api.smartthings.com/apps/3275eef3-xxxx-xxxx-xxxx-xxxxxxxxxxxx/confirm-registration?token=53c980fa-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}}
```

Paste the URL into a browser or request it with a utility like curl to enable callbacks to your app. 
The response should contain the
_targetURL_ value from your app creation request, for example:
```
{
    targetUrl: "https://315e5367357f.ngrok.app"
}
```

### 3. Update and restart your server

Add the _APP_ID_, _CLIENT_ID_ and _CLIENT_SECRET_ properties from `apps:create` command 
response to your `.env` file:
```
APP_ID=3275eef3-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLIENT_ID=7a850484-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLIENT_SECRET=3581f317-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Restart your server:
```
node server.js
```

Note that if you are using Glitch your server will restart automatically when you edit the `.env` file.

### 4. Log into SmartThings

Open the Website URL from the server log (`https://315e5367357f.ngrok.app` in this example) in a browser, 
log in with your SmartThings account credentials, and 
choose a location. You should see a page listing all devices in that location with the _switch_
capability. Tapping the device on the page should turn the switch on and off. You should also see
the states of the switches on the page change when you turn them on and off with the SmartThings
mobile app.

## Troubleshooting

Your app should be able to control switches and receive events from them. If the app UI is not being updated
when you change the switch state with the SmartThings mobile app, make sure that the target status is `CONFIRMED` 
by running the following command:
```
~ % smartthings apps 3275eef3-xxxx-xxxx-xxxx-xxxxxxxxxxxx
─────────────────────────────────────────────────────────────────────────────
 Display Name     My API Subscription App                                    
 App Id           3275eef3-xxxx-xxxx-xxxx-xxxxxxxxxxxx                       
 App Name         amyapisubscriptionapp-ab9fb550-xxxx-xxxx-xxxx-xxxxxxxxxxxx 
 Description      Allows SmartThings switches to be controlled               
 Single Instance  true                                                       
 Classifications  CONNECTED_SERVICE                                          
 App Type         API_ONLY                                                   
 Target URL       https://315e5367357f.ngrok.app                             
 Target Status    CONFIRMED                                                  
─────────────────────────────────────────────────────────────────────────────
```

If the target status is 'PENDING' you need to confirm the registration by running the following command and 
visiting the confirmation URL in a browser or using a utility like curl:
```
smatthings apps:register 3275eef3-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```
