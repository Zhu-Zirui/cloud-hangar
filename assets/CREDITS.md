# assets/CREDITS.md — 素材来源与许可记录

> 铁律 §4(2026-10-25 修订)要求:所有二进制素材记录来源与许可。
> 素材实体存放于移动硬盘 `D:\云端机库-assets\`,本目录为 junction 引用。

## 3D 模型 `models/<id>/<id>.glb`

来源仓库:**[Flightradar24/fr24-3d-models](https://github.com/Flightradar24/fr24-3d-models)**
(FlightRadar24 官方 3D 视图机型模型,glTF/GLB 格式)
许可:**GPL-2.0**(详见原仓库 LICENSE)。本项目为非商业爱好者图鉴,免费再分发;
如后续转为任何形式的商业用途,需按 GPL-2.0 义务开放相应源。已尽量保留原文件完整性。

| 文件 | 对应变体 ID | 用途 | 备注 |
| --- | --- | --- | --- |
| b738.glb | b738 波音 737-800 | 真实模型通道 | 由原仓库 source/b738/737.zip 的 737.dae + 737-800.png 贴图转换(trimesh/pycollada,2026-10-25),含波音牌示涂装 |
| a20n.glb | a20n A320neo(暂代) | 真实模型通道 | 为 ceo 世代模型(空客屋涂装),鲨鳍小翼一致,发动机细节与 neo 有差异 |
| a21n.glb | a21n A321neo(暂代) | 真实模型通道 | 同上 |
| a332.glb | a332 A330-200 | 真实模型通道 | 原生变体 |
| a333.glb | a333 A330-300 | 真实模型通道 | 原生变体 |
| b788.glb | b788 787-8 | 真实模型通道 | 原生变体 |
| b789.glb | b789 787-9 | 真实模型通道 | 由原仓库 source/b789/789.zip 的 787-900.dae + 4 张贴图转换(2026-10-25) |
| a359.glb | a359 A350-900 | 真实模型通道 | 原生变体 |
| b748.glb | b748 747-8 | 真实模型通道 | 原生变体 |
| (已舍弃) | b38m / c919 / a35k | — | 无免费可分发真实模型,经批准从图鉴中舍弃(2026-10-25) |

注:全部真实模型均为静态(无动画数据),起落架为停放姿态并贴地;默认涂装为波音/空客原厂牌示涂装,发动机为真实对应型号(如 747-8 的 GEnx 带 GE 标志)。

下载日期:2026-10-25。

## 厂商标志 `logos/`(机库内景品牌面板用)

来源:**Wikimedia Commons**(SVG 矢量原文件转 PNG,1200px 宽,透明底)。
波音/空客字标为各自公司注册商标,本项目为非商业爱好者图鉴的标识性引用,
不再分发、不用于任何商业用途;如需商用须取得权利人授权。

| 文件 | 内容 | 来源页面 |
| --- | --- | --- |
| logos/boeing.png | Boeing full logo(蓝色字标+圆环) | commons:File:Boeing_full_logo.svg |
| logos/airbus.png | Airbus 2017 现行字标 | commons:File:Airbus_Logo_2017.svg |

下载日期:2026-10-25。

## 照片 `photos/`(预留)

用于涂装/比例校准参考的照片(计划取自 Wikimedia Commons,CC BY-SA,逐张记录),
尚未下载。

## 涂装模型 `models/b788/b788-<airline>.glb`(P2 真实涂装,2026-10-25)

来源:**[FGMEMBERS/787](https://github.com/FGMEMBERS/787)**(FlightGear 787-8,Models/787-8.ac + Liveries 贴图)
许可:**GPL-2.0**(与项目现有模型同源同许可)。转换:`D:\云端机库-assets\_toolsc2glb.py`
(自研 AC3D 文本格式解析 → trimesh → glTF2,材质双面/金属度 0.12/粗糙度 0.78,灯光贴图以自发光呈现)。

| 文件 | 涂装 | 贴图来源 |
| --- | --- | --- |
| b788-hu.glb | 海南航空 | Liveries/CHH.png |
| b788-cz.glb | 中国南方航空 | Liveries/CSN.png |
| b788-mf.glb | 厦门航空 | Liveries/CXA.png |
| b788-ca.glb | 中国国际航空(B-2727) | Liveries/B-2727.png |
| b788-boe.glb | 波音演示涂装 | Liveries/BOE.png |
| b788-afr.glb | 法国航空 | Liveries/AFR.png |
| b788-baw.glb | 英国航空 | Liveries/BAW.png |
| b788-ual.glb | 美国联合航空 | Liveries/UAL.png |
| b788-ana.glb | 全日空 | Liveries/ANA-Livery.png |

注:几何为 FlightGear 787-8(低多边形),与 FR24 版 b788.glb(波音原厂默认)并存,涂装切换时整体换装。

## 航司标志 `logos/`(P2 涂装色卡/机库品牌用,2026-10-25)

ca/mu/cz/hu/3u/mf/zh/sc/fu/ho/9c.png:维基百科对应条目官方标志文件,经
`Special:FilePath?width=1200` 服务端渲染下载(透明底 PNG);其中 fu.png 仅 293×340
(全网可得的最高清晰度)、9c.png 为 Commons 公有领域版本放大至 1200px。
afr.png(Air France Logo.svg)、ual.png(United Airlines Logo.svg):en.wikipedia
Special:FilePath 下载(960px)。baw/ana 暂无可分发标志文件,色卡仅用品牌底色。
全部标志为各航司注册商标,本项目为非商业爱好者图鉴的标识性引用,不再分发。

## 转换工具 `_tools/ac2glb.py`

自研脚本(本项目产出,GPL-2.0 同源随项目分发),解析 AC3D 格式并经 trimesh 导出 glTF2。

## 航司标志补录 `logos/`(P5 机场图鉴"基地航司"用,2026-10-26)

kn.png(中国联合航空,File:China United Airlines logo.svg → 960px PNG)、
eu.png(成都航空,File:Chengdu Airlines logo.png)、pn.png(西部航空,
File:West Air (China) Logo.png)、8l.png(祥鹏航空,File:Lucky Air New Logo 2015.png)、
gj.png(浙江长龙航空,File:LoongAir logo.png):均取自 en.wikipedia
Special:FilePath 服务(2026-10-26 下载,原始分辨率 168–960px)。
与上节一致:全部标志为各航司注册商标,本项目为非商业爱好者图鉴的标识性引用,不再分发。

## 航司标志补录 `logos/`(P5 扩容 52 机场"基地航司"用,2026-10-29)

qd/gs/bk/ns/ry/jd/gx/dr/tv/9d/g5/aq/ky/fm.png(青岛航空、天津航空、奥凯航空、
河北航空、江西航空、首都航空、北部湾航空、多彩贵州航空、西藏航空、天骄航空、
华夏航空、九元航空、昆明航空、上海航空):经 360 图片搜索(image.so.com)检索
公开网络图片下载,长边压缩至 ≤400px、白底化处理。来源图片为各航司注册商标,
本项目为非商业爱好者图鉴的标识性引用,不再分发。

## 航司标志补录 `logos/`(P5 扩容 165 机场"基地航司"用,2026-10-29 第二批)

ci/cx/br/jx/it/b7/nx/hx/uo/a6.png(中华航空、国泰航空、长荣航空、星宇航空、
台湾虎航、立荣航空、澳门航空、香港航空、香港快运、湖南航空):经 360 图片搜索
(image.so.com)检索公开网络图片下载,长边压缩至 ≤400px、白底化处理,个别图源
附带水印已裁除。来源图片为各航司注册商标,本项目为非商业爱好者图鉴的标识性
引用,不再分发。

## 航司标志补录 `logos/`(P5 287 机场货运航司基地 + baw/ana 修复,2026-10-31)

sf/jg/cao/ck/fx/baw/ana.png(顺丰航空、京东航空、中国国际货运航空、
中国货运航空、联邦快递、英国航空、全日空):经百度图片搜索(image.baidu.com,
360 图片接口限流后切换)检索公开网络图片下载,白底修边、长边 ≤800px,
图源附带水印(头条号/socologo/品牌星球)已裁除;替换 2026-10-26 下载失败的
baw.png/ana.png 坏文件。来源图片为各航司注册商标,本项目为非商业爱好者
图鉴的标识性引用,不再分发。
