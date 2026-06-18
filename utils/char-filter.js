// utils/char-filter.js

/**
 * 从字符串中提取汉字，去重，最多返回 maxCount 个
 * @param {string} input - 用户输入的原始字符串
 * @param {number} [maxCount=10] - 最大字数，默认 10
 * @returns {string[]} 汉字数组
 */
function filterChinese(input, maxCount) {
  if (maxCount === undefined) maxCount = 10;
  if (!input || typeof input !== 'string') return [];
  // CJK 基础汉字(U+4E00-9FFF) + 扩展A区(U+3400-4DBF) + 兼容汉字(U+F900-FAFF)
  var chars = input.match(/[一-鿿㐀-䶿豈-﫿]/g) || [];
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
