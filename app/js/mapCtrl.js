var app = angular.module("MapApp", [
    "leaflet-directive"
]);

app.controller('MapCtrl', ['$scope', 'leafletData', 'leafletBoundsHelpers', '$http', function($scope, leafletData, leafletBoundsHelpers, $http) {
    
    var startingBounds = leafletBoundsHelpers.createBoundsFromArray([
        [ 47.62294, -122.3643 ], //coordinates for seattle
        [ 47.5971, -122.29587 ]
    ]); 

    var defaultMapSettings = {
        bounds : startingBounds, //we need access to current bounds of map to allow drawing on mobile
        center: {},      
        geojson : { //this geojson data will be used to draw the shape. Begins as a LineString, then converted to a Polygon when user clicks Apply
            data: {
              "type": "FeatureCollection",
              "features": []
            },
            style: { //style of the geojson LineString or Polygon
                weight: 2,
                opacity: .8,
                color: 'navy',
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
        },
        defaults: {
            // scrollWheelZoom: false
        }
    };

    angular.extend($scope, defaultMapSettings);

    //////////// GLOBAL VARIABLES ////////////
   
    $scope.logs = new Array();   
    $scope.isDrawingEnabled = false;
    var isMouseClickedDown = false;

    var mapElement = document.getElementById('map');
    var MAP_HEIGHT = mapElement.offsetHeight;
    var MAP_WIDTH = mapElement.offsetWidth;

    //////////// EVENT LISTENERS ////////////

    mapElement.addEventListener('touchstart', onMouseDown);
    mapElement.addEventListener('touchmove', onTouchMove);
    mapElement.addEventListener('touchend', onTouchEnd);

    $scope.$on("leafletDirectiveMap.map.mousedown", onMouseDown);
    $scope.$on("leafletDirectiveMap.map.mousemove", onMouseMove);
    $scope.$on("leafletDirectiveMap.map.mouseup", onMouseUp);

    //////////// MAIN FUNCTIONS ////////////

    function onTouchMove(e) { //gets x and y coordinates of touch move, converts them to geojson, adds geojson coordinates to boundary line
        updateCurrentMapDimensions(); //in case user has rotated screen since the last touch

        var x = Math.floor(e.touches[0].pageX); //get X position of touch event relative to page
        var y = Math.floor(e.touches[0].pageY); //get Y 

        if (x < 0 || x > MAP_WIDTH || y < 0 || y > MAP_HEIGHT) return;
        if (!$scope.isDrawingEnabled) return;

        var lng = convertToLongitude(x);
        var lat = convertToLatitude(y);

        addBoundaryPoint(lng, lat); //add point to boundary line
        
        $scope.$apply(); //needs apply because it can be called from non-$scope event listener for mobile touches
        e.preventDefault(); //prevents page scrolling
    }

    function onTouchEnd(e) {
        onMouseUp();
        $scope.$apply();
    }

    function addBoundaryPoint(lng, lat) { //adds a longitude, latitude pair to the geojson
        var coordinatePair = [lng, lat];

        var index = $scope.geojson.data.features.length - 1; //index of most recent feature

        $scope.geojson.data.features[index].geometry.coordinates.push(coordinatePair);
    }

    function onMouseDown() {
        if (!$scope.isDrawingEnabled) return;
        
        isMouseClickedDown = true;

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

    function onMouseMove(event, args) { //if mouse click held down and drawing enabled, then adds mouse coordinates to geojson boundary
        if (!($scope.isDrawingEnabled && isMouseClickedDown)) return; 

        var mouseCoordinates = args.leafletEvent.latlng;
        var lng = mouseCoordinates.lng;
        var lat = mouseCoordinates.lat;

        addBoundaryPoint(lng, lat);
    }

    function onMouseUp() {
        if (!($scope.isDrawingEnabled && isMouseClickedDown)) return; 

        isMouseClickedDown = false;
        finishShape();
    }

    function finishShape() { //converts feature from line string to polygon
        var index = $scope.geojson.data.features.length - 1; //index of current feature
        var geometry = $scope.geojson.data.features[index].geometry; 

        geometry.type = "Polygon";
        geometry.coordinates = [geometry.coordinates]; //Polygon format requires one more level of array nesting than LineString format

        $scope.logs.push(geometry.coordinates[0]);
        console.log(geometry.coordinates[0]);
    }

    //////////// HELPER FUNCTIONS ////////////

    $scope.enableDrawing = function() { //disables map panning, resets the geojson shape, and allows drawing
        leafletData.getMap().then(function(map) {
            map.dragging.disable();
            map.touchZoom.disable();
            map.doubleClickZoom.disable();
        });

        $scope.geojson.data.features = new Array(); //resets the geojson features
        $scope.logs = new Array();
        $scope.isDrawingEnabled = true;
    };

    $scope.disableDrawing = function() { //disable dragging and flip boolean
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

//////////////////////////////////////////////////////////////////////

//////////// PART 2 - ADDITIONAL FEATURES ////////////////////////////

//////////////////////////////////////////////////////////////////////

    $scope.areMarkerClustersEnabled = true;
    var placeMap = {}; //this hashmap used to store which places we have already added to map, to prevent duplicate places being added

    $scope.toggleMarkerClustering = function() {
        $scope.areMarkerClustersEnabled = !$scope.areMarkerClustersEnabled;
        createMarkers();
    };

    $scope.createMarkers = function() {
        createMarkers();
    };

    $scope.removeNonenclosedMarkers = function() {
        var index = 0;

        while (index < $scope.markers.length) {
            var marker = $scope.markers[index];
            var isMarkerInsideShape = checkIfMarkerEnclosed(marker);

            if (isMarkerInsideShape) {
                index++;
            } else {
                $scope.markers.splice(index, 1);
            }
        }
    };


    function checkIfMarkerEnclosed(marker) {
        var marker = marker;
        var long = marker.lng;
        var lat = marker.lat;

        for(var z=0; z<$scope.geojson.data.features.length; z++) {

            var polygon = $scope.geojson.data.features[z].geometry.coordinates[0];

            var firstPoint = polygon[0];
            polygon.push(firstPoint);

            var curLatStatus;

            if((polygon[0][1]) < lat) curLatStatus = -1;
            else curLatStatus = 1;

            var latIntersections = new Array();
            var prevLatStatus = curLatStatus;

            for(var i=0; i<polygon.length; i++) {
                prevLatStatus = curLatStatus;
                var current = polygon[i];
                var curLat = current[1];
                if (curLat < lat) {
                    curLatStatus = -1;
                } else {
                    curLatStatus = 1;
                }
                if (curLatStatus != prevLatStatus) latIntersections.push(i);
            }

            var longAtLatIntArr = new Array();

            for(var i=0; i<latIntersections.length; i++) {
                var index = latIntersections[i];
                var latInt = polygon[index];
                longAtLatIntArr.push(latInt[0]);
            }

            longAtLatIntArr.push(long);
            longAtLatIntArr = longAtLatIntArr.sort();
            var indx;
            
            for(var i=0; i<longAtLatIntArr.length; i++) {
                if(longAtLatIntArr[i] == long) indx = i;
            }

            var rem = indx % 2;

            if(rem) return true; //inside
        }

        return false; //outside
    };


    function createMarkers() {

        $scope.markers = new Array();
        placeMap = {};

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

                getNearbyMarkers(lat, long);
            }
        }
    };

    function getNearbyMarkers(lat, long) {
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

        }).then(function successCallback(response) {
            var itemArr = response.data.results.items;
            itemArr.forEach(function(item) {

                var title = item.title;
                if (placeMap[title]) return; //return if place has already added to map;
                placeMap[title] = true;

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

        }, function errorCallback(response) {
            console.log('errors');
        });
    }

}]);
