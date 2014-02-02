var express     = require('express');
var http        = require('http');

var app = express();
app.listen(1337);
console.log('Listening on port 1337');

app.use(express.logger());
app.use(express.static(__dirname + '/assets'));
app.use(express.bodyParser());
app.use(express.basicAuth('admin', 'pass'));

app.set('views', __dirname + '/');
app.engine('html', require('ejs').renderFile);

app.get('/', function(req, res){
	res.render('index.html');
});
