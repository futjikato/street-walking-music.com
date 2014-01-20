var sounds = {},
    runningSound,
    trackIds = {},
    limit = 8,
    offset = 0,
    volume = 70;

var template = $('.sc-track-template').html(),
    row = $('.sc-container');

// initialize soundcloud api
SC.initialize({
    client_id: "552867ff6d8ab877d1dad436413dc4f4"
});

// load playlist detail information
SC.get("/playlists/15347027", {limit: 0}, function(data){
    // we want to load the oldest one first
    offset = data.track_count - limit;
    enableLazyLoading();
});

/**
 * Checks if an element is in the viewport
 * See http://stackoverflow.com/questions/123999/how-to-tell-if-a-dom-element-is-visible-in-the-current-viewport/7557433#7557433
 *
 * @param el
 * @returns {boolean}
 */
function isElementInViewport (el) {
    var rect = el.getBoundingClientRect();

    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
        rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
    );
}

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

var isLoading = false;
/**
 * Returns the change handler for lazy loading
 *
 * @param el
 * @returns {Function}
 */
function elementVisibilityMayChange (el) {
    return function () {
        if ( isElementInViewport(el) && !isLoading) {
            loadTracks();
        }
    }
}


/**
 * Load the next 20 tracks the street walking music playlist on soundcloud
 */
function loadTracks() {
    if(offset < -limit) {
        $('.sc-loading').hide();
        return;
    }

    isLoading = true;
    SC.get("/playlists/15347027/tracks", {limit: limit, offset: ((offset > 0) ? offset : 0)}, function(tracks){
        // show in reverse order
        tracks.reverse();
        $.each(tracks, function(i, track) {
            offset--;
            addTrack(track);
        });

        isLoading = false;
        handler();
    });
}

/**
 * Adds a track to the site.
 * The given datastructure is given by the soundcloud api
 *
 * @param track
 */
function addTrack(track) {
    // do never add duplicates ( can happen at the end of the playlist because of offset <-> limit calculation )
    if(trackIds[track.id])
        return;

    // add track id to list
    trackIds[track.id] = true;

    var newTrack = Mustache.render(template, track);
    row.append(newTrack);
    $('.js-img-init').each(function() {
        $(this).attr('src', $(this).data('url')).removeAttr('js-img-init');
    })
}

var handler = elementVisibilityMayChange($('.sc-loading').get(0));
/**
 * Enables lazy loading by binding the handler to some relevant window events.
 */
function enableLazyLoading() {
    loadTracks();
    $(window).on('DOMContentLoaded load resize scroll', handler);
}

$(function() {
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
                    trackContainer.find('.progress>.meter.sc-track-loading').css('width', percentage + "%");
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
                    trackContainer.find('.progress>.meter.sc-track-playing').css('width', percentage + "%");
                    trackContainer.find('.sc-timing-running').text(getDuration(this.position));
                },
                onload: function() {
                    trackContainer.find('.sc-timing-total').removeClass('hide').text(getDuration(this.duration));
                },
                onfinish: function() {
                    trackContainer.removeClass('playing').addClass('stopped');
                    trackContainer.find('.progress>.meter.sc-track-playing').css('width', 0 + "%");
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
                s.setVolume(volume);
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

    // todo make volume slider draggable
    $('.sc-volume-control').on('click', function(e) {
        var clickX = e.offsetX;

        // validate value
        if(clickX < 0 && clickX > $(this).innerWidth())
            return;

        // calc new volume
        var percentage = Math.ceil(100 / $(this).innerWidth() * clickX);
        volume = parseInt(percentage);

        // adjust meter length
        $(this).children().width(clickX);

        // if currently a track is running set volume
        if(runningSound && sounds[runningSound]) {
            sounds[runningSound].setVolume(volume);
        }
    });
});