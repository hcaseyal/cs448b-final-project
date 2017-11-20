var http = require('http');
const axios = require('axios');
var express = require('express');
var app = express();

const port = 8080; 
var baseURL = 'https://na1.api.riotgames.com/lol/';
var apiKey = 'RGAPI-0c3f4dea-5a44-40ce-b29d-88e00f218389';

app.use(function (req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8000');

	// Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Pass to next layer of middleware
    next();
});

app.get('/summoner', function (req, res) {
	var name = req.param('name');
	makeRequestToRiot(req, res, name);
});

app.listen(port, function () {
	console.log(`Server running at http://localhost:${port}/`)
});

function makeRequestToRiot(req, res, name) {
	var url = `${baseURL}summoner/v3/summoners/by-name/${name}?api_key=${apiKey}`;
	axios.get(url)
	.then(response => {
		res.send(response.data);
		console.log(response);
	})
	.catch(error => {
		res.send(error);
		console.log(error);
	});
}