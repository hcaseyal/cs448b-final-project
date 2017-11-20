var mapWidth = 750;
var mapHeight = 750;
var analysisArea = d3.select('.analysis-area');
var visArea = d3.select('.vis-area');

// Node server url
var baseURL = "http://localhost:8080/";

// Add an SVG element to the DOM
var svg = d3.select('body').select('.vis-area')
	.append('svg')
  .attr('width', mapWidth)
  .attr('height', mapHeight);

// Add SVG map at correct size, assuming map is saved in a subdirectory called `data`
svg.append('image')
  .attr('width', mapWidth)
  .attr('height', mapHeight)
  .attr('xlink:href', 'img/map.png');

function searchSummoner() {
	var summoner = d3.select('.summoner-name').node().value;
	visArea.text(summoner);
	searchForSummoner(summoner);
}

function searchForSummoner(summoner) {
	var xhttp = new XMLHttpRequest();
	var url = `${baseURL}summoner/?name=${summoner}`;
	xhttp.open("GET", url);
	xhttp.onload = () => {
		var data = JSON.parse(xhttp.responseText);
		dispalySummonerInfo(data);
		renderMapKda(receiveKdaData(data));
		displayAnalysis(data);
	}
	xhttp.onerror = () => analysisArea.text("Couldn't retrieve summoner. " + xhttp.statusText);
	xhttp.send();
}

function displaySummonerInfo(data) {
	d3.select('.summoner-name-display').text(data.summoner.name);
}

function receiveKdaData(data) {
	var timelines = data.timelines;
	var kills = [];
	var deaths = [];
	var assists = [];

	for (var i = 0; i < timelines.length; i++) {
		var match = timelines[i];
		for (var j in match) {
			var matchInfoAtMinute = match[j];
			for (var eventIndex in matchInfoAtMinute.events) {
				var event = matchInfoAtMinute.events[eventIndex];
				event.id = i;
				if (isKill(event, data.summoner)) {
					kills.push(event);
				} 
				else if (isDeath(event, data.summoner)) {
					deaths.push(event);
				}
				else if (isAssist(event, data.summoner)){
					assists.push(event);
				}
			}
		}
	}

	return {kills, deaths, assists};
}

function renderMapKda(kda) {
	var kills = svg.selectAll('.kills')
		.data(kda.kills, d => d.id)
		.enter()
		.append('circle')
		.attr('class', 'kills');

	var circles = svg.selectAll('.kills')
		.data(kda.kills, d => d.id)
		.enter()
		.append('circle')
		.attr('class', 'kills');

	var circles = svg.selectAll('.kills')
		.data(kda.kills, d => d.id)
		.enter()
		.append('circle')
		.attr('class', 'kills');

}

function isKill(event, summonerInfo) {
	return (event.killer === summonerInfo.accountId);
}

function isDeath(event, summonerInfo) {
	return (event.victim === summonerInfo.accountId);
}

function isAssist(event, summonerInfo) {
	return (event.assists.contains(champion => champion === summonerInfo.accountId));
}

function displayAnalysis(data) {

}