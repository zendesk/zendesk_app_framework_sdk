var noop = function() {};

function Observable() {}

Observable.create = function(subscribe) {
  var o = new Observable();

  o.subscribe = function(onNext, onError, onCompleted) {
    var terminated = false;
    var observer;
    var disposable;

    var onTerminate = function (fn) {
      if (terminated) return;
      terminated = true;
      fn.apply(null, arguments);
    };

    if (typeof onNext === 'function') {
      observer = {
        onNext: onNext,
        onError: onError || noop,
        onCompleted: onCompleted || noop
      };
    } else {
      observer = onNext;
    }

    observer.onError = onTerminate.bind(null, observer.onError);
    observer.onCompleted = onTerminate.bind(null, observer.onCompleted);

    disposable = subscribe(observer);

    if (typeof disposable === 'function') {
      return {
        dispose: disposable
      };
    } else {
      return disposable;
    }
  };

  return o;
};

module.exports = Observable;
