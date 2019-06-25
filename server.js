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
const SmartApp = require('@smartthings/smartapp')
const DynamoDBStore = require('dynamodb-store');

const port = process.env.PORT
const apiUrl = process.env.ST_API_URL || 'https://api.smartthings.com'
const keyUrl = process.env.ST_KEY_URL || 'https://key.smartthings.com'
const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET
const redirectUri = `${process.env.URL}/oauth/callback`
const scope = encodeUrl('i:deviceprofiles r:locations:* r:devices:* x:devices:* r:scenes:* x:scenes:*')

/* SmartThings API */
const smartApp = new SmartApp()
	.apiUrl(apiUrl)
	.clientId(clientId)
	.clientSecret(clientSecret)

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
	console.log(`HEADERS: ${JSON.stringify(req.headers, null, 2)}`)
	console.log(`BODY: ${JSON.stringify(req.body, null, 2)}`)

	const auth = await isAuthorized(req)
	console.log(`AUTHORIZED: ${auth}`)

	// TODO -- incorporate confirmation into SDK & implement new signature check scheme
	//if (req.body.confirmationData && req.body.confirmationData.confirmationUrl) {
	//	rp.get(req.body.confirmationData.confirmationUrl).then(data => {
	//		console.log(data)
	//	})
	//}
	//else {
	//}
	res.send('{}')
})

/* Main page. Shows link to SmartThings if not authenticated and list of scenes afterwards */
server.get('/', function (req, res) {
	console.log(req.session.smartThings)
	if (req.session.smartThings) {
		// Context cookie found, use it to list scenes
		const data = req.session.smartThings
		smartApp.withContext(data).then(ctx => {
			ctx.api.scenes.list().then(scenes => {
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
	await ctx.api.installedApps.deleteInstalledApp()
	req.session.destroy(err => {
		res.redirect('/')
	})
})

/* Executes a scene */
server.post('/scenes/:sceneId', function (req, res) {
	smartApp.withContext(req.session.smartThings).then(ctx => {
		ctx.api.scenes.execute(req.params.sceneId).then(result => {
			res.send(result)
		})
	})
})

/* Handles OAuth redirect */
server.get('/oauth/callback', async (req, res) => {
	console.log(`/oauth/callback HEADERS: ${JSON.stringify(req.headers, null, 2)}`)
	console.log(`/oauth/callback PATH: ${req.path}`)
	console.log(`/oauth/callback QUERY: ${JSON.stringify(req.query, null, 2)}`)

	// Exchange the code for the auth token
	const body = await rp.post('https://api.smartthings.com/oauth/token', {
		headers: {
			Authorization: `Basic ${Buffer.from(clientId + ":" + clientSecret).toString("base64")}`
		},
		form: {
			client_id: clientId,
			code: req.query.code,
			grant_type: 'authorization_code',
			redirect_uri: redirectUri
		}
	})

	console.log(body)

	// Initialize the SmartThings API context
	const data = JSON.parse(body)
	let ctx = await smartApp.withContext({
		installedAppId: data.installed_app_id,
		authToken: data.access_token,
		refreshToken: data.refresh_token
	})

	// Get the location ID from the installedAppId (would be nice if it was already in the response)
	const isa = await ctx.api.installedApps.get(data.installed_app_id);
	ctx = await smartApp.withContext({
		locationId: isa.locationId,
		installedAppId: data.installed_app_id,
		authToken: data.access_token,
		refreshToken: data.refresh_token
	})

	// Create a subscription
	ctx.api.subscriptions.subscribeToCapability('switch', 'switch', 'switchHandler');

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
	const location = await ctx.api.locations.get(isa.locationId)

	// Set the cookie with the context, including the location ID and name
	req.session.smartThings = {
		locationId: isa.locationId,
		locationName: location.name,
		installedAppId: data.installed_app_id,
		authToken: data.access_token,
		refreshToken: data.refresh_token
	}

	// Redirect back to the main mage
	res.redirect('/')

})

/**
 * Verifies that the request is actually from SmartThings.
 * @returns true if verified, false otherwise.
 */
async function isAuthorized (req) {
	//console.log("Will attempt to verify request is authorized");
	try {
		let parsed = httpSignature.parseRequest(req);
		console.log(`PARSED: ${JSON.stringify(parsed, null, 2)}`)
		const cert = await getCertificate(parsed.keyId);
		console.log(`CERT: ${cert}`)
		//if (cert && cert.data) {
		if (cert) {
			//let par = sshpk.parseCertificate(cert.data, "pem");
			let par = sshpk.parseCertificate(cert, "pem");
			let verifyResult = httpSignature.verifySignature(parsed, par.subjectKey);
			if (!verifyResult) {
				console.log("forbidden - failed verifySignature");
				return false;
			}
		}
	} catch (err) {
		console.error(`Error verifying request ${JSON.stringify(err, null, 2)}`);
		handleError(err);
		return false;
	}
	return true;
}

// Makes a request to get the certificate
async function getCertificate (keyId) {

	const options = {
		method: 'GET',
		url: `${keyUrl}${keyId}`,
		headers: {
			'Content-Type': 'application/json; charset=utf-8'
		}
	}
	return rp(options);
}

function handleError (error) {
	if (error.response) {
		// The request was made and the server responded with a status code
		// that falls out of the range of 2xx
		console.log(error.response.data);
		console.log(error.response.status);
		console.log(error.response.headers);
	} else if (error.request) {
		// The request was made but no response was received
		// `error.request` is an instance of XMLHttpRequest in the browser and an instance of
		// http.ClientRequest in node.js
		console.log(error.request);
	} else {
		// Something happened in setting up the request that triggered an Error
		console.log("Error", error.message);
	}
	console.log(error.config);
}

server.listen(port);
console.log(`Open:     ${process.env.URL}`);
console.log(`Callback: ${process.env.URL}/oauth/callback`);
