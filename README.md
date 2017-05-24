Ronald Raygun
=============

This project currently exists as a proof of concept for allowing users to rewind the KPCC live broadcast stream.

## The Rewind Buffer

Ronald Raygun stores a large buffer of audio data in memory.  It's simply a doubly-linked list that stores encoded audio frames in groups of seconds, which allows players to support concepts like "Go back 30 seconds" or "Play the current program from its start".  Unlike podcasts, these functions are available immediately and keep the user connected to the station's live stream.

## Installation

### Prerequisites

- Node.js >= 7.0.0

### Install dependencies

`npm install`

## Use

Start the server by running `node index.js`.  This will run two HTTPS endpoints, one for the MP3 stream and one for AAC.

*MP3*: `https://localhost:3003/stream/mp3`

*AAC*: `https://localhost:3003/stream/aac`

By default, those endpoints stream the broadcast in real time.  

To rewind `n` number of seconds, say 30, provide an offset query parameter:

`https://localhost:3003/stream/mp3?offset=30`

Currently, the calculation is approximately to the second, though this is not currently accurate.  It's close enough for now.  How many encoded frames make up 1 second of audio depends on the codec being used, the bitrate, and the sample rate.

