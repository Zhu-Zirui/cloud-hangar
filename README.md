# Cloud Hangar

A browser-based 3D aviation atlas for aircraft discovery, airport exploration, and civil aviation knowledge.

<p align="center">
  <img src="https://raw.githubusercontent.com/Zhu-Zirui/cloud-hangar/main/assets/logos/brand.png" alt="Cloud Hangar logo" width="180" />
</p>

<p align="center">
  <a href="https://zhu-zirui.github.io/cloud-hangar/" target="_blank">🌐 Live Demo</a>
  ·
  <a href="https://github.com/Zhu-Zirui/cloud-hangar" target="_blank">📦 GitHub</a>
  ·
  <a href="LICENSE" target="_blank">📄 License</a>
</p>

<p align="center">
  <img alt="Status" src="https://img.shields.io/badge/Status-Initial%20Prototype-orange" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-blue" />
  <img alt="Stack" src="https://img.shields.io/badge/Stack-HTML%2FCSS%2FJS%2FThree.js-4ea1ff" />
</p>

## 中文简介 / Chinese Overview

Cloud Hangar（云端机库）是一个面向航空爱好者、航旅学习者与全球飞友的 3D 交互式航空知识平台。它目前仍处于初版探索阶段，项目还存在许多待完善的问题、数据校准需求和体验优化空间，但它已经清晰呈现出一个重要方向：

- 用浏览器让更多人感受飞机的结构、外观与工程设计
- 让用户了解机场、航司、航空文化与民航知识
- 让全球开发者、设计者、航空爱好者一起协作，构建更强大的航空知识平台

当前版本以中国民航内容为主，目标是从中国版起步，逐步发展成面向全球的航空知识图谱与生态平台，服务全球航空迷、飞友、学习者与开源贡献者。

## English Overview

Cloud Hangar is a 3D interactive aviation knowledge platform designed for aviation enthusiasts, learners, and global flight lovers. The project is still in its initial prototype stage, and many issues, data refinements, and UX improvements remain pending. Nevertheless, it already points toward a clear vision:

- Make aircraft structure, form, and engineering more accessible through the browser
- Help users explore airports, airlines, aviation culture, and civil aviation knowledge
- Build a more powerful and collaborative global aviation platform with developers, designers, and aviation enthusiasts

The current version focuses on China’s civil aviation ecosystem, but the long-term goal is to evolve from a China-focused project into a global aviation atlas that serves users worldwide.

## Why this project exists / 项目为什么存在

航空世界充满故事、系统与工程细节，但许多人仍难以以轻松、有趣且高质量的方式接触这些知识。Cloud Hangar 希望打造一个：

- 视觉上富有吸引力
- 具有教育意义和探索价值
- 能直接在浏览器中体验
- 可持续扩展并允许社区协作

它不是仅仅一个静态页面，而是一个面向知识传播、文化展示与航空学习的开放平台。

## Current status / 当前状态

This is an early-stage project.

- The core idea is already working and the site is runnable
- Features are still being iterated and improved
- Some visual details, content accuracy, and UX refinements are still in progress
- The current content is centered on China civil aviation
- The long-term direction is a global aviation edition

Important note:

This project is not a final product yet. It is a meaningful foundation for future community-driven development, open collaboration, and global expansion.

## Project vision / 项目愿景

We want Cloud Hangar to grow from a personal aviation interest project into a global open-source aviation platform.

Our long-term vision is to create a place where:

- aviation fans can learn together
- global aircraft and airport knowledge can be discovered in a modern interface
- developers, designers, and contributors collaborate on meaningful experiences
- aviation culture and knowledge can be shared across regions and languages

The goal is not only to build a website. The goal is to build a platform that inspires curiosity and brings aviation communities together.

## Core features / 核心功能

### 3D aircraft browsing / 3D 机型浏览
- Explore multiple aircraft models in 3D
- View aircraft variants and related information
- Experience an interactive aviation gallery in the browser

### Airline livery and identity showcase / 涂装与航司识别展示
- Explore airline liveries and aircraft branding
- Present aircraft visual identity in a more engaging way
- Support brand-driven aviation discovery experience

### Airport atlas / 机场图鉴
- Search and discover airport information
- View airport metadata, features, and runway context
- Present structured airport knowledge for browsing and learning

### Aviation encyclopedia / 民航百科
- Publish aviation-related knowledge in a readable format
- Build an accessible educational layer for learners and enthusiasts
- Support a structured knowledge base around aircraft and civil aviation

### Quiz and achievement system / 答题与成就系统
- Encourage interaction and learning
- Add replayability and progress tracking
- Support a more engaging gameplay-like knowledge experience

## Roadmap / 发展路线

### Phase 1: China-focused edition / 中国版
- China civil aviation content
- Major aircraft models and airport data
- Aviation knowledge and educational exploration

### Phase 2: Global aviation edition / 国际版
- Expand beyond China
- Add more aircraft families, airports, and airline brands
- Improve internationalization and multilingual content

### Phase 3: Community-driven platform / 社区协作平台
- Open contribution model
- Better data governance and structured content updates
- Broader participation by global contributors

### Phase 4: Global aviation knowledge hub / 全球航空知识中心
- Stronger user community
- More maintainers and contributors
- A broader platform for aviation enthusiasts and learners worldwide

## Tech stack / 技术栈

- HTML5
- CSS3
- JavaScript ES Modules
- Three.js
- GitHub Pages
- Static front-end architecture

This project intentionally keeps a lightweight architecture without complex frameworks so it can remain accessible, sharable, and easy to deploy.

## Live demo / 在线演示

- Demo: https://zhu-zirui.github.io/cloud-hangar/
- Repository: https://github.com/Zhu-Zirui/cloud-hangar

## Local run / 本地运行

### Option 1 / 方式一

```bash
cd cloud-hangar
python dev-server.py 8000
```

Then open:

```text
http://127.0.0.1:8000/
```

### Option 2 / 方式二

```bash
cd cloud-hangar
python -m http.server 8000
```

Then open:

```text
http://127.0.0.1:8000/
```

## Project structure / 项目结构

```text
cloud-hangar/
├── assets/                  # static assets and runtime resources
│   ├── models/              # 3D aircraft model files
│   ├── logos/               # brands and airline logos
│   └── CREDITS.md          # asset and source credits
├── css/
│   └── main.css            # global styling
├── data/
│   ├── aircraft/           # aircraft metadata
│   ├── airports.json       # airport data
│   ├── liveries.json       # aircraft livery data
│   ├── parts.json           # component knowledge data
│   ├── quiz.json            # quiz content
│   └── wiki.json            # encyclopedia content
├── js/
│   ├── core/               # shared utilities
│   ├── engine/             # 3D rendering and aircraft engine
│   ├── ui/                 # page rendering and interactions
│   ├── main.js             # routing and app bootstrapping
│   └── scene.js            # scene infrastructure
├── index.html              # site entry
├── dev-server.py           # local development server
├── PROGRESS.md             # project progress record
├── LICENSE                 # MIT license
├── README.md               # project documentation
├── .gitignore
└── assets/CREDITS.md
```

## Naming direction / 命名方向

The project currently uses the name Cloud Hangar, which is meaningful and works well for the early stage. However, for a global audience and future international expansion, the project could evolve toward a broader and more international brand name.

Recommended naming directions:

- AeroAtlas
- SkyAtlas
- FlightAtlas
- AirHarbor
- HangarWorld
- AeroHub

Recommended priority:

1. AeroAtlas
2. SkyAtlas
3. FlightAtlas

AeroAtlas is especially suitable for a platform that aims to become a global aviation atlas, knowledge base, and community project.

This README keeps the current project identity as Cloud Hangar while clearly positioning the project’s future ambition toward a global aviation platform.

## Open source spirit / 开源精神

This project is still small, but it has strong potential.

We hope it can become a shared platform where open-source contributors improve:

- aircraft data
- airport information
- aviation knowledge content
- UI/UX and interactions
- translations and localization
- data quality and product maturity

The project is not just about code. It is also about building a community around aviation discovery and knowledge sharing.

## Contributing / 参与贡献

We welcome contributions in many forms:

- bug reports
- feature ideas
- UI and interaction improvements
- data corrections
- translations
- aviation content reviews
- visual design and branding support

If you want to contribute, please fork the repository and open a pull request.

## License / 许可证

This project is released under the MIT License.

Please see the [LICENSE](LICENSE) file for the full license text.

The MIT license is a simple and community-friendly choice for an open-source aviation platform and supports broad adoption, modification, and distribution with attribution.

## Important note / 重要说明

This is an initial version.

There are still many issues that require attention, including:

- data accuracy refinement
- user experience polish
- content completeness
- internationalization
- optimization and stability improvements
- broader global aviation coverage

But that is also the value of an early open-source project: it has room to grow, improve, and evolve through community effort.

We sincerely welcome anyone who cares about aviation, open-source development, 3D web experiences, and global knowledge-sharing to join this mission.

## Community call / 社通告

We invite aviation enthusiasts, developers, designers, students, writers, and open-source contributors from around the world to join us.

Let us work together to make this platform stronger, more useful, and more inspiring for aviation communities worldwide.

Let’s build a better aviation knowledge platform — not only for China, but for the world.

## Author / 作者

- GitHub: Zhu-Zirui
- Project: Cloud Hangar
- Repository: https://github.com/Zhu-Zirui/cloud-hangar

## Final message / 最后一句话

Cloud Hangar is still young, but the vision is large.

We are building not only a project, but a future platform for aviation lovers, learners, and open-source contributors around the world.

If you care about aviation, design, front-end technology, and open knowledge-sharing, we welcome you to join us.

---

<p align="center">
  <sub>Cloud Hangar — an early-stage aviation atlas with a global future.</sub>
</p>
