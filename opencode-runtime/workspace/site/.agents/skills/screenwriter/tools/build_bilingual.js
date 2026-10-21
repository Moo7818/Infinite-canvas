// 双语剧本 — .docx 生成器
//
// 每句对白 = 两行：
//   1. 主语言（例如中文）。
//   2. 括号内的翻译（斜体、灰色，例如英文）。
//
// 动作、括号提示、场景标题 —— 使用用户选定的语言（见 helper 区常量）。
//
// 使用方法：
//   1. 把文件复制到工作目录。
//   2. 每句对白用 ...dialB("主语言行", "翻译行") 来写。
//   3. 运行：node build_bilingual.js

const fs = require("fs");
const docx = require("docx");
const {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, Header, PageNumber
} = docx;

const FONT = "Courier New";
const SIZE = 24;

// ============ 辅助函数 ============

const ENABLE_SCENE_NUMBERS = true;
const START_SCENE_NUMBER = 1;
let _sceneNum = START_SCENE_NUMBER - 1;

function slug(t) {
  let text = t.toUpperCase();
  if (ENABLE_SCENE_NUMBERS) {
    _sceneNum++;
    text = `${_sceneNum}  ${text}`;
  }
  return new Paragraph({
    spacing: { before: 360, after: 240, line: 240 },
    keepNext: true,
    children: [new TextRun({ text, font: FONT, size: SIZE, bold: true })]
  });
}

function action(t) {
  return new Paragraph({
    spacing: { before: 0, after: 240, line: 240 },
    children: [new TextRun({ text: t, font: FONT, size: SIZE })]
  });
}

function character(name, ext) {
  const txt = ext ? `${name.toUpperCase()} (${ext})` : name.toUpperCase();
  return new Paragraph({
    spacing: { before: 240, after: 0, line: 240 },
    indent: { left: 3168 },
    keepNext: true,
    children: [new TextRun({ text: txt, font: FONT, size: SIZE })]
  });
}

function paren(t) {
  return new Paragraph({
    spacing: { before: 0, after: 0, line: 240 },
    indent: { left: 2304, right: 2880 },
    keepNext: true,
    children: [new TextRun({ text: t.startsWith("(") ? t : `(${t})`, font: FONT, size: SIZE })]
  });
}

function dialMain(t) {
  return new Paragraph({
    spacing: { before: 0, after: 0, line: 240 },
    indent: { left: 1440, right: 2160 },
    children: [new TextRun({ text: t, font: FONT, size: SIZE })]
  });
}

function dialTranslation(t) {
  return new Paragraph({
    spacing: { before: 0, after: 120, line: 240 },
    indent: { left: 1440, right: 2160 },
    children: [new TextRun({ text: `(${t})`, font: FONT, size: SIZE, italics: true, color: "666666" })]
  });
}

// 双语对白主函数：用展开运算符调用：...dialB("...", "...")
function dialB(main, translation) {
  return [dialMain(main), dialTranslation(translation)];
}

function trans(t) {
  return new Paragraph({
    spacing: { before: 240, after: 240, line: 240 },
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text: t.toUpperCase(), font: FONT, size: SIZE, bold: true })]
  });
}

function center(t, opts = {}) {
  return new Paragraph({
    spacing: { before: opts.before ?? 240, after: opts.after ?? 240, line: 240 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: t, font: FONT, size: opts.size || SIZE, bold: !!opts.bold })]
  });
}

function blank() {
  return new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, children: [new TextRun({ text: "", font: FONT, size: SIZE })] });
}

// ============ 你的剧本内容 ============

const screenplay = [
  blank(), blank(),
  center("我的项目", { bold: true, size: 32 }),
  center("双语稿（主语言 / 翻译）"),
  blank(),

  slug("外景. 地点 — 白天"),
  action("场景描述，用主语言写。只用动词。"),

  character("主人公"),
  ...dialB(
    "主语言的台词。",
    "Translation line."
  ),

  character("另一人"),
  paren("安静地"),
  ...dialB(
    "另一句台词。",
    "Another line."
  ),

  trans("切至："),

  // 在下面添加你的场次。
];

// ============ 生成文档 ============

const doc = new Document({
  creator: "Screenwriter",
  title: "双语剧本",
  styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 2160 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ children: [PageNumber.CURRENT, "."], font: FONT, size: 22 })]
        })]
      })
    },
    children: screenplay
  }]
});

Packer.toBuffer(doc).then(buf => {
  const out = "./screenplay-bilingual.docx";
  fs.writeFileSync(out, buf);
  console.log(`已生成 ${out}`);
}).catch(e => { console.error(e); process.exit(1); });
