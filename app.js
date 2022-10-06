require('dotenv').config()

const Parse = require('parse');
const express = require('express')
var app = express()

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/public/index.html')
}) 

app.use('/public', express.static(__dirname+'/public'))

app.listen(process.env.SERVER_PORT)
console.log('Server listening on port ' + process.env.SERVER_PORT)
