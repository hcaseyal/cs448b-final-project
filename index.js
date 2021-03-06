var mapWidth = 512,
	mapHeight = 512,
	bg = "img/map.png",
    analysisArea = d3.select('.analysis-area'),
	visArea = d3.select('.vis-area'),
	borderRadiusPadding = 7;

var matchDetailsPerGame;
var matchesData;
var championData;
var championMap = {};

var filterStates = {"side": "both", "outcome": "both"};

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
var baseURL = "http://localhost:8082/";

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

$(".summoner-name").keyup(function(event) {
    if (event.keyCode === 13) {
        searchSummoner();
    }
});

 $('#enemyRoleKilled').DataTable( {
 	paging: false,
    columns: [
        { title: "Role Killed in Takedowns", data: "championOrRole" },
        { title: "Ratio", data: "ratio"}
    ]
} );

 $('#enemyChampKilled').DataTable( {
 	pageLength: 6,
 	lengthChange: false,
 	pagingType: "full",
    columns: [
        { title: "Champion Killed in Takedowns", data: "championOrRole" },
        { title: "Ratio", data: "ratio"}
    ]
} );

 $('#participatingAllyRoles').DataTable( {
 	paging: false,
    columns: [
        { title: "Ally Roles in Takedowns", data: "championOrRole" },
        { title: "Ratio", data: "ratio"}
    ]
} );

 $('#participatingAllyChamps').DataTable( {
 	pageLength: 7,
 	lengthChange: false,
 	pagingType: "full",
    columns: [
        { title: "Ally Champs in Takedowns", data: "championOrRole" },
        { title: "Ratio", data: "ratio"}
    ]
} );

 $('#participatingEnemyRoles').DataTable( {
 	paging: false,
    columns: [
        { title: "Enemy Roles in Deaths", data: "championOrRole" },
        { title: "Ratio", data: "ratio"}
    ]
} );

 $('#participatingEnemyChamps').DataTable( {
 	pageLength: 7,
 	lengthChange: false,
 	pagingType: "full",
    columns: [
        { title: "Enemy Champs in Deaths", data: "championOrRole" },
        { title: "Ratio", data: "ratio"}
    ]
} );

setupAreaFilter();
drawTimeFilter();
drawLegend();

function setupAreaFilter() {
	d3.select(".areaFilter-checkbox").on("change", d => {
		if (d3.select(".areaFilter-checkbox").property("checked")) {
			createAreaFilter();
		}
		else {
			removeAreaFilter();
		}
		updateMap();
	});
}

function removeAreaFilter() {
	d3.select("#circleBorder").data({})
		.exit().remove();

	d3.select("#circle").data({})
		.exit().remove();
}

function drawAreaFilter(params) {
	// Circle fill
	let circleDrag = d3.behavior.drag();
	circleDrag.origin(function(d) {return d; });
	circleDrag.on('drag', onCircleDrag);
	circleDrag.on('dragend', onDragEnd);


	let borderDrag = d3.behavior.drag();
	borderDrag.on('drag', onBorderDrag);
	borderDrag.on('dragend', onDragEnd);

	//Circle border
	svg.append('circle')
		.datum({x: params.xVal, y: params.yVal, r: params.rVal})
	  .attr('r', params.rVal + borderRadiusPadding)
	  .attr('cx', d => d.x)
	  .attr('cy', d => d.y)
	  .attr('id', 'circleBorder')
	  .style('stroke', 'green')
	  .style('stroke-width', '15px')
	  .style('fill-opacity', 0)
	  .call(borderDrag);
	  

	svg.append('circle')
		.datum({x: params.xVal, y: params.yVal, r: params.rVal})
	  .attr('r', params.rVal)
	  .attr('cx', d => d.x)
	  .attr('cy', d => d.y)
	  .attr('id', 'circle')
	  .style('fill-opacity', 0.3)
	  .call(circleDrag);
}

function createAreaFilter() {
	let params = {xVal: 200, yVal: 200, rVal: 20};
	drawAreaFilter(params);
}

function onBorderDrag(datum) {
	var cx = parseFloat(this.attributes.cx.value);
	var cy = parseFloat(this.attributes.cy.value);
	var delta = calculateDistanceBetweenPoints(
		cx, cy,
		d3.event.x, d3.event.y);
	datum.r = delta;
	d3.select(this).attr('r', delta + borderRadiusPadding);

	svg.select("#circle")
		.attr('r', delta);

	updateMap();
}

// Re-render the area filter when we stop dragging
// so that the area filter is on top of the data points
function onDragEnd(datum, i) {
	let params = {xVal: datum.x, yVal: datum.y, rVal: datum.r}
	redrawAreaFilter(params);
} 

function redrawAreaFilterInPlace() {
	if (d3.select(".areaFilter-checkbox").property("checked")) {
		let circleAttributes = d3.select('#circle').node().attributes;
		let params = {xVal: parseInt(circleAttributes.cx.value), 
			yVal: parseInt(circleAttributes.cy.value), rVal: parseInt(circleAttributes.r.value)};
		redrawAreaFilter(params);
	}
}

function redrawAreaFilter(params) {
	d3.select('#circle').remove();
	d3.select('#circleBorder').remove();
	drawAreaFilter(params);
}

function onCircleDrag(datum, i) {
	let filter = d3.select(this);
	filter
		.attr('cx', datum.x = d3.event.x)
		.attr('cy', datum.y = d3.event.y);

	d3.select("#circleBorder")
	  .attr('cx', d3.event.x)
	  .attr('cy',  d3.event.y)

	updateMap();
}

function calculateDistanceBetweenPoints(x1, y1, x2, y2) {
	let a = x1 - x2;
	let b = y1 - y2;
	return Math.sqrt(a*a + b*b);
}

function searchSummoner() {
	var summoner = d3.select('.summoner-name').node().value;
	//searchForSummoner(summoner);
	getAllMatchData(summoner);
}

function getAllMatchData(summoner) {
	var xhttp = new XMLHttpRequest();
	var url = `${baseURL}all-match-data/?name=${summoner}`;
	xhttp.open("GET", url);
	xhttp.onload = () => {
		matchesData = JSON.parse(xhttp.responseText);

		for (let i in matchesData.kills) {
			let d = matchesData.kills[i];
			d.cx = +xScale(d.position.x);
			d.cy = +yScale(d.position.y);
			d.eventType = "kills";
		};

		for (let i in matchesData.deaths) {
			let d = matchesData.deaths[i];
			d.cx = +xScale(d.position.x);
			d.cy = +yScale(d.position.y);
			d.eventType = "deaths";
		};

		for (let i in matchesData.assists) {
			let d = matchesData.assists[i];
			d.cx = +xScale(d.position.x);
			d.cy = +yScale(d.position.y);
			d.eventType = "assists";
		};

		matchDetailsPerGame = matchesData.matchDetailsPerGame;
		redrawAreaFilterAndUpdateMap();
	}
	xhttp.onerror = () => analysisArea.text("Couldn't retrieve match data. " + xhttp.statusText);
	xhttp.send();
}

function redrawAreaFilterAndUpdateMap() {
	updateMap();
	redrawAreaFilterInPlace();
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
		createChampionMap(championData);
		drawRoleAndChampionFilters('.championSelect-self', '.roleSelect-self');
		drawRoleAndChampionFilters('.championSelect-ally', '.roleSelect-ally');
		drawRoleAndChampionFilters('.championSelect-enemy', '.roleSelect-enemy');
	});
}

// id -> name
function createChampionMap(data) {
	Object.keys(data).forEach(function(k){
		let obj = data[k];
		championMap[obj.id] = obj.name;
	});
}

function drawChampionSelectFilter(componentName) {
	var select = d3.select(componentName);

	var championArray = [];				
	Object.keys(championData).forEach(function(k){
		championArray.push(championData[k]);
	});

	var sortedData = championArray.sort(function(x, y) {
		return d3.ascending(x.name, y.name);
	});

	var options = select
		.selectAll('option')
		.data(sortedData)
		.enter()
		.append('option')
		.text(d => d.name)
		.attr('value', d => d.key);

	$(componentName).multiselect({
		includeSelectAllOption: true,
		selectAllText: "All Champions",
		onSelectAll: redrawAreaFilterAndUpdateMap,
		onDeselectAll: redrawAreaFilterAndUpdateMap,
		onChange: redrawAreaFilterAndUpdateMap,
		maxHeight: 200,
		enableCaseInsensitiveFiltering: true
	});
}

function drawRoleSelectFilter(componentName) {
	var select = d3.select(componentName);

	var roleArray = ["Top", "Jungle", "Mid", "ADC", "Support"];				
	var options = select
		.selectAll('option')
		.data(roleArray)
		.enter()
		.append('option')
		.text(d => d)
		.attr('value', d => d);

	$(componentName).multiselect({
		includeSelectAllOption: true,
		selectAllText: "All Roles",
		onSelectAll: redrawAreaFilterAndUpdateMap,
		onDeselectAll: redrawAreaFilterAndUpdateMap,
		onChange: redrawAreaFilterAndUpdateMap,
		enableCaseInsensitiveFiltering: true
	});
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

function drawLegend() {
	d3.select('.killLegend')
		.append("svg")
		.attr("width", 20)
		.attr("height", 20)
		.append("svg:circle")
		.attr('r', 5)
		.attr('cx', 10)
		.attr('cy', 10)
		.classed("kills", true);

	d3.select('.deathLegend')
		.append("svg")
		.attr("width", 20)
		.attr("height", 20)
		.append("svg:circle")
		.attr('r', 5)
		.attr('cx', 10)
		.attr('cy', 10)
		.classed("deaths", true);

	d3.select('.assistLegend')
		.append("svg")
		.attr("width", 20)
		.attr("height", 20)
		.append("svg:circle")
		.attr('r', 5)
		.attr('cx', 10)
		.attr('cy', 10)
		.classed("assists", true);
}

function onSliderChange(event, ui) {
	var values = ui.values;
	redrawSliderText(values);
	redrawAreaFilterAndUpdateMap();
}

function redrawSliderText(values) {
	d3.select(".timeSliderText").text(values[0] + " - " + values[1] + " minutes");
	let valuesInMs = [values[0] * 60 * 1000, values[1] * 60 * 1000];
	filterStates["timeSlider"] = valuesInMs;
}

function blueSideSelected() {
	filterStates["side"] = "blue";
	redrawAreaFilterAndUpdateMap();
}

function redSideSelected() {
	filterStates["side"] = "red";
	redrawAreaFilterAndUpdateMap();
}

function bothSidesSelected() {
	filterStates["side"] = "both";
	redrawAreaFilterAndUpdateMap();
}

function winOutcomeSelected() {
	filterStates["outcome"] = "win";
	redrawAreaFilterAndUpdateMap();
}

function lossOutcomeSelected() {
	filterStates["outcome"] = "loss";
	redrawAreaFilterAndUpdateMap();
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
		if (dataRole === "DUO" || dataRole === "SOLO" || dataRole === "NONE") {
			return "Bot lane - unknown role";
		}
	}
	return "Unknown";
}

function getMatchDetails(datum) {
 	return matchDetailsPerGame[datum.matchId];
}

function filterByRoles(datum, roles, participantId) {
	let details = getMatchDetails(datum).participantDetails[participantId];
	if (roles.length === 0) {
		return true;
	}
	for (let i = 0; i < roles.length; i++) {
		if (roles[i].value === getRole(details.role, details.lane)) {
			return true;
		}
	}
	return false;
}

function filterGenericEvents(datum, champions, roles) {
	let myId = getMatchDetails(datum).myParticipantId;
	return filterByChampions(datum, champions, myId) &&
		filterByTime(datum) &&
		filterBySide(datum) &&
		filterByRoles(datum, roles, myId) &&
		filterByOutcome(datum) && 
		filterByArea(datum);
}

function inCircle(datum) {
	let circle = d3.select("#circle").node();

	var cx = circle.attributes.cx.value;
	var cy = circle.attributes.cy.value;
	var radius = circle.attributes.r.value;

	return (Math.pow(datum.cx - cx, 2) + Math.pow(datum.cy - cy, 2) < Math.pow(radius, 2));
}

function filterByArea(datum) {
	if (d3.select(".areaFilter-checkbox").property("checked")) {
		return inCircle(datum);
	} 
	else {
		return true;
	}
}

function filterByAssisters(datum, champions, roles) {
	let assisters = datum.assistingParticipantIds;
	let myId = getMatchDetails(datum).myParticipantId;

	if (champions.length === 0 && 
		roles.length === 0) {
		return true;
	} 

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
	return $(componentName + " option:selected");
}

function getSelectedRoles(componentName) {
	return $(componentName + " option:selected");
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
		&& filterByVictim(d, enemyChampions, enemyRoles));

	let filteredDeaths = matchesData.deaths.filter(d => 
		filterGenericEvents(d, championsSelf, rolesSelf)
		&& filterByAssisters(d, enemyChampions, enemyRoles));

	let filteredAssists = matchesData.assists.filter(d => 
		filterGenericEvents(d, championsSelf, rolesSelf)
		&& filterAssistsByParticipatingAllies(d, allyChampions, allyRoles)
		&& filterByVictim(d, enemyChampions, enemyRoles));

	let filteredEvents = filteredKills.concat(filteredDeaths).concat(filteredAssists);

	// Randomize filteredEvents rendering order so distribution of events is more even
	filteredEvents = shuffle(filteredEvents);
	let updatedEvents= svg.selectAll('.event').data(filteredEvents, d => d.id);	

	renderDataPoints(updatedEvents);

	displayAnalysis(filteredKills, filteredDeaths, filteredAssists);
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function renderDataPoints(data) {
	data.exit().remove();
	data.enter()
		.append('svg:circle')
		.attr('cx', function(d) { return d.cx })
        .attr('cy', function(d) { return d.cy })
        .attr('r', 5)
		.attr('class', function(d) { return d.eventType })
		.classed('event', true);
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
	if (champions.length === 0) {
		return true;
	}
	else {
		let championPlayed = details.participantDetails[participantId].championId;
		for (let i = 0; i < champions.length; i++) {
			if(championData[champions[i].value].id === championPlayed) {
				return true;
			}
		}
		return false;	
	}	
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

// Changes champion id to champion name in the process of analyzing
function analyzeTakedowns(data, getAssisters) {
	let participatingAllyChampions = {}; // championId -> frequency, role -> frequency
	let participatingAllyRoles = {};
	let victimChampions = {};
	let victimRoles = {};

	for(let i in data) {
		let event = data[i];
		let matchDetails = getMatchDetails(event);
		let assisters = getAssisters(event);

		if (event.killerId === 0) {
			increment(participatingAllyChampions, "Execute", 1);
			increment(participatingAllyRoles, "Execute", 1);
		}

		// if assisters is empty, then it's a solo kill
		else if (assisters.length === 0) {
			increment(participatingAllyChampions, "Solo kill", 1);
			increment(participatingAllyRoles, "Solo kill", 1);
		}

		else {
			for (let j in assisters) {
				let id = assisters[j];
				let details = matchDetails.participantDetails[id];
				let champion = championMap[details.championId];
				let role = getRole(details.role, details.lane);

				increment(participatingAllyChampions, champion, 1);
				increment(participatingAllyRoles, role, 1);
			}
		}

		// Enemy victim
		let id = event.victimId;
		let details = matchDetails.participantDetails[id];
		let champion = championMap[details.championId];
		let role = getRole(details.role, details.lane);
		increment(victimChampions, champion, 1);
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

// Converts from float to string in the process
function formatRatio(num) {
	return (num * 100).toFixed(2) + "%";
}

function getDeathAnalysisRatios(deaths, numTakedowns) {
	let ret = {};
	ret.participatingEnemyChampions = {};
	ret.participatingEnemyRoles = {};

	for (let champion in deaths.participatingAllyChampions) {
		ret.participatingEnemyChampions[champion] = formatRatio(deaths.participatingAllyChampions[champion] / numTakedowns);
	}

	for (let role in deaths.participatingAllyRoles) {
		ret.participatingEnemyRoles[role] = formatRatio(deaths.participatingAllyRoles[role] / numTakedowns);
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
		ret.participatingAllyChampions[champion] = formatRatio(killsAndAssists.participatingAllyChampions[champion] / numTakedowns);
	}

	for (let role in killsAndAssists.participatingAllyRoles) {
		ret.participatingAllyRoles[role] = formatRatio(killsAndAssists.participatingAllyRoles[role] / numTakedowns);
	}

	for (let champion in killsAndAssists.victimChampions) {
		ret.victimChampions[champion] = formatRatio(killsAndAssists.victimChampions[champion] / numTakedowns);
	}

	for (let role in killsAndAssists.victimRoles) {
		ret.victimRoles[role] = formatRatio(killsAndAssists.victimRoles[role] / numTakedowns);
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

function displayNewTableData(selector, data) {
	let datatable = $(selector).DataTable();
	datatable.clear();
	datatable.rows.add(data);
	datatable.order([1, 'desc']);
	datatable.draw();
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
	let takedownVictimRoles = toSortedArray(takedowns.victimRoles);
	
	let deathsEnemyChamps = toSortedArray(deaths.participatingEnemyChampions);
	let deathsEnemyRoles = toSortedArray(deaths.participatingEnemyRoles);

	displayNewTableData('#enemyChampKilled', takedownVictimChamps);

	displayNewTableData('#enemyRoleKilled', takedownVictimRoles);

	displayNewTableData('#participatingAllyChamps', takedownAllyChamps);

	displayNewTableData('#participatingAllyRoles', takedownAllyRoles);

	displayNewTableData('#participatingEnemyChamps', deathsEnemyChamps);

	displayNewTableData('#participatingEnemyRoles', deathsEnemyRoles);
}