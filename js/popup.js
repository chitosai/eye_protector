
function onclick() {
    var self = $(this),
        id = self.attr('id'),
        value = self.data('value');

    // 反转选项
    value = value ? false : true;

    if( value ) {
        self.addClass('checked');
    } else {
        self.removeClass('checked');
    }
    self.data('value', value);

    // 保存
    option[id] = value;
    saveOption();
}

function init() {
    // 获取当前激活tab的域名
    chrome.tabs.query({'active': true}, function(tabs){
        var url = tabs[0].url,
            host = getHost(url);

        if( host ) $('#skipThisSite').attr('id', 'skip-' + host);
    });

    // 读取设置
    readOption(function() {
        var i, item;
        for(i in option){
            item = $('#'+i);
            if( item.length ) {
                if( option[i] == true ) {
                    item.addClass('checked');
                }
                item.data(i, option[i]);
            }
        }
    });

    $('#menu').on('click', '.item', onclick);
}

init();
// chrome.storage.sync.clear();