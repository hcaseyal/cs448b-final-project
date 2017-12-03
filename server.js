// Example URL for requesting from RIOT API:
// https://na1.api.riotgames.com/lol/summoner/v3/summoners/by-name/RiotSchmick?api_key=RGAPI-0c3f4dea-5a44-40ce-b29d-88e00f218389
// Requests the summoner object for RiotSchmick

let http = require('http');
const axios = require('axios');
let express = require('express');
let app = express();
let fs = require('fs');

const port = 8082; 
let baseURL = 'https://na1.api.riotgames.com/lol/';
let apiKey = 'RGAPI-dce505ed-21a4-4809-89c8-1ccc16ac1bfb';

const queues = {2: "5v5 Blind Pick", 
				4: "5v5 Ranked Solo",
				6: "5v5 Ranked Premade",
				14: "5v5 Draft Pick",
				42: "5v5 Ranked Team",
				61: "5v5 Team Builder",
				400: "5v5 Draft Pick",
				410: "5v5 Ranked Dynamic",
				420: "5v5 Ranked Solo",
				430: "5v5 Blind Pick",
				440: "5v5 Ranked Flex"};

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
	let name = req.param("name");
	getSummonerInfo(req, res, name);
});

app.get('/all-match-data', function (req, res) {
	let id = req.param("name");
	getAllMatchData(req, res, id);
});

app.listen(port, function () {
	//TODO: remove prefetchData
	//prefetchFavoritesMatchData(); // YO don't call 
	//prefetchFavoritesTimelinesData(); // these at same time because asynchronous
	
	//prefetchMasterLeagueMatchListData();
	//prefetchTimelinesAndDetailsData();
	console.log(`Server running at http://localhost:${port}/`)
});

function onMatchlistFileContent(filename, content, requestContext, gameIdCache) {
	let matches = JSON.parse(content);
	let numSoFar = 0;
	for (let i = 0; i < matches.length; i++) {
		let gameId = matches[i].gameId;

		if (!gameIdCache[gameId]) {
			if (fs.existsSync(timelineFilename(gameId)) 
				|| fs.existsSync(matchDetailsFilename(gameId))) {
				gameIdCache[gameId] = true;
			}
			else {
				// For each game that hasn't already been cached, 
				// get the timeline and details from Riot and write it to a file
				setTimeout(() => {
					fetchAndWriteTimelineAndMatchDetails(gameId);
					numSoFar++;
					if (numSoFar % 10 === 0) {
						console.log("Fetched " + numSoFar + 
							" timelines and match details for " + filename);
					}
				}, 2700 * requestContext.requestId);
				requestContext.requestId++;
				gameIdCache[gameId] = true;
			}
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

function prefetchTimelinesAndDetailsData() {
	let requestContext = {requestId: 0};
	let gameIdCache = {};
	readFiles("./matchlist_data/", function(filename, content) {
		onMatchlistFileContent(filename, content, requestContext, gameIdCache)
	},
	(error) => console.log(error));
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
	/*let summonerList = 
	["Trick2g", "Hikashikun", "Sirhcez", "Amrasarfeiniel", 
	"FlowerKitten", "Reignover", "Meteos", "Voyboy", "Doublelift", "Bjergsen",
	"Svenskeren", "HotGuySixPack", "Xmithie", "ILovePotatoChips", "xNaotox"];
	*/

	let summonerList = ["FlowerKitten", "AmrasArFeiniel", "Pyrolykos", "Tanonev",
						"PerniciousRage", "ILovePotatoChips", "xNaotox", "Hikashikun", "Meteos"];

	prefetchMatchListData(summonerList);
}

function prefetchMatchListData(summonerNames) {
	let requestContext = {requestId: 0};
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

function prefetchFavoritesTimelinesData() {
	let summonerList = ["FlowerKitten", "AmrasArFeiniel", "Pyrolykos", "Tanonev",
						"PerniciousRage", "ILovePotatoChips", "xNaotox", "Hikashikun", "Meteos"];

	let requestContext = {requestId: 0};
	let gameIdCache = {};
	readFiles("./matchlist_data/", function(filename, content) {
		if (summonerList.some(name => filename.includes(name))) {
			onMatchlistFileContent(filename, content, requestContext, gameIdCache);
		}
	},
	(error) => console.log(error));
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
	let timelineUrl = `${baseURL}match/v3/timelines/by-match/${gameId}?api_key=${apiKey}`;
	axios.get(timelineUrl)
		.then(response => {
			let filename = timelineFilename(gameId);
			fs.writeFile(filename, JSON.stringify(response.data), function(err) {
				if(err) {
					console.log(err);
				}
				else {
					console.log("File saved: " + filename);
				}
			});
		});

	let matchDetailsUrl = `${baseURL}match/v3/matches/${gameId}?api_key=${apiKey}`;

	axios.get(matchDetailsUrl)
	.then(response => {
		let filename = matchDetailsFilename(gameId);
		fs.writeFile(filename, JSON.stringify(response.data), function(err) {
			if(err) {
				console.log(err);
			}
			else {
				console.log("File saved: " + filename);
			}
		});
	});
}

function prefetchMasterLeagueMatchListData() {
	fetchMasterLeague().then((master) => {
		let names = master.entries.map(entry => entry.playerOrTeamName);
		prefetchMatchListData(names);
	});
}

function fetchMasterLeague() {
	let url = `${baseURL}league/v3/masterleagues/by-queue/RANKED_SOLO_5x5?api_key=${apiKey}`;
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
	let url = encodeURI(`${baseURL}summoner/v3/summoners/by-name/${name}?api_key=${apiKey}`);
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
	let url = `${baseURL}match/v3/matchlists/by-account/${accountId}?api_key=${apiKey}&beginIndex=${beginIndex}`;
	
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
	let retObj = {};

	fetchSummonerInfo(name)
		.then(data => { // get summoner info
			retObj.summoner = data; 
			return data;
		})
		.then(summonerInfo => { // get matchlist
			let accountId = summonerInfo.accountId;
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
	let timelines = data.timelines;
	let details = data.details;
	let kills = [];
	let deaths = [];
	let assists = [];
	let matchDetailsPerGame = {};

	let eventId = 0;
	for (let matchId in timelines) {
		let matchTimeline = timelines[matchId];
		let matchDetails = details[matchId];
		let matchDetailsToSend = {};

		// Check for empty objects. Sometimes, match timelines or details are 
		// not available from Riot for some reason.
		if (!matchTimeline.frames || 
			!matchDetails.participantIdentities ||
			!isRecentSeason(matchDetails.seasonId) ||
			!isClassicSummonersRift(matchDetails.queueId)) {
			continue;
		}
		let summonersToParticipants = getSummonersToParticipantsMapping(matchDetails);
		let participantId = summonersToParticipants[summonerInfo.accountId];

		// Compile kills, deaths, and assists
		for (let j in matchTimeline.frames) {
			let frame = matchTimeline.frames[j];
			for (let eventIndex in frame.events) {
				let event = frame.events[eventIndex];

				// Attach event metadata
				event.id = eventId;
				eventId++;
				event.matchId = matchId;

				if (isKill(event, participantId)) {
					kills.push(event);
				} 
				else if (isDeath(event, participantId)) {
					deaths.push(event);
				}
				else if (isAssist(event, participantId)){
					assists.push(event);
				}
			}
		}
		matchDetailsToSend.win = isWin(matchDetails, participantId);
		matchDetailsToSend.participants = summonersToParticipants;
		matchDetailsToSend.myParticipantId = participantId;
		matchDetailsToSend.isRed = isRedSide(participantId);
		matchDetailsToSend.participantDetails = 
			getParticipantDetails(matchDetails, matchDetailsToSend.isRed);
		matchDetailsPerGame[matchId] = matchDetailsToSend;
	}
	return {kills, deaths, assists, matchDetailsPerGame};
}

function getParticipantDetails(matchDetails, isRedTeam) {
	let allDetails = {};
	for (let i in matchDetails.participants) {
		let participant = matchDetails.participants[i];
		let details = {};

		details.role = participant.timeline.role;
		details.lane = participant.timeline.lane;
		details.isAlly = 
			(isRedTeam === isRedSide(participant.participantId));
		details.championId = participant.championId;
		allDetails[participant.participantId] = details;
	}
	return allDetails;
}

function isClassicSummonersRift(queueId) {
	let id = parseInt(queueId);
	return id in queues;
}

// Seasons 4 and earlier use a different Summoner's Rift map
function isRecentSeason(seasonId) {
	return parseInt(seasonId) > 4;
}

// If not red side, then player was on blue side
function isRedSide(participantId) {
	return (parseInt(participantId) > 5);
}

function isWin(matchDetails, participantId) {
	for (let i in matchDetails.participants) {
		let participant = matchDetails.participants[i];
		if (participant.participantId === participantId) {
			return participant.stats.win;
		}
	}
	console.log("ERROR! Can't find participant in the matchDetails in isWin!");
	return false;
}

function isKill(event, participantId) {
	return (event.type === "CHAMPION_KILL" && 
		event.killerId === participantId);
}

function isDeath(event, participantId) {
	return (event.type === "CHAMPION_KILL" && 
		event.victimId === participantId);
}

function isAssist(event, participantId) {
	return (event.type === "CHAMPION_KILL" && 
		event.assistingParticipantIds.includes(participantId));
}

function getSummonersToParticipantsMapping(matchDetails) {
	let mapping = {};
	let identities = matchDetails.participantIdentities;
	for (let i in identities) {
		let participant = identities[i];
		mapping[participant.player.accountId] = participant.participantId;
	}
	return mapping;
}