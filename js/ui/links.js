/**
 * ui/links.js — 友情链接页(#/links)
 * 分组卡片:官方机构 / 数据与航班追踪 / 图库与爱好者社区 / 素材来源与开源项目。
 * 收录口径:民航相关站点 + 本站素材/基础设施的开源致谢;末组兼作开源许可的对外展示。
 * 文案均为界面级短句,已收录进 9 个语言包(非简中语言全量翻译,无"深度内容"提示)。
 */

const GITHUB_ISSUES = 'https://github.com/zhu-zirui/cloud-hangar/issues';

export const GROUPS = [
  {
    title: '官方机构',
    links: [
      {
        name: '中国民用航空局', host: 'www.caac.gov.cn', url: 'https://www.caac.gov.cn',
        desc: '中国民航主管部门,发布规章、公告与行业统计数据。',
      },
      {
        name: '国际民航组织', host: 'www.icao.int', url: 'https://www.icao.int',
        desc: '联合国专门机构,制定国际民用航空标准与建议措施。',
      },
    ],
  },
  {
    title: '数据与航班追踪',
    links: [
      {
        name: '飞常准', host: 'www.variflight.com', url: 'https://www.variflight.com',
        desc: '国内航班动态查询与民航运行数据分析平台。',
      },
      {
        name: '航旅纵横', host: 'www.umetrip.com', url: 'https://www.umetrip.com',
        desc: '中航信旗下的官方航班动态服务。',
      },
      {
        name: 'Flightradar24', host: 'www.flightradar24.com', url: 'https://www.flightradar24.com',
        desc: '全球实时航班追踪网站,本站部分 3D 模型亦来源于此。',
      },
      {
        name: 'FlightAware', host: 'www.flightaware.com', url: 'https://www.flightaware.com',
        desc: '覆盖全球的航班追踪与航空数据平台。',
      },
    ],
  },
  {
    title: '图库与爱好者社区',
    links: [
      {
        name: '民航资源网', host: 'www.carnoc.com', url: 'https://www.carnoc.com',
        desc: '老牌中文民航门户,新闻、数据与爱好者论坛。',
      },
      {
        name: 'Airliners.net', host: 'www.airliners.net', url: 'https://www.airliners.net',
        desc: '全球知名民航摄影图库与爱好者社区。',
      },
      {
        name: 'Planespotters.net', host: 'www.planespotters.net', url: 'https://www.planespotters.net',
        desc: '航司机队、注册号与涂装数据库。',
      },
      {
        name: 'JetPhotos', host: 'www.jetphotos.com', url: 'https://www.jetphotos.com',
        desc: '大型民航摄影社区,可按机型与航司检索。',
      },
    ],
  },
  {
    title: '素材来源与开源项目',
    links: [
      {
        name: 'FGMEMBERS', host: 'github.com/FGMEMBERS', url: 'https://github.com/FGMEMBERS',
        desc: 'FlightGear 社区模型仓库,本站部分机型模型来源(GPL-2.0)。',
      },
      {
        name: 'FlightAirMap 3D models', host: 'github.com/Ysurac', url: 'https://github.com/Ysurac/FlightAirMap-3dmodels',
        desc: '本站 GLB 机型模型来源之一(GPL-2.0)。',
      },
      {
        name: 'Three.js', host: 'threejs.org', url: 'https://threejs.org',
        desc: '驱动本站 3D 场景的开源渲染引擎(MIT 许可)。',
      },
      {
        name: 'GitHub Pages', host: 'pages.github.com', url: 'https://pages.github.com',
        desc: '为本站提供免费静态托管服务。',
      },
    ],
  },
];

export function render(container) {
  container.innerHTML = `
  <div class="container">
    <section class="page-head">
      <h2 class="section-title">友情链接 <span class="sub">FRIEND LINKS</span></h2>
      <p class="links-intro">这里收录了我们常去、也乐于推荐的民航相关站点与开源项目。</p>
    </section>
    ${GROUPS.map((g) => `
    <section class="friend-group anim-fade-up">
      <h3 class="friend-group-title">${g.title}</h3>
      <div class="friend-grid">
        ${g.links.map((l) => `
        <a class="friend-card glass-card" href="${l.url}" target="_blank" rel="noopener">
          <span class="fc-top">
            <span class="fc-name">${l.name}</span>
            <span class="fc-host">${l.host}</span>
          </span>
          <span class="fc-desc">${l.desc}</span>
        </a>`).join('')}
      </div>
    </section>`).join('')}
    <section class="friend-apply glass-card anim-fade-up">
      <h3>申请友链</h3>
      <p>想与本站交换友情链接?欢迎在 GitHub 仓库提交 Issue,附上站点名称、网址与一句话简介;民航科普与航空文化类站点优先。</p>
      <a class="btn btn-ghost btn-sm" href="${GITHUB_ISSUES}" target="_blank" rel="noopener">GitHub Issues ↗</a>
    </section>
  </div>`;

  return null;
}
