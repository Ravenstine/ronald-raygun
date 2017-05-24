'use strict';

const https        = require('https');
const RewindBuffer = require('./rewind-buffer');

module.exports = class {
  constructor(options){
    this.options      = options;
    this.rewindBuffer = new RewindBuffer({maxFrames: options.maxFrames || 60});
    this.secondBuffer = [];
    this.frameCount   = 0;
    this.events       = {};
    
    let connect = () => {
      console.log('connecting...');
      https.get(this.options, (res) => {
        res.on('data', d => this.process(d));
        res.on('end', connect);
      }).on('error', err => setTimeout(connect, 3000)); // try again in 3 seconds
    }
    connect();
  }
  process(data){
    let i   = 0;
    let len = data.length;
    while(i<len){
      let lastBytes = this.secondBuffer.slice(this.secondBuffer.length - 2, this.secondBuffer.length);
      if(lastBytes[0] === 255 && lastBytes[1] === 241){
        // If we detect the syncword, increment the frame count
        this.frameCount++;
      }
      if(this.frameCount >= 38){
        // If we have apprximately a second of audio
        // then push all that audio into the rewind
        // buffer and start over.
        this.events['frame']
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

