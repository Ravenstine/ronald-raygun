'use strict';

const express      = require('express');
const fs           = require('fs');
const https        = require('https');
const Mp3Source    = require('./lib/mp3-source');
const AACSource    = require('./lib/aac-source');

let app          = express();
let httpsServer  = https.createServer({
  key: fs.readFileSync('./key.pem', 'utf8'),
  cert: fs.readFileSync('./cert.pem', 'utf8'),
  passphrase: "password"
}, app);

let sources = {
  mp3: new Mp3Source({
    hostname: 'live.scpr.org',
    protocol: 'https:',
    path: '/kpcclive?ua=SCPRWEB&preskip=true',
    maxFrames: 7200
  }),
  aac: new AACSource({
    hostname: 'live.scpr.org',
    protocol: 'https:',
    path: '/aac?ua=SCPRWEB&preskip=true',
    maxFrames: 7200
  })
};

app.get('/stream/:type', function (req, res) {
  let source = sources[req.params.type];
  res.writeHead(200, {'Content-Type': source.contentType});
  let offset      = (req.query.offset ? parseInt(req.query.offset) : 0) + 8;
  // ☝️ Because MP3 frames depend on previous frames, it seems like
  // we need about 8 seconds worth of frames for the stream to start playing
  // immediately when a zero offset is provided.  In essence, there's always
  // going to be an 8 second delay for the tradeoff of not having to wait.
  let isConnected = true;
  source.read(offset, (samples) => {
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













