var app = angular.module("MapApp", [
    "leaflet-directive"
]);

app.controller('MapCtrl', ['$scope', 'leafletData', 'leafletBoundsHelpers', function($scope, leafletData, leafletBoundsHelpers) {
    
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
              "features": [
                {
                  "type": "Feature",
                  "properties": {},
                  "geometry": {
                    "type": "LineString",
                    "coordinates": []
                  }
                }
              ]
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
            }
        },
        defaults: {
            scrollWheelZoom: false
        }
    };

    angular.extend($scope, defaultMapSettings);

    //////////// GLOBAL VARIABLES ////////////
   
    $scope.isDrawingEnabled = false;
    var isMouseClickedDown = false;

    var mapElement = document.getElementById('map');
    var MAP_HEIGHT = mapElement.offsetHeight;
    var MAP_WIDTH = mapElement.offsetWidth;

    //////////// EVENT LISTENERS ////////////

    mapElement.addEventListener('touchmove', onTouchMove);
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
        e.preventDefault(); //prevents page scrolling
    }

    function addBoundaryPoint(lng, lat) { //adds a longitude, latitude pair to the geojson
        var coordinatePair = [lng, lat];
        $scope.geojson.data.features[0].geometry.coordinates.push(coordinatePair);
        $scope.$apply(); //needs apply because it can be called from non-$scope event listener for mobile touches
    }

    function onMouseDown() {
        if ($scope.isDrawingEnabled) isMouseClickedDown = true;
    }

    function onMouseMove(event, args) { //if mouse click held down and drawing enabled, then adds mouse coordiantes to geojson boundary
        if (!($scope.isDrawingEnabled && isMouseClickedDown)) return; 

        var mouseCoordinates = args.leafletEvent.latlng;
        var lng = mouseCoordinates.lng;
        var lat = mouseCoordinates.lat;

        addBoundaryPoint(lng, lat);
    }

    function onMouseUp() {
        isMouseClickedDown = false;
    }

    $scope.enableDrawing = function() { //disables map panning, resets the geojson shape, and allows drawing
        leafletData.getMap().then(function(map) {
            map.dragging.disable();
            map.touchZoom.disable();
            map.doubleClickZoom.disable();
        });

        resetGeojson();
        $scope.isDrawingEnabled = true;
    };

    $scope.applyBoundary = function() { //ends drawing, enables map panning, changes the geoson boundary line into a polygon
        disableDrawing();
        
        var geometry = $scope.geojson.data.features[0].geometry; 
        
        geometry.type = "Polygon";
        geometry.coordinates = [geometry.coordinates]; //Polygon format requires one more level of array nesting than LineString format
    };

    //////////// HELPER FUNCTIONS ////////////

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

    function disableDrawing() { //disable dragging and flip boolean
        leafletData.getMap().then(function(map) {
            map.dragging.enable();
            map.touchZoom.enable();
            map.doubleClickZoom.enable();
        });
        $scope.isDrawingEnabled = false;
    }

    function resetGeojson() { //reset the geojson feature to an empty LineString
        var geometry = $scope.geojson.data.features[0].geometry; 
        geometry.type = "LineString";
        geometry.coordinates = [];
    }

    function updateCurrentMapDimensions() { 
        MAP_WIDTH = mapElement.offsetWidth;
        MAP_HEIGHT = mapElement.offsetHeight;
    }

}]);
