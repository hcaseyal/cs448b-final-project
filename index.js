var mapWidth = 750;
var mapHeight = 750;
var analysisArea = d3.select('.analysis-area');
var visArea = d3.select('.vis-area');

// Node server url
var baseURL = "http://localhost:8081/";

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
	getAllMatchData(summoner);
}

function getAllMatchData(summoner) {
	var xhttp = new XMLHttpRequest();
	var url = `${baseURL}all-match-data/?name=${summoner}`;
	xhttp.open("GET", url);
	xhttp.onload = () => {
		var data = JSON.parse(xhttp.responseText);
		//renderMapKda(receiveKdaData(data));
		//displayAnalysis(data);
		console.log(xhttp.responseText);
		analysisArea.text(xhttp.responseText);
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

function renderMapKda(kda) {
	var kills = svg.selectAll('.kills')
		.data(kda.kills, d => d.id)
		.enter()
		.append('circle')
		.attr('class', 'kills');

	var circles = svg.selectAll('.deaths')
		.data(kda.deaths, d => d.id)
		.enter()
		.append('circle')
		.attr('class', 'deaths');

	var circles = svg.selectAll('.assists')
		.data(kda.assists, d => d.id)
		.enter()
		.append('circle')
		.attr('class', 'assists');
}

function displayAnalysis(data) {

}