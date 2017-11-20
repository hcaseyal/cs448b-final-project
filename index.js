// Set up size
var mapWidth = 750;
var mapHeight = 750;
var dataset;
var radiusText1;
var radiusText2;
var poiText1;
var poiText2;
var borderRadiusPadding = 7;

// Set up projection that the map is using
var projection = d3.geoMercator()
  .center([-122.433701, 37.767683]) // San Francisco, roughly
  .scale(225000)
  .translate([mapWidth / 2, mapHeight / 2]);

// This is the mapping between <longitude, latitude> position to <x, y> pixel position on the map
// projection is a function and it has an inverse:
// projection([lon, lat]) returns [x, y]
// projection.invert([x, y]) returns [lon, lat]

// Add an SVG element to the DOM
var svg = d3.select('body').select('.visArea')
	.append('svg')
  .attr('width', mapWidth)
  .attr('height', mapHeight);

// Add SVG map at correct size, assuming map is saved in a subdirectory called `data`
svg.append('image')
  .attr('width', mapWidth)
  .attr('height', mapHeight)
  .attr('xlink:href', 'data/sf-map.svg');

loadData();

function loadData() {
	// Citation: http://zeroviscosity.com/d3-js-step-by-step/step-4-loading-external-data
	d3.csv('data/trees.csv', function(error, treesDataset) {

		if (error) {
			return console.warn(error);
		}

		treesDataset.forEach(function(d, i) {
			d.DBH = +d.DBH;
			d.Latitude = +d.Latitude;
			d.Longitude = +d.Longitude;
			d.id = +i;
			d.cx = +projection([d.Longitude, d.Latitude])[0];
			d.cy = +projection([d.Longitude, d.Latitude])[1];
		});

		dataset = treesDataset;
		drawInitialTrees();
		drawSpeciesFilter();
		drawDiameterFilter();
	});
}

function drawInitialTrees() {
	var circles = svg.selectAll('circle')
			.data(dataset, d => d.id)
			.enter();

		circles.append('circle')
			.attr('r', 2)
  		.attr('cx', d => d.cx)
  		.attr('cy', d => d.cy)
  		.attr('class', 'tree')
  		.style('fill', 'blue');
  	createPointOfInterestCircles();
}

function drawDiameterFilter () {
	// Add drop down menu for species filtering
	// http://bl.ocks.org/jfreels/6734823
	var select = d3.select('.diameterSelect')
		.on('change', updateTrees);

	var optionsText = [{value: "All", text: "All diameters"}, 
	{value: ">", text: "Diameters greater than"}, {value: "<", text: "Diameters less than"}];

	var options = select
		.selectAll('option')
		.data(optionsText)
		.enter()
		.append('option')
		.text(d => d.text)
		.attr('value', d => d.value);

	var maxDiameter = d3.max(dataset, d => d.DBH);
	var slider = d3.select('.diameterSlider')
		.attr('max', maxDiameter)
		.on("input", onSliderChange);
	redrawSliderText(slider.node().value);
}

function onSliderChange() {
	redrawSliderText(this.value);
	updateTrees();
}

function redrawSliderText(value) {
	d3.select(".diameterText").text(value + " inches*");
}

function drawSpeciesFilter () {
	// Add drop down menu for species filtering
	// http://bl.ocks.org/jfreels/6734823
	var select = d3.select('.speciesSelect')
		.on('change', updateTrees);

	// https://stackoverflow.com/questions/25168086/sorting-objects-based-on-property-value-in-d3
	var sortedData = dataset.sort(function(x, y) {
		return d3.ascending(x.qSpecies, y.qSpecies);
	});


	sortedData.unshift({qSpecies: "All species"});
	// https://stackoverflow.com/questions/28572015/how-to-select-unique-values-in-d3-js-from-data
	var options = select
		.selectAll('option')
		.data(d3.map(sortedData, d => d.qSpecies).keys())
		.enter()
		.append('option')
		.text(d => d)
		.attr('value', d => d);
}

function createPointOfInterestCircles() {
	let xVals = [200, 500];
	let yVals = [200, 500];
	let rVals = [7, 5];
	let idVals = [0, 1];

	for (i = 0; i < xVals.length; i++) {
		//Circle border
		svg.append('circle')
			.datum({x: xVals[i], y: yVals[i], index: idVals[i]})
		  .attr('r', rVals[i] + borderRadiusPadding)
		  .attr('cx', d => d.x)
		  .attr('cy', d => d.y)
		  .attr('id', 'circleBorder' + i)
		  .attr('index', i)
		  .style('stroke', 'green')
		  .style('stroke-width', '15px')
		  .style('fill-opacity', 0)
		  .call(d3.drag().on('drag', onBorderDrag));;

		//Circle fill
		svg.append('circle')
			.datum({x: xVals[i], y: yVals[i], index: idVals[i]})
		  .attr('r', rVals[i])
		  .attr('cx', d => d.x)
		  .attr('cy', d => d.y)
		  .attr('id', 'circle' + i)
		  .attr('index', i)
		  .style('fill-opacity', 0.3)
		  .call(d3.drag().on('drag', onCircleDrag));
	}

	// Add the radius text to the DOM
	radiusText1 = svg.append('text')
	  .attr('x', 290)
	  .attr('y', 80)
	  .attr('fill', '#000')
	  .attr('id', 'radiusText1')
	  .text("Radius A in miles: " + parseMile(xVals[0], yVals[0], rVals[0]));

	radiusText2 = svg.append('text')
	  .attr('x', 290)
	  .attr('y', 140)
	  .attr('fill', '#000')
	  .attr('id', 'radiusText2')
	  .text("Radius B in miles: " + parseMile(xVals[1], yVals[1], rVals[1]));

	// Add the point of interest text to the DOM
	poiText1 = svg.append('text')
	  .attr('x', 290)
	  .attr('y', 60)
	  .attr('fill', '#000')
	  .attr('id', 'poiText1')
	  .text("Point of interest A: " + getPointOfInterest(xVals[0], yVals[0]));

	poiText2 = svg.append('text')
	  .attr('x', 290)
	  .attr('y', 120)
	  .attr('fill', '#000')
	  .attr('id', 'poiText2')
	  .text("Point of interest B: " + getPointOfInterest(xVals[1], yVals[1]));

	// Add checkbox functionality
	// https://bl.ocks.org/johnnygizmo/3d593d3bf631e102a2dbee64f62d9de4
	d3.select(".checkbox").on("change", updateTrees);
}

function inCircle(datum, circle) {
	var cx = circle.attributes.cx.value;
	var cy = circle.attributes.cy.value;
	var radius = circle.attributes.r.value;

	return (Math.pow(datum.cx - cx, 2) + Math.pow(datum.cy - cy, 2) < Math.pow(radius, 2));
}

function getPointOfInterest(xPixels, yPixels) {
	var proj = projection.invert([xPixels, yPixels]);
	var lon = proj[0];
	var lat = proj[1];
	return lat.toFixed(3) + ", " + lon.toFixed(3);
}

function inCircleIntersection(datum, poi1, poi2) {
	return inCircle(datum, poi1) && inCircle(datum, poi2);
}

function includeSpecies(datum) {
	var species = d3.select(".speciesSelect").node().value; 
	return (species === "All species" || datum.qSpecies === species);
}

function diameterFilter(datum) {
	var diameter = +d3.select(".diameterSlider").node().value;
	var comp = d3.select(".diameterSelect").node().value;
	if (comp === "All") {
		return true;
	}
	else if (datum.DBH === 0) {
		return false;
	}
	else if (comp === ">") {
		return datum.DBH > diameter;
	}
	else {
		return datum.DBH < diameter;
	}
}

function updateTrees(datum) {
	var poi1 = svg.select('#circle0').node();
	var poi2 = svg.select('#circle1').node();

	var filteredData;
	if (d3.select(".checkbox").property("checked")) {
		filteredData = dataset.filter(d => inCircleIntersection(d, poi1, poi2) 
			&& includeSpecies(d) && diameterFilter(d));
	} 
	else {
		filteredData = dataset.filter(d => diameterFilter(d) 
			&& includeSpecies(d));
	}

	var updatedTrees = svg.selectAll('.tree').data(filteredData, d => d.id);

	 updatedTrees.exit().remove();

	updatedTrees.enter().append('circle')
               .attr('r', 2)
               .attr('cx', d => d.cx)
               .attr('cy', d => d.cy)
               .attr('class', 'tree')
              .style('fill', 'blue');
}

function onCircleDrag(datum) {
	datum.x = d3.event.x;
	datum.y = d3.event.y;
	d3.select(this)
	  .attr('cx', d3.event.x)
	  .attr('cy', d3.event.y);

	d3.select("#circleBorder" + datum.index)
	  .attr('cx', d3.event.x)
	  .attr('cy',  d3.event.y)
	if (d3.select(".checkbox").property("checked")) {
		updateTrees(datum);
	}
	redrawPoiText(this.attributes.index.value, d3.event.x, d3.event.y);
}

//https://stackoverflow.com/questions/29687217/d3-event-x-does-not-get-the-x-cursors-position
function onBorderDrag(datum) {
	var cx = parseFloat(this.attributes.cx.value);
	var cy = parseFloat(this.attributes.cy.value);
	var index = this.attributes.index.value;
	var delta = calculateDistanceBetweenPoints(
		cx, cy,
		event.x, event.y);
	d3.select(this).attr('r', delta + borderRadiusPadding);

	svg.select("#circle" + index)
		.attr('r', delta);
	if (d3.select(".checkbox").property("checked")) {
		updateTrees(datum);
	}
	redrawRadiusText(index, cx, cy, delta);
}

function redrawPoiText(circleIndex, cx, cy) {
	if (circleIndex == 0) {
		poiText1
			.text("Point of interest A: " + getPointOfInterest(cx, cy));
	}
	else {
		poiText2
			.text("Point of interest B: " + getPointOfInterest(cx, cy));
	}
}

function redrawRadiusText(circleIndex, cx, cy, radius) {
	if (circleIndex == 0) {
		radiusText1
			.text("Radius A in miles: " + parseMile(cx, cy, radius));
	}
	else {
		radiusText2
			.text("Radius B in miles: " + parseMile(cx, cy, radius));
	}
}

function parseMile(cx, cy, radius) {	
	var centerPoint = [cx, cy]; // location in x,y pixels on map
	var arbitraryPoint = [cx + radius, cy]; // this is radius pixels away

	var lonLat1 = projection.invert(centerPoint);
	var lonLat2 = projection.invert(arbitraryPoint);

	var radianDistance = d3.geoDistance(lonLat1, lonLat2); // e.g. 0.0003511662069411614
	var fractionOfTheWayAroundTheEarth = radianDistance / (2 * Math.PI);

	// https://www.wolframalpha.com/input/?i=circumference+of+earth+in+miles
	var earthCircumference = 24901 // in miles

	var milesDistance = fractionOfTheWayAroundTheEarth * 24901; // e.g. 1.3917128481074619
	return milesDistance.toFixed(2);
}

function calculateDistanceBetweenPoints(x1, y1, x2, y2) {
	let a = x1 - x2;
	let b = y1 - y2;
	return Math.sqrt(a*a + b*b);
}
