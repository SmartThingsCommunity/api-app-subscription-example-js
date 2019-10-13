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

const port = process.env.PORT
const apiUrl = process.env.ST_API_URL || 'https://api.smartthings.com'
const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET
const redirectUri = `${process.env.URL}/oauth/callback`
const scope = encodeUrl('r:locations:* r:devices:* x:devices:*');

/* Server-sent events */
const sse = new SSE()

/*
 * Persistent storage of session data in DynamoDB. Table will be automatically created if it doesn't already exist.
 */
const sessionStore = new DynamoDBStore({
	"table": {
		"name": "api-app-subscription-example",
		"hashKey" : "id"
	}
})

/*
 * Persistent storage of SmartApp tokens and configuration data in a dynamo DB table. Uses the same table as the
 * session store. The auto-create feature is disabled to avoid duplicate table creation attempts.
 */
const contextStore = new DynamoDBContextStore({
	table: {
		name: 'api-app-subscription-example',
		hashKey : "id"
	},
	autoCreate: false
});

/*
 * SmartApp initialization. The SmartApp provides an API for making REST calls to the SmartThings platform and
 * handles calls from the platform for subscribed events as well as the initial app registration challenge.
 */
const apiApp = new SmartApp()
	.appId('6c2aee0e-b6a3-4099-904c-94deb2f90431')
	.apiUrl(apiUrl)
	.clientId(clientId)
	.clientSecret(clientSecret)
	.contextStore(contextStore)
	.redirectUri(redirectUri)
	.subscribedEventHandler('switchHandler', async (ctx, event) => {
		console.log(`*** EVENT: Switch ${event.deviceId} is ${event.value}`)
		sse.send({
			deviceId: event.deviceId,
			switchState: event.value
		})
	})

/* Webserver setup */
const server = express()
server.set('views', path.join(__dirname, 'views'))
server.set('view engine', 'ejs')
server.use(logger('dev'))
server.use(express.json())
server.use(express.urlencoded({extended: false}))
server.use(express.static(path.join(__dirname, 'public')))

/* Handles calls to the SmartApp from SmartThings, i.e. registration challenges and device events */
server.post('/', async (req, res) => {
	//console.log(`HEADERS: ${JSON.stringify(req.headers, null, 2)}`)
	//console.log(`BODY: ${JSON.stringify(req.body, null, 2)}`)
	apiApp.handleHttpCallback(req, res);
})

/* Define session middleware here so that it isn't used by the callback method */
server.use(session({
	store: sessionStore,
	secret: "api example secret",
	resave: false,
	saveUninitialized: true,
	cookie: {secure: false}
}))

/* Main page. Shows link to SmartThings if not authenticated and list of scenes afterwards */
server.get('/',async (req, res) => {
	console.log(req.session.smartThings)
	if (req.session.smartThings) {
		// Context cookie found, use it to list scenes
		const data = req.session.smartThings
		res.render('devices', {
			installedAppId: data.installedAppId,
			locationName: data.locationName
		})
	}
	else {
		// No context cookie. Display link to authenticate with SmartThings
		res.render('index', {
			url: `${apiUrl}/oauth/authorize?client_id=${clientId}&scope=${scope}&response_type=code&redirect_uri=${redirectUri}`
		})
	}
})

/**
 * Returns view model data for the devices page
 */
server.get('/viewData', async (req, res) => {
	const data = req.session.smartThings
	const ctx = await apiApp.withContext(data.installedAppId)
	ctx.retrieveTokens()
	try {
		const ops = await ctx.api.devices.findByCapability('switch').then(data => {
			return data.items.map(it => {
				return ctx.api.devices.getCapabilityState(it.deviceId, 'main', 'switch').then(state => {
					return {
						deviceId: it.deviceId,
						label: it.label,
						switchState: state.switch.value
					}
				})
			})
		})
		let devices = await Promise.all(ops)
		devices = await Promise.all(ops)
		console.log(JSON.stringify(devices, null, 2))
		res.send({
			errorMessage: '',
			devices: devices.sort( (a, b) => {
				return a.label === b.label ? 0 : (a.label > b.label) ? 1 : -1
			})
		})
	} catch (error) {
		res.send({
			errorMessage: `${error.message}`,
			devices: []
		})
	}
});

/* Uninstalls app and clears context cookie */
server.get('/logout', async function(req, res) {
	const ctx = await apiApp.withContext(req.session.smartThings.installedAppId)
	await ctx.api.installedApps.deleteInstalledApp()
	req.session.destroy(err => {
		res.redirect('/')
	})
})

/* Handles OAuth redirect */
server.get('/oauth/callback', async (req, res) => {
	console.log(`/oauth/callback HEADERS: ${JSON.stringify(req.headers, null, 2)}`)
	console.log(`/oauth/callback PATH: ${req.path}`)
	console.log(`/oauth/callback QUERY: ${JSON.stringify(req.query, null, 2)}`)

	const ctx = await apiApp.handleOAuthCallback(req)

	// Subscribe to device switch events
	await ctx.api.subscriptions.unsubscribeAll()
	await ctx.api.subscriptions.subscribeToCapability('switch', 'switch', 'switchHandler');

	// Get the location name
	const location = await ctx.api.locations.get(ctx.locationId)

	// Set the cookie with the context, including the location ID and name
	req.session.smartThings = {
		locationId: ctx.locationId,
		locationName: location.name,
		installedAppId: ctx.installedAppId
	}

	// Redirect back to the main mage
	res.redirect('/')

})

/**
 * Executes a device command
 */
server.post('/command/:deviceId', async(req, res) => {
	const ctx = await apiApp.withContext(req.session.smartThings.installedAppId)
	await ctx.api.devices.postCommands(req.params.deviceId, req.body.commands)
	res.send({})
});

/**
 * SSE connections
 */
server.get('/events', sse.init);

/**
 * Start the server
 */
server.listen(port);
console.log(`Open:     ${process.env.URL}`);
console.log(`Callback: ${process.env.URL}/oauth/callback`);
