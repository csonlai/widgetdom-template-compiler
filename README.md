# widgetdom-template-compiler
小程序widget模版预编译器，把wxml模版预编译成可执行的widgetDom模版函数。


# 安装
```
   npm install -g widgetdom-template-compiler
```

# 使用
```
   cd ./workplace && wdcompile
```

把工作目录的.wxml后缀模版文件编译成template.compile.js,然后可以在widgetDom项目中引用该js中的函数作为widgetDom的render函数