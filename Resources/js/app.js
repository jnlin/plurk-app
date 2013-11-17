(function($, undefined){
    var c_key = '';
    var c_secret = '';
    var a_key = '';
    var a_secret = '';

    var base_url = 'https://www.plurk.com/APP';
    var options = {
        consumerKey: c_key,
        consumerSecret: c_secret,
        accessTokenKey: a_key,
        accessTokenSecret: a_secret,
    };

    console.log(localStorage.test);

    localStorage.test = "Hello";
    console.log(localStorage.test);

    var oauth = OAuth(options);

    var mark_as_read = function(ids) {
        var url = base_url + '/Timeline/markAsRead';
        oauth.request({
            method: 'POST',
            'url': url,
            data: {'ids': '[' + ids.join(',') + ']'},
            success: function(data){
                for (var i in ids) {
                    $('#timeline').find('div[data-plurkid="' + ids[i] + '"]').removeClass('panel-warning').addClass('panel-default');
                }
            },
            failure: function(data){ onsole.log("error"); console.log(data); }});
    };

    var load_replies = function(id){
        var url = base_url + '/Responses/get';
        oauth.request({
            method: 'GET',
            'url': url,
            data: {'plurk_id': id},
            success: function(data) {
            var posts = new Array();
            data = JSON.parse(data.text);
            for (var i in data.responses) {
                var response = data.responses[i];
                var owner = data.friends[response.user_id];
                posts.push({
                    display_name: owner.display_name,
                    content: response.content
                });
            }
            var $reply = $('#timeline').find('div[data-plurkid="' + id + '"] table.post-reply');
            $reply.empty().append($.tmpl($('#reply'), posts)).show();
            mark_as_read([id]);
        },
            failure: function(data) { console.log("error"); console.log(data); }});
    };

    var get_avatar = function(user, size) {
        if (!size) {
            size = 'medium';
        }
        return user.has_profile_image ? ('http://avatars.plurk.com/' + user.id + '-' + size +
                (!user.avatar ? '' : user.avatar) + '.gif') : 'http://www.plurk.com/static/default_medium.gif';
    };

    // timeline
    var load_timeline = function(offset) {
        var url = base_url + '/Timeline/getPlurks';
        oauth.request({
            method: 'GET',
            'url': url,
            data: offset ? {'offset': offset} : {},
            success: function(data){
                var posts = new Array();
                var oldest;
                data = JSON.parse(data.text);
                for (var i in data.plurks) {
                    var plurk = data.plurks[i];
                    var owner = data.plurk_users[plurk.owner_id];
                    posts.push({
                        avatar: get_avatar(owner),
                        content: plurk.content,
                        display_name: owner.display_name,
                        favorite: plurk.favorite ? 1 : 0,
                        favorite_count: plurk.favorite_count,
                        is_unread: plurk.is_unread,
                        plurk_id: plurk.plurk_id,
                        posted: (new Date(Date.parse(plurk.posted))).toLocaleString(),
                        private_plurk: null === plurk.limited_to ? 0 : 1,
                        response_count: plurk.response_count,
                        replurkers_count: plurk.replurkers_count,
                        replurkable: plurk.replurkable
                    });
                    oldest = (new Date(Date.parse(plurk.posted))).toISOString();
                }

                if (!offset) {
                    $('#timeline').empty();
                }
                $.tmpl($('#post'), posts).appendTo('#timeline');
                $(window).scroll(load_more_plurks);
                $('#root').attr('data-offset', oldest);
            },
            failure: function(data) { console.log("error"); console.log(data); }});
    };

    var load_more_plurks = function(){
        if($(window).scrollTop() + $(window).height() > $(document).height() - 100) {
            $(window).unbind('scroll');
            load_timeline($('#root').attr('data-offset'));
        }
    };

    $('#timeline').on('click', 'div.post-content a, div.reply-text a', function(){
        // open url in default browser
        Ti.Platform.openURL($(this).attr('href'));
        return false;
    }).on('click', 'div.post-content, a.post-btn-reply', function(){
        var $container = $(this).parents('div.post-container').first();
        var id = $container.attr('data-plurkid');
        load_replies(id);
        return false;
    }).on('click', 'a.post-btn-mute', function(){
        var $container = $(this).parents('div.post-container').first();
        var ids = [$container.attr('data-plurkid')];
        var mute = (2 == $container.attr('data-unread'));
        var url;
        if (mute) {
            url = base_url + '/Timeline/mutePlurks';
        } else {
            url = base_url + '/Timeline/unmutePlurks';
        }
        oauth.request({
            method: 'POST',
            'url': url,
            data: {'ids': '[' + ids.join(',') + ']'},
            success: function(data){
                for (var i in ids) {
                    $('#timeline').find('div[data-plurkid="' + ids[i] + '"]').attr('data-unread', mute ? '0' : '2').
                        find('a.post-btn-mute').text(mute ? '消音' : '回音');
                }
            },
            failure: function(data){ onsole.log("error"); console.log(data); }
        });
        return false;
    }).on('click', 'a.post-btn-favorite', function(){
        var $container = $(this).parents('div.post-container').first();
        var ids = [$container.attr('data-plurkid')];
        var favorite = (1 == $container.attr('data-favorite'));
        var url;
        if (favorite) {
            url = base_url + '/Timeline/favoritePlurks';
        } else {
            url = base_url + '/Timeline/unfavoritePlurks';
        }
        oauth.request({
            method: 'POST',
            'url': url,
            data: {'ids': '[' + ids.join(',') + ']'},
            success: function(data){
                for (var i in ids) {
                    var plurk = $('#timeline').find('div[data-plurkid="' + ids[i] + '"]').attr('data-favorite', favorite ? '0' : '1');
                    plurk.find('a.post-btn-favorite').text(favorite ? '讚' : '收回讚');
                    plurk.find('span.glyphicon-heart').toggleClass('hide');
                }
            },
            failure: function(data){ onsole.log("error"); console.log(data); }
        });
        return false;
    }).on('submit', 'form.reply-form', function(){
        var $container = $(this).parents('div.post-container').first();
        var $input = $(this).find('input.reply-new-text').first();
        var id = $container.attr('data-plurkid');
        url = base_url + '/Responses/responseAdd';
        oauth.request({
            method: 'POST',
            'url': url,
            data: {'plurk_id': id, content: $input.val(), 'qualifier': ':'},
            success: function(data){
                load_replies(id);
                $input.val('');
            },
            failure: function(data){ onsole.log("error"); console.log(data); }
        });
        return false;
    });

    // post new plurk
    $('#post-new-form').submit(function(){
        var text = $('#post-new-text').val();
        var url = base_url + '/Timeline/plurkAdd';

        oauth.request({
            method: 'POST',
            'url': url,
            data: {'content': text, 'qualifier': ':', 'limited_to': '[' + $('#root').attr('data-userid') + ']'},
            success: function(data){
                load_timeline();
                $('#post-new-text').val('');
            },
            failure: function(data){ console.log("error"); console.log(data); }
        });
        return false;
    });

    // refresh
    $('#btn-refresh').click(function(){
        load_timeline();
        return false;
    });

    // menu
    var url = base_url + '/Users/me';
    oauth.get(url , function(data){
        data = JSON.parse(data.text);
        profile = {
            'avatar': get_avatar(data),
            'display_name': data.display_name,
            'karma': data.karma,
        };
        $.tmpl($('#menu'), profile).appendTo('#profile');
        $.tmpl($('#panel-profile'), profile).prependTo('#post-new-panel-head');

        $('#root').attr('data-userid', data.id);
    });

    load_timeline();
})(jQuery);
