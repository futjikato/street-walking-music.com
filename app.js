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

    SC.get("/playlists/15347027/tracks", {}, function(tracks){
        $('.sc-loading').hide();
        // show in reverse order
        tracks.reverse();
        $.each(tracks, function(i, track) {
            addTrack(track);
        });
    });

    var sounds = {},
        runningSound;

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
                },
                onplay: function() {
                    if(runningSound && runningSound !== trackid) {
                        sounds[runningSound].pause();
                    }

                    trackContainer.addClass('playing').removeClass('stopped');
                    runningSound = trackid;
                },
                onpause: function() {
                    trackContainer.removeClass('playing').addClass('stopped');
                },
                whileplaying: function() {
                    var percentage = Math.ceil(100 / this.duration * this.position);
                    trackContainer.find('.progress>.meter.sc-playing').css('width', percentage + "%");
                }
            }, function(s){
                trackContainer.removeClass('initializing');

                // cache sound object
                sounds[trackid] = s;

                // start loading
                s.play();
            });
        }
    });
});