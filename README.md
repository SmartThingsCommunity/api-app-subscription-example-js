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
- Clone [this GitHub repository](https://github.com/SmartThingsCommunity/api-app-subscription-example-js), cd into the
directory, and install the Node modules with NPM:
```$bash
git clone https://github.com/SmartThingsCommunity/api-app-subscription-example-js.git
cd api-app-subscription-example-js
npm install
```

- Create a file named `.env` in the project directory and set the base URL of the server to your ngrok URL 
(or the URL you configured in your local hosts file), your AWS credentials, and the AWS region where the
DynamoDB table is to be created (you can also configure AWS region and credentials in other ways). For example:
```$bash
SERVER_URL=https://your-subdomain-name.ngrok.io
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=ABCDEFGHIJKLMNOPQRST
AWS_SECRET_ACCESS_KEY=aaGFHJHG457kJH++kljsdgIKLHJFD786sdghDFKL
```

- Start your server and make note of the information it prints out:
```$bash
node server.js

Redirect URI -- Copy this value into the "Redirection URI(s)" field in the Developer Workspace:
https://your-subdomain-name.ngrok.io/oauth/callback

Target URL -- Use this URL to log into SmartThings and connect this app to your account:
https://your-subdomain-name.ngrok.io
```

- Go to the [SmartThings Developer Workspace](https://smartthings.developer.samsung.com/workspace) and create an new
[API Access](https://smartthings.developer.samsung.com/workspace/projects/new?type=CPT-OAUTH) project in your organization.
If the previous link doesn't work and you don't see an option for creating an API Access project, then your access
has not yet been approved. 

- After creating the project click the _Register an Application_ link and fill in the fields using the _Redirect URI_ 
and _Target URI_ values from your server logs. Click _Save_. 

- On the next page select the `r:locations:*`, `r:devices:*`, and `x:devices:*` scopes and click _Save_.

- Look in you server logs for a link similar to this one:
```.env
CONFIRMATION request for app f9a665e7-5a76-4b1e-bdfe-31135eccc2f3, to enable events visit 
https://api.smartthings.com/apps/f9a665e7-5a76-4b1e-bdfe-31135eccc2f3/confirm-registration?token=fd95...
```
- Paste this link into a browser or request it with a utility like curl to enable callbacks to your app. The response should contain the
_targetURL_ value you entered in the dev workspace, for example:
```.env
{
    targetUrl: "https://your-subdomain-name.ngrok.io"
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
