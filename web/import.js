// checkup-brief — web/import.js
// 本地导入 PDF / 图片 / 文本，返回可以交给 parseReportText 的纯文字。
//   importReportFile(file, onProgress) -> Promise<{ text, method, pages }>
//     method: 'text'（.txt）| 'pdf-text'（PDF 自带文字层）| 'pdf-ocr'（扫描件 PDF）| 'image-ocr'（照片 / 截图）
//     onProgress({ stage, progress })：stage = 'load' | 'read' | 'ocr'，progress 0–1
//
// 原则：所有库都在 web/vendor/ 里，只在需要时才加载；文件不离开浏览器。
//   - PDF：pdf.js 抽文字层，并按坐标还原成“一行一项”；某页几乎没字 → 当扫描件，渲染成图再 OCR。
//   - 图片：tesseract.js（chi_sim + eng），先放大、转灰度，提高小字识别率。
// 只做健康科普，不做诊断，不能替代医生。
'use strict';

(function () {
  const BASE = new URL('vendor/', document.currentScript ? document.currentScript.src : location.href).href;
  let pdfjsPromise = null;
  let workerPromise = null;
  let progressCb = () => {};

  function loadPdfJs() {
    if (!pdfjsPromise) {
      pdfjsPromise = import(BASE + 'pdfjs/pdf.min.mjs').then((lib) => {
        lib.GlobalWorkerOptions.workerSrc = BASE + 'pdfjs/pdf.worker.min.mjs';
        return lib;
      });
    }
    return pdfjsPromise;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('load failed: ' + src));
      document.head.appendChild(s);
    });
  }

  function getOcrWorker() {
    if (!workerPromise) {
      workerPromise = (async () => {
        if (!window.Tesseract) await loadScript(BASE + 'tesseract/tesseract.min.js');
        const worker = await window.Tesseract.createWorker(['chi_sim', 'eng'], 1, {
          workerPath: BASE + 'tesseract/worker.min.js',
          corePath: BASE + 'tesseract/core/',
          langPath: BASE + 'tesseract/lang',
          gzip: true,
          workerBlobURL: false,
          cacheMethod: 'none',
          logger: (m) => {
            if (m.status === 'recognizing text') progressCb({ stage: 'ocr', progress: m.progress });
            else progressCb({ stage: 'load', progress: m.progress || 0 });
          },
        });
        // 6 = 把整页当成一个文本块；体检表格按行识别更稳。保留单词间空格，方便拆分列。
        await worker.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' });
        return worker;
      })();
      workerPromise.catch(() => { workerPromise = null; });
    }
    return workerPromise;
  }

  // 把图片画到 canvas 上：小图放大到宽约 2000px，转灰度并拉一点对比度。
  function prepareCanvas(source, width, height) {
    const scale = Math.min(3, Math.max(1, 2000 / width));
    const c = document.createElement('canvas');
    c.width = Math.round(width * scale);
    c.height = Math.round(height * scale);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(source, 0, 0, c.width, c.height);
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      let g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      g = Math.max(0, Math.min(255, (g - 128) * 1.25 + 140));
      d[i] = d[i + 1] = d[i + 2] = g;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  async function ocrCanvas(canvas) {
    const worker = await getOcrWorker();
    const { data } = await worker.recognize(canvas);
    return data.text;
  }

  // PDF 文字层 → 按 y 坐标分行、按 x 排序，列之间用两个空格隔开。
  function itemsToLines(items) {
    const rows = [];
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue;
      const x = it.transform[4];
      const y = it.transform[5];
      const h = Math.abs(it.transform[3]) || it.height || 10;
      let row = rows.find((r) => Math.abs(r.y - y) < h * 0.5);
      if (!row) { row = { y, h, cells: [] }; rows.push(row); }
      row.cells.push({ x, w: it.width, s: it.str });
    }
    rows.sort((a, b) => b.y - a.y);
    return rows.map((r) => {
      r.cells.sort((a, b) => a.x - b.x);
      let line = '';
      let end = null;
      for (const c of r.cells) {
        if (end != null) line += c.x - end > r.h * 0.6 ? '  ' : '';
        line += c.s;
        end = c.x + c.w;
      }
      return line.trim();
    });
  }

  async function importPdf(file) {
    progressCb({ stage: 'load', progress: 0 });
    const pdfjs = await loadPdfJs();
    const doc = await pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      cMapUrl: BASE + 'pdfjs/cmaps/',
      cMapPacked: true,
      wasmUrl: BASE + 'pdfjs/wasm/',
      useSystemFonts: true,
      isEvalSupported: false,
    }).promise;
    const out = [];
    let ocrPages = 0;
    for (let p = 1; p <= doc.numPages; p++) {
      progressCb({ stage: 'read', progress: (p - 1) / doc.numPages });
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const lines = itemsToLines(content.items);
      const chars = lines.join('').replace(/\s/g, '').length;
      if (chars >= 30) {
        out.push(...lines);
      } else {
        // 几乎没有文字层：扫描件，渲染后 OCR。
        ocrPages++;
        const viewport = page.getViewport({ scale: 2.5 });
        const c = document.createElement('canvas');
        c.width = viewport.width;
        c.height = viewport.height;
        await page.render({ canvasContext: c.getContext('2d'), viewport, canvas: c }).promise;
        out.push(await ocrCanvas(prepareCanvas(c, c.width, c.height)));
      }
    }
    progressCb({ stage: 'read', progress: 1 });
    return { text: out.join('\n'), method: ocrPages ? 'pdf-ocr' : 'pdf-text', pages: doc.numPages };
  }

  async function importImage(file) {
    progressCb({ stage: 'load', progress: 0 });
    const bitmap = await createImageBitmap(file);
    const canvas = prepareCanvas(bitmap, bitmap.width, bitmap.height);
    const text = await ocrCanvas(canvas);
    return { text, method: 'image-ocr', pages: 1 };
  }

  async function importReportFile(file, onProgress) {
    progressCb = onProgress || (() => {});
    const name = (file.name || '').toLowerCase();
    const type = file.type || '';
    if (type === 'application/pdf' || name.endsWith('.pdf')) return importPdf(file);
    if (type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/.test(name)) return importImage(file);
    return { text: await file.text(), method: 'text', pages: 1 };
  }

  // 预热：用户把鼠标移到“上传”按钮上时就开始加载 OCR，减少等待。
  function warmUp(kind) {
    if (kind === 'pdf') loadPdfJs().catch(() => {});
    else getOcrWorker().catch(() => {});
  }

  window.importReportFile = importReportFile;
  window.warmUpImport = warmUp;
})();
