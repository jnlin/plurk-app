/*jslint browser: true, indent: 2 */
var Delayed = (function (delay) {

  /*! Andrea Giammarchi - Mit Style License */
  // https://gist.github.com/WebReflection/7286687

  'use strict';

  // method shared across all delayed wrappers
  function clear() {
    /*jshint validthis: true */
    // Infinity is the "never executed" state
    // if fn.clear() is invoke before the execution
    // then there is nothing to clear
    // same is for already executed state
    if (this.waiting !== Infinity || this.waiting !== 0) {
      clearTimeout(this.waiting);
    }
    // if it was waiting, better mark as non waiting anymore
    // somebody cleared this delayed state so it's reflected
    this.waiting = 0;
  }

  // method recycled per each setTimeout call
  // no need to create extra closures
  function invoke(delayed, callback, context, args) {
    // mark as consumed already, not waiting anymore
    delayed.waiting = 0;
    // finally invoke the callback
    callback.apply(context, args);
  }

  // the delayed wrapper exported function
  // accepts a callback and optional delay in millisecons
  function Delayed(callback, delay) {
    // the returned wrapper
    function delayed() {
      /*jshint validthis: true */
      // ensure the right clear method
      clear.call(delayed);
      // re-set the timeout (will be again in waiting state)
      delayed.waiting = setTimeout(
        invoke,   // the recycled function
        delay,    // the specific delay to wait for
        delayed,  // the wrapper to clean up
        callback, // the original callback
        this,     // the current context
        arguments // current list of arguments
      );
    }
    // if not specified or 0, the default is used instead
    if (!delay) {
      delay = Delayed.delay;
    }
    // exposing a method to stop the execution while waiting
    delayed.clear = clear;
    // until it's executed first time, the state is waiting
    delayed.waiting = Infinity;
    // state will be falsy once cleared or executed
    return delayed;
  }

  // the default delay per each wrapper, if not specified
  Delayed.delay = delay;

  // the exported utility
  return Delayed;

}(500));

