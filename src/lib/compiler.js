import SimpleHtmlParser from './simpleParser';

// 匹配变量
const varReg = /([a-zA-Z_\$]+[\w\$\[\]]*)(\.([a-zA-Z_\$]+[\w\$\[\]]*))*/g;
const expressionReg = /\{\{(.*?)\}\}/g;
// 匹配字符串
const strReg = /"([^"]*)"|'([^']*)'/g;

let plainStrObj = {};

// 转换属性数据为keyValue对象
const Attrs2KeyValue = (attrArr) => {
  let attrObj = {};
  for (let i = 0; i < attrArr.length; i++) {
    attrObj[attrArr[i].name] = attrArr[i].value
  }
  return attrObj;
}

export default {
  walk (node) {
    return this.compileNode(node);
  },
  getAndRemoveAttr (node, attrName, filterList) {
    let attrVal;
    if (node.attr[attrName] == null) {
      attrVal = null;
    } 
    else if (attrName === 'wx:for-item' || attrName === 'wx:for-index') {
      return node.attr[attrName];
    }
    else {
      attrVal = this.transformExpression(node, attrName, filterList);
    } 
    delete node.attr[attrName];
    return attrVal;
  },
  getRandom (type) {
    return '$$' + type + parseInt(Math.random() * 1e8);
  },
  // 是否不做替换的变量
  isFilterVar (name, filterList) {
    for (let i = 0; i < filterList.length; i++) {
      if (new RegExp('^' + filterList[i] + '(\\.(.*))*$').test(name)) {
        return true;
      }
    }
    return false;
  },
  getKeyNameByStrValue (strVal) {
    for (let i in plainStrObj) {
      if (plainStrObj[i] === strVal) {
        return i;
      }
    }
  },
  // 解析单个双引号表达式内容
  parseExpression (expression, filterList) {
    // 替换表达式内的字符串
    expression = expression.replace(strReg, (val, $1, $2) => {
      const strVal = $1 || $2;
      // 避免相同字符串重复赋值
      let randomName = this.getKeyNameByStrValue(strVal);

      if (randomName) {
        return randomName
      }

      randomName = this.getRandom('str');
      plainStrObj[randomName] = strVal;
      return randomName;
    });

    return expression.replace(varReg, (val) => {
      // 不需替代属性
      if (this.isFilterVar(val, filterList)) {
        return val;
      }
      return 'data\.' + val;
    });
  },
  transformExpression (node, name, filterList) {
    filterList = filterList || [];
    let expression = node.attr[name];
    let result;



    // 存在双括号表达式
    if (expressionReg.test(expression)) {
      let tokens = [];
      let index;
      let lastIndex = expressionReg.lastIndex = 0;
      // 找出所有双括号表达式
      while (result = expressionReg.exec(expression)) {
        index = result.index;
        if (index > lastIndex) {
          tokens.push(JSON.stringify(expression.slice(lastIndex, index)));
        }
        tokens.push('(' + this.parseExpression(result[1].trim(), filterList) + ')');
        lastIndex = index + result[0].length;
      }

      if (lastIndex < expression.length) {
        tokens.push('(' + JSON.stringify(expression.slice(lastIndex)) + ')');
      }

      return tokens.join('+');
    }
    // 加双引号
    return JSON.stringify(expression);
  },
  removeChild (child) {
    const parent = child.parentNode;
    for (let i = 0; i < parent.children.length; i++) {
      if (parent.children[i] === child) {
        parent.children.splice(i, 1);
        return;
      }
    }
  },
  compileNode (node, filterList) {
    if (!node) {
      return 'null';
    }
    // 标识已编译过，避免被重复编译
    // node.hasCompile = true;
    const hasIfVal = this.hasAttr(node, 'wx:if');
    const hasElifVal = this.hasAttr(node, 'wx:elif');
    const hasElseVal = this.hasAttr(node, 'wx:else');
    const hasForVal = this.hasAttr(node, 'wx:for');
    // 处理for
    if (hasForVal) {
      const forVal = this.getAndRemoveAttr(node, 'wx:for', filterList);
      if (forVal) {
        const forItemVal = this.getAndRemoveAttr(node, 'wx:for-item', filterList) || 'item';
        const forIndexVal = this.getAndRemoveAttr(node, 'wx:for-index', filterList) || 'index';
        return '...(' + forVal + ' || []).map((' + forItemVal + ',' + forIndexVal + ') => {'
          + 'return ' + this.compileNode(node, [forItemVal, forIndexVal])
        + '})'
      }

    }
    // 处理if
    else if (hasIfVal) {
      const ifVal = this.getAndRemoveAttr(node, 'wx:if', filterList);
      const nextHasElif = this.hasAttr(node.nextSibling, 'wx:elif', filterList);
      if (nextHasElif) {
        return '((' + ifVal + ') ? ' + this.compileNode(node, filterList) + ':' + this.compileNode(node.nextSibling, filterList) + ')';
      }
      else {
        return '((' + ifVal + ') ? ' + this.compileNode(node, filterList) + ': null)';
      }
    }
    // 处理elif
    else if (hasElifVal) {
      const elifVal = this.getAndRemoveAttr(node, 'wx:elif', filterList);
      this.removeChild(node);
      return '((' + elifVal + ') ? ' + this.compileNode(node, filterList) + ':' + this.compileNode(node.nextSibling, filterList) + ')';
    }
    // 处理else
    else if (hasElseVal) {
      const elseVal = this.getAndRemoveAttr(node, 'wx:else', filterList);
      return this.compileNode(node, filterList);
    }
    // 处理普通元素
    else {
      return 'new ' + this.upperFirstLetter(node.tagName) + '({style: {}, attr: ' + this.getAttrObject(node, filterList) + ',children:' + this.compileChildren(node, filterList) + '})';
    }
  },
  getAttrObject (node, filterList) {
    const arr = [];
    for (let name in node.attr) {
      if (node.attr[name]) {
        arr.push('"' + name + '":' + this.transformExpression(node, name, filterList));
      }
    }
    return '{' + arr.join(',') + '}';
  },
  hasAttr (node, name) {
    if (!node) {
      return false;
    }
    return node.attr[name] != null;
  },
  compileChildren (node, filterList) {
    let child;
    const arr = [];
    while(node.children.length) {
      child = node.children.shift();
      arr.push(this.compileNode(child, filterList));
    }
    return '$filterNullChildren([' + arr.join(',') + '])';
  },
  upperFirstLetter (name) {
    return name[0].toUpperCase() + name.slice(1);
  },
  generateCode (node) {
    const sectionCode = this.walk(node);
    return this.getPlainTextCode() + ' return ' + sectionCode;   // 遍历生成代码
  },
  getPlainTextCode () {
    const codeStr = JSON.stringify(plainStrObj);
    plainStrObj = {};
    return 'Object.assign(data,' + codeStr + ');';
  },
  compileTpl (tpl) {
    let parser = new SimpleHtmlParser();
    let nodeStack = [];
    let root = {
      tagName: 'view',
      attr: {},
      children: []
    };
    parser.parse(tpl, {
      startElement(tagName, attr) {
        let lastStackNode = nodeStack[nodeStack.length - 1];
        let parentNode;
        let node;
        let expression;
        let result;
        let children;

        if (lastStackNode) {
          parentNode = lastStackNode;
        } else {
          parentNode = root;
        }

        children = parentNode.children;

        node = {
          tagName: tagName,
          style: {},
          attr: Attrs2KeyValue(attr),
          children: [],
          parentNode: parentNode
        };
        // 互相设置相邻兄弟节点
        if (children.length) {
          node.previousSbling = children[children.length - 1];
          children[children.length - 1].nextSibling = node;
        }
        children.push(node);
        nodeStack.push(node);
      },
      characters(text) {
        if (!text.trim()) {
          return;
        }
        let lastStackNode = nodeStack[nodeStack.length - 1];
        if (lastStackNode) {
          lastStackNode.attr.content = text;
        }
      },
      endElement(tagName) {
        nodeStack.pop();
      }
    });
    return this.generateCode(root);
  }
}
