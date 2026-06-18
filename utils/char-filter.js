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
