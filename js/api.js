/*
 # HERE api could be put here based on jQuery.
 # The better way for every team member to collaborate on this .js file
 # is to create a pull request before merge into WANLINYU' master  our "final master branch". 
*/


//Step 1: initialize communication with the platform
var platform = new H.service.Platform({
  app_id: 'rd5Xy1piYyjfDQX5CfPJ',
  app_code: 'DtrvrlUl7Luea9uVKew7uQ',
  useCIT: true,
  useHTTPS: true
});
var defaultLayers = platform.createDefaultLayers();

//Step 2: initialize a map 
var map = new H.Map(document.getElementById('map'),
  defaultLayers.normal.map);
//Step 3: make the map interactive
var behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

// Create the default UI components
var ui = H.ui.UI.createDefault(map, defaultLayers);

// Hold a reference to any infobubble opened
var bubble;

// Global variable to store information
var currentPosition;
var targetPosition;
var runningTotalTime;

// Have these deferred to let we first get current and final position
// then we can calculet the result
var currentPositionDeferred = $.Deferred();
var targetPositionDeferred = $.Deferred();

/**
 * Opens/Closes a infobubble
 * @param  {H.geo.Point} position     The location on the map.
 * @param  {String} text              The contents of the infobubble.
 */
function openBubble(position, text){
 if(!bubble){
    bubble =  new H.ui.InfoBubble(
      position,
      // The FO property holds the province name.
      {content: text});
    ui.addBubble(bubble);
  } else {
    bubble.setPosition(position);
    bubble.setContent(text);
    bubble.open();
  }
}

/**
 * Creates a H.map.Polyline from the shape of the route and adds it to the map.
 * @param {Object} route A route as received from the H.service.RoutingService
 */
function addRouteShapeToMap(route){
  var strip = new H.geo.Strip(),
    routeShape = route.shape,
    polyline;

  routeShape.forEach(function(point) {
    var parts = point.split(',');
    strip.pushLatLngAlt(parts[0], parts[1]);
  });

  polyline = new H.map.Polyline(strip, {
    style: {
      lineWidth: 4,
      strokeColor: 'rgba(0, 128, 255, 0.7)'
    }
  });
  // Add the polyline to the map
  map.addObject(polyline);
  // And zoom to its bounding rectangle
  map.setViewBounds(polyline.getBounds(), true);
}

/**
 * Creates a series of H.map.Marker points from the route and adds them to the map.
 * @param {Object} route  A route as received from the H.service.RoutingService
 */
function addManueversToMap(route){
  var svgMarkup = '<svg width="18" height="18" ' +
    'xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="8" cy="8" r="8" ' +
      'fill="#1b468d" stroke="white" stroke-width="1"  />' +
    '</svg>',
    dotIcon = new H.map.Icon(svgMarkup, {anchor: {x:8, y:8}}),
    group = new  H.map.Group(),
    i,
    j;

  // Add a marker for each maneuver
  for (i = 0;  i < route.leg.length; i += 1) {
    for (j = 0;  j < route.leg[i].maneuver.length; j += 1) {
      // Get the next maneuver.
      maneuver = route.leg[i].maneuver[j];
      // Add a marker to the maneuvers group
      var marker =  new H.map.Marker({
        lat: maneuver.position.latitude,
        lng: maneuver.position.longitude} ,
        {icon: dotIcon});
      marker.instruction = maneuver.instruction;
      group.addObject(marker);
    }
  }

  group.addEventListener('tap', function (evt) {
    map.setCenter(evt.target.getPosition());
    openBubble(
       evt.target.getPosition(), evt.target.instruction);
  }, false);

  // Add the maneuvers group to the map
  map.addObject(group);
}


/**
 * Creates a series of H.map.Marker points from the route and adds them to the map.
 * @param {Object} route  A route as received from the H.service.RoutingService
 */
function addWaypointsToPanel(waypoints){
  var nodeH3 = document.createElement('h3'),
    waypointLabels = [],
    i;


   for (i = 0;  i < waypoints.length; i += 1) {
    waypointLabels.push(waypoints[i].label)
   }

   nodeH3.textContent = waypointLabels.join(' - ');

  routeInstructionsContainer.innerHTML = '';
  routeInstructionsContainer.appendChild(nodeH3);
}

/**
 * Creates a series of H.map.Marker points from the route and adds them to the map.
 * @param {Object} route  A route as received from the H.service.RoutingService
 */
function addSummaryToPanel(summary){
  var summaryDiv = document.createElement('div'),
   content = '';
   content += '<b>Total distance</b>: ' + summary.distance  + 'm. <br/>';
   content += '<b>Travel Time</b>: ' + summary.travelTime.toMMSS() + ' (in current traffic)';

   // runnning total time
   runningTotalTime = summary.travelTime;

  summaryDiv.style.fontSize = 'small';
  summaryDiv.style.marginLeft ='5%';
  summaryDiv.style.marginRight ='5%';
  summaryDiv.innerHTML = content;
  routeInstructionsContainer.appendChild(summaryDiv);
}

/**
 * Creates a series of H.map.Marker points from the route and adds them to the map.
 * @param {Object} route  A route as received from the H.service.RoutingService
 */
function addManueversToPanel(route){
  var nodeOL = document.createElement('ol'),
    i,
    j;

  nodeOL.style.fontSize = 'small';
  nodeOL.style.marginLeft ='5%';
  nodeOL.style.marginRight ='5%';
  nodeOL.className = 'directions';

     // Add a marker for each maneuver
  for (i = 0;  i < route.leg.length; i += 1) {
    for (j = 0;  j < route.leg[i].maneuver.length; j += 1) {
      // Get the next maneuver.
      maneuver = route.leg[i].maneuver[j];

      var li = document.createElement('li'),
        spanArrow = document.createElement('span'),
        spanInstruction = document.createElement('span');

      spanArrow.className = 'arrow '  + maneuver.action;
      spanInstruction.innerHTML = maneuver.instruction;
      li.appendChild(spanArrow);
      li.appendChild(spanInstruction);

      nodeOL.appendChild(li);
    }
  }

  routeInstructionsContainer.appendChild(nodeOL);
}


Number.prototype.toMMSS = function () {
  return  Math.floor(this / 60)  +' minutes '+ (this % 60)  + ' seconds.';
}

// Function to calculate the route
function HERERoute (map, platform, routeOptions) {
  var router = platform.getRoutingService();

  var onSuccess = function(result) {
	var route, routeShape, startPoint, endPoint, strip;

	  if (result.response.route) {
	    route = result.response.route[0];
	    routeShape = route.shape;

	    strip = new H.geo.Strip();

	    routeShape.forEach(function(point) {
	      var parts = point.split(',');
	      strip.pushLatLngAlt(parts[0], parts[1]);
	    });

	    var routeLine = new H.map.Polyline(strip, {
	      style: { strokeColor: 'blue', lineWidth: 10 }
	    });

	    map.addObject(routeLine);

	    map.setViewBounds(routeLine.getBounds());
	  }
  };

  var onError = function(error) {
    console.error('Oh no! There was some communication error!', error);
  }

  router.calculateRoute(routeOptions, onSuccess, onError);
}

// convert coordinate to string for later use
function locationToWaypointString(coordinates) {
  return 'geo!' + coordinates.lat + ',' + coordinates.lng;
}


// find a location according to input address
function geocode(platform, searchText) {
  var geocoder = platform.getGeocodingService(),
    geocodingParameters = {
      searchText: searchText,
      jsonattributes : 1
    };

  geocoder.geocode(
    geocodingParameters,
    onSuccessForFindingLocation,
    onErrorForFindingLocation
  );
}

function onSuccessForFindingLocation(result) {
  targetLocations = result.response.view[0].result;
  var coordinates = {
	    lat: targetLocations[0].location.displayPosition.latitude,
	    lng: targetLocations[0].location.displayPosition.longitude
	};
  targetPosition = coordinates;
  targetPositionDeferred.resolve();
}

function onErrorForFindingLocation(error) {
  alert('Ooops!');
}

// Function to find the route for current position to final position 
function updatePosition (platform, currentCoordinates, finalCoordinate) {
  var router = platform.getRoutingService(),
    routeRequestParams = {
      mode: 'shortest;pedestrian',
      representation: 'display',
      waypoint0: locationToWaypointString(currentCoordinates),
      waypoint1: locationToWaypointString(finalCoordinate),
      routeattributes: 'waypoints,summary,shape,legs',
      maneuverattributes: 'direction,action'
    };


  router.calculateRoute(
    routeRequestParams,
    onSuccessUpdatePosition,
    onErrorUpdatePosition
  );
}

function onSuccessUpdatePosition(result) {
  var route = result.response.route[0];
 /*
  * The styling of the route response on the map is entirely under the developer's control.
  * A representitive styling can be found the full JS + HTML code of this example
  * in the functions below:
  */
  addRouteShapeToMap(route);
  addManueversToMap(route);

  addWaypointsToPanel(route.waypoint);
  addManueversToPanel(route);
  addSummaryToPanel(route.summary);
  // ... etc.
}

// set up containers for the map  + panel
var mapContainer = document.getElementById('map'),
  routeInstructionsContainer = document.getElementById('panel');


/**
 * This function will be called if a communication error occurs during the JSON-P request
 * @param  {Object} error  The error message received.
 */
function onErrorUpdatePosition(error) {
  alert('Ooops!');
}


// Function to convert position object to coordinate
function showPosition(position) {
    var latitude =  position.coords.latitude;
    var longitude = position.coords.longitude; 
    
    var coordinates = {
	    lat: latitude,
	    lng: longitude
	};
	currentPosition = coordinates;
	currentPositionDeferred.resolve();
}

/**
 * This will be triggered when search button is hit
 */
$("#search-button").click(function() {
	// Get the target position
	var endAdress = $("#end-address").val();
	geocode(platform, endAdress);

	// Get the current position
	navigator.geolocation.watchPosition(showPosition)

	// calculate the route
	$.when( currentPositionDeferred, targetPositionDeferred).done(function() {
		updatePosition(platform, currentPosition, targetPosition);
	});

	$('#time-pannel').hide();

});


// Count down time function
function getTimeRemaining(endtime) {
  var t = Date.parse(endtime) - Date.parse(new Date());
  var seconds = Math.floor((t / 1000) % 60);
  var minutes = Math.floor((t / 1000 / 60) % 60);
  var hours = Math.floor((t / (1000 * 60 * 60)) % 24);
  var days = Math.floor(t / (1000 * 60 * 60 * 24));
  return {
    'total': t,
    'days': days,
    'hours': hours,
    'minutes': minutes,
    'seconds': seconds
  };
}

function initializeClock(id, endtime) {
  var clock = document.getElementById(id);
  var daysSpan = clock.querySelector('.days');
  var hoursSpan = clock.querySelector('.hours');
  var minutesSpan = clock.querySelector('.minutes');
  var secondsSpan = clock.querySelector('.seconds');

  function updateClock() {
    var t = getTimeRemaining(endtime);

    daysSpan.innerHTML = t.days;
    hoursSpan.innerHTML = ('0' + t.hours).slice(-2);
    minutesSpan.innerHTML = ('0' + t.minutes).slice(-2);
    secondsSpan.innerHTML = ('0' + t.seconds).slice(-2);

    if (t.total <= 0) {
      clearInterval(timeinterval);
    }
  }

  updateClock();
  var timeinterval = setInterval(updateClock, 1000);
}

// Hide the timer panel
$('#time-pannel').hide();

// Function when the start running button is hit
$("#running-start-button").click(function() {
	var deadline = new Date(Date.parse(new Date()) +  runningTotalTime* 1000);
	initializeClock('clockdiv', deadline);
	$('#time-pannel').show();
});


