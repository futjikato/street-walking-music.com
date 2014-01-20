SC.initialize({
    client_id: "552867ff6d8ab877d1dad436413dc4f4"
});

$(function() {
    var template = $('.sc-track-template').html(),
        row = $('.sc-container');

    function addTrack(track) {
        var newTrack = Mustache.render(template, track);
        row.append(newTrack);
        $('.js-img-init').each(function() {
            $(this).attr('src', $(this).data('url')).removeAttr('js-img-init');
        })
    }

    // todo implement limit & offset to lazy load tracks ( currently only 13 in playlist so ... )
    SC.get("/playlists/15347027/tracks", {}, function(tracks){
        $('.sc-loading').hide();
        // show in reverse order
        tracks.reverse();
        $.each(tracks, function(i, track) {
            console.log(track);
            addTrack(track);
        });
    });

    /**
     * Converts a time given in milliseconds to a human readable duration string
     * e.g. 04:45
     *
     * @param milliseconds
     * @returns {string}
     */
    function getDuration(milliseconds) {
        var seconds = parseInt(milliseconds / 1000),
            minutes = Math.floor(seconds / 60);
        if(minutes<10) minutes = "0" + minutes;
        seconds = seconds % 60;
        if(seconds<10) seconds = "0" + seconds;
        return minutes + ":" + seconds;
    }

    var sounds = {},
        runningSound;

    /**
     * Handle click events on the play and pause button.
     *
     * Initializes the soundmanager2 lib though soundcloud.
     * Add all the eventlistener on the sound object
     */
    row.on('click', 'a.sc-play', function(e) {
        e.preventDefault();

        var playBtn = $(this),
            trackid = playBtn.data('trackid'),
            trackContainer = playBtn.parents('.sc-container .track');

        if(trackContainer.hasClass('initializing')) {
            return;
        }

        if(sounds[trackid]) {
            sounds[trackid].togglePause();
        } else {
            trackContainer.addClass('initializing');

            SC.stream("/tracks/" + trackid, {
                whileloading: function() {
                    var percentage = Math.ceil(100 / this.bytesTotal * this.bytesLoaded);
                    trackContainer.find('.progress>.meter.sc-loading').css('width', percentage + "%");
                    trackContainer.find('.sc-timing-total').removeClass('hide').text(getDuration(this.durationEstimate));
                },
                onplay: function() {
                    if(runningSound && runningSound !== trackid) {
                        sounds[runningSound].pause();
                    }

                    trackContainer.addClass('playing').removeClass('stopped');
                    trackContainer.find('.sc-timing-running').removeClass('hide');
                    runningSound = trackid;
                },
                onpause: function() {
                    trackContainer.removeClass('playing').addClass('stopped');
                },
                onstop: function() {
                    trackContainer.removeClass('playing').addClass('stopped');
                },
                whileplaying: function() {
                    var percentage = Math.ceil(100 / this.duration * this.position);
                    trackContainer.find('.progress>.meter.sc-playing').css('width', percentage + "%");
                    trackContainer.find('.sc-timing-running').text(getDuration(this.position));
                },
                onload: function() {
                    trackContainer.find('.sc-timing-total').removeClass('hide').text(getDuration(this.duration));
                },
                onfinish: function() {
                    trackContainer.removeClass('playing').addClass('stopped');
                    trackContainer.find('.progress>.meter.sc-playing').css('width', 0 + "%");
                    this.setPosition(0);

                    var next = trackContainer.next();
                    if(next.length > 0) {
                        next.find('a.sc-play').trigger('click');
                    }
                }
                // todo integrate track comments
            }, function(s){
                trackContainer.removeClass('initializing');

                // cache sound object
                sounds[trackid] = s;

                // start loading
                s.play();
            });
        }
    });

    /**
     * Handles clicks on the progress bars to jump to a specific position within the track.
     */
    row.on('click', '.progress-container', function(e) {
        var clickX = e.offsetX;

        // validate value
        if(clickX < 0 && clickX > $(this).innerWidth())
            return;

        // grab sound ID
        var trackID = $(this).parents('.sc-container .track').find('a.sc-play').data('trackid');
        if(!trackID)
            return;

        // grab sound object
        if(!sounds[trackID])
            return;
        var s = sounds[trackID];

        // calc position in sound
        var percentage = Math.ceil(100 / $(this).innerWidth() * clickX);
        var newPosition = parseInt(s.duration / 100 * percentage);

        s.setPosition(newPosition);
    });
});