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

## 待办

- [ ] P1 参数化建模引擎 + 机型查看页(替换占位机,数据迁入 data/aircraft/)
- [ ] P2 Canvas 涂装贴图引擎(airlines liveries)
- [ ] P3 部件知识卡(parts)
- [ ] P4 舱内场景(驾驶舱 / 客舱)
- [ ] P5 机场图鉴
- [ ] P6 百科 + 答题 / 成就 / 收集
- 其余阶段划分以提示词包为准

## 遗留问题

- 暂无。

## 会话记录

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
