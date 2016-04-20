var app = angular.module('MapApp', [
    'leaflet-directive'
]);

app.controller('MapCtrl', ['$scope', 'leafletData', 'leafletBoundsHelpers', '$http', function($scope, leafletData, leafletBoundsHelpers, $http) {
    
    var startingBounds = leafletBoundsHelpers.createBoundsFromArray([
        [47.62294, -122.3643], //coordinates for seattle
        [47.5971, -122.29587]
    ]); 

    var mapSettings = {
        bounds : startingBounds, 
        center : {}, 
        geojson : { //initialize geojson feature collection (each of shapes we draw will be one feature)
            data: {
                type: 'FeatureCollection',
                features: []
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
   
    $scope.coordinatesLog = []; // used to log coordinates of the shapes we draw to the screen
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

    mapElement.addEventListener('touchstart', onMouseDownOrTouchStart); 
    mapElement.addEventListener('touchmove', onTouchMove);
    mapElement.addEventListener('touchend', onTouchEnd);

    $scope.$on('leafletDirectiveMap.map.mousedown', onMouseDownOrTouchStart);
    $scope.$on('leafletDirectiveMap.map.mousemove', onMouseMove);
    $scope.$on('leafletDirectiveMap.map.mouseup', onMouseUp);

    function onMouseDownOrTouchStart() {
        if (!$scope.isDrawingEnabled) return;
        if (isMouseClickedDown) return; //prevent weird errors in cases where we get 2 mouse downs without a mouse up in between
        
        isMouseClickedDown = true;

        //create a new LineString feature and add it to map's feature collection
        var feature =  {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: []
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

        var longitude = convertToLongitude(x);
        var latitude = convertToLatitude(y);

        addBoundaryPoint(longitude, latitude); //add point to boundary line
        
        $scope.$apply(); //needs apply because it is called from non-$scope event listener for mobile touches
        e.preventDefault(); //prevents page scrolling
    }

    function onTouchEnd(e) {
        onMouseUp();
        $scope.$apply();
    }

    function addBoundaryPoint(longitude, latitude) { //adds one longitude, latitude pair to the geojson feature
        var coordinatePair = [longitude, latitude];

        var index = $scope.geojson.data.features.length - 1; //index of most recent feature

        $scope.geojson.data.features[index].geometry.coordinates.push(coordinatePair);
    }

    function finishShape() { //converts feature from line string to polygon
        var index = $scope.geojson.data.features.length - 1; //index of current feature
        var geometry = $scope.geojson.data.features[index].geometry;

        //add copy of first point as the last point
        //polygon will autocomplete visually even if we don't but we need this point in array for future calculations
        if (geometry.coordinates.length > 0) geometry.coordinates.push(geometry.coordinates[0]); 

        geometry.type = 'Polygon';
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
        var polygons = [];

        // get all polygons in one simple array
        for (var i = 0; i < $scope.geojson.data.features.length; i++) {
            var polygon = $scope.geojson.data.features[i].geometry.coordinates[0]; 
            polygons.push(polygon);
        }
        
        return checkIfMarkerEnclosedByPolygons(polygons, marker); // in check_if_marker_enclosed_by_polygons.js module
    }

////////////////////////////////////////////////////// 
/////////  POPULATING THE MAP WITH MARKERS   ///////// 
////////////////////////////////////////////////////// 

    function createMarkers() {
        //the only free API I could find returns 20 places which are nearest to one point
        //so we will make the call on multiple evenly spaced points between the current bounds of our map

        $scope.markers = [];
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

        for (var i = 0; i <= INTERVAL; i++) {
            for (var j = 0; j <= INTERVAL; j++) {

                var longitude = westLongBound + (i * longDiff);
                var latitude = northLatBound - (j * latDiff);

                getNearbyPlacesFromAPI(latitude, longitude);
            }
        }
    }

    function getNearbyPlacesFromAPI(latitude, longitude) {
        var latitude = parseFloat(latitude).toFixed(5);
        var longitude = parseFloat(longitude).toFixed(5);

        var appId = 'WXhZTK2FXbfgsSY1WWQE';
        var appCode = 'ECiw79NUc9iM2Ou95f456g';

        var url = 'https://places.cit.api.here.com/places/v1/discover/explore';
        var query = '?at=' + latitude + ',' + longitude;
        query += '&app_id=' + appId;
        query += '&app_code=' + appCode;
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

            var latitude = item.position[0];
            var longitude = item.position[1];

            if ($scope.areMarkerClustersEnabled) {
                $scope.markers.push({
                    lng: longitude,
                    lat: latitude,
                    layer: 'clustered',
                    draggable: false
                });
            } else {
                $scope.markers.push({
                    lng: longitude,
                    lat: latitude,
                    draggable: false
                });
            }
        });
    }

    function errorCB(response) {
        console.log(response);
    }

}]);
