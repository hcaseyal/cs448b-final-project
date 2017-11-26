var mapWidth = 512,
	mapHeight = 512,
	bg = "img/map.png",
    analysisArea = d3.select('.analysis-area');
	visArea = d3.select('.vis-area');

var matchDetailsPerGame;
var matchesData;
var championData;

var filterStates = {"side": "both"};

// Domain for the current Summoner's Rift on the in-game mini-map
var domain = {
        min: {x: -120, y: -120},
        max: {x: 14870, y: 14980}
},
xScale, yScale, color;

color = d3.scale.linear()
    .domain([0, 3])
    .range(["white", "steelblue"])
    .interpolate(d3.interpolateLab);

xScale = d3.scale.linear()
  .domain([domain.min.x, domain.max.x])
  .range([0, mapWidth]);

yScale = d3.scale.linear()
  .domain([domain.min.y, domain.max.y])
  .range([mapHeight, 0]);

// Node server url
var baseURL = "http://localhost:8081/";

var svg = d3.select("#map").append("svg:svg")
	    .attr("width", mapWidth)
	    .attr("height", mapHeight);

	svg.append('image')
	    .attr('xlink:href', bg)
	    .attr('x', '0')
	    .attr('y', '0')
	    .attr('width', mapWidth)
	    .attr('height', mapHeight);

loadStaticData();
drawTimeFilter();

function searchSummoner() {
	var summoner = d3.select('.summoner-name').node().value;
	searchForSummoner(summoner);
	getAllMatchData(summoner);
}

function getAllMatchData(summoner) {
	var xhttp = new XMLHttpRequest();
	var url = `${baseURL}all-match-data/?name=${summoner}`;
	xhttp.open("GET", url);
	xhttp.onload = () => {
		matchesData = JSON.parse(xhttp.responseText);
		matchDetailsPerGame = matchesData.matchDetailsPerGame;
		renderMapKda();
		updateMap();
	}
	xhttp.onerror = () => analysisArea.text("Couldn't retrieve match data. " + xhttp.statusText);
	xhttp.send();
}

function searchForSummoner(summoner) {
	var xhttp = new XMLHttpRequest();
	var url = `${baseURL}summoner/?name=${summoner}`;
	xhttp.open("GET", url);
	xhttp.onload = () => {
		var data = JSON.parse(xhttp.responseText);
		console.log(xhttp.responseText);
		displaySummonerInfo(data);
	}
	xhttp.onerror = () => analysisArea.text("Couldn't retrieve summoner. " + xhttp.statusText);
	xhttp.send();
}

function displaySummonerInfo(data) {
	d3.select('.summoner-name-display').text(data.name);
}

function loadStaticData() {
	d3.json('champions.txt', function(error, data) {
		if (error) {
			return console.warn(error);
		}
		championData = data.data;

		drawRoleAndChampionFilters('.championSelect-self', '.roleSelect-self');
		drawRoleAndChampionFilters('.championSelect-ally', '.roleSelect-ally');
		drawRoleAndChampionFilters('.championSelect-enemy', '.roleSelect-enemy');
	});
}

function drawChampionSelectFilter(componentName) {
	var select = d3.select(componentName)
	.on('change', updateMap);

	var championArray = [];				
	Object.keys(championData).forEach(function(k){
		championArray.push(championData[k]);
	});

	var sortedData = championArray.sort(function(x, y) {
		return d3.ascending(x.name, y.name);
	});

	sortedData.unshift({name: "All champions", id: 0});
	var options = select
		.selectAll('option')
		.data(sortedData)
		.enter()
		.append('option')
		.text(d => d.name)
		.attr('value', d => d.key)
}

function drawRoleSelectFilter(componentName) {
	var select = d3.select(componentName)
	.on('change', updateMap);

	var roleArray = ["All roles", "Top", "Jungle", "Mid", "ADC", "Support"];				
	var options = select
		.selectAll('option')
		.data(roleArray)
		.enter()
		.append('option')
		.text(d => d)
		.attr('value', d => d)
}

function drawRoleAndChampionFilters(championSelectName, roleSelectName) {
	drawChampionSelectFilter(championSelectName);
	drawRoleSelectFilter(roleSelectName);
}

function drawTimeFilter() {
	$(".timeSlider" ).slider({
	  range: true,
	  max: 60,
	  min: 0,
	  values: [ 0, 60 ],
	  slide: onSliderChange
	});
	redrawSliderText([0, 60]);
}

function onSliderChange(event, ui) {
	var values = ui.values;
	redrawSliderText(values);
	updateMap();
}

function redrawSliderText(values) {
	d3.select(".timeSliderText").text(values[0] + " - " + values[1] + " minutes");
	let valuesInMs = [values[0] * 60 * 1000, values[1] * 60 * 1000];
	filterStates["timeSlider"] = valuesInMs;
}

function blueSideSelected() {
	filterStates["side"] = "blue";
	updateMap();
}

function redSideSelected() {
	filterStates["side"] = "red";
	updateMap();
}

function bothSidesSelected() {
	filterStates["side"] = "both";
	updateMap();
}

function winOutcomeSelected() {
	filterStates["outcome"] = "win";
	updateMap();
}

function lossOutcomeSelected() {
	filterStates["outcome"] = "loss";
	updateMap();
}

function bothOutcomesSelected() {
	filterStates["outcome"] = "both";
	updateMap();
}

function getRole(dataRole, dataLane) {
	if (dataLane === "JUNGLE") {
		return "Jungle";
	}
	if (dataLane === "MIDDLE") {
		return "Mid";
	}
	if (dataLane === "TOP") {
		return "Top";
	}
	if (dataLane === "BOTTOM") {
		if (dataRole === "DUO_SUPPORT") {
			return "Support";
		}
		if (dataRole === "DUO_CARRY") {
			return "ADC";
		}
	}
	return "Unknown";
}

function getMatchDetails(datum) {
 	return matchDetailsPerGame[datum.matchId];
}

function filterByRoles(datum, roles, participantId) {
	let details = getMatchDetails(datum).participantDetails[participantId];
	return (roles[0] === "All roles" || 
		roles.includes(getRole(details.role, details.lane)));
}

function filterGenericEvents(datum, champions, roles) {
	let myId = getMatchDetails(datum).myParticipantId;
	return filterByChampions(d, championSelected, myId) && filterByTime(d) 
		&& filterBySide(d) && filterByRoles(d, roles, myId) 
		&& filterByOutcome(d);
}

function filterByAssisters(datum, champions, roles) {
	let assisters = datum.assistingParticipantIds;
	let myId = getMatchDetails(datum).myParticipantId;

	for (let i in assisters) {
		let id = assisters[i];
		if (id === myId) {
			continue;
		}
		if (filterByRoles(datum, roles, id) 
			&& filterByChampions(datum, champions, id)) {
				return true;
		}
	}
	return false;
}

function filterByVictim(datum, champions, roles) {
	return filterByRoles(datum, roles, datum.victimId) 
			&& filterByChampions(datum, champions, datum.victimId);
}

function filterByKiller(datum, champions, roles) {
	return filterByRoles(datum, roles, datum.killerId) 
			&& filterByChampions(datum, champions, datum.killerId);
}

function filterAssistsByParticipatingAllies(datum, allyChampions, allyRoles) {
	return (filterByAssisters(datum, allyChampions, allyRoles) 
		|| filterByKiller(datum, allyChampions, allyRoles));
}

function getSelectedChampions(componentName) {
	return [d3.select(componentName).node().value];
}

function getSelectedRoles(componentName) {
	return [d3.select(componentName).node().value];
}

function updateMap() {
	if (!matchesData) {
		return;
	}
	let championsSelf = getSelectedChampions('.championSelect-self');
	let rolesSelf = getSelectedRoles('.roleSelect-self');

	let allyChampions = getSelectedChampions('.championSelect-ally');
	let allyRoles = getSelectedRoles('.roleSelect-ally');

	let enemyChampions = getSelectedChampions('.championSelect-enemy');
	let enemyRoles = getSelectedRoles('.roleSelect-enemy');

	let filteredKills = matchesData.kills.filter(d => 
		filterGenericEvents(d, championsSelf, rolesSelf) 
		&& filterByAssisters(d, allyChampions, allyRoles) 
		&& filterByVictim(enemyChampions, enemyRoles));

	let filteredDeaths = matchesData.deaths.filter(d => 
		filterGenericEvents(d, championsSelf, rolesSelf)
		&& filterByAssisters(d, enemyChampions, enemyRoles));

	let filteredAssists = matchesData.assists.filter(d => 
		filterGenericEvents(d, championsSelf, rolesSelf)
		&& filterAssistsByParticipatingAllies(d, allyChampions, allyRoles)
		&& filterByVictim(d, enemyChampions, enemyRoles));

	let updatedKills = svg.selectAll('.kills').data(filteredKills, d => d.id);	
	let updatedDeaths = svg.selectAll('.deaths').data(filteredDeaths, d => d.id);	
	let updatedAssists = svg.selectAll('.assists').data(filteredAssists, d => d.id);	

	renderDataPoints(updatedKills, 'kills');
	renderDataPoints(updatedDeaths, 'deaths');
	renderDataPoints(updatedAssists, 'assists');

	displayAnalysis(filteredKills, filteredDeaths, filteredAssists);
}

function renderDataPoints(data, className) {
	data.exit().remove();
	data.enter()
		.append('svg:circle')
		.attr('cx', function(d) { return xScale(d.position.x) })
        .attr('cy', function(d) { return yScale(d.position.y) })
        .attr('r', 5)
		.attr('class', className);
}

function filterBySide(datum) {
	let isRed = getMatchDetails(datum).isRed;
	return filterStates["side"] === "both" || 
		(filterStates["side"] === "red" && isRed) || 
		(filterStates["side"] === "blue" && !isRed);
}

function filterByOutcome(datum) {
	let isWin = getMatchDetails(datum).win;
	return filterStates["outcome"] === "both" || 
		(filterStates["outcome"] === "win" && isWin) || 
		(filterStates["outcome"] === "loss" && !isWin);
}

function filterByTime(datum) {
	let min = filterStates["timeSlider"][0];
	let max = filterStates["timeSlider"][1];
	return (datum.timestamp >= min && datum.timestamp <= max);
}

function filterByChampions(datum, champions, participantId) {
	let details = getMatchDetails(datum);
	if (championSelected[0] === "All champions") {
		return true;
	}
	else {
		let championPlayed = details.participantDetails[particpantId].championId;
		for (let i in champions) {
			if(championData[champions[i]].id === championPlayed) {
				return true;
			}
		}
		return false;	
	}	
}

function renderMapKda() {
	let kills = svg.selectAll('.kills')
		.data(matchesData.kills, d => d.id);
	renderDataPoints(kills, 'kills');

	let deaths = svg.selectAll('.deaths')
		.data(matchesData.deaths, d => d.id);
	renderDataPoints(deaths, 'deaths');

	let assists = svg.selectAll('.assists')
		.data(matchesData.assists, d => d.id);
	renderDataPoints(assists, 'assists');

	console.log("Rendered map");
}

function increment(object, field, amount) {
	if(object[field] === undefined) {
		object[field] = 0;
	}
	object[field]+= amount;
}

function getAssistersForKills(event) {
	return event.assistingParticipantIds;
}

function getAssistersForAssists(event) {
	let ret = [];
	let matchDetails = getMatchDetails(event);
	for (let i in event.assistingParticipantIds) {
		let id = event.assistingParticipantIds[i];
		if (id !== matchDetails.myParticipantId) {
			ret.push(id);
		}
	}
	ret.push(event.killerId);
	return ret;
}

function analyzeTakedowns(data, getAssisters) {
	let participatingAllyChampions = {}; // championId -> frequency, role -> frequency
	let participatingAllyRoles = {};
	let victimChampions = {};
	let victimRoles = {};

	for(let i in data) {
		let event = data[i];
		let matchDetails = getMatchDetails(event);

		let assisters = getAssisters(event);
		for (let j in assisters) {
			let id = assisters[j];
			let details = matchDetails.participantDetails[id];
			let championId = details.championId;
			let role = getRole(details.role, details.lane);

			increment(participatingAllyChampions, championId, 1);
			increment(participatingAllyRoles, role, 1);
		}
		
		// Enemy victim
		let id = event.victimId;
		let details = matchDetails.participantDetails[id];
		let championId = details.championId;
		let role = getRole(details.role, details.lane);
		increment(victimChampions, championId, 1);
		increment(victimRoles, role, 1);
	}
	return {participatingAllyChampions, participatingAllyRoles, victimChampions, victimRoles};
}

function combineKillsAndAssistsAnalysis(kills, assists) {
	let ret = {};
	ret.participatingAllyChampions = {};
	ret.participatingAllyRoles = {};
	ret.victimChampions = {};
	ret.victimRoles = {};

	for (let champion in kills.participatingAllyChampions) {
		increment(ret.participatingAllyChampions, champion, kills.participatingAllyChampions[champion]);
	}
	for (let champion in assists.participatingAllyChampions) {
		increment(ret.participatingAllyChampions, champion, assists.participatingAllyChampions[champion]);
	}

	for (let role in kills.participatingAllyRoles) {
		increment(ret.participatingAllyRoles, role, kills.participatingAllyRoles[role]);
	}
	for (let role in assists.participatingAllyRoles) {
		increment(ret.participatingAllyRoles, role, assists.participatingAllyRoles[role]);
	}

	for (let champion in kills.victimChampions) {
		increment(ret.victimChampions, champion, kills.victimChampions[champion]);
	}
	for (let champion in assists.victimChampions) {
		increment(ret.victimChampions, champion, assists.victimChampions[champion]);
	}

	for (let role in kills.victimRoles) {
		increment(ret.victimRoles, role, kills.victimRoles[role]);
	}
	for (let role in assists.victimRoles) {
		increment(ret.victimRoles, role, assists.victimRoles[role]);
	}

	return ret;
}

function getDeathAnalysisRatios(deaths, numTakedowns) {
	let ret = {};
	ret.participatingEnemyChampions = {};
	ret.participatingEnemyRoles = {};

	for (let champion in deaths.participatingAllyChampions) {
		ret.participatingEnemyChampions[champion] = deaths.participatingAllyChampions[champion] / numTakedowns;
	}

	for (let role in deaths.participatingAllyRoles) {
		ret.participatingEnemyRoles[role] = deaths.participatingAllyRoles[role] / numTakedowns;
	}
	return ret;
}

function getTakedownAnalysisRatios(killsAndAssists, numTakedowns) {
	let ret = {};
	ret.participatingAllyChampions = {};
	ret.participatingAllyRoles = {};
	ret.victimChampions = {};
	ret.victimRoles = {};

	for (let champion in killsAndAssists.participatingAllyChampions) {
		ret.participatingAllyChampions[champion] = killsAndAssists.participatingAllyChampions[champion] / numTakedowns;
	}

	for (let role in killsAndAssists.participatingAllyRoles) {
		ret.participatingAllyRoles[role] = killsAndAssists.participatingAllyRoles[role] / numTakedowns;
	}

	for (let champion in killsAndAssists.victimChampions) {
		ret.victimChampions[champion] = killsAndAssists.victimChampions[champion] / numTakedowns;
	}

	for (let role in killsAndAssists.victimRoles) {
		ret.victimRoles[role] = killsAndAssists.victimRoles[role] / numTakedowns;
	}
	return ret;
}

// From object "map" to sorted array
function toSortedArray(map) {
	let ret = [];
	for (let championOrRole in map) {
		ret.push({championOrRole, ratio : map[championOrRole]});
	}

	ret = ret.sort(function(x, y) {
		return d3.descending(x.ratio, y.ratio);
	});

	return ret;
}

function displayAnalysis(filteredKills, filteredDeaths, filteredAssists) {
	// Kills and assists
	let killsAnalysis = analyzeTakedowns(filteredKills, getAssistersForKills);
	let assistsAnalysis = analyzeTakedowns(filteredAssists, getAssistersForAssists);

	let killsAndAssistsAnalysis = combineKillsAndAssistsAnalysis(killsAnalysis, assistsAnalysis);
	
	// Deaths
	let deathsAnalysis = analyzeTakedowns(filteredDeaths, getAssistersForAssists);

	let takedowns = getTakedownAnalysisRatios(killsAndAssistsAnalysis, filteredKills.length + filteredAssists.length);
	let deaths = getDeathAnalysisRatios(deathsAnalysis, filteredDeaths.length);

	let takedownAllyChamps = toSortedArray(takedowns.participatingAllyChampions);
	let takedownAllyRoles = toSortedArray(takedowns.participatingAllyRoles);
	let takedownVictimChamps = toSortedArray(takedowns.victimChampions);
	let takedownVictimRoles = toSortedArray(takedown.victimRoles);
	
	let deathsEnemyChamps = toSortedArray(deaths.enemyChampions);
	let deathsEnemyRoles = toSortedArray(deaths.enemyRoles);

	let text = "takedownAllyChamps: " + JSON.stringify(takedownAllyChamps) 
		+ "\n takedownAllyRoles: " + JSON.stringify(takedownAllyRoles)
		+ "\n takedownVictimChamps: " + JSON.stringify(takedownVictimChamps)
		+ "\n takedownVictimRoles: " + JSON.stringify(takedownVictimRoles)
		+ "\n deathsEnemyChamps: " + JSON.stringify(deathsEnemyChamps)
		+ "\n deathsEnemyRoles: " + JSON.stringify(deathsEnemyRoles);

	analysisArea.text(text);
}