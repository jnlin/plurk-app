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

    var url = base_url + '/Timeline/getPlurks';
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

    $('#timeline').on('click', 'div.post-content, a.post-btn-reply', function(){
        var $container = $(this).parents('div.post-container').first();
        var id = $container.attr('data-plurkid');
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
            var $reply = $container.find('table.post-reply');
            $reply.empty().append($.tmpl($('#reply'), posts)).show();
            mark_as_read([id]);
        }, 
            failure: function(data) { console.log("error"); console.log(data); }});
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

    });

    oauth.get(url, function(data) {
            var posts = new Array();
            data = JSON.parse(data.text);
            for (var i in data.plurks) {
                var plurk = data.plurks[i];
                var owner = data.plurk_users[plurk.owner_id];
                posts.push({
                    avatar: owner.has_profile_image ? ('http://avatars.plurk.com/' + plurk.owner_id + '-medium' +
                                (0 == owner.avatar ? '' : owner.avatar) + '.gif') : 'http://www.plurk.com/static/default_medium.gif',
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
            }

            $.tmpl($('#post'), posts).appendTo('#timeline');
            },
    function(data) { console.log("error"); console.log(data); });
})(jQuery);
