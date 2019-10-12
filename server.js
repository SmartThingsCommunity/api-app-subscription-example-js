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

const port = process.env.PORT
const apiUrl = process.env.ST_API_URL || 'https://api.smartthings.com'
const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET
const redirectUri = `${process.env.URL}/oauth/callback`
const contextStore = new DynamoDBContextStore({
	table: {
		name: 'api-app-subscription-example',
		hashKey : "id"
	},
	autoCreate: false
});

let scope = encodeUrl('i:deviceprofiles r:locations:* r:devices:* x:devices:* r:scenes:* x:scenes:*');
scope = encodeUrl('r:locations:* r:devices:* r:scenes:*');


/* SmartThings API */
const apiApp = new SmartApp()
	.appId('6c2aee0e-b6a3-4099-904c-94deb2f90431')
	.apiUrl(apiUrl)
	.clientId(clientId)
	.clientSecret(clientSecret)
	.contextStore(contextStore)
	.redirectUri(redirectUri)
	.subscribedEventHandler('switchHandler', async (ctx, event) => {
		console.log(`*** EVENT: Switch ${event.deviceId} is ${event.value}`)
	})
	.subscribedEventHandler('deviceLifecycleHandler', async (ctx, event) => {
		console.log(`*** EVENT: DeviceLifecycle ${JSON.stringify(event, null, 2)}`)
	}, 'DEVICE_LIFECYCLE_EVENT')
	.subscribedEventHandler('deviceHealthHandler', async (ctx, event) => {
		console.log(`*** EVENT: DeviceHealth ${JSON.stringify(event, null, 2)}`)
	}, 'DEVICE_HEALTH_EVENT')
	.subscribedEventHandler('sceneLifecycleHandler', async(ctx, event) => {
		console.log(`*** EVENT: SceneLifecycle ${JSON.stringify(event, null, 2)}`)
	}, 'SCENE_LIFECYCLE_EVENT')

/* Webserver setup */
const server = express()
server.set('views', path.join(__dirname, 'views'))
server.set('view engine', 'ejs')
server.use(logger('dev'))
server.use(express.json())
server.use(express.urlencoded({extended: false}))
server.use(express.static(path.join(__dirname, 'public')))

/* Accepts registration challenge and confirms app */
server.post('/', async (req, res) => {
	console.log(`HEADERS: ${JSON.stringify(req.headers, null, 2)}`)
	console.log(`BODY: ${JSON.stringify(req.body, null, 2)}`)
	apiApp.handleHttpCallback(req, res);
})

/* Define session middleware here so that it isn't used by the callback method */
server.use(session({
	store: new DynamoDBStore({
		"table": {
			"name": "api-app-subscription-example",
			"hashKey" : "id"
		}
	}),
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
		apiApp.withContext(data.installedAppId).then(async ctx => {
			await ctx.retrieveTokens()
			const scenes = await ctx.api.scenes.list()
			const modes = await ctx.api.modes.list()
			try {
				res.render('scenes', {
					installedAppId: data.installedAppId,
					locationName: data.locationName,
					errorMessage: '',
					scenes: scenes,
					modes: modes
				})
			} catch (error) {
				res.render('scenes', {
					installedAppId: data.installedAppId,
					locationName: data.locationName,
					errorMessage: `${error.message}`,
					scenes: {items:[]},
					modes: {items:[]}
				})
			}
		})
	}
	else {
		// No context cookie. Displey link to authenticate with SmartThings
		res.render('index', {
			url: `${apiUrl}/oauth/authorize?client_id=${clientId}&scope=${scope}&response_type=code&redirect_uri=${redirectUri}`
		})
	}
})

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

	// Subscribe to lifecycle events (create, update & delete) for all devices in the location
	await ctx.api.subscriptions.unsubscribeAll()
	await ctx.api.subscriptions.subscribeToDeviceLifecycle('deviceLifecycleHandler');
	//await ctx.api.subscriptions.subscribeToSceneLifecycle('sceneLifecycleHandler');
	//await ctx.api.subscriptions.subscribeToDeviceHealth('deviceHealthHandler');

	//await ctx.api.subscriptions.subscribeToSecuritySystem('securityArmStateHandler');
	//await ctx.api.subscriptions.subscribeToHubHealth('hubHealthHandler');

	// Subscribe to all switch state changes in the location
	await ctx.api.subscriptions.subscribeToCapability('switch', 'switch', 'switchHandler');

	// Get the location name
	const location = await ctx.api.locations.get(ctx.locationId)

	// Set the cookie with the context, including the location ID and name
	const sessionData = {
		locationId: ctx.locationId,
		locationName: location.name,
		installedAppId: ctx.installedAppId
	}
	req.session.smartThings = sessionData

	// Redirect back to the main mage
	res.redirect('/')

})

/* Executes a scene */
server.post('/scenes/:sceneId', async (req, res) => {
	const ctx = await apiApp.withContext(req.session.smartThings.installedAppId)
	ctx.api.scenes.execute(req.params.sceneId).then(result => {
		res.send(result)
	})
})

/* Changes mode */
server.post('/modes/:id', async (req, res) => {
	const ctx = apiApp.withContext(req.session.smartThings.installedAppId)
	api.modes.update(req.params.id).then(result => {
		res.send(result)
	})
})

server.listen(port);
console.log(`Open:     ${process.env.URL}`);
console.log(`Callback: ${process.env.URL}/oauth/callback`);
