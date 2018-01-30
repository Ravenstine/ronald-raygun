'use strict';

const express      = require('express');
const fs           = require('fs');
const https        = require('https');
const YAML         = require('js-yaml');
const Source       = require('./lib/source');

let config       = YAML.safeLoad(fs.readFileSync('config.yml', 'utf-8'));

let app          = express();
let httpsServer  = https.createServer({
  key: fs.readFileSync('./key.pem', 'utf8'),
  cert: fs.readFileSync('./cert.pem', 'utf8'),
  passphrase: "password"
}, app);

let sources = {};

Object.keys(config.streams).forEach((key) => {
  sources[key] = new Source(config.streams[key]);
});

app.get('/stream/hls', function(req, res){

});

app.get('/stream/:type', function (req, res) {
  let source = sources[req.params.type];
  res.writeHead(200, {'Content-Type': source.contentType});
  let offset      = (req.query.offset    ? parseInt(req.query.offset) : 0) + 8;
  let iteration   = (req.query.iteration ? (parseInt(req.query.iteration) + 8) : undefined);
  // ☝️ Because MP3 frames depend on previous frames, it seems like
  // we need about 8 seconds worth of frames for the stream to start playing
  // immediately when a zero offset is provided.  In essence, there's always
  // going to be an 8 second delay for the tradeoff of not having to wait.
  let limit       = req.query.limit ? parseInt(req.query.limit) : 0;
  let frameCount  = 0; 
  let isConnected = true;
  // Let's say we want to return a URL where a
  // segment of audio can always be found as long
  // as it exists inside our rewind buffer?  In that
  // case, we're going to need to calculate the index
  // of the frame we want to start with based on a 
  // given iteration number, which corresponds with an
  // iteration of the rewind buffer.
  if(iteration){
    offset = source.rewindBuffer.iterations - iteration;  
  }
  source.read(offset, (samples) => {
    if (limit && frameCount >= limit){
      isConnected = false; // force disconnect if we are beyond a provided limit of seconds
    }
    frameCount++;
    res.write(Buffer.from(samples), 'binary');
    return isConnected;
  });
  let terminateRead = () => {
    console.log('client disconnected');
    isConnected = false;
  }
  // Stop the read process from continuing
  // if the client disconnects
  req.on("close", terminateRead);
  req.on("end",   terminateRead);
});



httpsServer.listen(3003);

