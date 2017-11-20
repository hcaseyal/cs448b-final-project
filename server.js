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
	var id = req.param("accountId");
	getMatchlist(req, res, id);
});

app.listen(port, function () {
	//TODO: remove prefetchData
	//prefetchData();
	prefetchMasterLeagueMatchData();
	console.log(`Server running at http://localhost:${port}/`)
});


function prefetchData() {
	var summonerList = 
	["Trick2g", "Hikashikun", "Sirhcez", "Amrasarfeiniel", 
	"FlowerKitten", "Reignover", "Meteos", "IWDominate", "Voyboy", "Doublelift", "Bjergsen",
	"Svenskeren", "HotGuySixPack", "Xmithie", "ILovePotatoChips", "xNaotox"];

	var requestId = 0;
	for (var i = 0; i < summonerList.length; i++) {
		let name = summonerList[i];
		fetchSummonerInfo(name).then((info) => {
			console.log(info);
			for (let index = 0; index < 1000; index += 100) {
				setTimeout(() => fetchMatchlist(info.accountId, name, index), 1500 * requestId);
				requestId++;
			}
		});
	}
}

function prefetchMasterLeagueMatchData() {
	fetchMasterLeague().then((master) => {
		var requestId = 0;
		for (let i = 0; i < master.entries.length; i++) {
			setTimeout(() => {
				let name = master.entries[i].playerOrTeamName;
				fetchSummonerInfo(name).then((info) => {
					for (let index = 0; index < 1000; index += 100) {
						setTimeout(() => fetchMatchlist(info.accountId, name, index), 1500 * requestId);
						requestId++;
					}
				});
			}, 1500 * requestId);
			requestId++;
		}
	});
}

function fetchMasterLeague() {
	var url = `${baseURL}league/v3/masterleagues/by-queue/RANKED_SOLO_5x5?api_key=${apiKey}`;
	return axios.get(url)
	.then(response => {
		return response.data;
	})
	.catch(error => {
		console.log(error);
	});
}

function fetchSummonerInfo(name) {
	var url = encodeURI(`${baseURL}summoner/v3/summoners/by-name/${name}?api_key=${apiKey}`);
	return axios.get(url)
	.then(response => {
		return response.data;
	})
	.catch(error => {
		console.log(error);
	});
}

function fetchMatchlist(accountId, name, beginIndex) {
	var url = `${baseURL}match/v3/matchlists/by-account/${accountId}?api_key=${apiKey}&beginIndex=${beginIndex}`;
	
	axios.get(url)
	.then(response => {
		fs.appendFile("data/matchlist_" + accountId + "_" + name, JSON.stringify(response.data), function(err) {
			if(err) {
				console.log(err);
			}
			else {
				console.log("File saved");
			}
		});
	})
	.catch(error => {
		console.log(error);
	});
}

function getSummonerInfo(req, res, name) {
	var url = encodeURI(`${baseURL}summoner/v3/summoners/by-name/${name}?api_key=${apiKey}`);
	axios.get(url)
	.then(response => {
		res.send(response.data);
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
	})
	.catch(error => {
		res.send(error);
		console.log(error);
	});
}