var url, host;

function onClick() {
  var key = OPTIONS.basic.mode + 'List',
      list = OPTIONS[key];
      
  if( list.indexOf(host) > -1 ) {
    list.remove(host);
  } else {
    list.push(host);
  }
  saveOption();

  // toggle class
  this.classList.toggle('checked');
}

function init() {
  // 获取当前激活tab的域名
  chrome.tabs.query({'active': true, 'currentWindow': true}, function(tabs) {
    url = tabs[0].url, host = getHost(url);
    if( !host ) {
      $('normal').style.display = 'none';
      $('error').textContent = '此插件仅在 http/https 协议的域名下生效。';
      return;
    }

    // 读取当前域名的配置
    readOption(function() {
      var mode = OPTIONS.basic.mode,
          list = OPTIONS[mode + 'List'];

      // 显示当前模式
      $('mode').textContent = mode == 'positive' ? '主动模式' : '被动模式';
      $('mode').href = 'chrome-extension://' + chrome.app.getDetails().id + '/options.html';

      // 根据运行模式产生按钮状态
      if( (mode == 'positive' && list.indexOf(host) == -1) || 
          (mode == 'passive' && list.indexOf(host) > -1) ) {
        $('on').classList.add('checked');
      }
    })
  });

  // 修改设置
  $('on').addEventListener('click', onClick);
}

init();