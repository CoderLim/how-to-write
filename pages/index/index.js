// pages/index/index.js
var createHanziWriterContext = require('hanzi-writer-miniprogram');
var filterChinese = require('../../utils/char-filter').filterChinese;

var COMMON_GROUPS = [
  { label: '数字', chars: ['一','二','三','四','五','六','七','八','九','十','百','千','万'] },
  { label: '常用', chars: ['人','大','小','中','上','下','口','手','目','心','日','月'] },
  { label: '动物', chars: ['鱼','鸟','马','牛','羊','猫','狗','虎','兔','龙','猪','鸡'] },
  { label: '自然', chars: ['山','水','火','土','木','金','风','雨','云','雪','花','草'] },
];

var RECENT_KEY = 'recentChars';
var RECENT_MAX = 12;

Page({
  data: {
    inputValue: '',
    chars: [],
    selectedChar: null,
    loading: false,
    animDone: false,
    errorMsg: '',
    recentChars: [],
    commonGroups: COMMON_GROUPS,
  },

  _writerCtx: null,

  onLoad: function() {
    try {
      var recent = wx.getStorageSync(RECENT_KEY) || [];
      this.setData({ recentChars: recent });
    } catch (e) { /* ignore */ }
  },

  onInput: function(e) {
    var value = e.detail.value;
    var chars = filterChinese(value);
    this.setData({
      inputValue: value,
      chars: chars,
      selectedChar: null,
      loading: false,
      animDone: false,
      errorMsg: '',
    });
    if (this._writerCtx) {
      this._writerCtx.destroy();
      this._writerCtx = null;
    }
  },

  onSelectChar: function(e) {
    var char = e.currentTarget.dataset.char;
    this._addToRecent(char);
    this.setData({
      selectedChar: char,
      loading: true,
      animDone: false,
      errorMsg: '',
    });
    var self = this;
    wx.nextTick(function() {
      self._loadChar(char);
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
    if (this._writerCtx) {
      this._writerCtx.destroy();
      this._writerCtx = null;
    }
  },

  _addToRecent: function(char) {
    var recent = this.data.recentChars.filter(function(c) { return c !== char; });
    recent.unshift(char);
    if (recent.length > RECENT_MAX) recent = recent.slice(0, RECENT_MAX);
    this.setData({ recentChars: recent });
    try { wx.setStorageSync(RECENT_KEY, recent); } catch (e) { /* ignore */ }
  },

  _loadChar: function(char) {
    if (this._writerCtx) {
      this._writerCtx.destroy();
      this._writerCtx = null;
    }

    var self = this;
    try {
      var ctx = createHanziWriterContext({
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
          } catch(err) {
            self.setData({ errorMsg: '动画加载失败，请重试' });
          }
        },
        onLoadCharDataError: function() {
          if (self._writerCtx !== ctx) return;
          self.setData({ loading: false, errorMsg: '暂不支持该字' });
        },
      });
      self._writerCtx = ctx;
    } catch(err) {
      self.setData({ loading: false, errorMsg: '初始化失败，请重试' });
    }
  },
});
