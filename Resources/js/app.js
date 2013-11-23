(function($, undefined){
    var c_key = 'kqLXG7kuozbA';
    var c_secret = 'D5gP8qqozYJJ15wKYEPHQwvbXojWql5R';
    var a_key = localStorage.access_key;
    var a_secret = localStorage.access_token;

    var base_url = 'https://www.plurk.com/APP';
    var bind_scroll = false;

    var options = {
        consumerKey: c_key,
        consumerSecret: c_secret,
        accessTokenKey: a_key,
        accessTokenSecret: a_secret,
    };

    var oauth = OAuth(options);

    var mark_as_read = function(ids, callback) {
        var url = base_url + '/Timeline/markAsRead';
        oauth.request({
            method: 'POST',
            'url': url,
            data: {'ids': '[' + ids.join(',') + ']'},
            success: function(data){
                if (callback) {
                    callback();
                }
            },
            failure: function(data){ console.log("error"); console.log(data); }});
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
            var $plurk = $('#timeline').find('div[data-plurkid="' + id + '"]');
            var $reply = $plurk.find('table.post-reply');
            for (var i in data.responses) {
                var response = data.responses[i];
                var owner = data.friends[response.user_id];
                posts.push({
                    content: response.content,
                    owner_id: owner.id,
                    display_name: owner.display_name,
                    is_owner: owner.id == $plurk.attr('data-owner') ? 1 : 0
                });
            }
            $reply.empty().append($.tmpl($('#reply'), posts)).parent().parent().show();
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
    var timeline = [];
    var load_timeline = function(offset) {
        var url;
        var filter = $('#root').attr('data-filter');
        var unread = ("1" == $('#filter-only-unread').attr('data-set'));
        var user_id;
        var filters;
        if (filter && filter.match(/^#userid-/)) {
            user_id = filter.split('-')[1];
        }
        if (unread) {
            url = base_url + '/Timeline/getUnreadPlurks';
            filters = {
                '#mine': 'my',
                '#responded': 'responded',
                '#private': 'private',
                '#favorite': 'favorite'
            };
        } else if (user_id) {
            url = base_url + '/Timeline/getPublicPlurks?user_id=' + user_id;
            filters = {};
        } else {
            url = base_url + '/Timeline/getPlurks';
            filters = {
                '#mine': 'only_user',
                '#responded': 'only_responded',
                '#private': 'only_private',
                '#favorite': 'only_favorite'
            };
        }
        var params = {};
        if (filters[filter]) {
            params.filter = filters[filter];
        }
        if (offset) {
            params.offset = offset;
        } else {
            $('#timeline').empty();
        }
        $('#no-more').hide();
        oauth.request({
            method: 'GET',
            'url': url,
            data: params,
            success: function(data){
                var posts = new Array();
                var oldest;
                var filter_users = null;
                if (!offset) {
                    timeline = [];
                }
                data = JSON.parse(data.text);
                if (filter && filter.match(/^#clique-/)) {
                    filter_users = clique_members[filter.split('-')[1]];
                } else if ('#friends' == filter) {
                    filter_users = friends_hash;
                }
                for (var i in data.plurks) {
                    var plurk = data.plurks[i];
                    var owner = data.plurk_users[plurk.owner_id];
                    if (filter_users && !filter_users[owner.id + '']) {
                        continue;
                    }
                    posts.push({
                        avatar: get_avatar(owner),
                        content: plurk.content,
                        display_name: plurk.replurker_id ? data.plurk_users[plurk.replurker_id].display_name + ' 轉噗 ' + owner.display_name : owner.display_name,
                        favorite: plurk.favorite ? 1 : 0,
                        favorite_count: plurk.favorite_count,
                        is_unread: plurk.is_unread,
                        is_owner: owner.id == $('#root').attr('data-userid') ? 1 : 0,
                        is_friend: friends_hash[owner.id],
                        is_fan: !friends_hash[owner.id],
                        owner_id: owner.id,
                        plurk_id: plurk.plurk_id,
                        posted: (new Date(Date.parse(plurk.posted))).toLocaleString(),
                        private_plurk: null === plurk.limited_to ? 0 : 1,
                        response_count: plurk.response_count,
                        replurkable: plurk.replurkable,
                        replurked: plurk.replurked ? 1 : 0,
                        replurkers_count: plurk.replurkers_count
                    });
                    timeline.push(plurk.plurk_id);
                    oldest = (new Date(Date.parse(plurk.posted))).toISOString();
                }

                if (!offset) {
                    $('#timeline').empty();
                    $('#root').attr('data-latest', (new Date()).toISOString());
                }
                if (posts.length <= 0) {
                    $('#no-more').show();
                }
                $.tmpl($('#post'), posts).appendTo('#timeline');
                if (!bind_scroll) {
                    bind_scroll = true;
                    $(window).scroll(load_more_plurks);
                }
                $('#root').attr('data-offset', oldest);
            },
            failure: function(data) { console.log("error"); console.log(data); }});
    };

    var load_more_plurks = function(){
        if($(window).scrollTop() + $(window).height() > $(document).height() - 100) {
            $(window).unbind('scroll');
            bind_scroll = false;
            load_timeline($('#root').attr('data-offset'));
        }
    };

    $('#timeline').on('click', '#new-plurk-content', function(){
        load_timeline();
    }).on('click', 'div.post-content a, span.reply-text a', function(){
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
            failure: function(data){ console.log("error"); console.log(data); }
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
            failure: function(data){ console.log("error"); console.log(data); }
        });
        return false;
    }).on('click', 'a.post-btn-replurk', function(){
        var $container = $(this).parents('div.post-container').first();
        var ids = [$container.attr('data-plurkid')];
        var replurked = (1 == $container.attr('data-replurked'));
        var url;
        if (replurked) {
            url = base_url + '/Timeline/unreplurk';
        } else {
            url = base_url + '/Timeline/replurk';
        }
        oauth.request({
            method: 'POST',
            'url': url,
            data: {'ids': '[' + ids.join(',') + ']'},
            success: function(data){
                for (var i in ids) {
                    var plurk = $('#timeline').find('div[data-plurkid="' + ids[i] + '"]').attr('data-replurked', replurked ? '0' : '1');
                    plurk.find('a.post-btn-replurk').text(replurked ? '轉噗' : '收回轉噗');
                }
            },
            failure: function(data){ console.log("error"); console.log(data); }
        });
        return false;
    }).on('click', 'a.post-btn-delete', function(){
        var $container = $(this).parents('div.post-container').first();
        var id = $container.attr('data-plurkid');
        var url = base_url + '/Timeline/plurkDelete';

        oauth.request({
            method: 'POST',
            'url': url,
            data: {'plurk_id': id},
            success: function(data){
                $('#timeline').find('div[data-plurkid="' + id + '"]').fadeOut(800, function(){ $(this).remove();});
            },
            failure: function(data){ console.log("error"); console.log(data); }
        });
        return false;
    }).on('submit', 'form.reply-form', function(){
        var $container = $(this).parents('div.post-container').first();
        var $input = $(this).find('input.reply-new-text').first();
        var id = $container.attr('data-plurkid');
        url = base_url + '/Responses/responseAdd';
        $input.prop('disabled', true);
        oauth.request({
            method: 'POST',
            'url': url,
            data: {'plurk_id': id, content: $input.val(), 'qualifier': ':'},
            success: function(data){
                load_replies(id);
                $input.val('').prop('disabled', false);
            },
            failure: function(data){ console.log("error"); console.log(data); alert('回應失敗，請稍候再試'); $input.prop('disabled', false); }
        });
        return false;
    }).on('click', 'span.post-reply-hide', function(){
        $(this).parent().parent().hide();
        return false;
    });

    // mark as read
    $('#btn-markasread').click(function(){
        mark_as_read(timeline, function(){$('#btn-refresh').click()});
        return false;
    });

    // post new plurk
    $('#post-new-form').submit(function(){
        var $text = $('#post-new-text');
        var url = base_url + '/Timeline/plurkAdd';
        $text.prop('disabled', true);
        var request = {'content': $text.val(), 'qualifier': ':'};
        if ($('#post-private').prop('checked')) {
            request.limited_to = '[0]';
        }

        oauth.request({
            method: 'POST',
            'url': url,
            data: request,
            success: function(data){
                load_timeline();
                $text.val('').prop('disabled', false);
            },
            failure: function(data){ console.log("error"); console.log(data); alert('發噗失敗，請稍候再試'); $text.prop('disabled', false);}
        });
        return false;
    });

    // refresh
    $('#btn-refresh').click(function(){
        load_timeline();
        update_cliques();
        return false;
    });

    // logout
    $('#btn-logout').click(function(){
        if (confirm('確定要登出嗎？')) {
            localStorage.clear();
            setTimeout(function(){
                Ti.App.exit();
            }, 2000);
        }
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
        $.tmpl($('#panel-profile'), profile).prependTo('#post-new-panel');

        $('#root').attr('data-userid', data.id);
        $('#root').attr('data-friends-count', data.friends_count);
        update_friends();
    });

    // cliques
    var cliques = [];
    var clique_members = [];
    var update_cliques = function() {
        var url = base_url + '/Cliques/getCliques';
        cliques = [];
        clique_members = [];
        oauth.get(url, function(data){
            data = JSON.parse(data.text);
            for (var i in data) {
                cliques.push({id: i, name: data[i]});
                clique_members[i] = {};
                oauth.request({
                    'url': base_url + '/Cliques/getClique',
                    'method': 'GET',
                    'data': {'clique_name': data[i]},
                    'async': false,
                    'success': function(data){
                        data = JSON.parse(data.text);
                        for (var j in data) {
                            clique_members[i][data[j].id + ''] = true;
                        }
                    }, failure: function(data){ console.log('error'); console.log(data); }});
            }
            $('li.clique-item').remove();
            $.tmpl($('#filter-clique'), cliques).appendTo('#filter-ul');
        });
    };

    // friends
    var friends = [];
    var friends_hash = {};
    var update_friends = function() {
        var url = base_url + '/FriendsFans/getFriendsByOffset';
        var offset = 0;
        var done = false;
        friends = [];
        friends_hash = {};
        while (!done) {
            oauth.request({
                'url': url,
                'method': 'GET',
                'data': {'user_id': $('#root').attr('data-userid'), 'offset': offset + '', 'limit': '100'},
                'async': false,
                'success': function(data){
                    data = JSON.parse(data.text);
                    friends = friends.concat(data);
                    if (offset > $('#root').attr('data-friends-count')) {
                        done = true;
                    }
                    offset += 100;
            }, failure: function(data){ console.log('error'); console.log(data); done = true;}});
        }

        for (var i in friends) {
            friends_hash[friends[i].id + ''] = true;
        }
    };

    Ti.UI.getCurrentWindow().setSize(800, 600);

    if (!(a_key && a_secret)) {
        alert("請先登入噗浪。");
        var request_params;
        oauth.request({
            method: 'GET',
            url: 'https://www.plurk.com/OAuth/request_token',
            async: false,
            success: function(data) {
                request_params = oauth.parseTokenRequest(data, data.responseHeaders['Content-Type'] || undefined);
                var url = 'https://www.plurk.com/OAuth/authorize?' + data.text;
                Ti.Platform.openURL(url);
            }
        });
        var code = prompt("Code");
        request_params.oauth_verifier = code;
        oauth.setAccessToken([request_params.oauth_token, request_params.oauth_token_secret]);
        oauth.setVerifier(code);
        oauth.request({
            url: 'https://www.plurk.com/OAuth/access_token',
            method: 'POST',
            async: false,
            success: function(data) {
                var token = oauth.parseTokenRequest(data, data.responseHeaders['Content-Type'] || undefined);
                oauth.setAccessToken([token.oauth_token, token.oauth_token_secret]);
                oauth.setVerifier('');
                localStorage.access_key = token.oauth_token;
                localStorage.access_token = token.oauth_token_secret
            }, failure: function(data) { console.log('error'); console.log(data.text); }
        });
    }

    var polling = function(){
        oauth.request({
            url: base_url + '/Polling/getPlurks',
            method: 'GET',
            data: {offset: $('#root').attr('data-latest')},
            success: function(data){
                data = JSON.parse(data.text);
                if (data.plurks.length > 0) {
                    $('#new-plurk-content').remove();
                    $.tmpl($('#new-plurk'), {'all': data.plurks.length}).prependTo('#timeline');
                }
            },
            failure: function(data){ console.log("error"); console.log(data); }
        });

        oauth.get(
            base_url + '/Polling/getUnreadCount',
            function(data){
                data = JSON.parse(data.text);
                $('#all-unread').text('(' + data.all + ')');
                $('#mime-unread').text('(' + data.my + ')');
                $('#private-unread').text('(' + data['private'] + ')');
                $('#responded-unread').text('(' + data.responded + ')');
                $('#favorite-unread').text('(' + data.favorite + ')');
            },
            function(data){ console.log("error"); console.log(data); }
        );
    };

    update_cliques();
    load_timeline();

    // check new plurk
    setInterval(polling, 2 * 60 * 1000);
    setTimeout(polling, 5000);

    // on hash change
    window.onhashchange = function()
    {
        $('#root').attr('data-filter', location.hash);
        $('a.filter').find('span.glyphicon-ok').addClass('hidden');
        $('a.filter[href="' + location.hash + '"]').find('span.glyphicon-ok').removeClass('hidden');
        load_timeline();
    };

    $('#filter-only-unread').click(function(){
        $(this).attr('data-set', "1" == $(this).attr('data-set') ? 0 : 1).find('span').toggleClass('hidden');
        load_timeline();
        return false;
    });

})(jQuery);
