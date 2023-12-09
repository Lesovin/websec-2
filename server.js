let PORT = process.env.PORT || 8000;
let express = require('express');
let http = require('http');
let path = require('path');
let app = express();
let server = http.Server(app);

app.use(express.static(__dirname));
app.get('/', function(request, response) {
    response.sendFile(path.join(__dirname, 'index.html'));
});
server.listen(PORT, function() {
    console.log('Server is working: 8000');
});