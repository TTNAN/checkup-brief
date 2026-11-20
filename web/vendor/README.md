# 第三方依赖（本地打包，不走 CDN）

为了“断网可用、不上传任何东西”，PDF 解析和 OCR 用到的库都直接放在仓库里，只在你导入 PDF / 图片时才按需加载。

| 目录 | 来源 | 版本 | 许可证 |
| --- | --- | --- | --- |
| `pdfjs/` | [pdfjs-dist](https://github.com/mozilla/pdf.js)（含 cmaps、jbig2 / openjpeg wasm） | 6.5.438 | Apache-2.0 |
| `tesseract/` | [tesseract.js](https://github.com/naptha/tesseract.js) | 7.0.0 | Apache-2.0 |
| `tesseract/core/` | [tesseract.js-core](https://github.com/naptha/tesseract.js-core)（lstm、simd-lstm、relaxedsimd-lstm 三个版本，按浏览器能力自动选） | 7.0.0 | Apache-2.0 |
| `tesseract/lang/` | [tesseract.js-data](https://github.com/naptha/tessdata) chi_sim / eng（4.0.0_best_int） | 1.0.0 | Apache-2.0 |
