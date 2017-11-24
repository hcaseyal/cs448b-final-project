var mapWidth = 512,
	mapHeight = 512,
	bg = "img/map.png",
    analysisArea = d3.select('.analysis-area');
	visArea = d3.select('.vis-area');

var matchDetailsPerGame;
var matchesData;
var championData;

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
		//displayAnalysis(data);
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

		drawChampionSelectFilter();
	});
}

function drawChampionSelectFilter() {
	var select = d3.select('.championSelect')
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
}

function updateMap() {
	if (!matchesData) {
		return;
	}
	let filteredKills = matchesData.kills.filter(d => filterByChampionPlayed(d));
	let filteredDeaths = matchesData.deaths.filter(d => filterByChampionPlayed(d));
	let filteredAssists = matchesData.assists.filter(d => filterByChampionPlayed(d));

	let updatedKills = svg.selectAll('.kills').data(filteredKills, d => d.id);	


	let updatedDeaths = svg.selectAll('.deaths').data(filteredDeaths, d => d.id);	

	let updatedAssists = svg.selectAll('.assists').data(filteredAssists, d => d.id);	

	renderDataPoints(updatedKills, 'kills');
	renderDataPoints(updatedDeaths, 'deaths');
	renderDataPoints(updatedAssists, 'assists');
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

function filterByTime() {

}

function filterByChampionPlayed(datum) {
	let championSelected = d3.select('.championSelect').node().value;
	let details = matchDetailsPerGame[datum.matchId];
	return (championSelected === "All champions" || 
		championData[championSelected].id === details.participantDetails[details.myParticipantId].championId);
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

function displayAnalysis() {
}