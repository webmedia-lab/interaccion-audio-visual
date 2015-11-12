'use strict'

var  EvilExtensions = (function () {
    Number.prototype.times = function (block) { for (var i = 0; i < this; i++) { block.call(this, i) } };
    Array.prototype.each  = ([]).__proto__.forEach;
    Array.prototype.remove = function (e) {
        var i = this.indexOf(e);
        if ( i !== -1) {
            this.splice( this.indexOf(e), 1 );
        }

        return this;
    }
    
    Array.prototype.sample = function () {
        return this[ Math.floor(Math.random() * this.length) ];
    }
    // MDN polyfill
    Array.prototype.includes = function(searchElement /*, fromIndex */) {
        var O = Object(this);
        var len = parseInt(O.length) || 0;
        if (len === 0) {
            return false;
        }
        var n = parseInt(arguments[1]) || 0;
        var k;
        if (n >= 0) {
            k = n;
        } else {
            k = len + n;
            if (k < 0) {k = 0;}
        }
        var currentElement;
        while (k < len) {
            currentElement = O[k];
            if (searchElement === currentElement ||
                (searchElement !== searchElement && currentElement !== currentElement)) {
                return true;
            }
            k++;
        }
        return false;
    };

})();

function Seq (steps, bpm) {
    var steps = steps || 24,
        bpm = bpm || 400,  
        beat = 60.0 / bpm, // duración del 1 slot en segundos
        round = beat * steps * 1000, // duración de una vuelta en millisegundos
        slots = [],
        context = new AudioContext(),
        clock = new WAAClock(context, {toleranceEarly: 0.1}),
        soundingKeys = [81, 87, 69, 82, 84, 89, 85, 73, 79, 80, 65, 83, 68, 70, 71, 72, 74, 75, 76, 90, 88, 67, 86, 66, 78, 77],
        queue = [],
        lastInteraction = 0,
        deathRate = 4 * round + Math.random() * 2 * round,
        lifeRate  = 12 * round + Math.random() * 8 * round,
        rand = Math.random() * 10 * 600000;
    ;
    
    
    function slotAtTime(time){
        return Math.floor(time / beat) % steps;
    }
    
    function schedule(key, time) {
        var slot = slotAtTime(time);
        if ( ! slots[slot].includes(key) ) {
            console.log('adding key ' + key + ' on slot ' + slot);
            slots[slot].push(key);
            
            queue.push({ key: key, slot: slot, time: time })
        }
    }

    function playSlot(slot) {
        slots[slot].each( function (key) {
            //console.log('triggering ' + key);
            triggerSound(key);
        });
    }

    function clean(){
        console.log('cleaning...')
        if (queue.length > 1) {
            kill();
            setTimeout(clean, 300);
        } else {
            console.log('cleaning off')
        }
    }

    function tick() {
        var slot = slotAtTime(context.currentTime);
        playSlot( slotAtTime(context.currentTime) );
    }

    
    function kill() {
        var i = Math.floor(Math.random() * queue.length);
        var ev = queue.splice(i, 1)[0];
        console.log('------------------------------', i, ev);
        if ( ev !== undefined ) {
            slots[ev.slot].remove(ev.key);
            console.log('sound ' + ev.key + ' in slot ' +  ev.slot + ' died...');
        }
    }
    
    function death(){
        if (queue.length > 12) { (2).times(kill) }
        else { kill() }
        console.log('next death: ' + deathRate);
        setTimeout(death, deathRate);
    }

    function life() {
        var key = soundingKeys.sample();
        console.log('bringing sound alive ' + key);
        schedule(key, context.currentTime);
        console.log('next life ' + lifeRate);
        setTimeout(life, lifeRate);
    }

    function tide() {
        if (context.currentTime - lastInteraction > 10) {
            // epidemia
            deathRate = round;
            lifeRate = (8 + Math.random() * 8 ) * round;
        } else {
            deathRate = (7 + Math.random() * 5 ) * round;
            lifeRate = (9 + Math.random() * 3 ) * round;
        }

        setTimeout(tide, 1000);
    }

    function globalChange() {
        rand = Math.random() * 10 * 600000;
        console.log('globalChange, rand: ' + rand);

        if (lastInteraction > rand) {
            console.log('making global change');
            (5).times(function () {
                var next = Math.floor(Math.random() * steps);
                console.log('globalChange: ' + next);
                var soundingKey = soundingKeys.sample();
                slots[next].push(soundingKey);
                queue.push({ key: soundingKey, slot: next, time: context.currentTime })
            });
        }

        setTimeout(tide, 10000);
    }
    
    // Initialization
    
    // initialize sequencer steps
    steps.times( function(i) { slots[i] = [] });
    
    window.addEventListener('keydown', function (event) {
        lastInteraction = context.currentTime;
        
        var key = event.keyCode || event.which;
        event.preventDefault();
        if (event.ctrlKey || event.altKey) {
            return false; 
        }

        else if (key == 8) {
            console.log('cleaning on!')
            clean();
        }
        
        else if (soundingKeys.includes(key)) {
            schedule(key, context.currentTime);
            schedule(key, context.currentTime + round / 2000 );
        }
    });

    clock.start();
    clock.callbackAtTime(tick, 0)
        .repeat(beat)
        .tolerance({late: 100});


    // Set the ecosystem alive
    death();
    life();
    tide();
    globalChange();
        
    
    return {
        steps: steps,
        bmp: bpm,
        round: round,
        slots: slots,
        beat: beat,
        context: context,
        clock: clock,
        queue: queue,
    };
}
