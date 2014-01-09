function onclick() {
    var self = $(this),
        key = self.attr('id'),
        value = self.data('value');

    // 反转选项
    value = value ? false : true;

    if( value ) {
        self.addClass('checked');
    } else {
        self.removeClass('checked');
    }
    self.data('value', value);

    // 根据选项类型保存
    if( self.hasClass('unique') ) {
        if( value ) {
            option[key].push(host);
        } else {
            option[key].remove(host);
        }
    } else if ( self.hasClass('global') ) {
        // 提示需要刷新生效
        $('#menu .hint').show();
        option[key] = value;
    };

    saveOption();
}

function init() {
    // 获取当前激活tab的域名
    chrome.tabs.query({'active': true, 'currentWindow': true}, function(tabs){
        url = tabs[0].url, host = getHost(url);

        if( !host ) {
            console.log('无法获取当前激活的标签页域名');
        }
    });

    // 读取设置
    readOption(function() {
        var i, item;
        for(i in option) {
            // object类的设置是域名列表，检查当前域名是否在列表中
            if( typeof option[i] == 'object' ) {
                item = option[i];
                if( item.indexOf(host) > -1 ) {
                    $('#'+i).addClass('checked').data('value', true);
                } else {
                    $('#'+i).data('value', false);
                }
            } else {
            // bool
                item = $('#'+i);
                if( item.length ) {
                    if( option[i] == true ) {
                        item.addClass('checked');
                    }
                    item.data('value', option[i]);
                }
            }
        }
    });

    $('#menu').on('click', '.item', onclick);
}

init();
// chrome.storage.sync.clear();