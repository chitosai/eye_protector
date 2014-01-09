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

    // 忽略的特殊class
    ignoreClass : ['highlight', 'syntax', 'code'],

    // 忽略的网站列表
    ignoreDomainList : [],
    // 强制替换的页面列表
    loopDomainList : [],
}

// 检查对象是否为空
function is_object_empty(obj) {
    for( key in obj ) 
        return false;
    return true;
}

// string.startsWith
if (!String.prototype.startsWith) {
  Object.defineProperty(String.prototype, 'startsWith', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: function (searchString, position) {
      position = position || 0;
      return this.indexOf(searchString, position) === position;
    }
  });
}

// array.remove
if( !Array.prototype.remove ) {
    Object.defineProperty(Array.prototype, 'remove', {
        value : function(key) {
            var index = this.indexOf(key);
            if( index > -1 ) this.splice(index, 1);
            return this;
        }
    });
}

var storage = chrome.storage.sync;

function readOption(callback) {
    storage.get('option', function(obj){
        if( !is_object_empty(obj) ) {
            option = $.extend(option, obj['option']);
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
    return host.split('.').join('-dot-').split(':').join('-colon-');
}