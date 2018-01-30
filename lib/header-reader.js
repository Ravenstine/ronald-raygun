'use strict';

const MP3Header    = require('mp3-header').Mp3Header;

module.exports = (encoding, chunk) => {
  let header;
  if (encoding === 'mp3'){
    try {
      // sadly, passing in bytes from the stream this way
      // can cause it to fail to find a table value
      header = new MP3Header(Buffer.from(chunk));
    } catch(err) {
      header = {};
    }
    if(header.is_valid){
      return {
        isValid: header.is_valid,
        bitRate: header.mpeg_bitrate,
        channels: header.mpeg_channels,
        sampleRate: header.mpeg_samplerate,
        numSamples: header.mpeg_num_samples,
        framesPerSecond: 1000 / ((1000/header.mpeg_samplerate) * header.mpeg_num_samples) 
        // ☝️ determine how many MP3 frames we need to make up approximately 1 second of audio
      };
    }
  } else if (encoding === 'aac') {
    let lastBytes = chunk.slice(chunk.length - 2, chunk.length);
    if(lastBytes[0] === 255 && lastBytes[1] === 241){
      return {
        isValid: true,
        bitRate: 48000,
        channels: 1,
        sampleRate: 44100,
        numSamples: null,
        framesPerSecond: 1024 / ((1024/44100) * 1024) 
      };
    }
  }
  return {};
};