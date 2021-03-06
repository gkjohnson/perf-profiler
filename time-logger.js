(exports => {

    /* Get Time Function */
    let getTime = null;

    // Browser
    if (getTime === null && typeof performance !== 'undefined' && performance.now) {

        getTime = () => performance.now();

        console.log('Using "performance.now" for timing');

    }

    // Node.js
    // https://stackoverflow.com/questions/23003252/window-performance-now-equivalent-in-nodejs
    if (getTime === null && typeof process !== 'undefined' && process.hrtime) {

        const startTime = process.hrtime();
        getTime = () => {

            const delta = process.hrtime(startTime);
            return delta[0] * 1e3 + delta[1] * 1e-6;

        };

        console.log('Using "process.hrtime" for timing');

    }

    // ArangoDB Foxx
    if (getTime === null && typeof require !== 'undefined') {

        try {

            // Using try catch in case the internal package
            // is made unavailable
            // internal.time() returns seconds since
            // epoch with microsecond timing
            const internal = require('internal');
            const getTimeNow = () => internal.time() * 1000; // ms
            const startTime = getTimeNow();
            getTime = () => getTimeNow() - startTime;

            console.log(`Using "require('internal').time" for timing`);

        } catch (e) {}
    }

    // Fallback to Date.now()
    if (getTime === null) {

        const startTime = Date.now();
        getTime = () => Date.now() - startTime;

        console.warn('Precise timing not available, falling back to millisecond precision with "Date.now()"');

    }

    /* Utilities */
    const pad = (str, width) => str.length < width ? pad(str + ' ', width) : str;

    /* Public API */
    // exposed mark fields for extra debug-ability
    exports._marks = {};
    exports._pendingMarks = {};

    // returns the time
    exports.getTime = () => getTime();

    // Begins a timing mark
    exports.begin = function(str) {

        if (str in this._pendingMarks) {

            console.warn(`TimeLogger.begin : '${ str }' is already being tracked. Call 'end' first.`);
            return;

        }

        this._pendingMarks[str] = this.getTime();

    };

    // Ends a timing mark
    exports.end = function(str) {

        if (!(str in this._pendingMarks)) {

            if (str in this._marks) console.warn(`TimeLogger.end : 'end' called more than once for 'begin' on '${ str }'.`);
            else console.warn(`TimeLogger.end : 'begin' not called for '${ str }'.`);
            return;

        }

        const delta = this.getTime() - this._pendingMarks[str];
        const details =
            this._marks[str] || {
                avg: 0,
                min: delta,
                max: delta,
                tally: 0,
            };

        details.tally++;
        details.avg += (delta - details.avg) / details.tally;
        details.min = Math.min(details.min, delta);
        details.max = Math.max(details.max, delta);
        this._marks[str] = details;

        delete this._pendingMarks[str];

        return delta;

    };

    // Clears out all accumulated timing
    exports.clear = function(str = null) {

        if (str != null) {

            if (str in this._marks) delete this._marks[str];
            if (str in this._pendingMarks) delete this._pendingMarks[str];

        } else {

            for (const key in this._marks) this.clear(key);
            for (const key in this._pendingMarks) this.clear(key);

        }

    };

    // Prints out all the logs for the given timing
    exports.dump = function(str = null, clear = false) {

        if (str != null) {

            if (str in this._marks) {

                const details = this._marks[str];

                console.log(
                    pad(str, 25),
                    pad(`calls: ${ details.tally }`, 10),
                    pad(`avg: ${ parseFloat(details.avg.toFixed(4)) }ms`, 20),
                    pad(`min: ${ parseFloat(details.min.toFixed(4)) }ms`, 20),
                    pad(`max: ${ parseFloat(details.max.toFixed(4)) }ms`, 20)
                );

                if (clear) this.clear(str);

            } else {

                console.warn(`TimeLogger.dump : no timing details to dump for '${ str }'`);

            }

        } else {

            for (const key in this._marks) this.dump(key, clear);

        }

    };

    // accessors for reading out timing data
    exports.getPending = function() {

        return Object.keys(this._pendingMarks);

    };

    exports.getAllTimingData = function(createCopy = true) {

        if (createCopy) {

            const res = {};
            for (var mark in this._marks) {

                res[mark] = this.getTimingData(mark, true);

            }

            return res;

        } else {

            return this._marks;

        }

    };

    exports.getTimingData = function(str, createCopy = true) {

        if (createCopy) {

            return str in this._marks ? Object.assign({}, this._marks[str]) : null;

        } else {

            return this._marks[str] || null;

        }

    };

})(typeof window !== 'undefined' ? window.TimeLogger = {} : module.exports = {});
