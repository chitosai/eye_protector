var option = {
    // 背景色
    replaceBgWithColor : '#C1E6C6',
    // 替换背景色的亮度阈值
    bgColorBrightnessThreshold : .9,
    // 边框色
    replaceBorderWithColor : 'rgba(0, 0, 0, .35)',
    // 替换边框色的亮度阈值
    borderColorBrightnessThreshold : .5,
    // 是否替换边框样式
    replaceBorderStyle : false,

    // 是否替换文字颜色
    replaceTextColor : true,
    // 是否替换文本输入框背景色
    replaceTextInput : false,
}

// 检查对象是否为空
function is_object_empty(obj) {
    for( key in obj ) 
        return false;
    return true;
}

var storage = chrome.storage.sync;

function readOption(callback) {
    storage.get('option', function(obj){
        if( !is_object_empty(obj) ) {
            option = obj['option'];
        }
        if( callback && typeof callback == 'function' ) callback();
    });
}

function saveOption() {
    var obj = {'option': option};
    storage.set(obj);
}

// 获取当前激活标签页域名
function getHost(url) {
    var host = /https?:\/\/([^/]+)\/.*/.exec(url)[1];
    if( host.length < 2 ) return false;

    // 去掉.
    return host.split('.').join('-dot-');
}