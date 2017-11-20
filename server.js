var http = require('http');
const axios = require('axios');
var express = require('express');
var app = express();
var fs = require('fs');

const port = 8080; 
var baseURL = 'https://na1.api.riotgames.com/lol/';
var apiKey = 'RGAPI-94236ef3-39fa-4112-80d7-ea1a480207c9';

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
	var name = req.param("name");
	getSummonerInfo(req, res, name);
});

app.get('/matchlist', function (req, res) {
	console.log(req);
	var id = req.param("accountId");
	getMatchlist(req, res, id);
});

app.listen(port, function () {
	console.log(`Server running at http://localhost:${port}/`)
});


function getSummonerInfo(req, res, name) {
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

function getMatchlist(req, res, id) {
	var url = `${baseURL}match/v3/matchlists/by-account/${id}?api_key=${apiKey}`;
	
	axios.get(url)
	.then(response => {
		fs.writeFile("matchlist_" + id, JSON.stringify(response.data), function(err) {
			if(err) {
				console.log(err);
			}
			else {
				console.log("File saved");
			}
		});
		res.send(response.data);
		console.log(response);
	})
	.catch(error => {
		res.send(error);
		console.log(error);
	});
}