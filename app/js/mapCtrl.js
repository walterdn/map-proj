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
        geojson : {
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
            style: {
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


    $scope.currentlyDrawingBoundary = false;

    var mapElement = document.getElementById('map');

    var MAP_HEIGHT = 400;
    var MAP_WIDTH = mapElement.offsetWidth;

    mapElement.addEventListener('touchmove', function(e) {

        var x = Math.floor(Number(e.touches[0].pageX));
        var y = Math.floor(Number(e.touches[0].pageY));

        if (x < 0 || x > MAP_WIDTH || y < 0 || y > MAP_HEIGHT) return;
        if (!$scope.currentlyDrawingBoundary) return;

        addBoundaryPoint(x, y);

        e.preventDefault();
    });

    function addBoundaryPoint(x, y) {
        var longitude = convertX(x);
        var latitude = convertY(y);

        var coordinatePair = [longitude, latitude];
        $scope.geojson.data.features[0].geometry.coordinates.push(coordinatePair);
        $scope.$apply();
    }

    function convertX(x) {

        var westLongBound = $scope.bounds.southWest.lng;
        var eastLongBound = $scope.bounds.northEast.lng;
        var longDegCurView = eastLongBound - westLongBound;
        
        var xRatio = x / MAP_WIDTH;
        var longitude = xRatio * longDegCurView;
        var finalLongitude = westLongBound + longitude;

        return finalLongitude;
    }

    function convertY(y) {

        var southLatBound = $scope.bounds.southWest.lat;
        var northLatBound = $scope.bounds.northEast.lat;
        var latDegCurView = northLatBound - southLatBound;

        var yRatio = y / MAP_HEIGHT;
        var latitude = yRatio * latDegCurView;
        var finalLatitude = northLatBound - latitude;

        return finalLatitude;
    }

    // $scope.$on("leafletDirectiveMap.map.mousedown", startDrawing);
    // $scope.$on("leafletDirectiveMap.map.touchmove", addBoundaryPoint);
    // $scope.$on("leafletDirectiveMap.map.mouseup", endDrawing);
    // $scope.$on("leafletDirectiveMap.map.touchstart", startDrawing);
    // $scope.$on("leafletDirectiveMap.map.touchmove", addBoundaryPoint);
    // $scope.$on("leafletDirectiveMap.map.touchend", endDrawing);

    $scope.startDrawing = function() {
        MAP_WIDTH = mapElement.offsetWidth;

        leafletData.getMap().then(function(map) {
            map.dragging.disable();
            map.touchZoom.disable();
            map.doubleClickZoom.disable();
        });

        resetGeojson();
        $scope.currentlyDrawingBoundary = true;
    };

    $scope.applyBoundary = function() { //changes the boundary line into a polygon
        endDrawing();
        
        var geometry = $scope.geojson.data.features[0].geometry; 
        
        geometry.type = "Polygon";
        geometry.coordinates = [geometry.coordinates]; //Polygon format requires one more level of nesting than LineString format
    };

    function endDrawing() {
        leafletData.getMap().then(function(map) {
            map.dragging.enable();
            map.touchZoom.enable();
            map.doubleClickZoom.enable();
        });
        $scope.currentlyDrawingBoundary = false;
    }

    function resetGeojson() {
        var geometry = $scope.geojson.data.features[0].geometry; 
        geometry.type = "LineString";
        geometry.coordinates = [];
    }

}]);
