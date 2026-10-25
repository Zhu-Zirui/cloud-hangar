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
| P7 | 部署上线 GitHub Pages(运行时资产全量入库方案) | 2026-10-25 |

## 待办

- [ ] P1 参数化建模引擎 + 机型查看页(替换占位机,数据迁入 data/aircraft/)
- [x] P2 涂装引擎(真实涂装 GLB 方案)
- [ ] P3 部件知识卡(parts)
- [ ] P4 舱内场景(驾驶舱 / 客舱)
- [ ] P5 机场图鉴
- [ ] P6 百科 + 答题 / 成就 / 收集
- 其余阶段划分以提示词包为准

## 遗留问题

- 涂装覆盖:b788 有 10 款(海航/南航/厦航/国航 + 波音演示 + 法/英/美/日航司),其余变体仅原厂涂装;737NG 东航 CES、A320 系国航等贴图已定位未转换(见"给下一会话的建议")。
- FG 涂装模型(FlightGear 787-8)为低多边形且起落架姿态/取景基线与 FR24 模型不同,换装后观感与取景待调优;换装功能本身已可用(色卡/下拉/品牌联动/seenLiveries)。
- 特殊彩绘(熊猫号/联合梦想号等 8 款已核实真实存在)暂无现成贴图,未实现。

## 会话记录

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
