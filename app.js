SC.initialize({
    client_id: "552867ff6d8ab877d1dad436413dc4f4"
});

$(function() {
    var template = $('.sc-track-template').html(),
        row = $('.sc-container');

    function addTrack(track) {
        var newTrack = Mustache.render(template, track);
        row.append(newTrack);
    }

    SC.get("/playlists/15347027/tracks", {limit : 20}, function(tracks){
        $('.sc-loading').hide();
        $.each(tracks, function(i, track) {
            console.dir(track);
            addTrack(track);
        });
    });

    var sounds = {},
        runningSound;

    row.on('click', 'a.sc-play', function(e) {
        e.preventDefault();

        var playBtn = $(this),
            trackid = playBtn.data('trackid'),
            trackContainer = playBtn.parents('.track.row');

        if(trackContainer.hasClass('initializing')) {
            console.log('buffering');
            return;
        }

        if(sounds[trackid]) {
            sounds[trackid].togglePause();
        } else {
            trackContainer.addClass('initializing');

            SC.stream("/tracks/" + trackid, {
                whileloading: function() {
                    var percentage = parseInt(100 / this.bytesTotal * this.bytesLoaded);
                    trackContainer.find('.progress>.meter').css('width', percentage + "%");

                    if(percentage === 100) {
                        trackContainer.removeClass('loading');

                        if(runningSound !== trackid) {
                            sounds[runningSound].pause();
                        }
                        this.play();
                    }
                },
                onplay: function() {
                    playBtn.text('Pause');
                    trackContainer.addClass('playing');
                    runningSound = trackid;
                },
                onpause: function() {
                    playBtn.text('Play');
                    trackContainer.removeClass('playing');
                },
                whileplaying: function() {
                    console.log(this.position);
                }
            }, function(s){
                trackContainer.removeClass('initializing');
                trackContainer.addClass('loading');

                // cache sound object
                sounds[trackid] = s;

                // start loading
                s.load();
            });
        }
    });
});