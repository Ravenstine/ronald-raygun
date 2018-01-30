'use strict';

const https        = require('https');
const readHeader   = require('./header-reader');
const RewindBuffer = require('./rewind-buffer');

module.exports = class {
  // This class takes an external source of audio, say an MP3 stream,
  // creates a rewind buffer for it and slices/groups audio frames.
  constructor(options){
    this.options      = options;
    this.rewindBuffer = new RewindBuffer({maxFrames: options.maxFrames || 60});
    this.secondBuffer = [];
    this.frameCount   = 0;
    this.contentType  = (options.format === 'aac') ? 'audio/aac' : 'audio/mpeg';
    this.queue        = [];

    let connect = () => {
      console.log('connecting...');
      let lastTimestamp = new Date().getTime();
      let req = https.get(this.options, (res) => {
        res.on('data', (d) => {
          this.process(d)
          lastTimestamp = new Date();
        });
        res.on('end', connect);
      });
      req
        .on('error', err => setTimeout(connect, 3000)) // try again in 3 seconds
        .on('socket', function (socket) {
          socket.setTimeout(1000);  
          socket.on('timeout', function() {
            if(new Date().getTime() > (lastTimestamp + 2000)){
              req.abort();
              setTimeout(connect, 3000);
            }
          });
        });
    }
    connect();
  }

  process(data){
    // Gather up whatever audio data we receive from
    // the remote source and group them up into frames
    // of approximately 1 second in duration, and push
    // those frames into the rewind buffer.
    let i   = 0;
    let len = data.length;
    while(i<len){
      let chunk  = this.secondBuffer.slice(this.secondBuffer.length - 4, this.secondBuffer.length);
      // ☝️ We're going to grab the last 4 bytes we captured, which should
      // be enough to determine if we have a syncword for a new frame

      let header = readHeader('mp3', chunk);

      if(header.isValid){
        // If we detect the syncword, increment the frame count
        this.frameCount++;
        if (!this.mediaInfo){
          this.mediaInfo = header;
        }
      }
      if(this.mediaInfo && (this.frameCount >= this.mediaInfo.framesPerSecond)){
        // If we have apprximately a second of audio
        // then push all that audio into the rewind
        // buffer and start over.
        this.rewindBuffer.push(this.secondBuffer);
        this.secondBuffer = [];
        this.frameCount   = 0;
      }
      this.secondBuffer.push(data[i]);
      i++;
    }    
  }
  read(index, callback){
    this.rewindBuffer.read(index, callback);
  }
}

