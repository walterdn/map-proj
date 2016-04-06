var express = require('express');
var app = express();

var port = process.env.PORT || 3000;

process.env.APP_SECRET = process.env.APP_SECRET || 'hello'; 

app.use(express.static(__dirname + '/app'));

app.listen(port, function() {
  console.log('Server up at port ' + port);
});

