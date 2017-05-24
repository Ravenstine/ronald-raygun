'use strict';

class Frame {
  constructor(samples){
    // A single frame == 1 second of audio with a 44100 sample rate
    this.prev         = null;
    this._next        = null;
    // this.samples      = samples || new Float32Array(44100);
    this.samples      = samples || [];
    this.callbacks    = [];
  }
  destroy(){
    // remove known references to this frame
    if(this.next){
      this.next.prev = null;
    }
    if(this.prev){
      this.prev.next = null;
    }
  }
  set next(frame){
    this._next = frame;
    let len = this.callbacks.length;
    if(this.next && len){
      let i = 0;
      while(i<len){
        setTimeout(() => {
          this.callbacks.pop()(this.next);  
        }, 0);
        i++;
      }
    }
  }
  get next(){
    return this._next;
  }
  get waitForNext(){
    // If nothing next has been assigned, we should
    // wait around until one is assigned.
    return new Promise((resolve, reject) => {
      if (this.next) {
        resolve(this.next);
        // setTimeout(()=>{resolve(this.next)}, 0);
      } else {
        this.callbacks.unshift(resolve);
      }
    });    
  }
}

class RewindBuffer {
  // this is just a doubly-linked list
  // nothing fancy
  constructor(options){
    options = options || {};
    this.head   = null;
    this.tail   = null;
    this.length = 0;
    this.maxFrames = options.maxFrames || 60;
  }
  push(samples){
    let prevHead = this.head;
    this.head    = new Frame(samples)
    if(prevHead){
      prevHead.next  = this.head;
      this.head.prev = prevHead;
    }
    if(!this.tail){
      this.tail = prevHead;
    }
    if (this.length >= this.maxFrames) {
      // begin shifting the tail if we exceed 60 seconds of audio
      // assuming that a frame is equivalent to a second
      this.tail.destroy();
      this.tail = this.tail.next;
    } else {
      this.length++;
    }
  }
  get(index){
    // technically, the index represents how many seconds behind
    // live you want to retrieve your current frame from.
    //
    // in theory, you will only want to use this method as a 
    // starting point from where your offset is, and then find
    // more frames through linked reference using the `next` attribute
    // on the most recent frame
    if((index >= this.length) && this.tail){
      // if the index is out of range, we'd might as
      // well return the tail since we already have it
      return this.tail;
    }
    let current = this.head;

    if(current){
      let i = 0;
      while(i<index){
        if(!current.prev){ // can't rewind any further
          break;
        }
        current = current.prev;
        i++;
      }
      return current;
    } else {
      this.head = new Frame(); // just add a blank frame so that the server can wait for a real one
      return this.head;
    }
  }

  read(index, callback){
    let reader = (frame) => {
      // returning false from your callback
      // will end the infinite read process
      if(callback(frame.samples) !== false){
        frame.waitForNext.then(reader);
      };
    }
    reader(this.get(index));
  }
}

module.exports = RewindBuffer;

