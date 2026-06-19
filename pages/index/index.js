// pages/index/index.js
var createHanziWriterContext = require('hanzi-writer-miniprogram');
var filterChinese = require('../../utils/char-filter').filterChinese;

var RECENT_KEY = 'recentChars';
var RECENT_MAX = 12;
var CDN_BASE = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0';
var CARD_SPEED = 200;
var MAX_CARDS = 15;  // 上限：1 主 + 2×15 = 31 canvas，避免复杂字崩溃

// 字形数据缓存（按 char 键），整个小程序生命周期内复用
var _charDataCache = {};

// ── 工具函数 ──────────────────────────────────────────────────────────────

// 依次播放指定笔画列表
function chainAnimate(ctx, strokeNums, idx) {
  if (!ctx || idx >= strokeNums.length) return;
  try {
    ctx.animateStroke(strokeNums[idx], {
      onComplete: function() { chainAnimate(ctx, strokeNums, idx + 1); },
    });
  } catch (e) { /* writer 已销毁，静默忽略 */ }
}

// 等待组件内部 #writer-canvas 节点可用，isCancelled() 返回 true 时停止重试
function waitForCanvasReady(comp, isCancelled, callback) {
  if (isCancelled()) return;
  comp.createSelectorQuery()
    .select('#writer-canvas')
    .fields({ node: true, size: true })
    .exec(function(res) {
      if (isCancelled()) return;
      if (res && res[0] && res[0].node) {
        callback();
      } else {
        // 节点还没就绪，等一帧后重试
        setTimeout(function() {
          waitForCanvasReady(comp, isCancelled, callback);
        }, 16);
      }
    });
}

// ── Page ─────────────────────────────────────────────────────────────────

Page({
  data: {
    inputValue: '',
    chars: [],
    selectedChar: null,
    loading: false,
    animDone: false,
    errorMsg: '',
    recentChars: [],
    strokeSteps: [],
  },

  _writerCtx: null,   // 主 writer 实例
  _cardCtxs: [],      // [{bg, red}] 小卡片 writer 对
  _cardLoadId: 0,     // 每次 _destroyCardWriters 时递增，令旧异步回调失效
  _stripTimer: null,  // 300ms 延迟定时器
  _staggerTimers: [], // 每张卡片的错开定时器

  onLoad: function() {
    try {
      var recent = wx.getStorageSync(RECENT_KEY) || [];
      this.setData({ recentChars: recent });
    } catch (e) { /* ignore */ }
  },

  onInput: function(e) {
    var value = e.detail.value;
    var chars = filterChinese(value);
    this._destroyAll();
    this.setData({
      inputValue: value,
      chars: chars,
      selectedChar: null,
      loading: false,
      animDone: false,
      errorMsg: '',
      strokeSteps: [],
    });
  },

  onSelectChar: function(e) {
    var char = e.currentTarget.dataset.char;
    this._addToRecent(char);
    this._destroyAll();
    this.setData({
      selectedChar: char,
      loading: true,
      animDone: false,
      errorMsg: '',
      strokeSteps: [],
    });
    var self = this;
    wx.nextTick(function() {
      self._loadChar(char);
    });
  },

  onClearInput: function() {
    this._destroyAll();
    this.setData({
      inputValue: '',
      chars: [],
      selectedChar: null,
      loading: false,
      animDone: false,
      errorMsg: '',
      strokeSteps: [],
    });
  },

  onClearRecent: function() {
    this.setData({ recentChars: [] });
    try { wx.removeStorageSync(RECENT_KEY); } catch (e) { /* ignore */ }
  },

  onReplay: function() {
    if (!this.data.animDone || !this._writerCtx) return;
    var self = this;
    this.setData({ animDone: false });
    this._writerCtx.animateCharacter({
      onComplete: function() {
        self.setData({ animDone: true });
      },
    });
  },

  onUnload: function() {
    this._destroyAll();
  },

  // ── 内部工具 ────────────────────────────────────────────────────────────

  _addToRecent: function(char) {
    var recent = this.data.recentChars;
    if (recent.indexOf(char) !== -1) return;
    recent = [char].concat(recent);
    if (recent.length > RECENT_MAX) recent = recent.slice(0, RECENT_MAX);
    this.setData({ recentChars: recent });
    try { wx.setStorageSync(RECENT_KEY, recent); } catch (e) { /* ignore */ }
  },

  _destroyAll: function() {
    if (this._writerCtx) {
      this._writerCtx.destroy();
      this._writerCtx = null;
    }
    this._destroyCardWriters();
  },

  // 销毁所有小卡片 writer 并取消所有挂起的异步任务
  _destroyCardWriters: function() {
    // 递增 ID，令所有 waitForCanvasReady / 定时器回调自动跳过
    this._cardLoadId++;

    if (this._stripTimer) {
      clearTimeout(this._stripTimer);
      this._stripTimer = null;
    }
    this._staggerTimers.forEach(function(t) { clearTimeout(t); });
    this._staggerTimers = [];

    this._cardCtxs.forEach(function(pair) {
      if (pair.bg)  { try { pair.bg.destroy();  } catch (e) {} }
      if (pair.red) { try { pair.red.destroy(); } catch (e) {} }
    });
    this._cardCtxs = [];
  },

  // ── 加载流程 ────────────────────────────────────────────────────────────

  // 统一入口：CDN 只拉一次，主 writer 和小卡片共用同一份 charData
  _loadChar: function(char) {
    var self = this;

    if (_charDataCache[char]) {
      self._onDataReady(char, _charDataCache[char]);
      return;
    }

    wx.request({
      url: CDN_BASE + '/' + char + '.json',
      success: function(res) {
        if (self.data.selectedChar !== char) return;
        var data = (res.data && res.data.strokes) ? res.data : null;
        if (data) _charDataCache[char] = data;
        self._onDataReady(char, data);
      },
      fail: function() {
        if (self.data.selectedChar !== char) return;
        self._onDataReady(char, null);
      },
    });
  },

  // CDN 数据到齐后，统一初始化主 writer 和小卡片
  _onDataReady: function(char, charData) {
    var self = this;
    var strokeCount = charData ? charData.strokes.length : 0;
    var displayCount = Math.min(strokeCount, MAX_CARDS);

    // 有数据时先渲染 DOM（让小卡片 hanzi-writer-view 出现在页面里）
    if (displayCount > 0) {
      var steps = [];
      for (var i = 1; i <= displayCount; i++) steps.push({ n: i });
      self.setData({ strokeSteps: steps });
    }

    // 等本次 setData 渲染完成
    wx.nextTick(function() {
      if (self.data.selectedChar !== char) return;

      // 主 writer：有缓存数据时用延迟 loader 避免 clearRect 崩溃，
      //             无数据时走默认 CDN loader（自带网络延迟，ctx 一定已就绪）
      self._initMainWriter(char, charData);

      // 小卡片：额外等 300ms，给批量 canvas native 初始化留出时间
      if (displayCount > 0) {
        var loadId = self._cardLoadId;
        self._stripTimer = setTimeout(function() {
          self._stripTimer = null;
          if (self._cardLoadId !== loadId) return; // 已切字，放弃
          self._initCardWriters(char, charData, displayCount, loadId);
        }, 300);
      }
    });
  },

  // ── 主 writer ───────────────────────────────────────────────────────────

  _initMainWriter: function(char, charData) {
    var self = this;

    // charData 存在时用带 50ms 延迟的 loader（单次下载）；
    // 否则走默认 CDN loader，网络 RTT 足以保证 ctx 就绪。
    var charDataLoader = charData
      ? function(ch, onLoad) { setTimeout(function() { onLoad(charData); }, 50); }
      : undefined;

    var opts = {
      id: 'hanzi-writer',
      page: self,
      character: char,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 300,
      onLoadCharDataSuccess: function() {
        if (self._writerCtx !== ctx) return;
        self.setData({ loading: false });
        try {
          ctx.animateCharacter({
            onComplete: function() {
              if (self._writerCtx !== ctx) return;
              self.setData({ animDone: true });
            },
          });
        } catch (err) {
          self.setData({ errorMsg: '动画加载失败，请重试' });
        }
      },
      onLoadCharDataError: function() {
        if (self._writerCtx !== ctx) return;
        self.setData({ loading: false, errorMsg: '暂不支持该字' });
      },
    };
    if (charDataLoader) opts.charDataLoader = charDataLoader;

    try {
      var ctx = createHanziWriterContext(opts);
      self._writerCtx = ctx;
    } catch (err) {
      self.setData({ loading: false, errorMsg: '初始化失败，请重试' });
    }
  },

  // ── 小卡片 writers ──────────────────────────────────────────────────────

  _initCardWriters: function(char, charData, displayCount, loadId) {
    var self = this;
    var STAGGER_MS = 40;

    // isCancelled：供 waitForCanvasReady 和定时器回调检查
    var isCancelled = function() { return self._cardLoadId !== loadId; };

    for (var n = 1; n <= displayCount; n++) {
      (function(cardN) {
        var pair = { bg: null, red: null };
        self._cardCtxs.push(pair);

        var t = setTimeout(function() {
          if (isCancelled()) return;

          // 每张卡片的 loader：50ms 延迟保证 ctx 先于 render() 就绪
          var loader = function(ch, onLoad) {
            setTimeout(function() {
              if (isCancelled()) return;
              onLoad(charData);
            }, 50);
          };

          // BG：先等 canvas 节点确认可用，再创建 writer
          var bgComp = self.selectComponent('#sw-bg-' + cardN);
          if (!bgComp) return;

          waitForCanvasReady(bgComp, isCancelled, function() {
            if (isCancelled()) return;
            try {
              var bgCtx = createHanziWriterContext({
                id: 'sw-bg-' + cardN,
                page: self,
                character: char,
                charDataLoader: loader,
                padding: 10,
                strokeColor: '#444444',
                outlineColor: '#d4c9bc',
                showCharacter: false,
                showOutline: true,
                strokeAnimationSpeed: CARD_SPEED,
                delayBetweenStrokes: 0,
                onLoadCharDataSuccess: function() {
                  if (pair.bg !== bgCtx) return;
                  var prev = [];
                  for (var i = 0; i < cardN - 1; i++) prev.push(i);
                  chainAnimate(pair.bg, prev, 0);
                },
              });
              pair.bg = bgCtx;
            } catch (e) { /* selectComponent 失败时静默 */ }

            // RED：同样等节点确认再创建
            var redComp = self.selectComponent('#sw-red-' + cardN);
            if (!redComp) return;

            waitForCanvasReady(redComp, isCancelled, function() {
              if (isCancelled()) return;
              try {
                var redCtx = createHanziWriterContext({
                  id: 'sw-red-' + cardN,
                  page: self,
                  character: char,
                  charDataLoader: loader,
                  padding: 10,
                  strokeColor: '#c9473b',
                  showCharacter: false,
                  showOutline: false,
                  strokeAnimationSpeed: CARD_SPEED,
                  delayBetweenStrokes: 0,
                  onLoadCharDataSuccess: function() {
                    if (pair.red !== redCtx) return;
                    chainAnimate(pair.red, [cardN - 1], 0);
                  },
                });
                pair.red = redCtx;
              } catch (e) { /* ignore */ }
            });
          });

        }, (cardN - 1) * STAGGER_MS);

        self._staggerTimers.push(t);
      })(n);
    }
  },
});
