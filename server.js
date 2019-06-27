'use strict';

require('dotenv').config();
const express = require('express')
const session = require("express-session");
const path = require('path')
const sshpk = require("sshpk");
const logger = require('morgan')
const encodeUrl = require('encodeurl')
const httpSignature = require("http-signature");
const rp = require('request-promise-native')
const SmartApp = require('@smartthings/smartapp/lib/api-app')
const DynamoDBStore = require('dynamodb-store');
const DynamoDBContextStore = require('@smartthings/dynamodb-context-store')

const port = process.env.PORT
const apiUrl = process.env.ST_API_URL || 'https://api.smartthings.com'
const keyUrl = process.env.ST_KEY_URL || 'https://key.smartthings.com'
const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET
const redirectUri = `${process.env.URL}/oauth/callback`
const scope = encodeUrl('i:deviceprofiles r:locations:* r:devices:* x:devices:* r:scenes:* x:scenes:*');
const contextStore = new DynamoDBContextStore('us-east-1', 'api-app-subscription-context');

/* SmartThings API */
const smartApp = new SmartApp()
	.appId('6c2aee0e-b6a3-4099-904c-94deb2f90431')
	.apiUrl(apiUrl)
	.clientId(clientId)
	.clientSecret(clientSecret)
	.contextStore(contextStore)
	.redirectUri(redirectUri)
	.subscribedEventHandler('switchHandler', async (ctx, event) => {
		console.log(`*** EVENT: Switch ${event.deviceId} is ${event.value}`)
	})

/* Webserver setup */
const server = express()
server.set('views', path.join(__dirname, 'views'))
server.set('view engine', 'ejs')
server.use(logger('dev'))
server.use(express.json())
server.use(express.urlencoded({extended: false}))
server.use(session({
	store: new DynamoDBStore({"table": {"name": 'api-all-subscription-sessions'}}),
	secret: "api example secret",
	resave: false,
	saveUninitialized: true,
	cookie: {secure: false}
}));
server.use(express.static(path.join(__dirname, 'public')))

/* Accepts registration challenge and confirms app */
server.post('/', async (req, res) => {
	//console.log(`HEADERS: ${JSON.stringify(req.headers, null, 2)}`)
	//console.log(`BODY: ${JSON.stringify(req.body, null, 2)}`)

	smartApp.handleEventCallback(req, res);

	//const auth = await isAuthorized(req)
	//console.log(`AUTHORIZED: ${auth}`)
    //
	// TODO -- incorporate confirmation into SDK & implement new signature check scheme
	//if (req.body.confirmationData && req.body.confirmationData.confirmationUrl) {
	//	rp.get(req.body.confirmationData.confirmationUrl).then(data => {
	//		console.log(data)
	//	})
	//}
	//else {
	//}
	//res.send('{}')
})

/* Main page. Shows link to SmartThings if not authenticated and list of scenes afterwards */
server.get('/',async (req, res) => {
	console.log(req.session.smartThings)
	if (req.session.smartThings) {
		// Context cookie found, use it to list scenes
		const data = req.session.smartThings
		smartApp.withContext(data).then(async ctx => {
			const api = await ctx.getApi()
			api.scenes.list().then(scenes => {
				res.render('scenes', {
					installedAppId: data.installedAppId,
					locationName: data.locationName,
					errorMessage: '',
					scenes: scenes
				})
			}).catch(error => {
				res.render('scenes', {
					installedAppId: data.installedAppId,
					locationName: data.locationName,
					errorMessage: `${error.message}`,
					scenes: {items:[]}
				})
			})
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
	const ctx = await smartApp.withContext(req.session.smartThings)
	await ctx.getApi().then(api => {
		api.installedApps.deleteInstalledApp()
		req.session.destroy(err => {
			res.redirect('/')
		})
	})
})

/* Executes a scene */
server.post('/scenes/:sceneId', async (req, res) => {
	smartApp.withContext(req.session.smartThings).then(async ctx => {
		ctx.getApi().then(api => {
			api.scenes.execute(req.params.sceneId).then(result => {
				res.send(result)
			})
		})
	})
})

/* Handles OAuth redirect */
server.get('/oauth/callback', async (req, res) => {
	console.log(`/oauth/callback HEADERS: ${JSON.stringify(req.headers, null, 2)}`)
	console.log(`/oauth/callback PATH: ${req.path}`)
	console.log(`/oauth/callback QUERY: ${JSON.stringify(req.query, null, 2)}`)

	const ctx = await smartApp.handleOAuthCallback(req)

	// Create a subscription
	await ctx.api.subscriptions.subscribeToCapability('switch', 'switch', 'switchHandler');

	// Create a device
/*
	const map = {
		label: 'API App Switch',
		profileId: process.env.DEVICE_PROFILE_ID
	};
	ctx.api.devices.create(map)
		.then(data => {
			ctx.api.devices.sendEvents(data.deviceId, [
				{
					component: 'main',
					capability: 'switch',
					attribute: 'switch',
					value: 'off'
				}
			]);
		})
		.catch(err => {
			console.log(`ERORR CREATING DEVICE: ${JSON.stringify(err, null, 2)}`)
			if (err.body) {
				console.log(err.body)
			}
		})

*/
	// Get the location name
	const location = await ctx.api.locations.get(ctx.locationId)

	// Set the cookie with the context, including the location ID and name
	const sessionData = {
		locationId: ctx.locationId,
		locationName: location.name,
		installedAppId: ctx.installedAppId,
		authToken: ctx.authToken,
		refreshToken: ctx.refreshToken
	}
	req.session.smartThings = sessionData

	// Redirect back to the main mage
	res.redirect('/')

})

contextStore.createTableIfNecessary();
server.listen(port);
console.log(`Open:     ${process.env.URL}`);
console.log(`Callback: ${process.env.URL}/oauth/callback`);
