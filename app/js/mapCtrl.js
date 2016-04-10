var app = angular.module("MapApp", [
    "leaflet-directive"
]);

app.controller('MapCtrl', ['$scope', 'leafletData', 'leafletBoundsHelpers', function($scope, leafletData, leafletBoundsHelpers) {
    
    var bounds = leafletBoundsHelpers.createBoundsFromArray([
        [ 47.62294, -122.3643 ], //coordinates for seattle
        [ 47.5971, -122.29587 ]
    ]); 

    var defaultMapSettings = {
        bounds : bounds,
        center: {},      
        geojson : { //this geojson data will be used to draw the shape. Begins as a LineString, is converted to a Polygon when user clicks Apply
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
        events: {}, 
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


    mapElement.addEventListener('touchmove', onTouchMove);

    $scope.$on("leafletDirectiveMap.map.mousedown", onMouseDown);
    $scope.$on("leafletDirectiveMap.map.mousemove", onMouseMove);
    $scope.$on("leafletDirectiveMap.map.mouseup", onMouseUp);


    function onTouchMove(e) {
        var x = Math.floor(Number(e.touches[0].pageX));
        var y = Math.floor(Number(e.touches[0].pageY));

        if (x < 0 || x > MAP_WIDTH || y < 0 || y > MAP_HEIGHT) return;
        if (!$scope.isDrawingEnabled) return;

        var lng = convertToLongitude(x);
        var lat = convertToLatitude(y);

        addBoundaryPoint(lng, lat);
        e.preventDefault();
    }

    function addBoundaryPoint(lng, lat) {
        var coordinatePair = [lng, lat];
        $scope.geojson.data.features[0].geometry.coordinates.push(coordinatePair);
        $scope.$apply(); //needs apply because it can be called from non-$scope event listener for mobile touches
    }

    function convertToLongitude(x) {
        var westLongBound = $scope.bounds.southWest.lng;
        var eastLongBound = $scope.bounds.northEast.lng;
        var longDegCurView = eastLongBound - westLongBound;
        
        var xRatio = x / MAP_WIDTH;
        var longitude = xRatio * longDegCurView;
        var finalLongitude = westLongBound + longitude;

        return finalLongitude;
    }

    function convertToLatitude(y) {
        var southLatBound = $scope.bounds.southWest.lat;
        var northLatBound = $scope.bounds.northEast.lat;
        var latDegCurView = northLatBound - southLatBound;

        var yRatio = y / MAP_HEIGHT;
        var latitude = yRatio * latDegCurView;
        var finalLatitude = northLatBound - latitude;

        return finalLatitude;
    }

    function onMouseDown() {
        if ($scope.isDrawingEnabled) isMouseClickedDown = true;
    }

    function onMouseMove(event, args) {
        if (!($scope.isDrawingEnabled && isMouseClickedDown)) return; 

        var mouseCoordinates = args.leafletEvent.latlng;
        var lng = mouseCoordinates.lng;
        var lat = mouseCoordinates.lat;

        addBoundaryPoint(lng, lat);
    }

    function onMouseUp() {
        isMouseClickedDown = false;
    }

    $scope.enableDrawing = function() {
        MAP_WIDTH = mapElement.offsetWidth;
        MAP_HEIGHT = mapElement.offsetHeight;

        leafletData.getMap().then(function(map) {
            map.dragging.disable();
            map.touchZoom.disable();
            map.doubleClickZoom.disable();
        });

        resetGeojson();
        $scope.isDrawingEnabled = true;
    };

    $scope.applyBoundary = function() { //changes the boundary line into a polygon
        disableDrawing();
        
        var geometry = $scope.geojson.data.features[0].geometry; 
        
        geometry.type = "Polygon";
        geometry.coordinates = [geometry.coordinates]; //Polygon format requires one more level of array nesting than LineString format
    };

    function disableDrawing() {
        leafletData.getMap().then(function(map) {
            map.dragging.enable();
            map.touchZoom.enable();
            map.doubleClickZoom.enable();
        });
        $scope.isDrawingEnabled = false;
    }

    function resetGeojson() {
        var geometry = $scope.geojson.data.features[0].geometry; 
        geometry.type = "LineString";
        geometry.coordinates = [];
    }

}]);
