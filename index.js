// Example URL for requesting from RIOT API:
// https://na1.api.riotgames.com/lol/summoner/v3/summoners/by-name/RiotSchmick?api_key=RGAPI-0c3f4dea-5a44-40ce-b29d-88e00f218389
// Requests the summoner object for RiotSchmick

var analysisArea = d3.select('.analysis-area');
var visArea = d3.select('.vis-area');

// Node server url
var baseURL = "http://localhost:8080/";

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
		analysisArea.text(xhttp.responseText);
	}
	xhttp.onerror = () => analysisArea.text("ERROR " + xhttp.statusText);
	xhttp.send();
}