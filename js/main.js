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

const STYLES = new Map();

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
  const originStyle = this.getStyle(key);
	let styleCache = STYLES.get(this);

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
const parseRGBA = function(str) {
  const rgba = str.match(/[\d\.]+/g);
  return [Number(rgba[0]), Number(rgba[1]), Number(rgba[2]), rgba.length == 4 ? Number(rgba[3]) : 1];
}

/**
 * 计算亮度
 *
 */
Element.prototype.calcBrightness = function(key) {
  // 读取颜色数据
  const bgcolor = this.getStyle(key);
  if( !bgcolor ) return false;

  const rgba = parseRGBA(bgcolor);
  // alpha通道为0是transparent
  if( !rgba[3] ) return false;

  // 把RGB转换为亮度
  return .2126 * rgba[0] / 255 + .7152 * rgba[1] / 255 + .072 * rgba[2] / 255;
}

/**
 * 判断是否需要处理这个节点，直接用IndexOf是因为这样highlight/highlight/highlighter之类的不用重复了
 * @return true 跳过
 * @return false 不跳过
 * 
 */
const skipNodes = ['SCRIPT', 'BR', 'CANVAS', 'IMG', 'svg'];
Element.prototype.shouldBeIgnored = function() {
  if( skipNodes.indexOf(this.nodeName) > -1 ) {
    return true;
  }
  const ignoreClassList = OPTIONS.ignoreClass, len = ignoreClassList.length;
  const _class = this.getAttribute('class');
  const _id = this.id;
  for( let i = 0; i < len; i++ ) {
    if( ( _class && _class.toLowerCase().indexOf(ignoreClassList[i]) > -1 ) || 
        ( _id && _id.toLowerCase().indexOf(ignoreClassList[i]) > -1 ) ) {
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
  // input[type=text]，用户选择「不替换输入框颜色」
  if( this.nodeName == 'INPUT' && !OPTIONS.basic.replaceTextInput ) {
    return 0;
  }

  // 根据亮度判断是否需要替换
  const brightness = this.calcBrightness('background-color');
  if( brightness === false ) return 1;

  if( brightness > OPTIONS.basic.bgColorBrightnessThreshold ) {
    this.setStyle('transition', 'background-color .3s ease');
    setTimeout(() => {
      this.setStyle('background-color', OPTIONS.basic.replaceBgWithColor);
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
  const sides = ['top', 'bottom', 'left', 'right'], len = sides.length;
  const borderWidthAttrString = 'border-%s-width',
        borderColorAttrString = 'border-%s-color';

  for( let i = 0; i < len; i++ ) {
    // 先判断下是否有边框
    let borderWidth = this.getStyle(borderWidthAttrString.replace('%s', sides[i]));
    if( !borderWidth ) continue;

    // 然后判断是否需要替换颜色
    let borderColorAttr = borderColorAttrString.replace('%s', sides[i]);
    let borderBrightness = this.calcBrightness(borderColorAttr);
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
  const brightness = this.calcBrightness('color');
  if( !brightness ) return false;

  // 确认此元素亮度过高且没有背景图片
  const bgImage = this.getStyle('background-image');
  if( brightness > OPTIONS.basic.borderColorBrightnessThreshold &&
    ( !bgImage || bgImage == 'none' ) ) {
    // 替换文字颜色
    this.setStyle('color', '#000');
  }
}

/**
 * 替换颜色啦啦啦
 * @param bool processOther 是否处理边框、文字等其他颜色，此参数继承
 *
 */
Element.prototype.replaceColor = function(processOther = false) {
  // 包含highlight/player等特征的节点应当直接跳过，其子节点也不必再遍历
  if( this.shouldBeIgnored() ) {
    return;
  }

  // 替换背景色
  const bgColorReplacReturn = this.replaceBackgroundColor();
  // 根据是否替换了背景色决定是否要处理边框、文字颜色等
  // 当返回值为2、3时说明当前节点是有背景色的，应当根据当前节点的情况修改processOther
  // 其他情况继续沿用父节点传下来的值
  if( bgColorReplacReturn == 3 ) {
    processOther = true;
  } else if( bgColorReplacReturn == 2 ) {
    processOther = false;
  }

  if( processOther ) {
    // 替换边框色
    this.replaceBorderColor();
    // 替换文本颜色
    this.replaceTextColor();
  }

  // 递归
  const children = this.childNodes, len = children.length;
  for( let i = 0; i < len; i++ ) {
    if( children[i].nodeType == 1 ) {
      children[i].replaceColor(processOther);
    }
  }
  benchmark.tick();
}

/**
 * 恢复页面原始样式
 * 
 */
function restoreColor() {
  const nodes = $$('.eye-protector-processed'), len = nodes.length;
  for( let i = 0; i < len; i++ ) {
    let node = nodes[i];
    let originalStyle = STYLES.get(node);
    if( !originalStyle ) continue;

    for( let key in originalStyle ) {
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
const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        const len = mutation.addedNodes.length;
        for( let i = 0; i < len; i++ ) {
          const node = mutation.addedNodes[i];
          // 先向上遍历一遍祖先，确认是否需要处理当前节点
          let ancestor = node, shouldIgnore = false;
          while( (ancestor = ancestor.parentNode) && ancestor.nodeName != 'BODY' ) {
            if( ancestor.shouldBeIgnored() ) {
              shouldIgnore = true;
              break;
            }
          }
          // 文本节点内容改变也会触发mutation，而text并不是正经的node
          if( !shouldIgnore && node.nodeType == 1 ) {
            node.replaceColor();
          }
        }
      });
    });
const observerConfig = {
  childList: true,
  subtree: true
};

function init() {
  readOption(function() {
    if( (OPTIONS.basic.mode == 'positive' && OPTIONS.positiveList.indexOf(host) == -1) ||
        (OPTIONS.basic.mode == 'passive' && OPTIONS.passiveList.indexOf(host) > -1) ) {
      // always set background to <html> element
      document.querySelector('html').setStyle('backgroundColor', OPTIONS.basic.replaceBgWithColor);
      // body需要特殊处理，当body的background-color为transparent时实际上页面是白色
      // 此时也需要给body设置背景色
      const body = document.body,
          brightness = body.calcBrightness('background-color');
      if( !brightness || brightness > OPTIONS.basic.bgColorBrightnessThreshold ) {
        body.setStyle('background-color', OPTIONS.basic.replaceBgWithColor);
        body.setStyle('transition', 'background-color .3s ease');
      }
      // 遍历DOM
      Array.from(body.children).forEach((node) => {
        node.replaceColor(false);
      });
      // watch dom changes
      observer.observe(body, observerConfig);
    } else {
      restoreColor();
      observer.disconnect();
    }
  });
}

// benchmark
const benchmark = new Benchmark();
// 保存域名
var host = getHost(document.location.href);
// 设置改变时重新读取设置
chrome.storage.onChanged.addListener(init);
// GO
init();