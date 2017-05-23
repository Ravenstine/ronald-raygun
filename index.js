'use strict';

const express      = require('express');
const fs           = require('fs');
const https        = require('https');
const wav          = require('./lib/node-wav');
const waveheader   = require("waveheader");
const RewindBuffer = require('./lib/rewind-buffer');

let rewindBuffer = new RewindBuffer({maxFrames: 300});
let app          = express();
let httpsServer  = https.createServer({
  key: fs.readFileSync('./key.pem', 'utf8'),
  cert: fs.readFileSync('./cert.pem', 'utf8'),
  passphrase: "password"
}, app);
var expressWs    = require('express-ws')(app, httpsServer);
 
app.get('/stream', function (req, res) {
  res.writeHead(200, {'Content-Type': 'audio/wav'});
  res.write(waveheader(44100 * 6000, {bitDepth: 16}), 'binary');
  let offset      = req.query.offset ? parseInt(req.query.offset) : 0;
  let isConnected = true;
  rewindBuffer.read(offset, (samples) => {
    let encoded = wav.encode([samples], {bitDepth: 16, skipHeader: true, sampleRate: 44100});
    res.write(encoded, 'binary');
    return isConnected;
  });
  let terminateRead = () => {
    console.log('client disconnected');
    isConnected = false;
  }
  req.on("close", terminateRead);
  req.on("end",   terminateRead);
});

app.get('/get-down', function(req, res){
  let file   = fs.readFileSync('./resources/none-shall-pasadena.wav');
  let audio  = wav.decode(file).channelData[0];
  let len    = audio.length;
  let i = 0;
  while (i < len) {
    rewindBuffer.push(audio.slice(i, i+44100));
    i += 44100;
  }
  res.send('its done');
});

app.ws('/record', function(ws, req) {
  let i         = 0;
  let preBuffer = new Float32Array(44100);
  ws.on('message', function(msg) {
    // receive sample buffers and concatenate
    // them into larger second-sized buffers,
    // and then push those into the rewind buffer
    let samples = new Float32Array(msg.buffer);
    let idx     = 0;
    let len     = samples.length;
    while(idx<len){
      if(!(i<44100)){
        rewindBuffer.push(Float32Array.from(preBuffer));
        i = 0;
      }
      preBuffer[i] = samples[idx];
      i++;
      idx++;
    }
  });
});


httpsServer.listen(3003);
// app.listen(3003);







