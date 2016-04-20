var checkIfMarkerEnclosedByPolygons = (function() {
    var compareLongitudes = function(value, arr) {
        // NOTE: This method mutates arr by reference! Use with caution.
        // Find where a value would sit in an array if we added it to the array and then sorted it
        arr.push(value);
        var sortedArr = arr.sort();
        var index;
        
        for (var i = 0; i < sortedArr.length; i++) {
            if (sortedArr[i] === value) index = i;
        }
        
        return index;
    };

    var findLatIntersections = function(polygon, latitude) { 
        // as we iterate along the edges of one polygon, find all edges that cross the latitude of our marker

        var curLatStatus; // will either be -1 or 1
        // -1 means latitude of current point in shape is less than the latitude of marker in question
        // 1 means greater than 

        if ((polygon[0][1]) < latitude) curLatStatus = -1; 
        else curLatStatus = 1;

        var latIntersections = new Array();
        var prevLatStatus = curLatStatus;

        for (var i = 0; i < polygon.length; i++) {
            prevLatStatus = curLatStatus;
            var curLat = polygon[i][1];
            if (curLat < latitude) {
                curLatStatus = -1;
            } else {
                curLatStatus = 1;
            }
            //if latitude of marker crossed, add index of point before latitude crossed and index of point after
            if (curLatStatus !== prevLatStatus) {
                latIntersections.push([i-1, i]);
            }
        }

        return latIntersections;
    };

    var findLongAtLatInt = function(pointA, pointB, latitude) {
        // need to find the exact longitude where the line between two points meets a latitude line
        var longitude; 

        var rise = pointB[1] - pointA[1];
        var run = pointB[0] - pointA[0];
        
        // make sure we don't calculate slope as undefined
        if (run === 0) { 
            longitude = pointA[0];
            return longitude; 
        }

        var slope = rise / run;
        var constant = pointA[1];
        
        var longDiff = (latitude - constant) / slope;
        var longitude = pointA[0] + longDiff;

        return longitude;
    };

    return function(polygons, marker) {
    // To find if a marker is enclosed in a polygon, we will use the following steps:
    
    // 1 - find all edges of the polygon which intersect the latitude line of the marker
    // 2 - find the exact points on the edges which have the same latitude as our marker (we will call these points lat intersections)
    // 3 - compare longitudes at lat intersections to longitude of the marker
    // 4 - if the number of intersections coming before our point is odd, then our point is inside the shape. if even, then point is outside.
    
    // More details about this algorithm here:   https://en.wikipedia.org/wiki/Point_in_polygon

        var longitude = marker.lng;
        var latitude = marker.lat;

        // loop through polygons, checking one at a time
        for (var i = 0; i < polygons.length; i++) {
            var polygon = polygons[i]; 
            
            if (polygon.length < 1) continue; // skip iteration if polygon is empty 

            // step 1
            var latIntersections = findLatIntersections(polygon, latitude);
            
            //step 2
            var longAtLatIntArr = new Array();

            latIntersections.forEach(function(latInt) {
                var pointBefore = polygon[latInt[0]]; 
                var pointAfter = polygon[latInt[1]];
                
                var longAtLatInt = findLongAtLatInt(pointBefore, pointAfter, latitude); 
                longAtLatIntArr.push(longAtLatInt); 
            });

            // step 3
            var index = compareLongitudes(longitude, longAtLatIntArr); 

            // step 4
            var isMarkerInsideShape = index % 2; // will be 0 or 1. 1 means inside, 0 means outside

            if (isMarkerInsideShape) return true; //marker is inside polygon of current loop iteration
        }

        return false; //marker is outside of all polygons
    };
})();