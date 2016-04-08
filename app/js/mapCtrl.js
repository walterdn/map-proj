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
            dragging: true
        }
    };

    $scope.logs = [];
    $scope.lastLog = '';

    $scope.currentlyDrawingBoundary = false;

    angular.extend($scope, defaultMapSettings);
    var counter = 0;

    var mapElement = document.getElementById('map');
    
    // document.body.addEventListener('touchstart', function(e){ e.preventDefault(); });
    // document.body.addEventListener('touchmove', function(e){ 
    //     // e.preventDefault(); 
    //     logmousemove();
    // });

    // document.body.addEventListener('touchstart', function(e){ 
    //     // e.preventDefault(); 
    //     logmousedown();
    // });

    // document.body.addEventListener('touchend', function(e){ 
    //     // e.preventDefault(); 
    //     logmouseup();
    // });

    // mapElement.addEventListener('click', logclick);
    mapElement.addEventListener('touchmove', function(e) {
        // logclick();

        // console.log(e);

        var x = e.touches[0].clientX;
        var y = e.touches[0].clientY;

        var coordinates = x + ', ' + y;

        $scope.logs.unshift(coordinates);

        $scope.$apply();

        e.preventDefault();
    });

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
    // $scope.$on("leafletDirectiveMap.map.touchstart", log('t start'));
    // $scope.$on("leafletDirectiveMap.map.touchmove", log('t move'));
    // $scope.$on("leafletDirectiveMap.map.touchend", log('t end'));

    function logmousedown() {
        $scope.logs.unshift('touch start - ' + counter);
        counter++;
    }   
    function logmousemove() {
        $scope.logs.unshift('touch move - ' + counter);
        counter++;
    }   

    function logmouseup() {
        $scope.logs.unshift('touch end - ' + counter);
        counter++;
    }

    function logclick() {
        $scope.logs.unshift('click - ' + counter);
        counter++;
    }

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
