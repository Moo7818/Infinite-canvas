// 分场大纲（Treatment）— .docx 生成器
//
// 每场 = 标题 + 3-5句描述。
// 可选 — 审计标签：⚠ [因果链] / [价值] / [人物设定] / [节奏]
//
// 使用方法：
//   1. 把文件复制到工作目录。
//   2. 用 scene("标题", "描述") 填充 `treatment` 数组。
//   3. 运行：node build_treatment.js

const fs = require("fs");
const docx = require("docx");
const {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, HeadingLevel, Header, PageNumber
} = docx;

const FONT = "Calibri";
const SIZE = 22; // 11pt

let _sceneNum = 0;

function act(title) {
  return new Paragraph({
    spacing: { before: 480, after: 240 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: title.toUpperCase(), font: FONT, size: 32, bold: true })]
  });
}

function scene(title, body, audit) {
  _sceneNum++;
  const titlePara = new Paragraph({
    spacing: { before: 360, after: 60 },
    children: [
      new TextRun({ text: `第${_sceneNum}场. `, font: FONT, size: SIZE, bold: true }),
      new TextRun({ text: title, font: FONT, size: SIZE, bold: true })
    ]
  });
  const bodyPara = new Paragraph({
    spacing: { before: 0, after: 120, line: 280 },
    children: [new TextRun({ text: body, font: FONT, size: SIZE })]
  });
  const out = [titlePara, bodyPara];
  if (audit) {
    out.push(new Paragraph({
      spacing: { before: 0, after: 240, line: 280 },
      children: [new TextRun({ text: `⚠ ${audit}`, font: FONT, size: SIZE - 2, italics: true, color: "C00000" })]
    }));
  }
  return out;
}

// ============ 分场大纲内容 ============

const treatment = [
  new Paragraph({
    spacing: { after: 240 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "项目名称", font: FONT, size: 44, bold: true })]
  }),
  new Paragraph({
    spacing: { after: 480 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "分场大纲 v1", font: FONT, size: 24, italics: true })]
  }),

  act("第一幕"),

  ...scene(
    "地点 — 时间 — 状态",
    "3-5句话：发生了什么，谁在场，入场价值是什么，发生了什么动作，出场价值是什么。用具体的动作动词，不写情绪描述。"
  ),

  ...scene(
    "下一场",
    "如果结构上有问题，可以加审计标签。",
    "[因果链] 这场不承接上一场——需要加个过渡桥。"
  ),

  // 在下面添加你的场次。
  // 用 act("第二幕"), act("第三幕") 来分隔幕。
];

// ============ 生成文档 ============

const doc = new Document({
  creator: "Screenwriter",
  title: "分场大纲",
  styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20 })]
        })]
      })
    },
    children: treatment
  }]
});

Packer.toBuffer(doc).then(buf => {
  const out = "./treatment.docx";
  fs.writeFileSync(out, buf);
  console.log(`已生成 ${out}`);
}).catch(e => { console.error(e); process.exit(1); });
