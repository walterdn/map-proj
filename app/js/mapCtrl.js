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

    var currentlyDrawingBoundary = false;

    angular.extend($scope, defaultMapSettings);

    // $scope.$on("leafletDirectiveMap.map.mousedown", startDrawing);
    // $scope.$on("leafletDirectiveMap.map.mousemove", drawBoundary);
    // $scope.$on("leafletDirectiveMap.map.mouseup", endDrawing);

    $scope.$on("leafletDirectiveMap.map.mousedown", addBoundaryPoint);
    

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
        currentlyDrawingBoundary = true;
    }

    function endDrawing() {
        currentlyDrawingBoundary = false;
    }

    function addBoundaryPoint(event, args) {
        if (!currentlyDrawingBoundary) return;

        var leafEvent = args.leafletEvent;
        var coordinatePair = [leafEvent.latlng.lng, leafEvent.latlng.lat];

        $scope.geojson.data.features[0].geometry.coordinates.push(coordinatePair);
    }

    function resetGeojson() {
        var geometry = $scope.geojson.data.features[0].geometry; 
        geometry.type = "LineString";
        geometry.coordinates = [];
    }

}]);
