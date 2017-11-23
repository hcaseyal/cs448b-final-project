var mapWidth = 512,
	mapHeight = 512,
	bg = "img/map.png",
    analysisArea = d3.select('.analysis-area');
	visArea = d3.select('.vis-area');

var matchDetailsPerGame;
var matchesData;
var championData;

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
		dataset = JSON.parse(xhttp.responseText);
		matchDetailsPerGame = data.matchDetailsPerGame;
		renderMapKda();
		drawChampionSelectFilter();
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
		.data(d3.map(sortedData, d => d.name).keys())
		.enter()
		.append('option')
		.text(d => d)
		.attr('value', d => d);
}

function updateMap() {

}

function renderMapKda() {
	// Domain for the current Summoner's Rift on the in-game mini-map
    let domain = {
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

	var kills = svg.selectAll('.kills')
		.data(data.kills, d => d.id)
		.enter()
		.append('svg:circle')
		.attr('cx', function(d) { return xScale(d.position.x) })
        .attr('cy', function(d) { return yScale(d.position.y) })
        .attr('r', 5)
		.attr('class', 'kills');

	var circles = svg.selectAll('.deaths')
		.data(data.deaths, d => d.id)
		.enter()
		.append('svg:circle')
		.attr('cx', function(d) { return xScale(d.position.x) })
        .attr('cy', function(d) { return yScale(d.position.y) })
        .attr('r', 5)
		.attr('class', 'deaths');

	var circles = svg.selectAll('.assists')
		.data(data.assists, d => d.id)
		.enter()
		.append('svg:circle')
		.attr('cx', function(d) { return xScale(d.position.x) })
        .attr('cy', function(d) { return yScale(d.position.y) })
        .attr('r', 5)
		.attr('class', 'assists');

	console.log("Rendered map");
}

function displayAnalysis() {
}