// Example URL for requesting from RIOT API:
// https://na1.api.riotgames.com/lol/summoner/v3/summoners/by-name/RiotSchmick?api_key=RGAPI-0c3f4dea-5a44-40ce-b29d-88e00f218389
// Requests the summoner object for RiotSchmick

var http = require('http');
const axios = require('axios');
var express = require('express');
var app = express();
var fs = require('fs');

const port = 8081; 
var baseURL = 'https://na1.api.riotgames.com/lol/';
var apiKey = 'RGAPI-5da90ab4-45a0-40d6-9121-c8d4b1731fb7';

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

app.get('/all-match-data', function (req, res) {
	var id = req.param("name");
	getAllMatchData(req, res, id);
});

app.listen(port, function () {
	//TODO: remove prefetchData
	//prefetchFavoritesMatchData();
	//prefetchMasterLeagueMatchListData();
	//prefetchTimelinesData();
	console.log(`Server running at http://localhost:${port}/`)
});

function onMatchlistFileContent(filename, content, requestContext, gameIdCache) {
	var matches = JSON.parse(content);
	var numSoFar = 0;
	for (var i = 0; i < matches.length; i++) {
		let gameId = matches[i].gameId;

		if (!gameIdCache[gameId]) {
			// For each game that hasn't already been cached, 
			// get the timeline and details from Riot and write it to a file
			setTimeout(() => {
				fetchAndWriteTimelineAndMatchDetails(gameId);
				numSoFar++;
				if (numSoFar % 10 === 0) {
					console.log("Fetched " + numSoFar + " timelines and match details");
				}
			}, 3000 * requestContext.requestId);
			requestContext.requestId++;
			gameIdCache[gameId] = true;
		}
	}
}

function timelineFilename(matchId) {
	return "timeline_data/timeline_" + matchId;
}

function matchListFilename(accountId, name) {
	return "matchlist_data/matchlist_" + accountId + "_" + name;
}

function matchDetailsFilename(matchId) {
	return "matchdetails_data/matchdetails_" + matchId;
}

function readFile(filename, onFileContent, onError) {
	fs.readFile(filename, 'utf-8', (err, content) => {
		if (err) {
			onError(err);
		} else {
			onFileContent(filename, content);
		}
	});
}

function readTimelineFile(matchId, onFileContent, onError) {
	let filename = timelineFilename(matchId);
	readFile(filename, onFileContent, onError);
}

function readMatchlistFile(accountId, name, onFileContent, onError) {
	let filename = matchListFilename(accountId, name);
	readFile(filename, onFileContent, onError);
}

function readMatchDetailsFile(matchId, onFileContent, onError) {
	let filename = matchDetailsFilename(matchId);
	readFile(filename, onFileContent, onError);
}

function prefetchTimelinesData() {
	var requestContext = {requestId: 0};
	var gameIdCache = {};
	readFiles("./matchlist_data/", function(filename, content) {
		onMatchlistFileContent(filename, content, requestContext, gameIdCache)
	},
	onError);
}

function readFiles(dirname, onFileContent, onError) {
  fs.readdir(dirname, function(err, filenames) {
    if (err) {
      onError(err);
      return;
    }
    filenames.forEach(function(filename) {
      fs.readFile(dirname + filename, 'utf-8', function(err, content) {
        if (err) {
          onError(err);
          return;
        }
        onFileContent(filename, content);
      });
    });
  });
}
function prefetchFavoritesMatchData() {
	var summonerList = 
	["Trick2g", "Hikashikun", "Sirhcez", "Amrasarfeiniel", 
	"FlowerKitten", "Reignover", "Meteos", "Voyboy", "Doublelift", "Bjergsen",
	"Svenskeren", "HotGuySixPack", "Xmithie", "ILovePotatoChips", "xNaotox"];

	prefetchMatchListData(summonerList);
}

function prefetchMatchListData(summonerNames) {
	var requestContext = {requestId: 0};
	for (let i = 0; i < summonerNames.length; i++) {
		let name = summonerNames[i];
		setTimeout(() => {
			fetchSummonerInfo(name).then((info) => {
				fetchAndWriteMatchList(info, name, requestContext);
			});
		}, 1500 * requestContext.requestId);
		requestContext.requestId++;
	}
}

function fetchAndWriteMatchList(info, name, requestContext) {
	let promises = [];
	for (let index = 0; index < 1000; index += 100) {
		promises.push(new Promise((resolve, reject) => {
			setTimeout(() => fetchMatchlist(info.accountId, name, index, resolve), 1500 * requestContext.requestId);
		}));
		requestContext.requestId++;
	}

	//matchlists is an array of the 100Matchlists
	Promise.all(promises).then(matchLists => {
		let matches = matchLists.reduce((prev, next) => prev.concat(next.matches), []);
		fs.writeFile(matchListFilename(info.accountId, name), JSON.stringify(matches), function(err) {
			if(err) {
				console.log(err);
			}
			else {
				console.log("File saved");
			}
		});
	});
}

function fetchAndWriteTimelineAndMatchDetails(gameId) {
	var timelineUrl = `${baseURL}match/v3/timelines/by-match/${gameId}?api_key=${apiKey}`;
	axios.get(timelineUrl)
		.then(response => {
			fs.writeFile(timelineFilename(gameId), JSON.stringify(response.data), function(err) {
				if(err) {
					console.log(err);
				}
				else {
					console.log("File saved");
				}
			});
		});

	var matchDetailsUrl = `${baseURL}match/v3/matches/${gameId}?api_key=${apiKey}`;

	axios.get(matchDetailsUrl)
	.then(response => {
		fs.writeFile(matchDetailsFilename(gameId), JSON.stringify(response.data), function(err) {
			if(err) {
				console.log(err);
			}
			else {
				console.log("File saved");
			}
		});
	});
}

function prefetchMasterLeagueMatchListData() {
	fetchMasterLeague().then((master) => {
		var names = master.entries.map(entry => entry.playerOrTeamName);
		prefetchMatchListData(names);
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
	console.log("Fetching summoner info for " + name);
	var url = encodeURI(`${baseURL}summoner/v3/summoners/by-name/${name}?api_key=${apiKey}`);
	return axios.get(url)
	.then(response => {
		return response.data;
	})
	.catch(error => {
		console.log(error);
	});
}

function fetchMatchlist(accountId, name, beginIndex, resolve) {
	console.log("Fetching match list for " + name);
	var url = `${baseURL}match/v3/matchlists/by-account/${accountId}?api_key=${apiKey}&beginIndex=${beginIndex}`;
	
	axios.get(url)
	.then(response => {
		resolve(response.data);
	})
	.catch(error => {
		console.log(error);
	});
}

function getSummonerInfo(req, res, name) {
	fetchSummonerInfo(name).then(data => res.send(data));
}

function getAllMatchData(req, res, name) {
	var retObj = {};

	fetchSummonerInfo(name)
		.then(data => { // get summoner info
			retObj.summoner = data; 
			return data;
		})
		.then(summonerInfo => { // get matchlist
			var accountId = summonerInfo.accountId;
			return new Promise((resolve, reject) => {
				readMatchlistFile(accountId, name, (filename, content) => {
					retObj.matchlist = JSON.parse(content);
					resolve(retObj.matchlist);
				}, (error) => {
					reject(error);
				});
			});
		})
		.then(matchlist => { // get match timelines
			let promises = [];
			let numComplete = 0;
			for (let i in matchlist) {
				let matchId = matchlist[i].gameId;
				promises.push(new Promise((resolve, reject) => {
					readTimelineFile(matchId, (filename, content) => {
						numComplete++;
						if (numComplete % 50 === 0) {
							console.log("Read " + numComplete + " timeline files");
						}
						resolve(JSON.parse(content));
					}, (error) => {
						resolve({});
					});
				}));
			}
			return Promise.all(promises).then(timelines => { // Make map {matchId -> timeline}
				let map = {};
				for (let i = 0; i < timelines.length; i++) {
					map[matchlist[i].gameId] = timelines[i];
				}
				retObj.timelines = map;
				return matchlist;
			});
		})
		.then(matchlist => { // get match details
			console.log("Starting to get match details");
			let promises = [];
			let numComplete = 0;
			for (let i in matchlist) {
				let matchId = matchlist[i].gameId;
				promises.push(new Promise((resolve, reject) => {
					readMatchDetailsFile(matchId, (filename, content) => {
						numComplete++;
						if (numComplete % 50 === 0) {
							console.log("Read " + numComplete + " match details files");
						}
						resolve(JSON.parse(content));
					}, (error) => {
						console.log("Error getting match detail");
						console.log(error);
						resolve({});
					});
				}));
			}
			return Promise.all(promises).then(details => { // Make map {matchId -> matchDetail}
				let map = {};
				for (let i = 0; i < details.length; i++) {
					map[matchlist[i].gameId] = details[i];
				}
				retObj.details = map;
				return retObj;
			});
		})
		.then(allMatchesData => {
			fs.writeFile("AllMatchesData", JSON.stringify(allMatchesData));
			res.send(parseAllMatchesData(retObj.summoner, allMatchesData));
			console.log("All matches data sent");
		});
}

function parseAllMatchesData(summonerInfo, data) {
	var timelines = data.timelines;
	var kills = [];
	var deaths = [];
	var assists = [];

	var eventId = 0;
	for (var matchId in timelines) {
		var matchTimeline = timelines[matchId];
		var matchDetails = data.details[matchId];
		var summonersToParticipantsMapping = getSummonersToParticipantsMapping(matchDetails);

		for (var j in matchTimeline.frames) {
			var frame = matchTimeline.frames[j];
			for (var eventIndex in frame.events) {
				var event = frame.events[eventIndex];
				if (isKill(event, summonerInfo, summonersToParticipantsMapping)) {
					kills.push(event);
					event.id = eventId;
					eventId++;
				} 
				else if (isDeath(event, summonerInfo, summonersToParticipantsMapping)) {
					deaths.push(event);
					event.id = eventId;
					eventId++;
				}
				else if (isAssist(event, summonerInfo, summonersToParticipantsMapping)){
					assists.push(event);
					event.id = eventId;
					eventId++;
				}
			}
		}
	}
	return {kills, deaths, assists, summonersToParticipantsMapping};
}

function isKill(event, summonerInfo, summonerToParticipantsMapping) {
	return (event.type === "CHAMPION_KILL" && 
		event.killerId === summonerToParticipantsMapping[summonerInfo.accountId]);
}

function isDeath(event, summonerInfo, summonerToParticipantsMapping) {
	return (event.type === "CHAMPION_KILL" && 
		event.victimId === summonerToParticipantsMapping[summonerInfo.accountId]);
}

function isAssist(event, summonerInfo, summonerToParticipantsMapping) {
	return (event.type === "CHAMPION_KILL" && 
		event.assistingParticipantIds.includes(summonerToParticipantsMapping[summonerInfo.accountId]));
}

function getSummonersToParticipantsMapping(matchDetails){
	var mapping = {};
	var identities = matchDetails.participantIdentities;
	for (var i in identities) {
		var participant = identities[i];
		mapping[participant.player.accountId] = participant.participantId;
	}
	console.log(mapping);
	return mapping;
}