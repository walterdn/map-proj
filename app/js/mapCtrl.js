var app = angular.module("MapApp", [
    "leaflet-directive"
]);

app.controller('MapCtrl', ['$scope', 'leafletData', function($scope, leafletData) {
    var defaultMapSettings = {
        seattle: {
            lat: 47.61,
            lng: -122.33,
            zoom: 14
        },
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
            scrollWheelZoom: false,
            dragging: false
        }
    };

    angular.extend($scope, defaultMapSettings);

    $scope.logs = [];

    $scope.currentlyDrawingBoundary = false;

    var counter = 0;

    var MAP_HEIGHT = 450;
    var MAP_WIDTH = 800;

    $scope.markers = new Array();
    $scope.$on("leafletDirectiveMap.map.click", function(event, args){
        var leafEvent = args.leafletEvent;
        $scope.markers.push({
            lat: leafEvent.latlng.lat,
            lng: leafEvent.latlng.lng,
            draggable: true
        });
    });


    var mapElement = document.getElementById('map');
    
    mapElement.addEventListener('touchstart', function(e) {
        $scope.logs.unshift('touch start detected');
        $scope.$apply();
    }); 

    mapElement.addEventListener('touchend', function(e) {
        $scope.logs.unshift('touch end detected');
        $scope.$apply();
    });


    mapElement.addEventListener('touchmove', function(e) {
        // console.log(e);

        var x = Math.floor(Number(e.touches[0].clientX));
        var y = Math.floor(Number(e.touches[0].clientY));

        var coordinates = convertX(x) + ', ' + convertY(y);

        if (x < 0 || x > MAP_WIDTH || y < 0 || y > MAP_HEIGHT) return;


        var coordinatePair = [convertX(x), convertY(y)];

        $scope.geojson.data.features[0].geometry.coordinates.push(coordinatePair);


        $scope.logs.unshift(coordinates);
        $scope.$apply();

        e.preventDefault();
    });



    function convertX(x) {

        var startingLng = -122.3643;

        var ratio = Number(x/MAP_WIDTH);

        var multiplier = 0.06843;

        var longitude = Number(ratio * multiplier);

        var finalLongitude = startingLng + longitude;

        return finalLongitude;
    }


    function convertY(y) {
        var startingLat = 47.62294;

        var ratio = Number(y/MAP_HEIGHT);

        var multiplier = 0.02584;

        var latitude = Number(ratio * multiplier);

        var finalLat = startingLat - latitude;

        return finalLat;

        // 450 should be 47.5971

        // 0 should be 47.62294;
    }



    // $scope.$on("leafletDirectiveMap.map.mousedown", startDrawing);
    // $scope.$on("leafletDirectiveMap.map.touchmove", addBoundaryPoint);
    // $scope.$on("leafletDirectiveMap.map.mouseup", endDrawing);
    // $scope.$on("leafletDirectiveMap.map.touchstart", startDrawing);
    // $scope.$on("leafletDirectiveMap.map.touchmove", addBoundaryPoint);
    // $scope.$on("leafletDirectiveMap.map.touchend", endDrawing);

    // $scope.$on("leafletDirectiveMap.map.touchstart", logmousedown);
    // $scope.$on("leafletDirectiveMap.map.touchmove", logmousemove);
    // $scope.$on("leafletDirectiveMap.map.touchend", logmouseup);
    // $scope.$on("leafletDirectiveMap.map.click", logclick);


    // $scope.$on("leafletDirectiveMap.map.click", addBoundaryPoint);
    
    $scope.startBoundary = function() {
        startDrawing();
    };

    $scope.applyBoundary = function() { //changes the boundary line into a polygon
        endDrawing();
        
        var geometry = $scope.geojson.data.features[0].geometry; 
        geometry.type = "Polygon";
        console.log(geometry.coordinates.length);
        geometry.coordinates = [geometry.coordinates]; //Polygon format requires one more level of nesting than LineString format
    };

    function startDrawing() {
        resetGeojson();
        $scope.currentlyDrawingBoundary = true;
    }

    function endDrawing() {
        $scope.currentlyDrawingBoundary = false;
    }

    function addBoundaryPoint(event, args) {
        if (!$scope.currentlyDrawingBoundary) return;

        var leafEvent = args.leafletEvent;
        var coordinatePair = [leafEvent.latlng.lng, leafEvent.latlng.lat];

        $scope.geojson.data.features[0].geometry.coordinates.push(coordinatePair);
        $scope.$apply();
    }

    function resetGeojson() {
        var geometry = $scope.geojson.data.features[0].geometry; 
        geometry.type = "LineString";
        geometry.coordinates = [];
    }

}]);
