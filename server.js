var http = require('http');
const axios = require('axios');
var express = require('express');
var app = express();
const port = 8080; 

app.get('/', function (req, res) {
	makeRequestToRiot(req, res);
});

app.listen(port, function () {
	console.log(`Server running at http://localhost:${port}/`)
});

function makeRequestToRiot(req, res) {
	var url = 'https://na1.api.riotgames.com/lol/summoner/v3/summoners/by-name/RiotSchmick?api_key=RGAPI-0c3f4dea-5a44-40ce-b29d-88e00f218389';
	axios.get(url)
	.then(response => {
		res.send(response.data);
	})
	.catch(error => {
		res.send(error);
		console.log(error);
	});
}