# 云端机库 · 中国民航 3D 图鉴 / Cloud Hangar · China Civil Aviation 3D Atlas

<p align="center">
  <img src="https://raw.githubusercontent.com/Zhu-Zirui/cloud-hangar/main/assets/logos/brand.png" alt="Cloud Hangar Logo" width="180" />
</p>

<p align="center">
  <a href="https://zhu-zirui.github.io/cloud-hangar/">🌐 在线演示 / Live Demo</a>
  ·
  <a href="https://github.com/Zhu-Zirui/cloud-hangar">📦 GitHub 仓库 / Repository</a>
</p>

## 1. 项目简介 / Project Overview

云端机库是一个以中国民航为主题的纯前端 3D 图鉴项目，聚焦于航空器、机场、部件知识与民航百科的沉浸式展示体验。项目以原生 HTML + CSS + JavaScript 构建，结合 Three.js 3D 渲染，实现了机型浏览、涂装切换、机型知识卡、机场图鉴、百科与答题成就等一体化的静态展示站点。

Cloud Hangar is a front-end 3D aviation showcase themed around China's civil aviation ecosystem. It focuses on immersive display of aircraft, airports, component knowledge, and civil aviation encyclopedia content. Built with native HTML, CSS, and JavaScript, and powered by Three.js, the project offers a static single-page experience featuring aircraft browsing, livery switching, component knowledge cards, airport exploration, encyclopedia, and quiz-based achievements.

这个项目的设计目标是：
- 让更多人可以用浏览器直接了解中国民航机型与航空知识
- 用轻量静态站点的方式展示高质量 3D 内容
- 让内容以“交互 + 信息 + 数据”三位一体的方式被浏览和传播

Project goals:
- Make China's civil aviation aircraft and aviation knowledge accessible directly in the browser
- Deliver high-quality 3D content through a lightweight static website
- Present information via interactive visuals, structured knowledge, and data-driven exploration

## 2. 亮点功能 / Key Features

### 2.1 3D 机型图鉴 / 3D Aircraft Gallery
- 支持多机型浏览与切换
- 采用 Three.js 渲染航空器模型
- 支持交互式视角切换与场景观测
- 机库界面展示机型信息与机型关联内容

- Supports multi-aircraft browsing and switching
- Uses Three.js to render aircraft models
- Includes interactive camera/view-angle changes
- Hangar interface displays aircraft details and related content

### 2.2 涂装切换 / Livery Switching
- 支持不同航空公司涂装切换
- 通过真实机队着色方案和整机替换实现品牌差异展示
- 适用于对航空涂装、机队识别与品牌视觉体验的展示

- Supports airline livery switching
- Uses real aircraft branding variations and full-model replacement
- Useful for demonstrating airline identity and visual variations

### 2.3 部件知识图鉴 / Component Knowledge Atlas
- 提供 30+ 部件知识卡
- 按部件分类、热点定位与交互式展示
- 帮助用户理解飞机结构和各部件功能

- Includes 30+ component knowledge cards
- Offers part classification, hotspot positioning, and interaction
- Helps users understand aircraft structure and component functions

### 2.4 机场图鉴 / Airport Atlas
- 覆盖中国主要机场数据
- 支持列表、详情、地图三视图切换
- 提供跑道布局、机场信息与城市航线语境

- Covers major airports in China
- Includes list, detail, and map views
- Provides runway layout, airport information, and city/aviation context

### 2.5 民航百科与答题成就 / Aviation Encyclopedia + Quiz + Achievements
- 提供 40+ 主题词条
- 搭配知识问答、进度记录与徽章成就系统
- 适合学习、传播和互动式参观

- Provides 40+ aviation entries
- Includes quiz challenges, progress tracking, and badge achievements
- Suitable for learning, discovery, and interactive engagement

## 3. 项目结构 / Project Structure

```text
cloud-hangar/
├── assets/                  # 资源文件 / static assets
│   ├── models/             # 3D 模型 / GLB files
│   ├── logos/              # 航司及品牌 logo / airline brand logos
│   └── CREDITS.md          # 版权与素材来源说明 / credits
├── css/
│   └── main.css            # 全站样式 / site styling
├── data/
│   ├── aircraft/           # 机型数据 / aircraft metadata
│   ├── airports.json       # 机场数据 / airport dataset
│   ├── liveries.json      # 涂装数据 / livery dataset
│   ├── parts.json          # 部件知识卡 / part knowledge dataset
│   ├── quiz.json           # 问答数据 / quiz content
│   └── wiki.json           # 百科数据 / encyclopedia content
├── js/
│   ├── core/               # 基础通用逻辑 / core utilities
│   ├── engine/             # 3D 引擎与机型构建 / rendering engine
│   ├── ui/                 # 页面渲染和交互 / UI modules
│   ├── main.js             # 路由和入口 / route + app bootstrap
│   └── scene.js            # 场景基础设施 / scene foundation
├── index.html              # 站点入口 / HTML entry
├── dev-server.py           # 本地开发服务器 / local dev server
├── PROGRESS.md             # 项目进度记录 / progress ledger
├── README.md               # 项目说明文档 / project documentation
├── .gitignore
└── LICENSE                 # 若项目后续补充许可 / license if added
```

## 4. 技术栈 / Tech Stack

- HTML5
- CSS3
- JavaScript ES Modules
- Three.js r160
- GitHub Pages
- Pure static asset architecture (no build tools required)

This project intentionally avoids heavy frameworks or complex build systems, which keeps it lightweight, easy to browse, and easy to deploy on GitHub Pages.

## 5. 在线访问 / Live Access

项目已部署到 GitHub Pages：

- Chinese demo: https://zhu-zirui.github.io/cloud-hangar/
- GitHub repository: https://github.com/Zhu-Zirui/cloud-hangar

## 6. 本地运行 / Local Run

### 方法一 / Option 1：直接使用内置开发服务器

```bash
cd cloud-hangar
python dev-server.py 8000
```

然后在浏览器打开：

```text
http://127.0.0.1:8000/
```

### 方法二 / Option 2：使用 Python 自带静态服务器

```bash
cd cloud-hangar
python -m http.server 8000
```

随后访问：

```text
http://127.0.0.1:8000/
```

## 7. 项目特色与应用场景 / Highlights and Use Cases

### 7.1 面向民航爱好者 / For Aviation Enthusiasts
- 机型识别与结构学习
- 机队与涂装知识扩展
- 机场与航线知识探究

### 7.2 面向教育传播 / For Education and Outreach
- 适合航空知识普及
- 适合课程演示和互动展示
- 可作为前端/3D/数据展示类项目案例

### 7.3 面向开源学习 / For Open Source Learning
- 体现静态站点开发方式
- 展示 3D Web 场景与交互逻辑组织
- 适合学习前端、3D 与内容型 Web 应用开发

## 8. 浏览器兼容性 / Browser Compatibility

推荐使用现代浏览器：
- Chrome
- Edge
- Firefox
- Safari (较新版本)

由于项目使用 WebGL/Three.js，建议在较新版本浏览器中体验最佳效果。

## 9. 版本说明 / Version Notes

当前项目处于持续迭代状态，包含以下主要模块：
- 机库与航机浏览
- 机场图鉴
- 航空百科
- 问答和成就系统
- 3D 机型展示与数据驱动内容

The project is under active iteration and includes:
- Hangar and aircraft browsing
- Airport atlas
- Aviation encyclopedia
- Quiz and achievement system
- 3D aircraft rendering and data-driven content

## 10. 版权说明 / Copyright and Disclaimer

本项目用于学习、展示与非商业研究场景，素材与模型来源均遵循项目说明与附属文件记录，具体请参考：

- `assets/CREDITS.md`
- `PROGRESS.md`

This project is intended for learning, display, and non-commercial research. Asset and model sources should be checked in the project records and credits files, especially:

- `assets/CREDITS.md`
- `PROGRESS.md`

如需商用或二次分发，请先确认各模型、图片、品牌/Logo 与数据来源的授权条件。

For any commercial use or redistribution, please confirm the licensing status of each model, image, logo, brand asset, and data source before use.

## 11. 贡献方式 / Contributing

欢迎提出建议、参与修正或提交改进：

1. Fork 本仓库
2. 创建功能分支
3. 提交改进
4. 提交 Pull Request

We welcome suggestions, fixes, and improvements:

1. Fork this repository
2. Create a feature branch
3. Commit your improvements
4. Open a Pull Request

## 12. 项目作者 / Author

- GitHub: Zhu-Zirui
- Repository: https://github.com/Zhu-Zirui/cloud-hangar

## 13. 最后说明 / Final Note

云端机库不是一个传统的“静态页面”，而是一个兼具展示、互动与知识传播功能的前端航空主题作品。它将三维展现、文化信息和用户体验结合在一起，为航空爱好者、前端学习者和内容型项目开发者提供了一个有参考价值的案例。

Cloud Hangar is not a traditional static landing page; it is a front-end aviation-themed project combining 3D presentation, interactive discovery, and knowledge propagation. It integrates 3D visualization, cultural information, and user experience into a single project, making it a useful reference for aviation enthusiasts, frontend learners, and content-driven web app developers.

如果你喜欢这个项目，欢迎 Star、Fork 与分享。让更多人看到这份关于中国民航的 3D 图鉴作品。

If you enjoy this project, please consider giving it a Star, Fork, and sharing it with others. Let more people discover this 3D aviation atlas project about China’s civil aviation.

---

<p align="center">
  <sub>Cloud Hangar · A browser-based 3D aviation atlas for civil aviation discovery</sub>
</p>
