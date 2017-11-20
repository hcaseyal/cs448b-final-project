// Example URL for requesting from RIOT API:
// https://na1.api.riotgames.com/lol/summoner/v3/summoners/by-name/RiotSchmick?api_key=RGAPI-0c3f4dea-5a44-40ce-b29d-88e00f218389
// Requests the summoner object for RiotSchmick

var analysisArea = d3.select('.analysis-area');
var visArea = d3.select('.vis-area');
var baseURL = 'https://na1.api.riotgames.com/lol/';
var apiKey = 'RGAPI-0c3f4dea-5a44-40ce-b29d-88e00f218389';

function onEnterButtonPress() {
	var summoner = d3.select('.summoner-name').node().value;
	visArea.text(summoner);
	searchForSummoner();
}

function searchForSummoner() {
	var xhttp = new XMLHttpRequest();
	var url = `${baseURL}summoner/v3/summoners/by-name/RiotSchmick?api_key=${apiKey}`;
	xhttp.open("GET", url);
	xhttp.onload = () => analysisArea.text(this.responseText);
	xhttp.onerror = () => analysisArea.text("ERROR " + xhttp.statusText);
	xhttp.send();
}