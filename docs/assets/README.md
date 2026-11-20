# README 素材

全部用 `examples/` 里的脱敏示例数据生成，不含任何真实体检报告。

| 文件 | 内容 |
| --- | --- |
| `banner.png` | README 顶部横幅，也可作为 GitHub Social preview（源文件 `banner.src.html`） |
| `demo.gif` | 主演示：粘贴 → 生成 → 五个模块 → 中 / EN |
| `plan-checkin.gif` | 30 天打卡 + 分享长图 |
| `*.png` / `*-en.png` | 五个模块的中 / 英文截图 |
| `share-card.png` | 分享长图示例 |
| `mobile.png` | 手机端 |

重新生成：

```bash
python3 -m http.server 8765 &
python3 scripts/screenshots.py
python3 scripts/record-gifs.py   # 产出 /tmp/demo.webm、/tmp/plan.webm
ffmpeg -ss 0.6 -i /tmp/demo.webm -vf "fps=10,scale=880:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" docs/assets/demo.gif
```
