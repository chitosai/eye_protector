// Map polyfill
if( typeof Map != 'function' ) {
  Map = function() {};
  Map.uid = 1;
  Map.prototype.data = {}
  Map.prototype.set = function(obj, value) {
    this.data[obj.uid || (obj.uid = Map.uid++)] = value;
  }
  Map.prototype.get = function(obj) {
    return obj.uid ? this.data[obj.uid] : false;
  }
}

var STYLES = new Map();

/**
 * 获取元素样式
 *
 */
Element.prototype.getStyle = function(key) {
  return window.getComputedStyle(this, null)[key];
}
// 设置元素样式，同时缓存它原有的样式
Element.prototype.setStyle = function(key, val) {
  // 获取原始样式
  var originStyle = this.getStyle(key),
	    styleCache = STYLES.get(this);

  // 带上class注明这个dom是被修改过样式的
  if( !styleCache ) {
    styleCache = {};
    this.classList.add('eye-protector-processed');
  }

  // 新增样式
  if( !styleCache[key] ) {
    styleCache[key] = originStyle;
    STYLES.set(this, styleCache);
  }

  this.style[key] = val;
}

/**
 * 获取rgba数组
 *
 */
var parseRGBA = function(str) {
  var rgba = str.match(/[\d\.]+/g);
  return [Number(rgba[0]), Number(rgba[1]), Number(rgba[2]), rgba.length == 4 ? Number(rgba[3]) : 1];
}

/**
 * 计算亮度
 *
 */
Element.prototype.calcBrightness = function(key) {
  // 读取颜色数据
  var bgcolor = this.getStyle(key);
  if( !bgcolor ) return false;

  var rgba = parseRGBA(bgcolor);
  // alpha通道为0是transparent
  if( !rgba[3] ) return false;

  // 把RGB转换为亮度
  return .2126 * rgba[0] / 255 + .7152 * rgba[1] / 255 + .072 * rgba[2] / 255;
}

/**
 * 根据预设的class列表跳过特定div，直接用IndexOf是因为这样highlight/highlight/highlighter之类的不用重复了
 * @return true dom中包含需要跳过的class
 * @return false 不包含
 * 
 */
Element.prototype.hasIgnoreClass = function() {
  var ignoreClassList = OPTIONS.ignoreClass, i = 0, len = ignoreClassList.length;

  for( ; i < len; i++ ) {
    try{
      if( this.className.indexOf(ignoreClassList[i]) > -1 ) {
        return true;
      }
    } catch(e) {
      // 当前元素没有className可能是遇到svg了，姑且不替换吧
      // 栗子：google
      return true;
    }
  }
  return false;
}

/*
 * 替换颜色
 * @return 3 设置了背景色，且背景色亮度超过阈值，替换了背景色
 * @return 2 设置了背景色，但背景色亮度没有超过阈值，没有替换背景色
 * @return 1 元素没有设置背景色
 * @return 0 此元素依照config中的设置跳过不处理
 */
Element.prototype.replaceBackgroundColor = function() {
  // case.1 是input[type=text]，用户选择「不替换输入框颜色」
  // case.2 此元素包含例外class，如highlight/code等
  if( (!OPTIONS.basic.replaceTextInput && this.nodeName == 'INPUT') || this.hasIgnoreClass() ) return 0;

  // 根据亮度判断是否需要替换
  var brightness = this.calcBrightness('background-color');
  if( brightness === false ) return 1;

  if( brightness > OPTIONS.basic.bgColorBrightnessThreshold ) {
    var self = this;
    self.setStyle('transition', 'background-color .3s ease');
    setTimeout(function() {
      self.setStyle('background-color', OPTIONS.basic.replaceBgWithColor);
    }, 0);
    return 3;
  } else {
    return 2;
  }
}

/**
 * 修改Border颜色
 *
 */
Element.prototype.replaceBorderColor = function() {
  // 四边各自计算
  var sides = ['top', 'bottom', 'left', 'right'], i = 0, len = sides.length;

  var borderWidthAttrString = 'border-%s-width',
	    borderColorAttrString = 'border-%s-color', borderColorAttr,
	    borderWidth, borderBrightness;

  for( ; i < len; i++ ) {
    // 先判断下是否有边框
    borderWidth = this.getStyle(borderWidthAttrString.replace('%s', sides[i]));
    if( !borderWidth ) continue;

    // 然后判断是否需要替换颜色
    borderColorAttr = borderColorAttrString.replace('%s', sides[i]);
    borderBrightness = this.calcBrightness(borderColorAttr);
    if( !borderBrightness ) continue;

    if( borderBrightness > OPTIONS.basic.borderColorBrightnessThreshold ) {
      this.setStyle(borderColorAttr, OPTIONS.basic.replaceBorderWithColor);
    }
  }
}

/**
 * 修改文字颜色
 *
 */
Element.prototype.replaceTextColor = function() {
  if( !OPTIONS.basic.replaceTextColor ) return false;

  // 文字亮度
  var brightness = this.calcBrightness('color'), color;
  if( !brightness ) return false;

  // 确认此元素亮度过高且没有背景图片
  var bgImage = this.getStyle('background-image');
  if( brightness > OPTIONS.basic.borderColorBrightnessThreshold &&
    (!bgImage || bgImage == 'none') ) {
    // 替换文字颜色
    this.setStyle('color', '#000');
  }

  // TODO: 有时候虽然当前元素没有背景图片，但其实文字浮动在父元素或其他元素的背景图片上，造成文字看不清
}

/**
 * 替换颜色啦啦啦
 * @param bool processOther 是否处理边框、文字等其他颜色，此参数继承
 *
 */
var skipNodes = ['HTML', 'HEAD', 'BODY', 'SCRIPT', 'BR', 'CANVAS'];
Element.prototype.replaceColor = function(processOther) {
  if( skipNodes.indexOf(this.nodeName) == -1 ) {
    // 替换背景色
    var bgColorReplacReturn = this.replaceBackgroundColor();
    // 根据是否替换了背景色决定是否要处理边框、文字颜色等
    if( bgColorReplacReturn == 3 ) {
      processOther = true;
    } else if( bgColorReplacReturn == 2 ) {
      processOther = false;
    }

    // 是否处理子元素
    if( processOther ) {
      // 替换边框色
      this.replaceBorderColor();
      // 替换文本颜色
      this.replaceTextColor();
    }
  }

  // 递归
  var children = this.childNodes, i = 0, len = children.length;
  for( ; i < len; i++ ) {
    if( children[i].nodeType == 1 ) {
      children[i].replaceColor(processOther);
    }
  }
}

/**
 * 回复页面原始样式
 * 
 */
function restoreColor() {
  var nodes = $$('.eye-protector-processed'), node, originalStyle, key,
      i = 0, len = nodes.length;
  for( ; i < len; i++ ) {
    node = nodes[i];
    originalStyle = STYLES.get(node);
    if( !originalStyle ) continue;

    for(key in originalStyle) {
      if( key == 'transition' ) {
        setTimeout(function() {
          node.style.transition = originalStyle.transition;
        }, 300);
      } else {
        node.style[key] = originalStyle[key];
      }
    }
  }
}

// 用mutationObserver代替监听DOMSubtreeModified事件，后者有性能缺陷：
// https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Mutation_events
var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        var nodes = Array.from(mutation.addedNodes);
        nodes.forEach(function(node) {
          // 文本节点内容改变也会触发mutation，而text并不是正经的node
          if( node.nodeType == 1 ) {
            node.replaceColor();
          }
        });
      });
    });
var observerConfig = {
      childList: true,
      subtree: true
    };

function init() {
  readOption(function() {
    if( (OPTIONS.basic.mode == 'positive' && OPTIONS.positiveList.indexOf(host) == -1) ||
        (OPTIONS.basic.mode == 'passive' && OPTIONS.passiveList.indexOf(host) > -1) ) {
      // always set background to <html> element
      document.querySelector('html').setStyle('backgroundColor', OPTIONS.basic.replaceBgWithColor);
      // body需要特殊处理，当body的background-color是transparent时实际上页面是白色
      // 此时也需要给body设置背景色
      var body = document.body,
          brightness = body.calcBrightness('background-color');
      if( !brightness || brightness > OPTIONS.basic.bgColorBrightnessThreshold ) {
        body.setStyle('background-color', OPTIONS.basic.replaceBgWithColor);
        body.setStyle('transition', 'background-color .3s ease');
      }
      // 遍历DOM替换成目标色
      body.replaceColor();
      // watch dom changes
      observer.observe(body, observerConfig);
    } else {
      restoreColor();
      observer.disconnect();
    }
  });
}

// 保存域名
var host = getHost(document.location.href);
// 设置改变时重新读取设置
chrome.storage.onChanged.addListener(init);
// GO
init();