# PROGRESS.md — 项目进度账本

> 每次会话收工前必须在「会话记录」末尾追加一节(总纲 §6)。

## 项目简介

《云端机库 · 中国民航 3D 图鉴》:面向中国民航爱好者的纯静态 3D 图鉴平台。
原生 HTML + CSS + JavaScript(ES Module)+ Three.js r160(CDN importmap,版本锁死),
禁止框架 / 构建工具 / 二进制资源,一切视觉素材由代码运行时程序化生成。
目录结构与全部铁律见《00-项目总纲》。

## 已完成阶段

| 阶段 | 内容 | 完成日期 |
| ---- | ---- | -------- |
| P0 | 站点基座:路由 / 设计系统 / 3D 场景基座 / 机库首页(占位机)/ 占位页 | 2026-10-25 |
| P1 | 参数化建模引擎 → 全量真实 GLB 模型(参数化退役,9 变体) | 2026-10-25 |
| P2 | 涂装引擎(定稿:真实涂装 GLB 整体换装;初稿 Canvas 贴面方案废弃) | 2026-10-25 |
| P5 | 机场图鉴:18 座机场数据 + 列表/详情/地图三视图 + 程序化跑道布局图 | 2026-10-26 |
| P7 | 部署上线 GitHub Pages(运行时资产全量入库方案) | 2026-10-25 |
| P3 | 部件热点图鉴:partId 命名/空间双通道重建 + 30 知识卡 + 左清单右卡片 UI | 2026-10-26 |
| P6 | 民航百科 40 词条 + 题库 120 题 + 答题闯关/收集仪表盘/10 徽章成就 | 2026-10-26 |
| P4 | 舱内漫游:驾驶舱(6 屏/演示/口令)+ 客舱(第一人称/细节) | 2026-10-28 |
| P10 | 多语言:10 语种运行时 DOM 翻译 + IP 首访语言探测 | 2026-10-31 |
| P11 | 友情链接:页脚友链行 + #/links 分组卡片页(10 语种全覆盖) | 2026-11-01 |

## 待办

- [ ] P1 参数化建模引擎 + 机型查看页(替换占位机,数据迁入 data/aircraft/)
- [x] P2 涂装引擎(真实涂装 GLB 方案)
- [x] P3 部件知识卡(parts)——2026-10-26 本会话验收通过(9 机型×30 部件覆盖、UI 全链路、控制台零报错);核心文件由并行 P5 会话代提交 c6b8dca,本会话后续修复已含在该提交中
- [x] P4 舱内场景(驾驶舱 / 客舱)——2026-10-28 完成(CSS §P4 + 用户反馈整改 + 两舱全流程实测通过)
- [x] P5 机场图鉴
- [x] P6 百科 + 答题 / 成就 / 收集——2026-10-26 本会话完成(40 词条 + 120 题 + 晋级/徽章/仪表盘,IAB 全链路验收)
- 其余阶段划分以提示词包为准

## 遗留问题

- **~~b738 垂尾位置 bug~~(2026-10-26 证伪,非模型缺陷)**:实测源 GLB 垂尾三网格(Mesh_059/251/060)位于尾端(z=−12.4~−17.9),此前"渲染在机头端 z≈+7.4~19.7"是把盲翻转后的坐标套了"机鼻 +Z"契约得出的误判(翻转后机鼻实际在 −Z,+z 端即机尾)。随归一化盲翻转移除一并了结,模型无需重导出。
- **P2 换装引擎级隐患(未触发)**:`loadGltfTemplate` 按 URL 缓存且 `normalizeAircraft` 重复应用 scale(同 URL 二次加载 = 2 倍缩放),触发场景:A→涂装B→切回A。P3 的 rebind 走"换装后新 URL"路径未触发;彻底修复需改 engine/gltfModel.js(缓存 clone 或归一化标记)。
- b748 的 FLG_* 襟翼连杆整流罩被空间分类归入"翼身整流罩"(33 个),语义上归襟翼更准;观感无碍,暂留。
- 涂装覆盖:b788 有 10 款(海航/南航/厦航/国航 + 波音演示 + 法/英/美/日航司),其余变体仅原厂涂装;737NG 东航 CES、A320 系国航等贴图已定位未转换(见"给下一会话的建议")。
- FG 涂装模型(FlightGear 787-8)为低多边形且起落架姿态/取景基线与 FR24 模型不同,换装后观感与取景待调优;换装功能本身已可用(色卡/下拉/品牌联动/seenLiveries)。
- 特殊彩绘(熊猫号/联合梦想号等 8 款已核实真实存在)暂无现成贴图,未实现。

## 会话记录

### 2026-11-01 · P11 友情链接:页脚友链行 + #/links 分组卡片页

- **所用模型**:GLM-5.3Flash
- **用户要求**:给站点做友情链接。
- **本次完成项**:
  - `js/ui/links.js`(新):#/links 友情链接页,四组卡片——官方机构(民航局/ICAO)、数据与航班追踪(飞常准/航旅纵横/Flightradar24/FlightAware)、图库与爱好者社区(民航资源网/Airliners.net/Planespotters.net/JetPhotos)、素材来源与开源项目(FGMEMBERS/FlightAirMap-3dmodels/Three.js/GitHub Pages,兼作开源许可对外展示);页尾「申请友链」卡片指向 GitHub Issues(口径:民航科普与航空文化类站点优先)。所有外链 target=_blank + rel=noopener。
  - `index.html`:页脚新增 `.footer-friends` 友链行(4 个代表站 + 「全部友情链接」入口),标签冒号由 CSS ::after 生成(避免文本节点带标点破坏 i18n 键匹配)。
  - `js/main.js`:路由表加 `links`(nav 空,不占主导航高亮);header 注释同步。
  - `css/main.css` §FRIENDS:页脚友链行(flex 换行居中)+ 友链页样式(auto-fill 卡片栅格/悬浮上浮/名称溢出省略)+ RTL 修正(域名与外链站名 direction:ltr embed,内链「全部友情链接」不强制方向)。
  - **i18n 全覆盖**:28 条 CJK 文案(页面标题/4 组名/14 条站点描述/申请友链文案/5 个中文站名等)补入全部 9 个语言包(键=简中源文案,与 links.js 渲染文本严格一致,脚本校验通过);纯拉丁站名(Flightradar24/Three.js 等)由 CJK_RE 天然跳过,无需键。links 页为界面级文案、无深度内容,故**不加入** contentNotice 的"暂仅中文"提示路由列表。
- **本地实测(8046 端口,IAB;注意 #lang-btn/#lang-item locator click 会超时,改 evaluate 里 click 即可)**:中文页四组卡片/申请友链/页脚友链行渲染 ✓;英语全链路翻译(卡片名 CAAC→Civil Aviation Administration of China、飞常准→VariFlight 等)✓;阿拉伯语 dir=rtl 布局镜像 + 域名保持 LTR ✓;切回 zh-CN 后 header/footer 快照还原正常 ✓;路由往返(机库↔友链)window error/unhandledrejection 捕获零报错 ✓;375px 窄屏单列正常 ✓。
- **改动文件**:`js/ui/links.js`(新)、`js/main.js`、`index.html`、`css/main.css`、`js/locales/`×9、`PROGRESS.md`。
- **给下一会话的建议**:友链收录口径与 GitHub Issues 入口集中在 `links.js` 顶部 GROUPS/GITHUB_ISSUES 常量,增删站点只改这一个文件(新增中文文案记得 9 个语言包同步补键);若未来加英文站名描述,纯拉丁文本不需要进语言包。

### 2026-10-31 · P10 一键切换语言:10 语种界面国际化(简中/繁中/英/法/俄/阿/西/日/朝/印地)

- **所用模型**:GLM-5.3Flash
- **用户要求**:面向全球爱好者,做一键切换语言,首期含简体中文、繁体中文、英语、法语、俄语、阿拉伯语、西班牙语、日语、朝鲜语、印地语。
- **架构决策(核心:运行时 DOM 文本翻译,页面代码零侵入)**:
  - 全站约 2200 处中文串、273 个唯一文案,逐处改 `t()` 调用回归风险高;改为 **`core/i18n.js` 运行时翻译**——`applyDOM()` 用 TreeWalker 遍历渲染后的文本节点 + title/placeholder/aria-label 属性,按「语言包词典」整体替换(zh-CN 为源语言恒等);MutationObserver 兜底覆盖晚插入节点(toast/成就弹窗/命令面板/异步渲染块)。
  - 语言包键 = 简中源文案(与渲染后文本节点一致),`{}` 占位符支持插值模式匹配(正则捕获组原样回填);`t()` 供 confirm()/拼接等拿不到 DOM 的少量场景。
  - **数据名称映射 `js/locales/names.js`**(工具生成,446 条):机场/航司/部件用数据自带 `en` 字段,78 款机型目录名由厂商 EN+型号合成,所有非简中语言共用;zh-TW 另有字符级简→繁映射(NAMES_TW,446 条转换零残留,双→雙/云→雲/萨→薩/鲁→魯/达→達/飞→飛/圆→圓/邮→郵/机→機/桥→橋/沈→瀋等约 150 字表)。
  - 语言检测:navigator.languages(zh-Hant/HK→繁中,前缀匹配其余)→ `cav3d.lang` 持久化 → 首访自动选语言;切换器在 header(地球图标+当前语言名,下拉 10 项原生名);langchange 时 header/footer 从快照还原后按新语言重译、路由重渲染。
  - 阿拉伯语 RTL:`html[dir=rtl]` + §I18N 的少量修正(kbd/拉丁混排 embed、HUD 角框 direction 保护);flex 布局自动镜像,实测布局正常。
  - **深度内容暂仅中文**:百科正文/题库/机场冷知识/部件知识卡/法律文本为数据内容,非简中语言下在 `#i18n-note-slot`(专用槽位,置于 #app 外——曾放 #app 内被机场页异步整体重写冲掉)挂提示条,由 main.js 按路由(wiki/game/airports/aircraft/terms/privacy/cookies)开关。
- **本次完成项**:`js/core/i18n.js`(核心)、`js/locales/`(9 语言包 ×约 450 键 + names.js,含分类名/状态模式"停产{}"等/机型家族/hero 组合键/同意横幅组合键)、`index.html`(切换器+槽位)、`js/main.js`(i18n 启动/渲染后翻译/langchange 重渲染)、`js/ui/airports.js`(省分组"座"→"座机场",消除与座位数歧义)、`css/main.css` §I18N。
- **本地实测(8181,IAB;注意 8180 曾遇 IAB 顽固缓存——index 新而 main.js 旧,换端口解决)**:zh-CN 默认渲染与切换器 ✓;切英语后 nav/hero/机队卡描述/机场列表(287 卡英文名+分省标题"Beijing 2 airports")/机场 head/百科(标题/搜索框/六分类)/成就中心(等级 Cadet/徽章墙/仪表盘)/对比页(注释/交换/表格标签)/查看页(标题 Boeing 737-800/参数表/相机预设)全链路 ✓;reload 持久化 ✓;阿拉伯语 dir=rtl + 布局镜像截图核验 ✓;同意横幅组合键 ✓;切回 zh-CN 全部还原 ✓;控制台零报错。
- **踩坑**:①提取器对"插值表达式含 <>"的模板有盲区,约 20 条动态串(三元/拼接)不入键表——已人工核对补入语言包(○●已浏览/查看成绩→/晋升「{}」等);②同一文本节点含多句时需补"组合键"(hero 两句、同意横幅两句+详见);③main.js 编辑时曾丢 `const note = contentNotice();` 声明,靠 MutationObserver 兜底翻译掩盖了 ReferenceError——提示条不出现才暴露;④"{} 座"在省份分组(机场数)与对比页(座位数)撞语义,改源码为"座机场"。
- **改动文件**:`js/core/i18n.js`(新)、`js/locales/`(新:9 语言包+names.js)、`index.html`、`js/main.js`、`js/ui/airports.js`、`css/main.css`、`PROGRESS.md`。
- **遗留/建议**:①百科正文/题库/机场 facts/部件卡/法律文本 9 语翻译是大工程,提示条已声明,建议后续分批(可先用离线任务跑 wiki 40 词条);②搜索索引仍按中文名,英文搜索暂不可用(可加 en 字段入索引);③地图 SVG 打点标签用 names 映射已英化,跑道图内 canvas/3D 场景 canvas 文字(驾驶舱仪表等)未翻译;④zh-TW 数据名称为字符映射,个别多字词(如"信息/软件"类)未做短语级校正;⑤城市名(city 字段)暂未翻译;⑥数据变更后需重跑名称生成脚本(TMP/i18n/gen2.mjs 思路,建议后续把脚本收进仓库 dev/ 目录)。

### 2026-10-31 · P10.1 默认语言按 IP 归属地自动选择(纯 IP,不看浏览器语言)

- **所用模型**:GLM-5.3Flash
- **用户要求(两轮收敛)**:先问"能否按用户 IP 自动切到所在地主要通用语言,不属于这 10 种的默认英语";初版做的是"浏览器语言命中优先、不命中才 IP",用户随后明确**"不要看浏览器,都走 IP"**——定稿优先级:**URL ?lang= 参数 > 已保存手动选择 > IP 归属地主要语言 > 英语**。
- **实现**(`core/i18n.js`):
  - `langForCountry(cc)` 纯函数 + `LANG_BY_COUNTRY` 映射表(23 例单测全过):zh-CN(中国大陆/新加坡)、zh-TW(台港澳)、fr(法/比/卢/摩/西非法 11 国)、ru(俄/白俄/哈/吉)、es(西班牙+拉美 20 国+赤几)、ar(22 阿拉伯国家)、ja(日)、ko(韩朝)、hi(印度);**未列出国家一律英语**。
  - IP 接口 **get.geojs.io**(免费/HTTPS/CORS/无密钥,返回 `{country:"CN"}`),AbortController 1.2s 超时,失败/超时→英语;国家码存 `cav3d.geo`(cc+时间戳)缓存 **30 天**,避免每次访问都请求。
  - **自动探测结果不写 `cav3d.lang`**(只有手动切换/URL 参数才持久化)——旅行者回国自动回正确语言;URL `?lang=xx` 视为明确选择并持久化(也可作为分享链接与测试通道)。
  - 隐私政策"三、第三方服务"新增 get.geojs.io 披露 li(9 语翻译同步)。
- **IAB 实测(8183)**:①全新访客(清 localStorage)→ geojs 返回 CN → 默认简中且 `cav3d.lang` 为空 ✓;②`?lang=fr` → 法语 + 持久化 ✓;③清手动选择+伪造缓存 JP → 日语(零网络)✓;④缓存 BR(葡语区,不在映射表)→ 英语兜底 ✓;隐私页新条款渲染且随语言翻译 ✓。
- **注意**:IP 探测只在首访无保存选择时发一次;geojs 被墙/无网时约 1.2s 超时后落英语,中文用户不受影响场景仅剩"无网+无选择"(此时本就无法翻译)。国内用户实测 geojs 可达性如有问题,备选:ipwho.is / freeipapi.com(同为 HTTPS+CORS 免费接口,替换 `geoCountry()` 一处即可)。
- **改动文件**:`js/core/i18n.js`、`js/ui/legal.js`、`js/locales/*.js`(9 包披露条款)、`PROGRESS.md`。

### 2026-10-31 · P9.1 反馈修复:搜索面板真关不掉(根因 CSS)+ 地图缩放/平移 + 机型对比全目录 78 款

- **所用模型**:GLM-5.3Flash
- **用户反馈**:①搜索面板退出不了;②机场地图要能缩放;③机型对比扩充为全系列主要民航机型(波音/空客/巴航/ATR/德哈维兰/商飞/麦道/图/安/伊尔/苏霍伊等)。
- **①搜索"关不掉"根因(用户报告属实,比表象更深)**:关闭逻辑(hidden 属性)一直生效,但 `.cmdk-overlay { display:flex }` 是作者样式,压过浏览器 UA 对 `[hidden] { display:none }` 的默认规则,面板逻辑上已关、视觉上永驻。**修复 = 一行 `.cmdk-overlay[hidden] { display:none }`**。同时补齐三通道退出:✕ 关闭按钮、点卡片以外任意遮罩区、Esc 全局监听(焦点不必在输入框)。实测 computed display 随 hidden 正确切换 ✓。
- **②地图缩放/平移**:SVG viewBox 直操——右上角 ＋/－/复位 按钮(视图中心锚)、滚轮以光标为锚缩放(passive:false)、按住拖拽平移(pointer events + clamp 到地图范围);拖拽移动过的点击在捕获阶段吞掉,防拖完松手误跳详情。事件委托挂在 document,列表↔地图切换重渲染后依然生效。实测按钮/合成 wheel/合成 pointer 拖拽/复位/防误点全 ✓。放大后标签自然拉开,密集区(华东)观感显著改善。
- **③机型对比全目录**:`data/aircraft-catalog.json` 新建,78 款 × 12 厂商(波音 22/空客 21/巴航工业 8/ATR 2/德哈维兰加拿大 3/中国商飞 3/麦道 5/图波列夫 3/安东诺夫 3/伊柳申 3/苏霍伊 1/其他经典 4 含福克 70/100、Avro RJ100、协和号)。字段:oem/family/model/id/cn/first(首飞年)/status/length/span/height/seats(典型两级)/engines/engineCount/cruise/mtow/approx。**数据口径:公开资料整理的参考值,页面脚注声明"以厂商官方为准";不确定条目 approx=true(俄系/E2/MAX7·10/C929 等约 40 款)**;9 个真实 GLB 变体 id 保持与 GLB_VARIANTS 一致(b738/b789/a20n/a21n/a332/a333/b788/a359/b748),对比页标题可跳 3D 查看页。compare.js 重写:下拉按厂商 optgroup 分组、默认 737-800 vs A320neo、12 行参数并排 + 5 指标条形、approx 条目显示"约"角标、页头显示"78 款机型 · 12 个厂商"。数据文件已过 JSON 结构校验(字段完整/id 无重复)。
- **测试坑**:CUA 的 scroll/drag 送不进 IAB 页面(合成 WheelEvent/PointerEvent 验证替代);SVG 元素无 .click() 方法(HTMLElement 专属),须 dispatchEvent(MouseEvent);evaluate 只收单表达式(多语句用 `(function(){...})()` 包裹可以)。
- **改动文件**:`js/ui/search.js`、`js/ui/airports.js`、`js/ui/compare.js`(重写)、`data/aircraft-catalog.json`(新建 78 款)、`css/main.css`、`PROGRESS.md`。
- **遗留**:①目录数值多为单源整理,欢迎社区纠错(可在 CREDITS/条款口径下迭代);②C929/MAX7/MAX10/E175-E2 等在研机型数据随进展更新;③地图拖拽在触屏上未做双指捏合(按钮可用);④目录与机库卡片两套数据源并存,未来可统一。

### 2026-10-31 · P9 体验升级包:换装缩放修复 + 地图标签避让 + 导出/导入 + 每日一题/错题本 + 收藏夹 + Ctrl+K 搜索 + 机型对比

- **所用模型**:GLM-5.3Flash
- **用户要求**:按上轮建议清单进行网站改进升级(本机账号/法律文档 P8 已完成)。
- **技术债清偿**:
  - **换装双倍缩放(P2 遗留,已彻底修复)**:`buildGltfAircraftUrl` 改为每次 `(await loadGltfTemplate(url)).clone(true)`——缓存模板永不被 `normalizeAircraft` 原地改写 scale/rotation,同 URL 二次加载(A→涂装B→切回A)不再叠加缩放;clone(true) 共享几何/材质,显存不翻倍。页内回归测试:同 URL 双取模板,归一化克隆后模板 scale 仍为 1 ✓。
  - **地图标签重叠(P5 遗留,大幅缓解)**:`mapHTML` 重写打点标注——按规模分(航站楼×2+跑道数)降序抢占标签位,四向候选(右/左/上/下)矩形碰撞检测,全碰撞则隐藏常驻标签(287 点实测 139 显/148 隐),`.ap-lbl.off` + 悬停/聚焦强制显示兜底;圆点 halo 9→7。
- **新增功能**:
  - **进度导出/导入**(个人中心·账号管理):导出全部 `cav3d.*` 键为带版本头的 JSON 下载(`waitForEvent("download")` 实测触发 ✓);导入校验 app/version/前缀 → confirm 覆盖 → 先清后写(删除性同步)→ reload。IAB 不支持 file chooser,导入实测留待真浏览器。
  - **每日一题 + 错题本**(成就中心):题目以 quiz.json 下标为稳定 ID;每日一题按本地日期串哈希出题(当日全站同题,`cav3d.daily` 记录后锁定,显示对错+解析);闯关答错自动入本(`cav3d.wrongBook`,去重),hub 显示计数,"错题重做"以错题为题池开局,答对即销账(实测 [0,5,12]→答对 12→[0,5] ✓)。
  - **收藏夹**:`core/favs.js` 三类(aircraft/airport/wiki)存 `{id,name}`,收藏时记录展示名,个人中心汇总免回查数据文件;viewer 机型参数区/机场详情 hero/词条详情头部各一枚星标 chip(`favChipHTML`+`bindFavChips` 共用,键盘可达),个人中心"我的收藏"分组展示;兼容历史裸字符串 id。
  - **全站搜索 Ctrl+K**(`ui/search.js` 命令面板):索引懒构建(首次打开才拉 loadAllVariants + airports/wiki JSON),标题前缀>包含>hay 包含三级评分 + 权重,前 12 条;↑↓/Enter/Esc 键盘导航,header 搜索按钮同入口;实测"c919"→词条、"海拉尔"→机场、点击跳转+关闭 ✓(注:IAB 外壳拦截真实 Ctrl+K,合成事件已验证处理逻辑,真浏览器无碍)。
  - **机型对比 `#/compare`**(`ui/compare.js`):双下拉 + 交换按钮,9 行参数并排表 + 5 项指标双向条形(较大值=100%);入口:机库 hero"机型对比"、个人中心快捷入口、路由归"机库"高亮。首版 bug:"家族"行缺 fmt 抛 TypeError 被 catch 吞成错误卡,已修。
- **改动文件**:`js/engine/gltfModel.js`、`js/ui/airports.js`、`js/ui/game.js`、`js/ui/account.js`、`js/ui/viewer.js`、`js/ui/wiki.js`、`js/ui/hangar.js`、`js/main.js`、`index.html`、`css/main.css`,新增 `js/core/favs.js`、`js/ui/search.js`、`js/ui/compare.js`、`PROGRESS.md`。
- **本地实测(8161,IAB)**:机库 hero 3D/搜索按钮/对比入口 ✓;viewer b738 三角数 24,998 正常+星标 ✓;对比页 9 行 5 条+交换 ✓;地图 287 点/139 显 148 隐/PEK 跳详情 ✓;每日一题出题→作答→锁定→次日状态 ✓;错题重做开局→销账 ✓;三类收藏 toggle+个人中心汇总 ✓;导出下载 ✓;全流程控制台无报错。
- **遗留/建议**:①导入流程真浏览器过一遍(IAB 无 file chooser);②收藏/错题本未入成就徽章体系,可加"收藏家"徽章;③地图标签在特别密集区(华东)仍可再叠加缩放分级;④Ctrl+K 真浏览器键盘实测;⑤机场数据 ~80 座 approx 校核与本轮无关,仍挂账。

### 2026-10-31 · P8 账号系统 + 法律文档(注册/登录/个人中心/条款/隐私/Cookie/同意横幅)

- **所用模型**:GLM-5.3Flash
- **用户要求**:做用户注册登录界面,以及服务条款、Cookie 等法律页面。
- **架构决策**:站点为 GitHub Pages 纯静态、无后端,故实现**本机账号**(纯前端):凭据(用户名 + 16 字节随机盐 + WebCrypto SHA-256 哈希)只存访客浏览器 localStorage(`cav3d.users`/`cav3d.session`),不上服务器;页面文案对用户明确说明。未来接 Supabase Auth 等真后端时只需保持 `core/auth.js` 导出签名替换实现。
- **本次完成项**:
  - `js/core/auth.js`:注册/登录/登出/注销本机账号;用户名校验(2-20 字中英文数字下划线)、密码 ≥6 位、两次一致性、密码不含用户名;`cav3d:authchange` 事件驱动 header 刷新;validateUsername/validatePassword 导出。
  - `js/ui/auth.js`(#/login、#/register 双 tab 卡片):注册需勾选同意三份法律文档(未勾选前端拦截);成功 toast + 跳 #/account。
  - `js/ui/account.js`(#/account):头像/注册与最近登录时间/等级 chip、七格进度仪表盘(与成就中心同口径,liveries/airports/wiki 从数据文件动态计算)、快捷入口、退出登录、二次确认式注销本机账号;未登录渲染引导卡。
  - `js/ui/legal.js`(#/terms、#/privacy、#/cookies):服务条款(非商业性质/本机账号/知识产权—航司商标归权利人/使用规范/免责)/隐私政策(不收集个人数据、仅 localStorage、GitHub Pages 与 jsDelivr 标准日志)/Cookie 说明(本站不用 Cookie,仅 localStorage,含键位表);三页互切 nav。
  - `js/core/consent.js` + main.js 启动调用:首访底部同意横幅(说明仅用 localStorage),点"知道了"记 `cav3d.consent`,之后不再打扰。
  - `js/main.js`:新增 6 条路由;header 右侧 `#header-auth` 徽标(未登录"登录 / 注册"按钮/已登录头像 chip),监听 authchange。
  - `index.html`:header 账号槽位;footer 增加三份法律文档链接。
  - `css/main.css` 末尾追加 §AUTH(header 徽标/登录卡/个人中心/法律文档排版/横幅)。
- **关键修复**:横幅初始用 `left:50%+translateX(-50%)` 居中,被 `fadeUp` 关键帧 `transform: translateY(0)` 覆盖导致右偏——改为 `left:0;right:0;margin:0 auto`(不复用 transform 居中)。
- **本地实测(8153,IAB)**:注册(含未勾选拦截)→自动登录→个人中心数据齐;登出→header 复位;错误密码报"密码错误";正确登录恢复;localStorage 凭据仅 salt(32 hex)+hash(64 hex),全文无明文密码;连续 reload 会话保持;三法律页 + Cookie 键位表渲染正常;未登录 #/account 引导卡;横幅首现/记录/复现逻辑正确。控制台无报错。
- **测试环境坑(非代码 bug)**:IAB webview 在多次 reload 间可能恢复旧 hash 历史条目,曾误现"已登出"假象,干净复测会话稳定;evaluate 只接受单表达式(多语句 IIFE 报 SyntaxError);横幅未关时会遮挡表单提交按钮(locator click 超时),先关横幅再操作。
- **改动文件**:`js/core/auth.js`、`js/core/consent.js`、`js/ui/auth.js`、`js/ui/account.js`、`js/ui/legal.js`、`js/main.js`、`index.html`、`css/main.css`、`PROGRESS.md`。
- **遗留/建议**:①本机账号无跨设备同步与找回,页面已如实提示,真账号体系建议接 Supabase(免费层够用);②个人中心进度仪表盘与成就中心口径重复,未来可把 getTotals 抽到 core 共享;③同意横幅会短暂遮挡页面底部内容,可考虑改为顶部细条。

### 2026-10-31 · 机场图鉴三轮扩容(165→287 座,全国支线全覆盖)+ 机场名更正

- **所用模型**:GLM-5.3Flash
- **用户要求**:①更正三座机场名(海拉尔非"东山"、乌鲁木齐为"天山"非"地窝堡"、库尔勒为"梨城");②按省补齐全国支线机场(用户点名约 120 座)。
- **数据规模**:165→**287 座**,34 省级区域全覆盖;新增内蒙古 10/新疆 19/台湾 8/贵州 8/黑龙江 8/云南 5/吉林 4/湖南 5 等共 122 座。
- **数据核实(多渠道轮换)**:curl 直抓本轮全灭(快懂 404/360 反爬/搜狗 antispider/百度百科屏蔽 curl/必应 JS 渲染),改用**内置浏览器打开百度百科词条页逐座提取 IATA/ICAO/标高**,核实约 60 座(含新疆全部新机场:莎车 QSZ/ZWSC、阿拉尔 ACF/ZWAL、于田 YTW/ZWYT、红其拉甫 HQL/ZWTK、巴音布鲁克 HJB/ZWHJ、奇台 JBK/ZWQT、巴里坤 DHH/ZWLK、昭苏 ZFL/ZWZS、阿勒泰雪都 AAT/ZWAT 等;邢台 XNT/ZBXT 2024 通航、朔州 SZH/ZBSG、丽水 LIJ/ZSLI 2025 通航、蚌埠滕湖 BFY/ZSBA 2026 通航、瑞金 JRJ/ZSRJ、铜仁德江 DEJ/ZUDJ、三沙永兴 XYI/ZJYX、巫山 WSK(非 WSN)/ZUWS 等);其余按权威常识撰写并记 approx 待核。台湾离岛仅南竿 LZN/RCFG、望安 WOT/RCWA 核实,其余 ICAO 为通行值。
- **顺手修正旧账 4 处**:**阿克苏红旗坡 ICAO ZWAT→ZWAK**(原值实为阿勒泰,见上)、广元盘龙 ZUGY→ZUGU、林芝米林 ZULS→ZUNZ(原值与拉萨撞码)、井冈山 ZSJG→ZSGS(原值与济宁大安撞码)。ICAO/IATA 现已零重复。
- **更名落实**:地窝堡→**乌鲁木齐天山国际机场**(2024 更名)、东山→**呼伦贝尔海拉尔机场**(复名)、**库尔勒梨城机场**,facts 同步改写;茫崖机场现名"海西茫崖机场"(原花土沟,HTT/ZLHX)。
- **口径说明**:秦皇岛北戴河(BPE)上轮已收录故未重复;用户所述"腾冲景迈"实为澜沧景迈(腾冲驼峰已在库),已按澜沧收录并说明。仪表盘徽章门槛与收集进度由数据文件动态计算,本次无需改 JS;UI 仅列表/详情自动带出新记录(详情页"跑道布局图"对新纪录同样生效)。
- **本次完成项(补)**:`js/ui/airports.js` 详情路由键改为 `apId()=iata||icao||encodeURIComponent(cn)`,5 座暂无 IATA 的机场(四平勤业/盘州官山/府谷府州/定边/宝鸡凤翔)卡片与地图打点可正常进详情;无 IATA 详情表显示"—(暂未获配)"。
- **改动文件**:`data/airports.json`、`js/ui/airports.js`、`PROGRESS.md`。
- **本地实测(8112,注意换端口绕模块缓存)**:列表 287 座/34 省组;四平勤业、宝鸡凤翔(中文名兜底路由)、红其拉甫 HQL(海拔 3258 chip)、海拉尔 HLD、天山 URC 详情全通过;地图 287 打点。
- **遗留**:①新增记录约 80 座记 approx(标高/跑道/通航年多为一手常识值),可二次校核;②地图模式 287 点,标签重叠加剧(原 165 点已列待办),需聚合避让;③盘州官山/府谷/定边/宝鸡凤翔/四平勤业暂无公开 IATA(留空);宝鸡凤翔、铜仁德江在建/待投运,opened 为计划年。

- **追加(同日反馈)**:返回图鉴列表自动定位——详情页把路由键记入 `cav3d.lastAirport`(localStorage),列表渲染 60ms 后 smooth `scrollIntoView` 居中 + 2s 蓝色脉冲高亮(`.ap-focus`,§P5.2),450ms 兜底校验对抗 hash 导航滚动恢复打断;列表/地图模式切换不触发,搜索态不触发。实测 HLD/XYI 返回均落位。
- **改动文件(追加)**:`js/ui/airports.js`、`css/main.css`。

- **追加(同日反馈②货运航司基地标注)**:liveries.json airlines 46→**51 家**,新增 5 家货运航司色卡芯片(暂无 LOGO,同 baw/ana 色块兜底):sf 顺丰航空/jg 京东航空/cao 中国国际货运航空/ck 中国货运航空/fx 联邦快递;hubs 标注(经百度百科核实):**鄂州花湖=顺丰航空**(用户指出,顺丰货运枢纽)、**深圳宝安=顺丰航空**(主运营基地,词条原文核实)、**南通兴东=京东航空**(主运营基地,IATA JG/ICAO JDL)、**上海浦东=国货航(远程货机主运营基地)+中货航(浦东/虹桥运营基地)**、**广州白云=联邦快递**(亚太转运中心,通行常识未单独核);中国邮政航空/圆通航空/中州航空基地未核实暂不标。实测 EHU/PVG/NTG/CAN/SZX 详情页芯片渲染正常。
- **改动文件(追加)**:`data/liveries.json`、`data/airports.json`。

- **追加(同日反馈③LOGO 补齐)**:7 家无 LOGO 航司全部补图——sf/jg/cao/ck/fx(货运 5 家)+ baw/ana(2026-10-26 下载失败的坏文件替换),百度图片搜索(image.baidu.com,360 图片接口限流后切换;浏览器搜页 evaluate 提取 img src→curl 下载)→PIL 白底修边/裁水印(头条号/socologo/品牌星球)/长边≤800→assets/logos/*.png;liveries.json 51 家现全带 logo。实测 EHU/SZX/NTG/PVG/CAN 芯片 img naturalWidth 全 >0。注意:候选图同图源有白底/黑底变体,目检时别选错(cao 曾误用黑底版返工)。
- **改动文件(追加)**:`assets/logos/`(7 png)、`assets/CREDITS.md`。

### 2026-10-29 · 机场图鉴二轮扩容(52→165 座,分省视图)+ 港澳台与 10 家新航司 LOGO

- **所用模型**:GLM-5.3Flash
- **用户要求**:①机场数增至至少 120,国内 4C 级及以上尽量全覆盖;②按省分组显示;③加港澳台;④新增基地航司 LOGO 按老规矩(国内源、登记、CREDITS)补齐。
- **数据规模**:52→**165 座**,覆盖 **34 个省级区域**(31 省区市 + 港澳台),全部数据带新 `province` 字段;含 4F(京沪蓉港桃园)、高高原全部五座(拉萨/邦达/阿里/稻城/康定群系)、离岛与海岛机场(舟山/博鳌/金门/马公/澎湖)。
- **数据核实**:快懂百科逐座抓取 113 座(前 60 座成功后触发验证码,360 百科接力 5 座,搜狗摘要兜底 4 座,其余 18 座以权威常识撰写并全量 approx 标注待核);修正:贵阳 IATA=KWE、达州金垭 2022 通航、湛江吴川 2022"一夜转场"、无锡正名等。
- **本次完成项**:
  - `data/airports.json`:+113 座(批次 A 华北东北西北 49/B 华东港澳 15/C 中南西南 27/D 港澳台与散补 22),全部含 province;note 更新为 165 座口径。
  - `js/ui/airports.js`:列表页**按省分组**(PROV_ORDER 固定顺序,组内拼音排序,空组隐藏,搜索含省份关键词);详情 hero 新增"省份 · 城市"chip;修复搜索回调引用旧函数名(gridHTML→provGroupsHTML)导致的过滤失效 bug。
  - `css/main.css` §P5.2:ap-prov/ap-prov-title 分组样式。
  - **10 家新航司 LOGO**:ci(中华)/cx(国泰)/br(长荣)/jx(星宇)/it(台湾虎航)/b7(立荣)/nx(澳门)/hx(香港航空)/uo(香港快运)/a6(湖南),360 图片搜索+候选目检,ci/uo/a6 裁除水印;`data/liveries.json` airlines 现 **46 家**;来源记入 CREDITS.md。
  - **IAB 实测(8042)**:列表"165 座 · 覆盖省级区域 34 个"+ 分省标题(北京 2 座→…→台湾 8 座)渲染正常;搜索"台湾"→仅台湾组 8 卡,清空恢复 165;TPE 详情页省份 chip、4 家台系航司 LOGO 全部 naturalWidth>0;地图模式 165 打点;数据/LOGO 全 200。
- **改动文件**:`data/airports.json`、`data/liveries.json`、`js/ui/airports.js`、`css/main.css`、`assets/logos/`(新增 10 png)、`assets/CREDITS.md`、`PROGRESS.md`。
- **遗留**:
  1. D 批 18 座(赣/鄂/湘剩余+台湾 8 座等)数值多为 approx,快懂/360 解封后可二次校核;台湾机场跑道编号全部为近似标注。
  2. 徽章「机场通」门槛自动变 165。
  3. 地图 165 点密集区(沪宁杭/成渝/珠三角)标签必然重叠,需下轮做聚合或缩放避让。
  4. 保山基地航司湖南航空(a6)标志为过渡版(英文仍 Air Travel),如航司换标需更新。
- **给下一会话的建议**:地图模式若要支持 165 点,优先做按缩放级别的标签避让或点聚合;省份组标题可加锚点跳转;quiz 历史与机场类可借 165 座扩题。

### 2026-10-29 · 题库扩容加难(120→260)+ 机场图鉴扩容(18→52)+ 基地航司写全与 LOGO 补齐

- **所用模型**:GLM-5.3Flash
- **用户要求**:①增大题库量与难度;②机场图鉴新增到至少 50 座中国机场;③机场数据真实性/逼真性/完整性/全面性、基地航司写全、缺图标的上网找并按原规则显示;④不连外网,只用国内源(百度/必应国内/搜狗/360 等)。
- **数据核实方式**:三路并行研究代理(两组因并发上限失败,后一组成功返回西部 11 座数据);主会话以快懂百科(baike.com)逐座抓取 34 座条目原文并逐句蒸馏核实,修正多处记忆错误(贵阳 IATA 实为 **KWE**、无锡正名**无锡硕放机场**、桃仙为单跑道、哈尔滨 2025-01 东二跑道投运成东北首个双跑道、武宿 1971 年通航而非 1939、KHN 1999 年通航而非 1996、LXA 1966 年贡嘎转场等)。
- **本次完成项**:
  - `data/quiz.json`:120→**260 题**(每类 +28),新增 140 题难度分布 1/2/3 = 16/74/50(存量 48/48/24),总体 64/122/74;合并脚本自动洗牌选项使 answer 下标分布 73/73/57/57;新增题覆盖后掠翼/临界马赫数/载荷因数/失速比速/RVSM/CAT II·IIIa/应答机 75/76/77/V1 决断/ETOPS/氧烛/海恩法则/C919·C909 时间线等进阶考点。
  - `js/ui/game.js`:**难度自适应抽题**——按 pilotRank 加权不放回抽样(权重 1星:5−rank,2星:3,3星:1+rank,见习 5:3:1 → 五星 1:3:5);题面新增「难度 ★」chip;开局区显示「题库 N 题 · 难度随机长等级自适应」;getTotals 增加题库总数;删除无用的 shuffle。
  - `data/airports.json`:18→**52 座**,新增胶东/遥墙/蓬莱/周水子/桃仙/太平/龙嘉/滨海/正定/武宿/新桥/昌北/栎社/龙湾/硕放/兴东/美兰/凤凰/吴圩/两江/龙洞堡(KWE!)/金湾/潮汕/中川/河东/曹家堡/贡嘎/徕宁/白塔/晋江/嘎洒/三义/九黄/伊宁;跑道编号除个别核实外一律 approx 标注;现有 SHA/PVG(拆分上海航空 fm)、CAN(+九元 aq)、CKG(+华夏 g5)、KMG(+昆明 ky)基地航司补全。
  - **14 家航司 LOGO 补齐**:qd/gs/bk/ns/ry/jd/gx/dr/tv/9d/g5/aq/ky/fm.png,经 360 图片搜索(image.so.com)检索公开图片、必应缩略图候选经目检淘汰(首轮缩略图方案命中错误图片,改用 360 接口+候选目检拼图挑选),PIL 白底化并压至长边 ≤400px;`data/liveries.json` airlines 登记(现 36 家),来源记入 `assets/CREDITS.md`。
  - **IAB 实测(8041 端口)**:机场列表 52 座拼音排序正常 → LXA 详情(T3/双跑道/双基地 chip 带新 LOGO/高高原冷知识)→ 成就中心仪表盘自动跟随(机场图鉴 x/52、题库 260 题 chip)→ 综合闯关开局,「难度 ★」chip 显示,见习等级首题为一星(符合 5:3:1 权重);数据与 LOGO 全部 HTTP 200。
- **改动文件**:`data/quiz.json`、`data/airports.json`、`data/liveries.json`、`js/ui/game.js`、`assets/logos/`(新增 14 png)、`assets/CREDITS.md`、`PROGRESS.md`。
- **遗留**:
  1. 新增机场跑道编号多为近似(approx),待对官方 AIP 逐座校核;兰州三跑道、拉萨第二跑道的正式编号未查到权威公开信息,以示意标注。
  2. 徽章「机场通」门槛自动变为 52(总数动态计算),老用户进度条比例会变化,属预期。
  3. baw/ana 仍无 LOGO(外网渠道被禁,国内源未获得可分发文件),沿用色块兜底。

### 2026-10-28 · P4 二次整改:机鼻壳体重建 + 语音/景色 + 客舱精致化(用户三连反馈)

- **所用模型**:GLM-5.3Flash
- **用户反馈**:①驾驶舱是方盒子,外面看不像飞机,侧风挡没了,仪表太少;②起飞降落语音有问题,窗外景色不带动态;③客舱不真实,舷窗只露一半。
- **本次完成项**:
  - **驾驶舱壳体重建**:废弃方盒,改站位放样机鼻壳体(8 站位超椭圆截面 n=2.6,由机尾 1.74 半宽收拢到鼻尖,DoubleSide 浅灰);风挡带开洞(跳过 z∈[0.9,1.78] 两侧上象限面片,两洞间留 8° 细脊)+ 顶点色把洞缘涂深(外看是深色风挡带/防眩面板,内看是窗周深结构);每侧 3 块环抱风挡(前风挡/固定窗/滑动窗,A320 布局)+ 四条边框式窗框(整块垫片会从舱内挡死玻璃——踩坑)+ 中央风挡柱 + 雨刷;地板改三段收窄(原矩形板从机鼻下伸出);尾封盖绕序翻转。
  - **驾驶舱仪表补齐**:仪表台两侧 SYS PANEL 开关阵列(canvas)、RMP×2+ATC(canvas 旋钮面板)、ECAM 控制板、FCU SPD/HDG/ALT 数字窗、停留刹车×2(黄手柄)、遮阳板、驾驶舱顶灯、鼻锥/尾段补光 PointLight×2(壳体内表面背光发黑的解法)。
  - **语音重做**:getVoices() 首调返回空列表 → voiceschanged 异步补选,优先 Google/Microsoft en-US;播报前 cancel 防堆积;WebAudio 合成客舱"叮咚"双音;广播词补全(起飞前 doors on automatic cross check / 落地后 disarm doors prepare for disembarking)。
  - **窗外景色动态**:草地 canvas 纹理 repeat 60 随地速滚动(与跑道虚线同速)、跑道边灯×58+入口绿灯排×15+PAPI(二白二红)、航站楼+塔台+树×12、16 云团缓慢漂移;地面整体随高度沉浮不变。
  - **客舱精致化**:舷窗整列下移收短(x±1.90,y1.22,h0.42)——"舷窗露一半"根因是椭圆截面在窗顶内收把窗片上沿埋进壁里;窗贴图比例重绘 180×222;腰饰条下移+新增窗上肩线饰条;顶灯带×2 分置;座椅加白色头枕巾+椅背网兜(InstancedMesh 新件,per-part 颜色);座椅滑轨×10;FAP 客舱管理面板(canvas,L1 门内侧);盥洗室 OCC/VAC 占用牌;咖啡机+壶。
  - **实测**(端口 8034):机长位全景风挡(天空/云/塔台/航站楼/树/跑道均可见)、外机位机鼻形态达标、起飞演示爬升段正常、客舱舷窗成排完整露出+头枕巾可见。
- **改动文件**:`js/interior/cockpit.js`、`js/interior/cabin.js`、`PROGRESS.md`。
- **遗留**:机鼻外形仍为风格化低模(放样 24 段);客舱布帘从入口看存在感偏强;语音依赖浏览器 TTS 音色。

### 2026-10-28 · P4 舱内漫游完成(CSS §P4 + 用户反馈整改 + 两舱实测)

- **所用模型**:GLM-5.3Flash
- **背景**:上会话 WIP(8d33d2f)后,用户提出 4 条反馈:①驾驶舱舷窗被挡;②驾驶舱简陋/视角不自由/要能开门进客舱;③演示要窗外景物联动+正式口令(V1 等);④客舱舷窗矩形太假,要求精致逼真、应急演示不做了。本次按反馈逐条整改并实测收口。
- **本次完成项**:
  - **css/main.css §P4**:cabin-wrap/cabin-main/cb-topbar/cb-title/cb-tabs/cb-tab/cb-chip/cb-actions/cb-presets/btn-xs/cb-hint 全套玻璃 HUD 样式 + 900px 响应式;`.v-reserved .btn` 改为仅 disabled 置灰。
  - **驾驶舱逼真化**:圆角三面风挡放大(下沿 1.2 与仪表板上沿齐平,视野开阔)+ 分隔柱 + 雨刷;仪表板/遮光罩压到视线下;FCU 自动飞行面板 + SPD/HDG/ALT 数字窗(canvas 随模拟 10Hz 联动);中央后段 RMP×2 + ATC 面板、ECAM 控制板(canvas 贴图);侧杆底座、遮阳板;后隔板开中央舱门(把手/警示牌),点击运镜 1.15s 后路由切客舱;预设加「后舱门」机位;屏幕框像素→米换算修正;顶板标签面沿法线外移防埋入。
  - **起飞/降落演示状态机重写**:双时间线(TAKEOFF/LANDING);口令按 A320 标准 SOP(Web Speech API 英文语音):THRUST SET → 100 节 → V1 → ROTATE → POSITIVE CLIMB → GEAR UP → ONE THOUSAND → LEVEL OFF;降落 FLAPS ONE → ONE THOUSAND → GEAR DOWN → FLAPS FULL → 500~100 呎高度呼叫 → FIFTY/RETARD → REVERSE GREEN/SPOILERS → 70/50/30 节减速呼叫;滑跑按速度门控(98/148/150kt),降落 1000ft 放轮、50ft 拉平、接地反推减速;阶段转移规则修复(无 d 的阶段由 next() 门控——此前滑跑卡死速度飙到 2194kt);进近/拉平下沉率由阶段直控(forceVs,修"负俯仰下沉率归零永不落地");时间倍率 roll/climb/flare 1.7、approach 2.4,起飞约 40s、降落约 45s 跑完自动复位。
  - **窗外景物联动**:停机坪隐藏,大地(2400m 草地)+ 跑道(阈值外移 100m,跑道号翻转修复镜像/法线朝向)+ 16 团云全部挂 rwyGrp 随高度整体沉浮——起飞地面远去/穿云,降落地面迎面抬起;跑道虚线随地速滚动。
  - **客舱精致化**:舷窗重绘圆角四层结构(舱壁框/窗框/密封条/玻璃,昼云海夜星空)尺寸加大;窗间立柱、顶部灯带(昼白夜暖)、走道地毯、禁烟/系安全带标语牌×3、客舱信息牌、头等/经济分舱布帘;厨房烤箱×2 + 餐车×4 + 水槽台;盥洗室加马桶;乘务员折叠座椅;**应急演示整体移除**(氧气面罩/滑梯代码与按钮删除,用户要求);成就"应急达人"改挂"进入客舱漫游"(更名「云端乘客」,emDemo 键复用)。
  - **实测通过(IAB,端口 8033)**:驾驶舱六屏无镜像、FCU/顶板/油门正常;起飞演示 TOGA→V1→抬轮→收轮→3000ft 改平自动复位;降落演示 1800ft 下滑→放轮→拉平→接地减速自动复位;客舱 L1 走入、圆角舷窗、行李架开合、舷窗机位;驾驶舱点后舱门→自动切客舱;云端乘客成就弹出;控制台零报错。
- **改动文件**:`css/main.css`、`js/interior/cockpit.js`、`js/interior/cabin.js`、`js/ui/cabin.js`、`js/ui/game.js`(徽章文案)、`PROGRESS.md`。
- **遗留问题**:
  1. 机长位俯视遮挡:遮光罩上沿压视线,跑道 ~100m 内被仪表台挡住(真实客机亦如此,但可再压低遮光罩/抬眼位微调)。
  2. 相机轨道 360° 旋转半径大于舱体半宽,拖拽过猛会甩到舱外(壳体单薄处可见反面);如需 strictly 舱内可改第一人称模式。
  3. 降落接地后跑道纹理仍在滚动(地速未归零前虚线流动),观感轻微。
  4. 语音口令依赖浏览器 SpeechSynthesis(无音频资源,离线不可用时静默)。
- **给下一会话的建议**:P4 收尾后下一阶段按总纲推进;若继续打磨舱内:优先机长位视野微调与舱内第一人称化(把轨道控制换成 pointer lock 行走,复用客舱 WASD 框架)。

### 2026-10-26 · 修复全站机头/机尾颠倒(归一化盲翻转根因)+ b738"垂尾 bug"证伪

- **所用模型**:GLM-5.3
- **背景**:用户报告查看页 9 机型机头/机尾全部反了(相机预设"前视/尾翼"指错端、部件图鉴空间分类镜像)。
- **根因(逐 GLB 实测定案)**:自研 Node 脚本解包 9 个 GLB 的 JSON chunk,按节点层级合成 POSITION min/max 世界包围盒,以名字证据(鼻锥/前起舱门/皮托管 vs 方向舵/垂尾/APU 排气)判定源机鼻朝向——**8 个变体(b738/b789/a21n/a332/a333/b788/a359/b748)源机鼻均为 +Z,唯 a20n 机鼻 +X**;`normalizeAircraft` 里"FR24 机鼻 −Z"注释有误,无条件 `rotation.y += Math.PI` 把 8 个机型转成机鼻 −Z(a20n 因"转 90°+再转 180°≡−90°"歪打正着)。
- **修复**:`engine/gltfModel.js` 重写 `normalizeAircraft(scene, dims, yaw)`——去掉纵轴 errX/errZ 猜测与盲翻转,改为显式 `SOURCE_NOSE_YAW` 朝向表(a20n:−90°,其余 0;`sourceNoseYaw` 按文件名主名取值,b788-cz 等涂装变体共用主型号值);新增变体须先实测后补表。
- **b738"垂尾位置 bug"证伪**:源坐标实测垂尾三网格(Mesh_059/251/060)z=−12.4~−17.9(尾端),P3 会话记录的"z≈+7.4~19.7 落在机头端"是翻转后的归一化坐标套了"机鼻 +Z"契约所致——翻转后机鼻实际在 −Z,+z 端本就是机尾。垂尾几何位置自始正确,模型无需重导出;"无名高瘦叶片=垂尾"兜底规则可继续保留(无害)。
- **验证(临时目录站点 + git 提取资产 + dev-server 8031,IAB)**:b748 默认视角机鼻/垂尾正确 →"尾翼"预设正对垂尾/方向舵/尾锥 →"前视"预设正对风挡/机鼻 → 部件图鉴"机鼻雷达罩"飞至机头(微部件光点标在机头)→"APU"飞至尾锥;b738"垂直安定面"飞至机尾垂尾、"机鼻雷达罩"飞至机头风挡处。
- **改动文件**:engine/gltfModel.js、PROGRESS.md
- **给下一会话的建议**:parts.js 的空间分类契约("机鼻 +Z")现与实际一致,无需改;若再发现某机型端点异常,先用解包脚本核实源朝向再动归一化。

### 2026-10-26 · P6 民航百科 + 题库 + 收集与成就玩法(完成)

- **所用模型**:GLM-5.3(主会话)+ general-purpose 子代理(题库撰写)
- **数据规模按实际修正(沿用暂停节决策)**:机型 9 / 机场 18 / 涂装 18(提示词写 12/17/20),徽章与仪表盘总数一律从数据文件动态计算(变体数 = liveries.json variant 去重;涂装 = liveries 数;机场 = airports 数;词条 = wiki 数;部件 = 常量 30)。
- **本次完成项**:
  - `data/wiki.json`(新):40 词条六分类(原理 6/系统 8/导航运行 8/安全 8/历史 6/旅行 4),正文 229-321 字全部 ≤400;4 条内联 SVG(升力/翼梢涡/后掠翼/ILS);"参见"互跳链全有效;数字均冠"约"并与题库同源;
  - `data/quiz.json`(新):120 题五类(25/25/25/25/20),难度 1/2/3 = 48/48/24,answer 下标 33/31/28/28 均匀,explain ≤80 字,子代理脚本自检 ALL PASS;
  - `js/ui/wiki.js`(重写,约 210 行):六分类侧栏(计数)+ 搜索(标题/标签/正文)+ 卡片栅格(已读角标)+ 词条详情(#/wiki/<id>,标题/标签/SVG 图/正文/"参见"胶囊/底部"去答题(本分类)"→ #/game/<slug>);阅读即写 cav3d.readWiki 并触发成就补检;
  - `js/ui/game.js`(重写,约 300 行,不 import three):答题闯关(随机 15 题/即时判分/解析展开/≥12 晋级,等级链 5 级存 cav3d.pilotRank,得分卡+错题回顾);收集仪表盘四条进度条;徽章墙 10 枚(BADGES 数组 + BADGE_ICONS 集中顶部);**checkAchievements() 导出**为全站成就引擎(单枚判定异常不阻断、去重、toast 3 秒);
  - `js/ui/viewer.js`(小改):进页写 cav3d.seenVariants(首航/全机型鉴赏家)、夜间模式写 cav3d.nightUsed、换装后补检;`js/ui/hangar.js`(小改):hero 等级 chip(RANKS 复用)+ 机型卡"涂装 x/y"真实收集角标(替换"收集 --"占位)+ 页面加载全量补检;emDemo 徽章因 P4 未做置灰(说明"待 P4 激活");
  - `css/main.css`(追加 §P6.1-6.11,约 130 行):百科侧栏/词条卡/详情排版/答题判分/成绩卡/徽章墙/等级卡/响应式。
- **IAB 全链路验收(8031 端口)**:百科列表(侧栏计数/搜索框/40 卡)→ lift 详情(SVG/参见/去答题/readWiki 打卡)→ 成就中心(等级卡/四条进度 18-30-18-40/10 徽章)→ 综合闯关 15/15 全对 → "晋升飞行学员" + 徽章"初出茅庐"toast + pilotRank=1 → **reload 后等级/徽章/进度全保留** → 原理分类局 0/15 全错 → 不晋级 + 15 条错题回顾 → 机库页等级 chip"飞行学员 ★"+ 各卡"涂装 0/10"角标 → b788 查看页 seenVariants 打卡 + 徽章"首航"点亮(GLB 因 D 盘 junction 缺失 404,正常回退参数化通道 △13,456)。
- **改动文件**:`data/wiki.json`(新)、`data/quiz.json`(新)、`js/ui/wiki.js`、`js/ui/game.js`、`js/ui/hangar.js`(小改)、`js/ui/viewer.js`(小改)、`css/main.css`(§P6)、`PROGRESS.md`。CP1(数据)提交 1faa6c2,CP2(界面)随后提交。
- **环境注意(本会话)**:移动硬盘 D: 未插电,`assets/` junction 失效,git status 显示全部资产为 D(**禁止 git add -A**,本次提交只加白名单路径);本地测试机型页 GLB 404 自动回退参数化属预期。下次插上硬盘 junction 即恢复,无需任何操作。
- **给下一会话的建议**:
  - P4 舱内场景完成后:viewer 应急演示回调里写 `cav3d.emDemo`(storeSet 即可),徽章"应急达人"自动点亮,无需改 game.js;
  - 徽章"全机型鉴赏家/机场通/百科全书"的判定在 hangar/wiki/game 页加载时补检,若新增打卡点(如 parts.js)也无需改动——下次进任意页自动触发;
  - 词条扩充:直接在 wiki.json 追加,侧栏计数/进度条总数自动跟随;"参见"与题库事实同源,两文件需同步修改;
  - 用户浏览器内人工复核涂装收集联动(换装→涂装收藏家徽章)因 D 盘缺失未在本会话验证,代码路径与 seenLiveries 已就绪。

### 2026-10-26 · P6 会话启动即暂停(用户指示,明日继续)

- **所用模型**:GLM-5.3
- **状态**:已完成 P6 开工侦察与方案定稿,**未产生任何代码/数据改动**(工作区干净,与 d692647 一致);后台题库撰写代理在写出文件前已安全终止,无残留。
- **已定方案(下一会话直接照此执行,不必重新设计)**:
  - 数据规模以真实数据动态计算,与提示词数字的差异按实际为准:机型 **9**(提示词写 12)、机场 **18**(写 17)、涂装 **18**(写 20);徽章"全收集"门槛用实际总数(涂装收藏家 = min(20, 实际) = 18),百科全书仍 30+;词条 40 / 题库 120 照写;
  - quiz.json:纯数组,id q001-q120,五类分布 原理25(q001-025)/系统与结构25(q026-050)/运行与导航25(q051-075)/安全25(q076-100)/历史与机场20(q101-120),难度 1-3 约为 4:4:2,answer 下标分布均匀,explain ≤80 字;
  - wiki 六分类用提示词原名(飞行原理/结构与系统/导航与运行/飞行安全/历史与国产民机/旅客与旅行);词条页"去答题(本分类)"经 W2Q 映射表接 `#/game/<slug>`(slug: principle/systems/ops-nav/safety/history-airport;旅客与旅行→综合闯关),该分类抽 15 题、≥12 晋级;
  - 新 store 键:`readWiki`(词条已读 id 数组)/`pilotRank`(0-4,见习学员→飞行学员→副驾驶→机长→五星机长)/`badges`(已获徽章 id)/`seenVariants`(进过的机型页)/`nightUsed`(bool);`emDemo` 因 P4 未做不写,徽章置灰"待 P4 激活";
  - 徽章引擎集中在 game.js 顶部 BADGES 数组 + 导出 `checkAchievements()`;viewer.js 挂 seenVariants/nightUsed/seenLiveries 三处调用,hangar.js 挂等级徽章 + 机型卡"收集"角标启用(涂装 x/y)+ 页面加载补检,wiki.js 词条打卡后调用;parts.js/airports.js 不在白名单不动,其徽章(部件工程师/机场通)在机库或成就页加载时补检触发 toast;
  - 变体总数从 liveries.json 的 variant 字段去重得出(=9),game/wiki 页不 import three,保持纯 DOM 轻量;
  - css 追加 §P6 段(词条侧栏/搜索/详情、答题、进度条、徽章墙、等级卡)。
- **执行顺序建议**:wiki.json(正文本人撰写,4 条内联 SVG:升力/后掠翼/ILS/翼梢涡)→ quiz.json(可再用子代理,事实基准:C919 2017 首飞/2022-09-29 取证/2022-12-09 交付东航 B-919A/2023-05-28 商业首航;ARJ21 2008 首飞/2014 取证/2015 成都航空/2024 更名 C909;两航起义 1949-11-9;CAT I 200ft·550m / II 100ft·300m / IIIa 175m;ETOPS-180 即单发 180 分钟)→ CP1 提交 → game.js/wiki.js → viewer/hangar 挂钩 + css → 自测(答一局晋级、四条进度联动、徽章 toast、刷新持久化)→ CP2 提交推送。

### 2026-10-26 · P3 部件热点图鉴(partId 双通道重建 + 30 知识卡 + 热点交互)

- **所用模型**:GLM-5.3
- **背景**:P3 提示词假定"引擎已带 userData.partId",但 P1-CP4 参数化退役后全量真实 GLB 无 partId——本阶段核心是在**不改 engine/** 的前提下于 UI 层重建 partId 映射。
- **方案:命名规则 + 空间区域双通道**(js/ui/parts.js,约 520 行):
  - `NAME_RULES` 34 条正则(小写剔符号匹配):GLB 节点语义命名(aileron/flap/slat/engine/gear/beacon…)直接映射,覆盖除 b738 外 8 变体;顺序敏感(vstab 先于 stab、turbofan 先于 fan、gear 先于 door 等);
  - 空间区域兜底:归一化机体坐标系(机鼻+Z/轮贴地/真实米制,与 normalizeAircraft 一致)按家族站位表(发动机 x/z、机身半径 R、轴线高 axisY)做 11 层规则分类,专救 b738(FR24 源命名丢失);锚点优先取部件网格包络盒中心,缺失用估算表;
  - **关键坑**:深层级 GLB(b738 根四元数节点)必须先 `root.updateMatrixWorld(true)` 再逐网格取 Box3,否则世界矩阵未合成、分类全错(首轮 96 网格误入机轮即此因);齿轮判定收紧至 H*0.13+|x|<0.15SP(737 翼件吊得低);无名高瘦叶片(尺寸 y>0.3H 且 x 极薄)=垂尾兜底;
  - 微部件(皮托管/静压孔/迎角/防撞/频闪/着陆灯/APU)模型上点不到:热点模式放发光 Sprite 圆点(深度穿透可见);无网格归属的大部件用"锚点探针借网格"做高亮集。
- **交互**:悬停 emissive 脉冲高亮(按 material 存/还原,不污染涂装贴图)+ 跟随提示;点击/清单项/相关部件胶囊 → 知识卡滑入 + 相机 0.55s 平滑飞行(与相机预设共用 tween 通道,flyTo 增加 dur 参数)+ 2s 驻留高亮;查看即打卡 `cav3d.exploredParts`(去重);机库卡片「部件 x/30」角标;涂装换装后 viewer 调 rebind() 重建索引。
- **验收**:控制台遍历 9 变体×30 部件覆盖(classifyAll 为纯函数导出,4 轮迭代收敛:空缺项全部有圆点/借网格兜底);UI 全链路实测(开图鉴→清单点击→相机飞行采样 target 0→13→18.2 到位→知识卡→打卡跨刷新持久化→机库角标);悬停提示+指针光标;控制台零报错。
- **发现并记录两个遗留问题**:b738 垂尾位置 bug(见遗留问题节,隐藏法实锤)、P2 换装同 URL 二次加载双倍缩放隐患(未触发)。
- **改动文件**:`data/parts.json`(新,30 卡)、`js/ui/parts.js`(新)、`js/ui/viewer.js`(小改)、`js/ui/hangar.js`(小改)、`css/main.css`(§17)、`PROGRESS.md`。核心代码已由并行 P5 会话代提交(c6b8dca),含本会话全部修复。
- **给下一会话的建议**:
  - b738 垂尾修复后,可删 parts.js 里"高瘦叶片"兜底规则(先确认渲染位置归位);
  - IAB 内连续跑重型脚本(9 GLB 遍历)后 rAF 帧循环可能停摆(画布冻结但无报错),验证交互前先 reload 一次再测;
  - 手动改 `__CH_DEBUG.camera.position` 后画布是否真渲染,要以改后截图为准,IAB 冻结时会误判;
  - parts.json 的 principle 字数 110-210 已脚本校验;若扩充部件,保持同规格并同步 ALL_PART_IDS/EST/GROUP_ORDER。

### 2026-10-26 · P5 机场图鉴(数据 + 三视图 UI)

- **所用模型**:GLM-5.3Flash
- **重要说明**:P5 提示词标题写"17 座",但正文必备清单实际列出 18 座(含 XMN/FOC 重点卡);按清单全量收录 **18 座**。
- **本次完成项**:
  - `data/airports.json`:18 座机场全字段(icao/iata/cn/en/city/pinyin/opened/elevationM/terminals/runways/hubs/facts/coord);不确定的年份、跑道长宽、海拔等一律加 `approx: true`,未编造精确值;XMN 含 T3(国际)/T4(国内)双楼说明与翔安新机场"规划背景"表述,FOC 含 T1/T2 双楼现状、福州航空(全 737-800)与厦航福建基地;
  - `js/ui/airports.js`(约 470 行)三视图:
    - 列表:卡片栅格(IATA 大字/跑道数徽章/已浏览角标)+ 搜索(IATA/中文/城市/拼音)+ 拼音排序;
    - 详情(#/airports/<iata>):基础数据表(基地航司色块复用 P2 liveries.json 色+LOGO)、航站楼列表、跑道表、冷知识卡;
    - **程序化跑道布局图**:按 runways 数据绘制——跑道按编号换算真航向旋转(36L/36R 平行组、01/19 斜向组各自成簇),道肩/道面渐变/白色边线/虚线中线/入口琴键/接地带与瞄准点标线(窄道面自动省略)/跑道号斜跑道上保持正立且方位符合航空惯例(北端标 36 系)/黄色平行滑行道+联络道/机坪+廊桥齿+停机飞机剪影/航站楼块按 terminals 数据/指北针/500m 比例尺/“非精确比例”注记;道面宽度放大 2.4 倍以便阅读(已注明);
    - 地图:内联 SVG 简化中国轮廓(含台湾岛、海南岛标注与南海诸岛示意框:简化九段线弧+西沙/中沙/黄岩/南沙/曾母暗沙点),18 机场按 coord 打点,近距离双场(京/沪/广/蓉)标签自动错位避让,hover 原生 title,点击/回车跳详情,页脚"示意图,仅作分布参考";
  - 浏览打卡:进入详情写 `cav3d.seenAirports`,列表卡片与详情 hero 双处显示;
  - IAB 自测:列表→详情→地图→点位跳转→搜索(中文/IATA)全链路通,控制台零报错。
- **改动文件**:`data/airports.json`(新)、`js/ui/airports.js`(重写)、`css/main.css`(末尾追加 §P5 样式段,**同文件还含并行会话的 §P3 样式段,已一并提交**)、`PROGRESS.md`。
- **代收尾提交**:工作区发现并行会话(P3 部件卡)未提交改动(data/parts.json、js/ui/parts.js、js/ui/hangar.js、js/ui/viewer.js,node --check 全过),按"每会话必 commit"纪律单独一笔提交,避免混入 P5;该会话若仍在进行请知悉。
- **approx 待核对清单(请有空时校对)**:
  - 跑道编号/长度:PKX 四条(3400/3800 组合)、SHA 两条(3300/3400)、PVG 三条近似、CAN 宽度、SZX 15/33+16/34、TFU 两条 4000、CKG 03/21 第三条、KMG 03/21+04/22、XIY 两条、HGH 06/24+07/25、URC 07/25+15/33、WUH 两条、NKG 第二条 16/34(最不确定)、CSX 18L/18R、XMN 宽度、FOC 宽度;
  - 年份:CTU T1(2001)/T2(2012)、HGH T1-T4、URC T2/T3、CSX T1/T2、FOC T2(2023)、XIY T5(2023)、CKG T2(2004);
  - 海拔:TFU(475)/CKG(416)/NKG(25)/XMN(17)/FOC(15)。
- **给下一会话的建议**:
  - airports.js 地图轮廓为粗折线,若要更精细可换 TopoJSON 简化数据(仍保持纯静态);
  - 详情页跑道图可加机场真实构型特调(如 PKX 放射五指廊俯视),当前为通用程序化布局;
  - 18 座之外扩容只需在 data/airports.json 追加,UI 无需改码。
- **遗留问题**:跑道图两组跑道簇(如 PKX 01 系与 17 系)按簇心横移排布,交叉观感为示意级;approx 字段待用户核对后去标记。
- **同日追加(用户指示)**:基地航司 LOGO 补全与白底——新下载 kn(中国联合航空)/eu(成都航空)/pn(西部航空)/8l(祥鹏航空)/gj(浙江长龙航空)真实标志(en.wikipedia Special:FilePath,来源已记 assets/CREDITS.md),登记入 data/liveries.json airlines(现 22 家);`.ap-hub img` 统一纯白底(#fff,18px)。已验:PKX/CTU/CKG/KMG/HGH 五页徽标全部加载且白底生效。
  - 注意:kn/eu/pn/8l/gj 的色块主色为按标志目测取的近似值;8l.png 仅 168×97、pn.png 292×96,已是全网可得最高清晰度,chip 内 18px 显示无碍。

### 2026-10-25 · P7 部署上线 GitHub Pages

- **所用模型**:GLM-5.3
- **关键决策(用户拍板)**:
  - **运行时资产全量入库**:参数化兜底已退役,纯代码部署线上 3D 必挂;铁律 5 修订——运行时 GLB(20 个,39.8MB)与航司 LOGO(18 个)随 git 仓部署,`_src/_tools/photos/*.glb.bak/.probe` 仍不入库;仓库体积预算由 <20MB 上调至 ~42MB(GitHub 上限 1GB,单文件最大 16MB 远低于 100MB 红线);
  - **不装 gh CLI**,按 P7 预案走手动三步(网页建仓 → 我 remote add/push → 网页开 Pages)。
- **本次完成项**:
  - 部署前体检:25 个 JS `node --check` 全过;本地服务全资源 HTTP 200(含涂装 GLB/LOGO);jsdelivr 的 three@0.160.0 与 three-mesh-bvh@0.7.6 均 200,importmap 维持 jsdelivr 不换 npmmirror;
  - `.gitignore` 修订 + 资产入库 commit `eee93d2`(39 文件);剔除 junction 探针残留 `.probe`;
  - 远程 `origin = github.com/Zhu-Zirui/cloud-hangar`,6 个 commit 全量推送(main 已跟踪 origin/main);
  - GitHub Pages 开启(main 分支 / root);线上地址 **https://zhu-zirui.github.io/cloud-hangar/** 已写入页脚与本账本;
  - 路径审计:代码全相对路径 + hash 路由,子路径 `/cloud-hangar/` 下无障碍。
- **改动文件**:`.gitignore`、`index.html`(页脚线上地址)、`PROGRESS.md`、入库 `assets/models/**`(20 GLB)、`assets/logos/**`、`assets/CREDITS.md`
- **给下一会话的建议(部署纪律)**:
  - 会话纪律第 6 条在 git commit 后**必须再 `git push`**,否则线上看不到新效果;
  - 新增涂装:GLB 放 `assets/models/<变体>/` 并在 `data/liveries.json` 登记,`git add -A` 自动带上;转换源只放 `models/_src/`(被忽略,不误入);
  - 若线上某模型 404:先查该文件是否已 commit+push;若浏览器报 three 加载失败:按总纲 §2 整体换 npmmirror 镜像后重新 push;
  - 本机 push 凭据已由 Git Credential Manager 记住,后续 push 无需再登录。
- **遗留问题**:线上首屏 3D 渲染与涂装切换的浏览器人工验收待用户完成(Pages 构建在每次 push 后约需 1 分钟)。

### 2026-10-25 · P2 涂装引擎(定稿:真实涂装 GLB 整体换装)

- **所用模型**:GLM-5.3
- **方案演变(重要,经用户三次指示)**:
  1. 初稿按 P2 提示词做 Canvas 贴面引擎(three-mesh-bvh 射线采样贴片 + 反查烘焙舷窗 + 尾徽贴片),b738 上已渲染出国航腰带/标题/注册号/垂尾 LOGO,但存在硬伤:盖不住整机(发动机/机翼/烘焙原厂涂装仍在)、特殊彩绘只能矢量近似;
  2. 用户质疑"网上没有现成的涂装成品吗",经查证:FGMEMBERS(FlightGear)生态有整套真实航司涂装贴图(787:海航 CHH/南航 CSN/厦航 CXA/国航 B-2727/波音 BOE/法航 AFR/英航 BAW/美联航 UAL/全日空 ANA;737-800:东航 CES;A319:国航 CCA),许可同为 GPL-2.0;
  3. 用户定稿:有现成真实涂装的全用现成的,中国航司没有的补著名国外航司,弃用纯贴面方案。
- **新增 `D:\云端机库-assets\_toolsc2glb.py`(自研 AC3D→glTF2 转换器,无需 Blender)**:
  - 解析 AC3Db 文本格式(MATERIAL/OBJECT/loc/rot/texture/numvert/SURF/refs,层级 kids 变换累积);
  - refs 扇形三角化,UV v 翻转(AC3D 左下原点 → glTF 左上),`--livery` 整套换贴图,`--drop-tex` 丢座舱内部;
  - 材质:双面 + metallic 0.12/roughness 0.78,灯光贴图自发光,trimesh 导出 GLB;
  - 产出 `models/b788/b788-{hu,cz,mf,ca,boe,afr,baw,ual,ana}.glb` ×9(约 1.3-1.6MB/个)。
- **engine/gltfModel.js**:`loadGltfTemplate` 改直取 URL(涂装 GLB 任意路径),新增 `buildGltfAircraftUrl`;**修复纵轴判定 bug**:787 翼展>机长,"最长轴=纵轴"启发式判错,改为按权威数据 length 差值判轴。
- **engine/livery.js 重写为纯数据模块**(getAllLiveries/liveriesForVariant),Canvas 贴面实现移除;**data/liveries.json 定稿 v2**:每条 = {id, variant, airline, name, model}。
- **ui/viewer.js 换装通道**:色卡(航司底色+LOGO)横排 + 下拉,点击整体换装 GLB(remove→dispose→build→add),换装后按新模型包围盒重校取景基线;机库环境品牌联动(setBrand)、`cav3d.seenLiveries` 浏览记录、"切换涂装"按钮滚动定位。修复换装期间引入的段丢失(参照物/初始相机/夜灯绑定误删已还原)与 cH 重复声明。
- **真实 LOGO**:11 家中国航司 + 法航/美联航(960px),经维基百科 Special:FilePath 下载;福州航空全网最大仅 293×340;春秋用 Commons PD 版放大;英航/全日空无可分发标志文件(色卡仅底色)。
- **验证**:机库卡片涂装数量角标(787-8 ×11);b788 默认 FR24 波音 Dreamliner 渲染正常;切换海航涂装成功(整机换装 + 品牌柱联动);IAB 浏览器 WebGL 上下文经多次重载后耗尽导致截图通道超时,新开标签页恢复——后续测试注意少开新 context。
- **遗留问题**:见"遗留问题"节;取景基线/FG 模型贴合度待下轮调优。
- **给下一会话的建议**:
  - 737NG 东航:clone FGMEMBERS/737NG,解析 Models/738.xml 装配多部件 .ac(737-800.ac/LWing/RWing/HorzStab/VertStab/nosegear 等,部件顶点已在整机坐标系),ac2glb.py 需支持多文件合并 + Liveries-800/CES-800.png;
  - A320 系国航:FGMEMBERS/A320-family 仅 A319-CCA(A319),若接受 A319 替代 A320neo 展示可转;
  - 取景:换装后可同时微调相机距离(当前仅 target.y);
  - IAB 测试节制重载,WebGL context 上限约十余次。

### 2026-10-25 · 查看页默认环境:航空公司维修机库内景 + 品牌系统

- **所用模型**:GLM-5.3
- **新增 `engine/hangarEnv.js`(程序化室内大机库)**:
  - 内部 120m 宽 × 156m 深 × 34m 高(容 747-8 有余):环氧地坪(伸缩缝/机位框/牵引中线/警示带/工位编号)、肋板墙、门式刚架柱列 + 檩条(InstancedMesh)、后墙 72m 大门(门板横条 + 底部黄黑警示条)、天窗带 + 20 组灯具阵;
  - 昼/夜两态:白天靠天窗带自发光(hemisphere+sun 照常),夜间灯具全亮 + 6 盏 PointLight(1600cd,不投影),门楣色带夜间微光;与查看页"夜间模式"开关联动;
  - **墙体/屋面全部单面(法线朝内)**:外部/俯视相机穿透形成剖面展示效果,不挡 6 个相机预设(俯视在屋面之上、前视在 156m 之外都能看到整机);
  - 品牌件:后墙大门上方 26×6.5m 品牌面板(LOGO + 中英文厂名)、4 根柱幅(品牌色底 + 白色 LOGO 剪影 + 竖排厂名)、门楣色带;
  - **品牌 API(P2 涂装接入点)**:`HANGAR_BRANDS` 注册表 + `registerHangarBrand(def)` + `env.setBrand(key)`;查看页默认按机型厂商挂 `boeing`/`airbus`(变体 ID 前缀判定),P2 切换涂装时改调 `hangar.setBrand(航司)` 即可联动;
  - dispose 完整(贴图/材质/几何),挂在 scene 基座的统一 dispose 链上。
- **真实 LOGO(经用户同意上网获取)**:Wikimedia Commons 取 Boeing full logo 与 Airbus Logo 2017(SVG→PNG 1200px 透明底)存 `D:\云端机库-assets\logos\`,来源与商标声明已记入 CREDITS.md;深色柱幅用 canvas `source-in` 重绘成白色剪影。下载当日 Wikimedia 曾被墙,后解封;jsdelivr/raw.githubusercontent 为备选渠道。
- **改动文件**:engine/hangarEnv.js(新)、ui/viewer.js(import + 环境/品牌/夜间联动)、assets/CREDITS.md、D:\云端机库-assets\logos\*(U 盘)
- **验证**:node --check 通过;HTTP 200(logos、hangarEnv);IAB 内 b789 页重载后画布/标题/△14,186 正常。IAB 截图通道对 WebGL 页持续超时("surface preparation timed out"),机库观感与波音/空客 LOGO 待用户浏览器内人工复核。
- **遗留问题**:
  - 夜间点光 1600cd 为保守初值,明暗观感待复核后调;
  - 机库首页(hangar hero)仍是室外停机坪,未换机库内景(可后续复用 hangarEnv);
  - P2 涂装引擎需注册各航司 brand(logoUrl + 主色)并接线。

### 2026-10-25 · 修复 b738/b789 直立渲染(Z-up 轴系未转换)

- **所用模型**:GLM-5.3
- **问题**:b738/b789 在查看页整机沿机身轴线直立(机头朝天)。根因:FR24 源 dae 声明 `<up_axis>Z_UP</up_axis>`,pycollada 不自动应用 up_axis,上一轮转换把 Z-up 坐标原样写入 glTF(Y-up),飞机横滚 90° 立起;`normalizeAircraft` 只绕 Y 轴转(处理机头朝向),救不了横滚。
- **修复**:直接在两个 GLB 的场景图插入根节点旋转四元数 `[0, √2/2, √2/2, 0]`(绕 (0,1,1) 轴 180°:高度 Z→+Y、机鼻 +Y→+Z、翼展 X→−X),网格/贴图数据零改动。实测 trimesh 世界坐标:b738 X=35.7(翼展)/Y=12.1(高)/Z=39.4(机长),b789 X=59.6/Y=14.9/Z=65.9,机鼻均 +Z,与 b748 等正常变体同惯例。原文件备份为 `*.glb.bak`。
- **排查要点(供后续转换复用)**:GLB accessor min/max 是网格局部坐标,不可用于判断整机朝向;须用 trimesh 加载后取世界系顶点,以"长度轴两端的高度的均值"判机头(机头端低、尾翼端高)。
- **改动文件**:D:\云端机库-assets\models\b738\b738.glb、b789\b789.glb(根节点补旋转)、PROGRESS.md
- **遗留问题**:浏览器内渲染复核由用户完成(若缓存顽固按惯例换端口)。

### 2026-10-25 · P1 检查点 4(全量切换真实模型,参数化退役)完成

- **所用模型**:GLM-5.3
- **重要变更——按用户指示"不要参数化的了,有真实模型全部换成真实模型,没有的就舍弃"**:
  - **参数化通道退役**:GLB_VARIANTS 扩至 9 变体,VARIANT_ORDER = Object.keys(GLB_VARIANTS),页面不再走参数化兜底;
  - **舍弃变体**:b38m(737 MAX 8)、c919、a35k(A350-1000)——无免费可分发真实模型,按指示从机库移除(共 9 机型在册);
  - **b738/b789 转换成功**:FR24 源 zip 内 dae(Collada)+ 贴图 → pycollada 解析材质链(effect.diffuse→Map→sampler→surface→image)→ trimesh PBRMaterial(baseColorTexture, metallic 0/roughness 0.92)→ glTF2 glb。b738 1.3MB(21 贴图件/144 mesh)、b789 3.1MB(110 贴图件/152 mesh),转换源留存 `D:\云端机库-assets\models\_src\`;
  - **动画开关移除**:核查全部 9 个 GLB,animations 均为 0(FlightGear 动画未随模型分发),起落架/襟翼/客舱灯切换无数据支撑,按指示删除;查看页动画面板仅保留夜间模式,附说明"停放姿态,无收放动画";
  - **起落架贴地保障**:normalizeAircraft 以包围盒 min.y=0 归一,真实模型自带停放姿态起落架,不存在悬空;
  - **涂装即原厂**:GLB 自带 Boeing/Airbus house 涂装(737 白蓝经典、A320neo 空客屋、787 白色原厂),发动机品牌真实(GEnx 锯齿短舱+GE 标)。
- **改动文件**:engine/gltfModel.js(9 变体映射)、engine/aircraft.js(VARIANT_ORDER)、ui/viewer.js(动画面板精简)、ui/hangar.js(CARD_DESC 9 机型)、assets/CREDITS.md(转换溯源)、D:\云端机库-assets\models\b738|b789(新 glb)
- **验证**:9/9 GLB 经 HTTP(junction)200 全通;全部 ES 模块 node --check 通过;dev-server.py 8022 端口 no-store
- **遗留问题**:
  - b738/b789 的 dae 转换贴图质量(737 舷窗带、787 涂装文字)待浏览器内人工复核;
  - a20n/a21n 仍为 A320ceo 世代模型(免费库无 neo 世代);
  - IAB 内置浏览器自动化工具本会话不可用(node_repl 未挂载),页面渲染复核由用户在浏览器完成。
- **给下一会话的建议**:
  - 若 737/787 贴图不佳:FR24 的 dae 贴图分辨率有限,可考虑换 FGMEMBERS 原始 XML/ac3d 源走 Blender headless 转换;
  - P2 涂装引擎恢复时,直接做 GLB 贴图覆盖方案(house 涂装 → 各航司涂装);
  - 测试用 `python dev-server.py 8022`(no-store),改码不生效就换端口。

### 2026-10-25 · P1 检查点 2+3(真实模型双通道 + 12 变体全量)完成

- **所用模型**:GLM-5.3
- **重要变更——项目铁律修订(经用户批准)**:
  - 原"禁止任何二进制资源"条款撤销:允许引用 .glb/.gltf 模型与图片;
  - 素材实体存移动硬盘 `D:\云端机库-assets\`,junction `cloud-hangar/assets` 引用,`/assets` 已入 .gitignore;
  - 来源与许可记录于 `assets/CREDITS.md`(当前:Flightradar24/fr24-3d-models 与 Ysurac/FlightAirMap-3dmodels,均 GPL-2.0);
  - **P2(涂装引擎)按用户指示暂停**,优先 P1 逼真性。
- **本次完成项**:
  - 真实模型通道 `engine/gltfModel.js`:GLTFLoader 加载 + 包围盒自动归一(米制/机鼻+Z/轮底贴地)+ 环境反射注入 + 动画混入器透出;
  - 下载 9 个真实机型模型入 U 盘(约 19MB):glTF2 版 a20n/a21n/a332/a333/a359/b748/b788(FlightAirMap),glTF1 版 b738/b789(r160 不认,待转换);
  - viewer 双通道:GLB 优先(7 变体)、参数化兜底(5 变体),相机预设按统一尺寸估算兼容两通道;
  - 参数化逼真性改造:超椭圆机身截面(n=2.2 冠部饱满)、短舱外径修正为风扇×1.42(CFM56 2.3m/LEAP 2.66m 实测比例)、背鳍整流片、襟翼滑轨整流罩×3、737 门位修正(2 对门+翼上出口)、A350 墨镜风挡面罩;
  - 7 家族模块全部注册 + 7 份权威数据 JSON(a320/c919/a330/b787/a350/b747),b747 四发(内/外发双站位)+上凸 hump+4 组主起;
  - hangar 卡片改读 JSON(loadAllVariants),删除写死常量;
  - 新增 `dev-server.py`(no-store 本地服务器):python http.server 的启发式浏览器缓存导致改码不生效,踩坑后自制;
  - 相机预设重校:侧/前/俯视取 ~2 倍机长远距,压小透视畸变(观感接近三视图);
  - 实测:12/12 变体渲染成功、控制台零报错、三角形最大 42,552(a359)≤15 万;hangar 12 卡片来自 JSON。
- **改动文件**:engine/gltfModel.js(新)、engine/families/a320|c919|a330|b787|a350|b747.js(新)、data/aircraft/*.json ×6(新)、dev-server.py(新)、engine/aircraft.js、fuselage.js、wing.js、enginePod.js、families/b737.js、ui/viewer.js、ui/hangar.js、民航图鉴-提示词包/00-项目总纲.md(铁律修订)、D:\云端机库-assets\*(U 盘,不入 git)
- **遗留问题**:
  - b738/b789 仍参数化(FR24 的 glb 为 glTF1 旧格式,r160 GLTFLoader 报 "Legacy binary file detected";待由 source/*.zip 的 dae 转 glTF2,或继续找现成 glTF2);
  - b38m 用 b737 参数(MAX 差异仅小翼/短舱)、c919/a35k 参数化;免费可分发的 MAX 8/C919/A350-1000 模型未找到;
  - GLB 模型自带 house 涂装(A320 空客屋、747 灰白),P2 涂装引擎恢复后可做贴图覆盖或保留;
  - a20n/a21n 用 A320ceo 世代模型(鲨鳍小翼一致,发动机细节差);
  - 参数化机型的舷窗列近景偏淡、发动机内涵黑区偏长(下轮细调)。
- **给下一会话的建议**:
  - P2 恢复时:先做 GLB 变体的涂装方案(贴图叠加或材质染色)再考虑参数化机身的 Canvas 贴图;
  - b738/b789 转换:试 `pip install trimesh pycollada` 走 dae→glb,或 Blender headless;转换后放入 D:\云端机库-assets\models\b738\b738.glb 并在 GLB_VARIANTS 恢复映射即可;
  - 测试时若改码不生效:换 dev-server 端口(8021→8022…),IAB webview 磁盘缓存对旧端口条目顽固。

### 2026-10-25 · P1 检查点 1(通用件 + b737 家族 + b738 可看)

- **所用模型**:GLM-5.3
- **本次完成项**:
  - `js/engine/` 通用件六模块:
    - `materials.js`:PBR 材质包(机身 MeshPhysicalMaterial:metalness .15/roughness .35/clearcoat .6;RoomEnvironment+PMREM 环境反射按 renderer 缓存)+ P1 素色涂装 CanvasTexture(白机身/灰机腹/深色细 cheatline)+ 机身 UV 契约注释(u 圆周 0=顶 .25=右舷 .5=机腹 .75=左舷;s 纵向 0=机头;flipY=false;左舷文字 rotate(+π/2)/右舷 rotate(−π/2))
    - `fuselage.js`:站位放样自建 BufferGeometry(sin^0.6 钝头机鼻/等直段/尾锥上收),雷达罩分界环、舱门 Canvas 描边贴片、舷窗 InstancedMesh、风挡面片、747 上凸 hump 预留、APU 排气口;makeSurfaceSampler 供细节件贴面
    - `wing.js`:六边形翼型展向放样(后掠/梯形/上反/双折点),活动面枢轴组(襟翼×2/缝翼×3/副翼/扰流板×5,铰链对齐后掠角),小翼型式库(blended/forked/sharklet/raked),垂尾+方向舵/平尾+升降舵复用,翼身整流罩
    - `enginePod.js`:旋成体短舱(唇口钛灰环/腹鼓/收敛),内涵导管+风扇盘(整流锥+20 叶 InstancedMesh 可转),反推环缝纹,尾喷锥,四棱台吊挂
    - `gear.js`:前起双轮(前收)+主起小车式(内收,1/2/3 轴参数化),轮组=轮胎+轮毂刹车,舱门板收起闭合,收起时上提藏入轮舱
    - `details.js`:叶片天线/皮托管/静压孔/迎角叶片/翼上出口标线/灯组(左红右绿航行灯、翼尖白频闪[双闪节奏独立材质]、上下红防撞 1Hz、尾白灯、翼根+前起着陆灯)/1.8m 人形剪影/客梯车/地面米数标尺
  - `families/b737.js`:b738/b38m 性格调参(MAX 大短舱前伸/分叉小翼)
  - `aircraft.js`:总装器(fetch JSON→tune→组装→抬升 centerH 停放)+ 动画状态机(damp 平滑收放/襟翼缝翼扰流板联动/风扇转速渐变/频闪双闪/夜间舷窗发光)+ triCount(InstancedMesh 按实例计)+ dispose
  - `data/aircraft/b737.json`:权威数据表 b738/b38m
  - `ui/viewer.js` 重建:信息栏参数表、5 个动画开关、6 相机预设(平滑过渡,用户接管即断)、上一架/下一架、P2/P3/P4 预留置灰、点击部件 console.log partId+toast 中部件名、三角形计数 chip、标尺开关
  - `css/main.css` 追加 §15 查看页样式;`livery.js` P1 接口占位
  - 修复关键 bug:placeOnSurface 的 Matrix4.lookAt 方向(面片 +Z 需朝外,目标取 -n),否则风挡/舷窗/舱门被背面剔除不可见
  - 本地实测:b738 渲染 ✓ 控制台零报错 ✓ △11,880 ≤15 万 ✓ 舷窗成列/风挡 2+2/上反角/垂尾居中(视觉模型复核)
- **改动文件**:上述 js/engine/* 全部、families/b737.js、data/aircraft/b737.json、ui/viewer.js、css/main.css、PROGRESS.md
- **遗留问题**:舱门在前视图确认 1 对,其余视角待 CP2 统一复检;747 hump/四发未实测(CP2)
- **下一步**:P1 检查点 2——其余 6 家族(a320/c919/a330/b787/a350/b747)模块 + JSON,747 上凸前机身重点细调

### 2026-10-25 · P0 站点基座

- **所用模型**:GLM-5.3
- **本次完成项**:
  - 建立 `cloud-hangar/` 骨架,目录符合总纲 §3(engine/、interior/、data/ 本阶段未建,P1+ 按需创建)
  - `index.html`:three r160 importmap(jsdelivr 直连可用)、顶部导航、挂载点
  - `css/main.css`:全站设计系统(令牌 / 玻璃卡片 / HUD 角框 / 按钮 / 栅格 / toast / 动画关键帧)
  - `js/main.js`:hash 路由(懒加载 + 导航竞态令牌 + 上一页清理函数),`js/core/store.js`:localStorage 封装(`cav3d.` 前缀,get/set/update)
  - `js/scene.js`:场景基座工厂(渲染器 / OrbitControls 阻尼+俯仰限位 / 顶点色渐变天空 / Canvas 标线停机坪 / 昼夜接口 / RAF / 完整 dispose)
  - `js/ui/hangar.js`:机库首页——hero + 3D 占位验证机(胶囊机身+板状直翼+垂尾,含简易起落架/闪烁防撞灯)、1.8m 人形剪影立牌、"占位机·P1 替换"悬浮标签、12 机型卡片栅格(含收集角标占位)、闲置自转
  - `js/ui/viewer.js`、`airports.js`、`wiki.js`、`game.js`:建设中占位页
  - 本地 `http.server 8000` + 内置浏览器实测:四页切换、`#/aircraft/c919` 路由、3D 画布销毁重建、store 读写回测、全模块动态 import,站点控制台零报错
- **改动文件清单**:`index.html`、`css/main.css`、`js/main.js`、`js/core/store.js`、`js/scene.js`、`js/ui/hangar.js`、`js/ui/viewer.js`、`js/ui/airports.js`、`js/ui/wiki.js`、`js/ui/game.js`、`PROGRESS.md`、`.gitignore`
- **遗留问题**:
  - 机型卡片数据仍写死于 `hangar.js` 顶部常量,P1 迁入 `data/aircraft/*.json` 后删除
  - `viewer.js` 目前是占位页(P1 重写);收集角标仅为占位样式(P6 启用)
- **给下一会话的建议**:
  - P1 先建 `js/engine/` 各模块与 `data/aircraft/b737.json`,用 `createSceneBase()` 起场景验证第一架参数化整机,再替换 hangar 占位机
  - 占位验证机的构建函数(`buildPlaceholderPlane` 等)在 P1 整机可用后整段删除
  - 夜间模式接口 `base.setNight(bool)` 已就绪,勿重复实现
