'use strict';

require('dotenv').config();
const express = require('express')
const session = require("express-session");
const path = require('path')
const logger = require('morgan')
const encodeUrl = require('encodeurl')
const SmartApp = require('@smartthings/smartapp')
const DynamoDBStore = require('dynamodb-store');
const DynamoDBContextStore = require('@smartthings/dynamodb-context-store')
const SSE = require('express-sse')

const port = process.env.PORT || 3000
const appId = process.env.APP_ID
const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET
const tableName = process.env.DYNAMODB_TABLE || 'api-app-subscription-example'
const serverUrl = process.env.SERVER_URL || `https://${process.env.PROJECT_DOMAIN}.glith.me`
const redirectUri =  `${serverUrl}/oauth/callback`
const scope = encodeUrl('r:locations:* r:devices:* x:devices:*');

if (!process.env.AWS_REGION && !process.env.AWS_PROFILE) {
	console.log('\n***************************************************************************')
	console.log('*** Please add AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY ***')
	console.log('*** entries to the .env file to run the server                          ***')
	console.log('***************************************************************************')
	return
}

/*
 * Server-sent events. Used to update the status of devices on the web page from subscribed events
 */
const sse = new SSE()

/*
 * Persistent storage of session data in DynamoDB. Table will be automatically created if it doesn't already exist.
 */
const sessionStore = new DynamoDBStore({
	table: {
		name: tableName,
		hashKey : "id"
	}
})

/*
 * Persistent storage of SmartApp tokens and configuration data in a dynamo DB table. Uses the same table as the
 * session store. The auto-create feature is disabled to avoid duplicate table creation attempts.
 */
const contextStore = new DynamoDBContextStore({
	table: {
		name: tableName,
		hashKey : "id"
	},
	autoCreate: false
});

/*
 * Thew SmartApp. Provides an API for making REST calls to the SmartThings platform and
 * handles calls from the platform for subscribed events as well as the initial app registration challenge.
 */
const apiApp = new SmartApp()
	.appId(appId)
	.clientId(clientId)
	.clientSecret(clientSecret)
	.contextStore(contextStore)
	.redirectUri(redirectUri)
	.subscribedEventHandler('switchHandler', async (ctx, event) => {
		/* Device event handler. Current implementation only supports main component switches */
		if (event.componentId === 'main') {
			sse.send({
				deviceId: event.deviceId,
				switchState: event.value
			})
		}
		console.log(`EVENT ${event.deviceId} ${event.componentId}.${event.capability}.${event.attribute}: ${event.value}`)
	})

/*
 * Webserver setup
 */
const server = express()
server.set('views', path.join(__dirname, 'views'))
server.set('view engine', 'ejs')
server.use(logger('dev'))
server.use(express.json())
server.use(express.urlencoded({extended: false}))
server.use(express.static(path.join(__dirname, 'public')))

/*
 * Handles calls to the SmartApp from SmartThings, i.e. registration challenges and device events
 */
server.post('/', async (req, res) => {
	apiApp.handleHttpCallback(req, res);
})

/*
 * Session middleware. Defined here so that it isn't used by the callback method, which would create lots of
 * unnecessary sessions.
 */
server.use(session({
	store: sessionStore,
	secret: "api example secret",
	resave: false,
	saveUninitialized: true,
	cookie: {secure: false}
}))

/*
 * Main web page. Shows link to SmartThings if not authenticated and list of switch devices afterwards
 */
server.get('/',async (req, res) => {
	if (req.session.smartThings) {
		// Cookie found, display page with list of devices
		const data = req.session.smartThings
		res.render('devices', {
			installedAppId: data.installedAppId,
			locationName: data.locationName
		})
	}
	else {
		// No context cookie. Display link to authenticate with SmartThings
		res.render('index', {
			url: `https://api.smartthings.com/oauth/authorize?client_id=${clientId}&scope=${scope}&response_type=code&redirect_uri=${redirectUri}`
		})
	}
})

/**
 * Returns view model data for the devices page
 */
server.get('/viewData', async (req, res) => {
	const data = req.session.smartThings

	// Read the context from DynamoDB so that API calls can be made
	const ctx = await apiApp.withContext(data.installedAppId)
	try {
		// Get the list of switch devices, which doesn't include the state of the switch
		const deviceList = await ctx.api.devices.list({capability: 'switch'})

		// Query for the state of each one
		const ops = deviceList.map(it => {
			return ctx.api.devices.getCapabilityStatus(it.deviceId, 'main', 'switch').then(state => {
				return {
					deviceId: it.deviceId,
					label: it.label,
					switchState: state.switch.value
				}
			})
		})

		// Wait for all those queries to complete
		const devices = await Promise.all(ops)

		// Respond to the request
	res.send({
			errorMessage: devices.length > 0 ? '' : 'No switch devices found in location',
			devices: devices.sort( (a, b) => {
				return a.label === b.label ? 0 : (a.label > b.label) ? 1 : -1
			})
		})
	} catch (error) {
		res.send({
			errorMessage: `${error.message || error}`,
			devices: []
		})
	}
});

/*
 * Logout. Uninstalls app and clears context cookie
 */
server.get('/logout', async function(req, res) {
	try {
		// Read the context from DynamoDB so that API calls can be made
		const ctx = await apiApp.withContext(req.session.smartThings.installedAppId)

		// Delete the installed app instance from SmartThings
		await ctx.api.installedApps.delete()

		// Delete the session data
		req.session.destroy(err => {
			res.redirect('/')
		})
	}
	catch (error) {
		res.redirect('/')
	}
})

/*
 * Handles OAuth redirect
 */
server.get('/oauth/callback', async (req, res) => {

	// Store the SmartApp context including access and refresh tokens. Returns a context object for use in making
	// API calls to SmartThings
	const ctx = await apiApp.handleOAuthCallback(req)

	// Remove any existing subscriptions and ubscribe to device switch events
	await ctx.api.subscriptions.unsubscribeAll()
	await ctx.api.subscriptions.subscribeToCapability('switch', 'switch', 'switchHandler');

	// Get the location name (for display on the web page)
	const location = await ctx.api.locations.get(ctx.locationId)

	// Set the cookie with the context, including the location ID and name
	req.session.smartThings = {
		locationId: ctx.locationId,
		locationName: location.name,
		installedAppId: ctx.installedAppId
	}

	// Redirect back to the main page
	res.redirect('/')

})

/**
 * Executes a device command from the web page
 */
server.post('/command/:deviceId', async(req, res) => {
	// Read the context from DynamoDB so that API calls can be made
	const ctx = await apiApp.withContext(req.session.smartThings.installedAppId)

	// Execute the device command
	await ctx.api.devices.postCommands(req.params.deviceId, req.body.commands)
	res.send({})
});


/**
 * Executes a command for all devices
 */
server.post('/commands', async(req, res) => {
	console.log(JSON.stringify(req.body.commands, null, 2))
	// Read the context from DynamoDB so that API calls can be made
	const ctx = await apiApp.withContext(req.session.smartThings.installedAppId)

	const devices = await ctx.api.devices.findByCapability('switch')
	const ops = []
	for (const device of devices) {
		ops.push(ctx.api.devices.postCommands(device.deviceId, req.body.commands))
	}
	await Promise.all(ops)

	res.send({})
});

/**
 * Handle SSE connection from the web page
 */
server.get('/events', sse.init);

/**
 * Start the HTTP server and log URLs. Use the "open" URL for starting the OAuth process. Use the "callback"
 * URL in the API app definition using the SmartThings Developer Workspace.
 */
server.listen(port);
console.log(`\nWebsite URL -- Use this URL to log into SmartThings and connect this app to your account:\n${serverUrl}\n`);
console.log(`Redirect URI -- Copy this value into the "Redirection URI(s)" field in the Developer Workspace:\n${redirectUri}`);


