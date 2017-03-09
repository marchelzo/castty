var getTimeout = (function() {
	var _setTimeout = setTimeout,
	map = {};

	setTimeout = function(callback, delay) {
		var id = _setTimeout(callback, delay);
		map[id] = [Date.now(), delay];
		return id;
	};

	return function(id) {
		var m = map[id];
		return m ? Math.max(m[1] - Date.now() + m[0], 0) : NaN;
	}
})();

var player = function(audioFile, containerElem, termEvents) {
	var Player = {};
	
	var init = function(audioFile, containerElem, termEvents) {
		Player.container = containerElem;

		Player.termContainer = $('<div id="term"></div>')
		    .appendTo(Player.container);

		Player.controls = $('<div id="controls"></div>')
		    .appendTo(Player.container);

		Player.term = new Terminal({
			cols: 80,
			rows: 24
		});
		Player.term.open(Player.termContainer[0]);

		Player.termEvents = termEvents;
		Player.eventOff = 0;
		Player.rem = 0;
		Player.timerHandle = undefined;

		Player.playTime = 0;

		Player.seekTo = function(t) {
			Player.term.clear();

			var i = 0;
			while (Player.termEvents[i].s <= t) {
				Player.term.write(Player.termEvents[i++].e);
			}

			Player.eventOff = i;

			return Player.termEvents[i].s - t;
		};

		Player.nextEvent = function() {
			Player.term.write(Player.termEvents[Player.eventOff].e);

			if (Player.termEvents[Player.eventOff + 1]) {
				Player.timerHandle = setTimeout(Player.nextEvent,
				    (Player.termEvents[Player.eventOff + 1].s -
				     Player.termEvents[Player.eventOff].s));
			}

			Player.eventOff++;
		}

		Player.updateSeeker = function() {
			var v = + Player.seeker.val();
			var n = Date.now();
			var d = n - Player.start;

			Player.seekUpdate = 1;
			Player.seeker.val(d + v).change();
			Player.seekUpdate = 0;

			Player.start = n;

			Player.seekerHandle = setTimeout(Player.updateSeeker, 100);
		}

		Player.toggle = $('<button id="playToggle" disabled>(Loading)</button>')
			.appendTo(Player.controls);

		Player.paused = 1;
		Player.toggle.click(function() {
			if (Player.startable) {
				if (Player.paused) {
					Player.paused = 0;
					Player.toggle.text("\u25b6");
					Player.start = Date.now();
					Player.audio.play();
					Player.timerHandle =
					    setTimeout(Player.nextEvent, Player.rem);
					Player.seekerHandle =
					    setTimeout(Player.updateSeeker, 100);
				} else {
					Player.audio.pause();
					if (Player.seekerHandle) {
						clearTimeout(Player.seekerHandle);
					}

					if (Player.timerHandle) {
						Player.rem =
						    getTimeout(Player.timerHandle);
						clearTimeout(Player.timerHandle);
					}
					Player.toggle.text("\u23f8");
					Player.paused = 1;
				}
			}
		});

		Player.duration = Player.termEvents[Player.termEvents.length - 1].s;
		Player.seeker = $('<input type="range" min="0" max="' +
		    Player.duration + '" step="100" value="0">').appendTo(Player.controls);

		Player.maxSeek = 0;
		Player.seeking = 0;
		Player.seekUnpause = 0;
		Player.seeker.rangeslider({
			polyfill : false,

			onSlide: function(pos, val) {
				if (Player.seekUpdate) {
					return;
				}

				if (Player.seeking == 0) {
					Player.seeking = 1;
					if (val > Player.maxSeek) {
						Player.seeker.val(val).change();
					}
					if (Player.paused == 0) {
						Player.toggle.trigger('click');
					}
				}
			},

			onSlideEnd: function(pos, val) {
				if (Player.seekUpdate) {
					return;
				}

				if (val > Player.maxSeek) {
					Player.seeker.val(val).change();
				}

				clearTimeout(Player.timerHandle);
				Player.rem = Player.seekTo(val);
				Player.audio.currentTime = val / 1000;
				Player.seeking = 0;
			}
		});

		Player.audio = new Audio(audioFile);
		$(Player.audio).on('durationchange', function(x) {
			Player.maxSeek = Player.audio.duration;
		});

		$(Player.audio).on('canplaythrough', function() {
			Player.startable = 1;
			Player.toggle.text('\u23f8');
			Player.toggle.prop('disabled', false);
		});

		return Player;
	}

	return init(audioFile, containerElem, termEvents);
}