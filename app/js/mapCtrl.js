var app = angular.module("MapApp", [
    "leaflet-directive"
]);

app.controller('MapCtrl', ['$scope', 'leafletData', 'leafletBoundsHelpers', '$http', function($scope, leafletData, leafletBoundsHelpers, $http) {
    
    var startingBounds = leafletBoundsHelpers.createBoundsFromArray([
        [ 47.62294, -122.3643 ], //coordinates for seattle
        [ 47.5971, -122.29587 ]
    ]); 

    var mapSettings = {
        bounds : startingBounds, 
        center : {}, 
        geojson : { //initialize geojson feature collection (each of shapes we draw will be one feature)
            data: {
              "type": "FeatureCollection",
              "features": []
            },
            style: { //style of the geojson LineString or Polygon
                weight: 3,
                opacity: .8,
                color: '#2aa22a',
                dashArray: '4',
                fillOpacity: .25
            }
        },
        layers: {
            baselayers: {
                osm: {
                    name: 'OpenStreetMap',
                    url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    type: 'xyz'
                }
            },
            overlays: {
                clustered: {
                    name: 'Clustered',
                    type: 'markercluster',
                    visible: true
                }
            }
        }
    };

    angular.extend($scope, mapSettings); 

/////////   GLOBAL VARIABLES   ///////// 
   
    $scope.coordinatesLog = new Array(); // used to log coordinates of the shapes we draw to the screen
    $scope.isDrawingEnabled = false;
    var isMouseClickedDown = false;

    var mapElement = document.getElementById('map');
    var MAP_HEIGHT = mapElement.offsetHeight;
    var MAP_WIDTH = mapElement.offsetWidth;

////////////////////////////////////////////////////// 
/////////         DRAWING FUNCTIONS         //////////
////////////////////////////////////////////////////// 

// we create a new map feature (a line string) on mouse down (or touch start)
// we add points to this line on mouse move (or touch move)
// we convert the line to a polygon on mouse up (or mouse up)

    mapElement.addEventListener('touchstart', onMouseDown); 
    mapElement.addEventListener('touchmove', onTouchMove);
    mapElement.addEventListener('touchend', onTouchEnd);

    $scope.$on("leafletDirectiveMap.map.mousedown", onMouseDown);
    $scope.$on("leafletDirectiveMap.map.mousemove", onMouseMove);
    $scope.$on("leafletDirectiveMap.map.mouseup", onMouseUp);

    function onMouseDown() {
        if (!$scope.isDrawingEnabled) return;
        if (isMouseClickedDown) return; //prevent weird errors in cases where we get 2 mouse downs without a mouse up in between
        
        isMouseClickedDown = true;

        //create a new LineString feature and add it to map's feature collection
        var feature =  {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "LineString",
                "coordinates": []
            }
        };

        $scope.geojson.data.features.push(feature);
    }

    function onMouseMove(event, args) { //if mouse click held down and drawing enabled, then add mouse coordinates to geojson boundary
        if (!$scope.isDrawingEnabled || !isMouseClickedDown) return; 

        var mouseCoordinates = args.leafletEvent.latlng;
        var lng = mouseCoordinates.lng;
        var lat = mouseCoordinates.lat;

        addBoundaryPoint(lng, lat);
    }

    function onMouseUp() {
        if (!$scope.isDrawingEnabled || !isMouseClickedDown) return; 

        isMouseClickedDown = false;
        finishShape(); //converts feature from line string to polygon
    }

    function onTouchMove(e) { 
    //for mouse events, the map can provide us the latitude and longitude of our mouse pointer
    //but not for touch events, so we must take the pixel data and convert it to latitude and longitude
        if (!$scope.isDrawingEnabled) return;

        updateCurrentMapDimensions(); //in case user has rotated screen since the last touch

        var x = Math.floor(e.touches[0].pageX); //get X position of touch event relative to page
        var y = Math.floor(e.touches[0].pageY); //get Y 

        if (x < 0 || x > MAP_WIDTH || y < 0 || y > MAP_HEIGHT) return; //return if user has moved finger off of the map

        var lng = convertToLongitude(x);
        var lat = convertToLatitude(y);

        addBoundaryPoint(lng, lat); //add point to boundary line
        
        $scope.$apply(); //needs apply because it is called from non-$scope event listener for mobile touches
        e.preventDefault(); //prevents page scrolling
    }

    function onTouchEnd(e) {
        onMouseUp();
        $scope.$apply();
    }

    function addBoundaryPoint(lng, lat) { //adds one longitude, latitude pair to the geojson feature
        var coordinatePair = [lng, lat];

        var index = $scope.geojson.data.features.length - 1; //index of most recent feature

        $scope.geojson.data.features[index].geometry.coordinates.push(coordinatePair);
    }

    function finishShape() { //converts feature from line string to polygon
        var index = $scope.geojson.data.features.length - 1; //index of current feature
        var geometry = $scope.geojson.data.features[index].geometry;

        //add copy of first point as the last point
        //polygon will autocomplete visually even if we don't but we need this point in array for future calculations
        if (geometry.coordinates.length > 0) geometry.coordinates.push(geometry.coordinates[0]); 

        geometry.type = "Polygon";
        geometry.coordinates = [geometry.coordinates]; //Polygon format requires one more level of array nesting than LineString format

        $scope.coordinatesLog.push(geometry.coordinates[0]);
        console.log(geometry.coordinates[0]);
    }

//////////// HELPER FUNCTIONS ////////////

    $scope.toggleDrawing = function() {
        if ($scope.isDrawingEnabled) disableDrawing();
        else enableDrawing();
    };

    function enableDrawing() { //disable map panning, reset geojson shapes, and allow drawing
        leafletData.getMap().then(function(map) {
            map.dragging.disable();
            map.touchZoom.disable();
            map.doubleClickZoom.disable();
        });

        $scope.geojson.data.features = new Array(); //resets the geojson features
        $scope.coordinatesLog = new Array(); 
        $scope.isDrawingEnabled = true;
    }

    function disableDrawing() { //enable map panning/dragging and flip boolean
        leafletData.getMap().then(function(map) {
            map.dragging.enable();
            map.touchZoom.enable();
            map.doubleClickZoom.enable();
        });
        $scope.isDrawingEnabled = false;
    }

    function convertToLongitude(x) { //converts X position of a touchevent to longitude
        var westLongBound = $scope.bounds.southWest.lng;
        var eastLongBound = $scope.bounds.northEast.lng;
        var longDegCurView = eastLongBound - westLongBound;
        
        var xRatio = x / MAP_WIDTH;
        var longitude = xRatio * longDegCurView; //degrees from the edge of the map 
        var finalLongitude = westLongBound + longitude; 

        return finalLongitude;
    }

    function convertToLatitude(y) { //converts Y position of a touchevent to latitude
        var southLatBound = $scope.bounds.southWest.lat;
        var northLatBound = $scope.bounds.northEast.lat;
        var latDegCurView = northLatBound - southLatBound;

        var yRatio = y / MAP_HEIGHT;
        var latitude = yRatio * latDegCurView; //degrees from the edge of the map 
        var finalLatitude = northLatBound - latitude;

        return finalLatitude;
    }

    function updateCurrentMapDimensions() { 
        MAP_WIDTH = mapElement.offsetWidth;
        MAP_HEIGHT = mapElement.offsetHeight;
    }

////////////////////////////////////////////////////// 
/////////    PART 2 - ADDITIONAL FEATURES    ///////// 
/////////  PLACING AND FILTERING MAP MARKERS ///////// 
////////////////////////////////////////////////////// 

    $scope.markers = new Array();
    $scope.areMarkerClustersEnabled = true;
    var placesAddedToMap = {}; //this hashmap used to store which places we have already added to map, to prevent duplicate places being added

///////// CONTROLLER FUNCTIONS ///////// 

    $scope.createMarkers = function() {
        createMarkers();
    };

    $scope.removeNonenclosedMarkers = function() {
        removeNonenclosedMarkers();
    };

    $scope.toggleMarkerClustering = function() {
        $scope.areMarkerClustersEnabled = !$scope.areMarkerClustersEnabled;

        // probably a more elegant way of doing this, but I experimented with a few other options and this was only one I could get to work
        if ($scope.areMarkerClustersEnabled) {
            $scope.markers.forEach(function(marker) {
                marker.layer = 'clustered';
            });
        } else {
            $scope.markers.forEach(function(marker) {
                delete marker.layer;
            });
        }
    };

////////////////////////////////////////////////////// 
//////    FILTERING OUT NON-ENCLOSED MARKERS    ////// 
////////////////////////////////////////////////////// 

    function removeNonenclosedMarkers() {
        var index = 0;

        // loop through all markers, remove any marker not enclosed in one of user-drawn polygons
        while (index < $scope.markers.length) {
            var marker = $scope.markers[index];
            var isMarkerInsideShapes = checkIfMarkerEnclosed(marker);

            if (isMarkerInsideShapes) {
                index++;
            } else {
                $scope.markers.splice(index, 1);
            }
        }
    }

    function checkIfMarkerEnclosed(marker) {
    // To find if a marker is enclosed in a polygon, we will use the following steps:
    
    // 1 - find all edges of the polygon which intersect the latitude line of the marker
    // 2 - find the exact points on the edges which have the same latitude as our marker (we will call these points lat intersections)
    // 3 - compare longitudes at lat intersections to longitude of the marker
    // 4 - if the number of intersections coming before our point is odd, then our point is inside the shape. if even, then point is outside.
    
    // More details about this algorithm here:   https://en.wikipedia.org/wiki/Point_in_polygon

        var long = marker.lng;
        var lat = marker.lat;

        // loop through polygons, checking one at a time
        for (var i=0; i<$scope.geojson.data.features.length; i++) {
            var polygon = $scope.geojson.data.features[i].geometry.coordinates[0]; 
            
            if (polygon.length < 1) continue; // skip iteration if polygon is empty 

            // step 1
            var latIntersections = findLatIntersections(polygon, lat);
            
            //step 2
            var longAtLatIntArr = new Array();

            latIntersections.forEach(function(latInt) {
                var pointBefore = polygon[latInt[0]]; 
                var pointAfter = polygon[latInt[1]];
                
                var longAtLatInt = findLongAtLatInt(pointBefore, pointAfter, lat); 
                longAtLatIntArr.push(longAtLatInt); 
            });

            // step 3
            var index = compareLongitudes(long, longAtLatIntArr); 

            // step 4
            var isMarkerInsideShape = index % 2; // will be 0 or 1. 1 means inside, 0 means outside

            if (isMarkerInsideShape) return true; //marker is inside polygon of current loop iteration
        }

        return false; //marker is outside of all polygons
    }

    function compareLongitudes(value, arr) {
        //find where a value would sit in an array if we added it to the array and then sorted it
        arr.push(value);
        var sortedArr = arr.sort();
        var index;
        
        for (var i=0; i<sortedArr.length; i++) {
            if (sortedArr[i] == value) index = i;
        }
        
        return index;
    }

    function findLatIntersections(polygon, lat) { 
        //as we iterate along the edges of one polygon, find all edges that cross the latitude of our marker

        var curLatStatus; //will either be -1 or 1
        // -1 means latitude of current point in shape is less than the latitude of marker in question
        // 1 means greater than 

        if ((polygon[0][1]) < lat) curLatStatus = -1; 
        else curLatStatus = 1;

        var latIntersections = new Array();
        var prevLatStatus = curLatStatus;

        for (var i=0; i<polygon.length; i++) {
            prevLatStatus = curLatStatus;
            var curLat = polygon[i][1];
            if (curLat < lat) {
                curLatStatus = -1;
            } else {
                curLatStatus = 1;
            }
            //if latitude of marker crossed, add index of point before latitude crossed and index of point after
            if (curLatStatus != prevLatStatus) latIntersections.push([i-1, i]); 
        }

        return latIntersections;
    }

    function findLongAtLatInt (pointA, pointB, latitude) {
        // need to find the exact longitude where the line between two points meets a latitude line
        var longitude; 

        var rise = Number(pointB[1] - pointA[1]);
        var run = Number(pointB[0] - pointA[0]);
        
        // make sure we don't calculate slope as undefined
        if (run == 0) { 
            longitude = pointA[0];
            return longitude; 
        }

        var slope = rise / run;
        var constant = pointA[1];
        
        var longDiff = Number((latitude - constant)/(slope));
        var longitude = pointA[0] + longDiff;

        return longitude;
    }

////////////////////////////////////////////////////// 
/////////  POPULATING THE MAP WITH MARKERS   ///////// 
////////////////////////////////////////////////////// 

    function createMarkers() {
        //the only free API I could find returns 20 places which are nearest to one point
        //so we will make the call on multiple evenly spaced points between the current bounds of our map

        $scope.markers = new Array();
        placesAddedToMap = {}; //reset object

        var westLongBound = $scope.bounds.southWest.lng;
        var eastLongBound = $scope.bounds.northEast.lng;
        var southLatBound = $scope.bounds.southWest.lat;
        var northLatBound = $scope.bounds.northEast.lat;

        var latDegCurView = northLatBound - southLatBound;
        var longDegCurView = eastLongBound - westLongBound;

        var INTERVAL = 3; // ((Interval+1)^2) will be the number of API calls made to get markers around a point

        var longDiff = longDegCurView / INTERVAL;
        var latDiff = latDegCurView / INTERVAL;

        for(var i=0; i<=INTERVAL; i++) {
            for(var j=0; j<=INTERVAL; j++) {

                var long = westLongBound + (i * longDiff);
                var lat = northLatBound - (j * latDiff);

                getNearbyPlacesFromAPI(lat, long);
            }
        }
    }

    function getNearbyPlacesFromAPI(lat, long) {
        var lat = parseFloat(lat).toFixed(5);
        var long = parseFloat(long).toFixed(5);

        var app_id = 'WXhZTK2FXbfgsSY1WWQE';
        var app_code = 'ECiw79NUc9iM2Ou95f456g';

        var url = "https://places.cit.api.here.com/places/v1/discover/explore";
        var query = "?at=" + lat + ',' + long;
        query += '&app_id=' + app_id;
        query += '&app_code=' + app_code;
        query += '&tf=plain&pretty=true';

        url += query;

        $http({
            
            method: 'GET',
            url: url

        }).then(addItemsToMapCB, errorCB);
    }

    function addItemsToMapCB(response) {
        var itemArr = response.data.results.items;
        itemArr.forEach(function(item) {

            var title = item.title;
            if (placesAddedToMap[title]) return; //return if place has already been added to map;
            placesAddedToMap[title] = true;

            var lt = item.position[0];
            var lg = item.position[1];

            if ($scope.areMarkerClustersEnabled) {
                $scope.markers.push({
                    lng: lg,
                    lat: lt,
                    layer: 'clustered',
                    draggable: false
                });
            } else {
                $scope.markers.push({
                    lng: lg,
                    lat: lt,
                    draggable: false
                });
            }
        });
    }

    function errorCB(response) {
        console.log(response);
    }

}]);
