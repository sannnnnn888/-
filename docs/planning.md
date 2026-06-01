# DISC 页面调整 · 完整上下文 + 任务规划

> 本文档已收纳所有历史调整讨论，子 Agent 只看此文件即可执行，无需回溯对话。

---

## 一、项目背景

- 项目：DISC 性格测试 H5 页面（暗金水墨武侠风格）
- 文件：`C:\Users\san\disc-project\deploy\index.html`
- 设计参考：`C:\Users\san\Desktop\CC资料\角色卡设计_全预览.html`
- 部署方式：单 HTML 文件，所有 CSS/JS 内联

---

## 二、技术要点

| 项目 | 详情 |
|------|------|
| 主题色 | 背景 #08080a，金色 #c9a96e/#d4a853 |
| DISC计分 | 28题迫选，每题选最符合+最不符，D/I/S/C 各+1/-1 |
| 角色数 | 16个 combo 角色（DI/ID/DS/SD/DC/CD/IS/SI/IC/CI/SC/CS + D/I/S/C纯型） |
| 4家族 | 破军虎(ftiger,赤金)、焰羽凤(fphoenix,暖金)、抱山熊(fbear,墨青)、玄机鹰(feagle,冷金) |
| 角色卡 | 图片 3:4 竖版海报(background-image)，文字区在底部 |
| 截图 | html2canvas 捕获 .role-card 元素 |
| 二维码 | https://api.qrserver.com/v1/create-qr-code/ |
| 解锁 | sessionStorage('disc_unlocked') 存储解锁状态 |
| 角色图CDN | libtv-res.liblib.art |
| 保存尺寸 | 卡片是固定大小不随屏幕变化（朋友圈分享） |

---

## 三、已完成的历史调整（不再改动）

1. **背景金色条文** — body::before(右上斜线) + body::after(左下横线)，repeating-linear-gradient
2. **解锁弹窗简化** — 移除7项锁状态列表，改为1行描述
3. **雷达+报告合并** — result-top-box 内 flex 布局，左边雷达(130px) + 右边报告
4. **角色卡CSS类名** — 已匹配参考设计：.role-card > .card-inner > .card-image-area > .card-badge/.card-quote + .card-text-area > .card-summary-bubble/.card-stats-row/.card-footer
5. **角色卡总结文案** — 已从 oneliner(~10-22字) 改为 combo.id(截取~50字)
6. **角色卡固定宽度** — 已加 width:280px + margin:0 auto + flex-shrink:0

---

## 四、当前需要调整（6项）

### 调整①：角色卡长宽比修正（unlock后）
**用户反馈**: 卡片太长了，参考设计_全预览.html的长宽比才是对的

**当前代码位置**:
- `.role-card` CSS → lines 203-213，宽度已固定 280px
- `.card-text-area` CSS → lines 279-285: `padding:8px 14px 10px; gap:4px;`
- `.card-footer .qr-icon` CSS → line 314: `width:56px;height:56px;`
- `.card-summary-bubble` CSS → lines 288-296

**原因**: 文本区 padding(8+10=18px) + gap(4+4=8px) + summary(~35px) + stats(~20px) + QR(56px) ≈ 137px，图片区 280×4/3≈373px，总高≈510px，比例≈1.82:1，比参考设计瘦长

**修改方案**:
1. QR 图标 56×56 → **36×36**（line 314）
2. card-text-area padding: `8px 14px 10px` → **`6px 12px 8px`**（line 281）
3. card-text-area gap: `4px` → **`2px`**（line 284）
4. card-summary-bubble padding 适当缩小
5. card-footer 的 gap 缩小

**扩展说明**: 文本区目标高度约 100px（比现在少 ~37px），总卡片高度 ≈ 473px，比例 ≈ 1.69:1，接近参考设计

---

### 调整②：测试提示语移至顶部
**用户反馈**: 已经说了两次了，"最符合/最不符"的提示语放在页面顶部

**当前代码位置**:
- line 516: `<div class="test-instruct">` 目前在 nav-bar 上方、questions-container 下方
- lines 91-92: `.test-instruct` CSS 样式

**修改方案**:
1. 在 `screen-test`（line 510-522）中，把 `test-instruct` 的 HTML 移到 `<div id="questions-container">` 之前
2. 给 `.test-instruct` 增强样式（金色边框更醒目、背景略微增强）

**最终顺序**: progress-wrap → test-instruct → questions-container → nav-bar

---

### 调整③：背景金色条文不显眼
**用户反馈**: "没有看到有金色的条文在这个页面的背景"

**当前代码位置**:
- lines 26-27: body::before 和 body::after

```css
body::before{content:'';position:fixed;top:5%;right:4%;width:130px;height:200px;
  background:repeating-linear-gradient(135deg,transparent,transparent 28px,rgba(201,169,110,.06) 28px,rgba(201,169,110,.06) 29px);}
body::after{content:'';position:fixed;bottom:8%;left:3%;width:180px;height:80px;
  background:repeating-linear-gradient(0deg,transparent,transparent 16px,rgba(201,169,110,.05) 16px,rgba(201,169,110,.05) 17px);}
```

**原因**: opacity 0.05~0.06 在深色背景上几乎不可见

**修改方案**:
1. 提升 opacity 到 **0.15~0.18**
2. 线条从 1px 加粗到 2px（调整 gradient stop）
3. 适当放大尺寸（width/height 各增加 50%）

---

### 调整④：结果页顶部加入性格本源插画
**用户反馈**: "在结果页头顶最顶部的放大的DISC...把对应的性格本源的插画放进去作为一个背景图"

**当前代码位置**:
- lines 876-894: renderResults() 生成 result-header + result-top-box
- result-header: rh-type 大字号 DISC 类型 + rh-nature 描述
- result-top-box: flex 布局，左雷达右报告

**修改方案**:
在 `result-top-box`（或 `result-header`）中添加当前角色的插画作为极淡背景水印：
1. 在 JS renderResults() 中，给 result-top-box 或里面的 div 添加 inline style `background-image: url(CHAR_IMG[key])`
2. opacity 约 0.03~0.05，不干扰文字
3. background-size: cover，background-position: center

---

### 调整⑤：雷达图浮动布局 + 文字自动避让
**用户反馈**: "雷达图跟正式的情感报告文字都重叠了。雷达图放在框的左上角，占据大概10行左右的位置，文字自动避让"

**当前代码位置**:
- lines 134-145: `.result-top-box` flex 布局
  ```css
  .result-top-box{display:flex;gap:16px;...}
  .result-top-box .rt-radar{flex:0 0 auto;width:130px;}
  .result-top-box .rt-report{flex:1;}
  ```
- lines 886-893: HTML 结构
  ```
  result-top-box > rt-radar(canvas) + rt-report(detailed report text)
  ```

**修改方案**:
1. .result-top-box 改为 **block** 布局（非flex）
2. .rt-radar 改为 **float: left**，设置 width:130px，margin-right:12px，margin-bottom:8px
3. 加一个 min-height 约 140px（10行文字高度）让雷达图有足够空间
4. 去掉 flex:1，文字自然环绕
5. 确保 shape-outside 或 overflow 正确处理

**关键实现细节**:
- .result-top-box: `display:block; overflow:hidden;`（contain float）
- .rt-radar: `float:left; width:130px; margin:0 12px 8px 0;`
- .rt-report: 不需要额外样式，文字自动环绕

---

### 调整⑥：合并4个解锁框为1个
**用户反馈**: "太多框框了，专属角色卡解锁、情感关系解锁、压力状态解锁、适配推荐解锁。你不需要那么多框，就融合做成一个框"

**当前代码位置**:
- lines 897-901: 4个独立的 `analysis-section analysis-lock`
  ```javascript
  h+='<div class="analysis-section analysis-lock" id="section-char">...🎭...</div>'
  h+='<div class="analysis-section analysis-lock" id="section-rel">...💕...</div>'
  h+='<div class="analysis-section analysis-lock" id="section-pressure">...🔥...</div>'
  h+='<div class="analysis-section analysis-lock" id="section-match">...💑...</div>'
  ```

**修改方案**:
1. 4个 section 合并为**1个** analysis-lock：
   ```
   <h4>🔓 完整报告 <span class="unlock-badge">✅ 已解锁</span></h4>
   <div class="lock-overlay">
     <div class="lock-icon">📜</div>
     <div class="lock-title">完整报告已加密</div>
     <div class="lock-sub">输入手机号一键解锁：专属角色卡 · 情感关系 · 压力状态 · 适配推荐</div>
     <input type="tel" placeholder="请输入手机号" maxlength="11">
     <button class="lock-btn">🔓 解锁完整报告</button>
   </div>
   ```
2. 解锁后隐藏 lock-overlay，同时显示所有4项内容
3. 对应的 CSS 简化
4. 注意原来的 `id="section-char"` 等不再需要，改为一个统一的 section

**注意项**: 
- unlock 逻辑（applyUnlock/renderUnlockReport）已切换到 screen-report，所以这里只是结果页上的锁定状态展示
- 当前4个 section 各自触发的都是同一个 `showUnlock()` 弹窗，所以合并后逻辑不变

---

## 五、执行策略（并行派发3个Agent）

```
主任务框（指挥）
├── Agent A: ①卡片比例 + ②提示语位置 + ③金色背景增强
│   → CSS + HTML结构调整，单文件修改
├── Agent B: ④插画背景 + ⑤雷达浮动布局
│   → CSS + JS renderResults() 修改
├── Agent C: ⑥合并解锁框
│   → CSS + JS renderResults() 修改
└── 汇总 → 打开浏览器 → 用户确认
```

Agent A/B/C 无依赖关系，**同时并行执行**。每个 Agent 只改 index.html 一个文件，彼此不冲突（操作不同代码段）。

---

## 六、验证清单

- [ ] 角色卡 unlock 后显示比例是否正确（QR缩小、文本区紧凑）
- [ ] 测试页面提示语在最顶部可见
- [ ] 背景金色条文清晰可见（opacity 提升后）
- [ ] 结果页 top-box 有角色插画底纹
- [ ] 雷达图在左上角浮动，文字自动环绕无重叠
- [ ] 4个解锁框已合并为1个，解锁后所有内容展开
