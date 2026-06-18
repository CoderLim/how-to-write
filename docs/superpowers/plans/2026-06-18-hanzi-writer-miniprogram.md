# 汉字笔顺小程序 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一款微信小程序，用户输入汉字后可点击单字查看 HanziWriter 笔顺动画。

**Architecture:** 单页小程序，搜索框实时过滤汉字字符并展示为字卡，点击字卡后通过 `hanziwriter-miniprogram` 从 CDN 加载笔划数据并在 canvas 上播放动画。

**Tech Stack:** 微信小程序原生框架、hanziwriter-miniprogram、Make Me a Hanzi CDN（jsdelivr）

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `app.js` | 小程序入口（空，无全局状态） |
| `app.json` | 页面注册、窗口样式配置 |
| `app.wxss` | 全局字体、背景色 |
| `project.config.json` | 微信开发者工具项目配置 |
| `project.private.config.json` | 本地私有配置（加入 .gitignore） |
| `package.json` | npm 依赖声明 |
| `utils/char-filter.js` | 从字符串中提取汉字，限制数量上限 |
| `pages/index/index.wxml` | 页面结构：搜索框 + 字卡列表 + canvas 动画区 |
| `pages/index/index.wxss` | 页面样式 |
| `pages/index/index.js` | 页面逻辑：输入处理 + HanziWriter 控制 |
| `pages/index/index.json` | 页面配置 |

---

## Task 1: 项目基础结构

**Files:**
- Create: `app.js`
- Create: `app.json`
- Create: `app.wxss`
- Create: `project.config.json`
- Create: `.gitignore`

- [ ] **Step 1: 创建 app.js**

```javascript
// app.js
App({})
```

- [ ] **Step 2: 创建 app.json**

```json
{
  "pages": [
    "pages/index/index"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#fff",
    "navigationBarTitleText": "怎么写",
    "navigationBarTextStyle": "black"
  },
  "style": "v2",
  "sitemapLocation": "sitemap.json",
  "lazyCodeLoading": "requiredComponents"
}
```

- [ ] **Step 3: 创建 app.wxss**

```css
/* app.wxss */
page {
  font-family: -apple-system, "PingFang SC", "Helvetica Neue", sans-serif;
  background-color: #f7f7f7;
  box-sizing: border-box;
}
```

- [ ] **Step 4: 创建 project.config.json**

将 `appid` 替换为你的实际 AppID（在微信公众平台查询）。

```json
{
  "appid": "YOUR_APPID_HERE",
  "projectname": "how-to-write",
  "description": "汉字笔顺学习小程序",
  "setting": {
    "urlCheck": true,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "minified": true,
    "newFeature": true,
    "coverView": true,
    "nodeModules": true,
    "autoAudits": false,
    "showShadowRootInWxmlPanel": true,
    "packNpmManually": false,
    "enableEngineNative": false,
    "packNpmRelationList": [],
    "minifyWXSS": true,
    "minifyWXML": false,
    "uglifyFileName": false,
    "ignoreUploadUnusedFiles": true
  },
  "compileType": "miniprogram",
  "libVersion": "3.4.3",
  "srcMiniprogramRoot": "./",
  "condition": {}
}
```

- [ ] **Step 5: 创建 .gitignore**

```
node_modules/
miniprogram_npm/
project.private.config.json
.DS_Store
```

- [ ] **Step 6: 创建空页面文件夹和 index.json**

```bash
mkdir -p pages/index
```

```json
// pages/index/index.json
{
  "usingComponents": {}
}
```

- [ ] **Step 7: 提交**

```bash
git add .
git commit -m "feat: scaffold miniprogram project structure"
```

---

## Task 2: 安装 HanziWriter

**Files:**
- Create: `package.json`
- Create: `miniprogram_npm/` (由微信开发者工具构建生成)

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "how-to-write",
  "version": "1.0.0",
  "description": "汉字笔顺学习小程序",
  "dependencies": {
    "hanziwriter-miniprogram": "^3.5.0"
  }
}
```

- [ ] **Step 2: 安装依赖**

```bash
npm install
```

预期输出：`added 1 package` 类似信息，`node_modules/hanziwriter-miniprogram` 目录存在。

- [ ] **Step 3: 在微信开发者工具中构建 npm**

打开微信开发者工具 → 顶部菜单 → **工具** → **构建 npm**

预期：项目根目录出现 `miniprogram_npm/hanziwriter-miniprogram/` 文件夹。

- [ ] **Step 4: 验证构建产物**

```bash
ls miniprogram_npm/hanziwriter-miniprogram/
```

预期输出中应包含 `index.js`。

- [ ] **Step 5: 提交**

```bash
git add package.json package-lock.json
git commit -m "feat: add hanziwriter-miniprogram dependency"
```

注意：`miniprogram_npm/` 和 `node_modules/` 已在 `.gitignore` 中，无需提交。

---

## Task 3: char-filter 工具函数

**Files:**
- Create: `utils/char-filter.js`

- [ ] **Step 1: 创建 utils 目录和文件**

```bash
mkdir -p utils
```

- [ ] **Step 2: 实现 filterChinese 函数**

```javascript
// utils/char-filter.js

/**
 * 从字符串中提取汉字，去重，最多返回 maxCount 个
 * @param {string} input - 用户输入的原始字符串
 * @param {number} maxCount - 最大字数，默认 10
 * @returns {string[]} 汉字数组
 */
function filterChinese(input, maxCount) {
  if (maxCount === undefined) maxCount = 10;
  if (!input || typeof input !== 'string') return [];
  // 匹配 CJK 统一汉字区 一-鿿
  var chars = input.match(/[一-鿿]/g) || [];
  // 去重，保持顺序
  var seen = {};
  var unique = [];
  for (var i = 0; i < chars.length; i++) {
    if (!seen[chars[i]]) {
      seen[chars[i]] = true;
      unique.push(chars[i]);
    }
  }
  return unique.slice(0, maxCount);
}

module.exports = { filterChinese };
```

- [ ] **Step 3: 手动验证（在开发者工具控制台执行）**

在微信开发者工具 → 调试器 → Console 里输入：

```javascript
const { filterChinese } = require('../../utils/char-filter');
console.log(filterChinese('中国123abc中华'));   // ["中", "国", "华"]（去重后）
console.log(filterChinese(''));                // []
console.log(filterChinese(null));             // []
console.log(filterChinese('一二三四五六七八九十零'));  // ["一","二","三","四","五","六","七","八","九","十"]（最多10个）
```

- [ ] **Step 4: 提交**

```bash
git add utils/char-filter.js
git commit -m "feat: add char-filter utility to extract Chinese characters"
```

---

## Task 4: 页面 WXML 结构

**Files:**
- Create: `pages/index/index.wxml`

- [ ] **Step 1: 编写 WXML**

```xml
<!-- pages/index/index.wxml -->
<view class="container">

  <!-- 搜索区域 -->
  <view class="search-area">
    <input
      class="search-input"
      placeholder="输入汉字，如：中国"
      placeholder-class="search-placeholder"
      bindinput="onInput"
      value="{{inputValue}}"
      maxlength="20"
    />
  </view>

  <!-- 字卡列表 -->
  <view class="char-list" wx:if="{{chars.length > 0}}">
    <view
      wx:for="{{chars}}"
      wx:key="index"
      class="char-card {{selectedChar === item ? 'char-card--active' : ''}}"
      bindtap="onSelectChar"
      data-char="{{item}}"
    >
      {{item}}
    </view>
  </view>

  <!-- 动画区域 -->
  <view class="animation-area" wx:if="{{selectedChar}}">
    <view class="animation-title">「{{selectedChar}}」的笔顺</view>

    <view class="canvas-wrapper">
      <canvas type="2d" id="hanzi-canvas" class="hanzi-canvas"></canvas>
      <view class="loading-mask" wx:if="{{loading}}">
        <text class="loading-text">加载中...</text>
      </view>
      <view class="error-mask" wx:if="{{errorMsg}}">
        <text class="error-text">{{errorMsg}}</text>
      </view>
    </view>

    <view
      class="replay-btn {{animDone ? 'replay-btn--active' : ''}}"
      bindtap="onReplay"
    >
      ▶ 重播
    </view>
  </view>

  <!-- 空状态提示 -->
  <view class="empty-hint" wx:if="{{chars.length === 0 && inputValue.length > 0}}">
    <text>请输入汉字</text>
  </view>

</view>
```

- [ ] **Step 2: 在微信开发者工具中预览**

打开模拟器，页面应显示搜索框，无其他内容（字卡和动画区均隐藏）。

- [ ] **Step 3: 提交**

```bash
git add pages/index/index.wxml
git commit -m "feat: add index page WXML structure"
```

---

## Task 5: 页面样式 WXSS

**Files:**
- Create: `pages/index/index.wxss`

- [ ] **Step 1: 编写样式**

```css
/* pages/index/index.wxss */

.container {
  padding: 32rpx 24rpx;
  min-height: 100vh;
}

/* 搜索框 */
.search-area {
  margin-bottom: 32rpx;
}

.search-input {
  width: 100%;
  height: 88rpx;
  background: #fff;
  border-radius: 44rpx;
  padding: 0 32rpx;
  font-size: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
}

.search-placeholder {
  color: #bbb;
}

/* 字卡列表 */
.char-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 40rpx;
}

.char-card {
  width: 96rpx;
  height: 96rpx;
  background: #fff;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  font-weight: bold;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  border: 4rpx solid transparent;
  transition: all 0.15s;
}

.char-card--active {
  border-color: #07c160;
  background: #f0fff6;
  color: #07c160;
}

/* 动画区域 */
.animation-area {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.animation-title {
  font-size: 30rpx;
  color: #888;
  margin-bottom: 24rpx;
}

.canvas-wrapper {
  position: relative;
  width: 600rpx;
  height: 600rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.hanzi-canvas {
  width: 600rpx;
  height: 600rpx;
}

.loading-mask,
.error-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.85);
}

.loading-text {
  font-size: 28rpx;
  color: #888;
}

.error-text {
  font-size: 28rpx;
  color: #f56c6c;
}

/* 重播按钮 */
.replay-btn {
  margin-top: 32rpx;
  padding: 20rpx 64rpx;
  background: #e5e5e5;
  color: #bbb;
  border-radius: 48rpx;
  font-size: 28rpx;
}

.replay-btn--active {
  background: #07c160;
  color: #fff;
}

/* 空状态 */
.empty-hint {
  text-align: center;
  color: #bbb;
  font-size: 28rpx;
  padding-top: 80rpx;
}
```

- [ ] **Step 2: 在模拟器中检查样式**

在搜索框输入"中国"（暂时无 JS 逻辑），搜索框应显示正常、圆角、有阴影。

- [ ] **Step 3: 提交**

```bash
git add pages/index/index.wxss
git commit -m "feat: add index page styles"
```

---

## Task 6: 页面逻辑 — 输入与字卡

**Files:**
- Create: `pages/index/index.js`

- [ ] **Step 1: 创建 index.js，实现输入处理**

```javascript
// pages/index/index.js
var HanziWriter = require('hanziwriter-miniprogram');
var charFilter = require('../../utils/char-filter');

Page({
  data: {
    inputValue: '',   // 搜索框内容
    chars: [],        // 过滤后的汉字数组
    selectedChar: null, // 当前选中的字
    loading: false,   // 是否正在加载笔划数据
    animDone: false,  // 动画是否播放完毕
    errorMsg: '',     // 错误信息
  },

  // HanziWriter 实例，不放 data（不需要响应式）
  _writer: null,

  onInput: function(e) {
    var value = e.detail.value;
    var chars = charFilter.filterChinese(value);
    this.setData({
      inputValue: value,
      chars: chars,
      selectedChar: null,
      loading: false,
      animDone: false,
      errorMsg: '',
    });
  },

  onSelectChar: function(e) {
    var char = e.currentTarget.dataset.char;
    this.setData({
      selectedChar: char,
      loading: true,
      animDone: false,
      errorMsg: '',
    });
    // 需要等 canvas 渲染后再初始化，用 nextTick
    var self = this;
    wx.nextTick(function() {
      self._initWriter(char);
    });
  },

  onReplay: function() {
    if (!this.data.animDone || !this._writer) return;
    var self = this;
    this.setData({ animDone: false });
    this._writer.animateCharacter({
      onComplete: function() {
        self.setData({ animDone: true });
      },
    });
  },

  _initWriter: function(char) {
    // 取消并销毁旧实例
    if (this._writer) {
      this._writer.cancelAnimation();
      this._writer = null;
    }

    var self = this;
    var query = wx.createSelectorQuery().in(this);
    query.select('#hanzi-canvas')
      .fields({ node: true, size: true })
      .exec(function(res) {
        if (!res || !res[0] || !res[0].node) {
          self.setData({ loading: false, errorMsg: '画布初始化失败' });
          return;
        }

        var canvas = res[0].node;
        // 设置画布实际像素尺寸（300 × 设备像素比，保证清晰）
        var dpr = wx.getWindowInfo().pixelRatio || 2;
        var size = 300;
        canvas.width = size * dpr;
        canvas.height = size * dpr;

        self._writer = HanziWriter.create(canvas, char, {
          width: size * dpr,
          height: size * dpr,
          padding: size * dpr * 0.05,
          strokeAnimationSpeed: 1,
          delayBetweenStrokes: 300,
          renderer: 'canvas',
          onLoadCharDataSuccess: function() {
            self.setData({ loading: false });
            self._writer.animateCharacter({
              onComplete: function() {
                self.setData({ animDone: true });
              },
            });
          },
          onLoadCharDataError: function() {
            self.setData({ loading: false, errorMsg: '暂不支持该字' });
          },
        });
      });
  },
});
```

- [ ] **Step 2: 在模拟器中验证输入流程**

1. 输入"中国"→ 应出现两个字卡"中"和"国"
2. 输入"123abc中国" → 应只出现"中"和"国"
3. 清空输入 → 字卡消失
4. 输入"中中中" → 只出现一个"中"（去重）

- [ ] **Step 3: 提交**

```bash
git add pages/index/index.js
git commit -m "feat: implement input handling and char card selection"
```

---

## Task 7: HanziWriter 动画验证与联网配置

**Files:**
- Modify: 微信公众平台配置（非代码文件）

- [ ] **Step 1: 开发阶段跳过域名校验**

在微信开发者工具 → 右上角"详情" → 本地设置 → 勾选 **"不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"**

- [ ] **Step 2: 验证笔顺动画**

1. 在模拟器中输入"中"
2. 点击字卡"中"
3. 预期：canvas 区域出现"中"字的笔顺动画，逐笔绘制
4. 动画结束后，"▶ 重播"按钮变为绿色可点击状态
5. 点击重播，动画重新从第一笔开始

- [ ] **Step 3: 验证错误处理**

1. 输入一个生僻字（如"𠮷"——注意这是 emoji 区汉字，filterChinese 不会匹配到，可以直接在 JS 里临时 hardcode 一个不存在的 key 测试）
2. 预期：显示"暂不支持该字"文字，不崩溃

- [ ] **Step 4: 上线前配置合法域名（仅上线时需要）**

登录 [微信公众平台](https://mp.weixin.qq.com) → 开发 → 开发管理 → 开发设置 → 服务器域名 → request 合法域名，添加：

```
https://cdn.jsdelivr.net
```

- [ ] **Step 5: 提交**

```bash
git add .
git commit -m "feat: complete hanziwriter animation integration"
```

---

## Task 8: 收尾与优化

**Files:**
- Create: `sitemap.json`
- Modify: `pages/index/index.wxml`（添加标题）

- [ ] **Step 1: 创建 sitemap.json**

```json
{
  "desc": "关于本文件的更多信息，请参考文档 https://developers.weixin.qq.com/miniprogram/dev/framework/sitemap.html",
  "rules": [{
    "action": "disallow",
    "page": "*"
  }]
}
```

- [ ] **Step 2: 添加顶部说明文字（让孩子知道怎么用）**

在 `pages/index/index.wxml` 的 `<view class="container">` 第一行加入：

```xml
<view class="tip-text">输入不会写的字，看笔顺动画 ✍️</view>
```

在 `pages/index/index.wxss` 末尾加入：

```css
.tip-text {
  font-size: 26rpx;
  color: #aaa;
  text-align: center;
  margin-bottom: 24rpx;
}
```

- [ ] **Step 3: 完整端到端验证**

按以下步骤完整走一遍：

1. 打开小程序 → 看到"输入不会写的字，看笔顺动画 ✍️"提示
2. 输入"学" → 字卡出现"学"
3. 点击"学" → 看到加载提示 → 动画开始播放
4. 动画结束 → "▶ 重播"绿色高亮
5. 点击重播 → 动画重新播放
6. 清空输入 → 字卡和动画区消失
7. 输入"好好学习" → 出现4个字卡（去重）
8. 点击不同字卡 → 切换到对应字的动画

- [ ] **Step 4: 最终提交**

```bash
git add .
git commit -m "feat: complete hanzi writer miniprogram MVP"
```

---

## 附：常见问题

| 问题 | 排查方法 |
|---|---|
| 动画不出来，控制台报网络错误 | 确认开发者工具勾选了"不校验合法域名" |
| canvas 显示空白 | 检查 `type="2d"` 是否在 `<canvas>` 上，检查 `wx.nextTick` 是否生效 |
| npm 包找不到 | 重新执行"工具 → 构建 npm" |
| 字卡点击无反应 | 检查 `onSelectChar` 是否绑定，`data-char` 是否正确 |
