/**
 * ui/legal.js — 法律文档页(#/terms 服务条款、#/privacy 隐私政策、#/cookies Cookie 说明)
 * 纯静态文案,同一模块三份文档,按路由首段选择;末次更新日期统一维护在 DOCS。
 * 文案口径:非商业爱好者项目、GitHub Pages 托管、无服务器账号、仅浏览器本地存储。
 */

const UPDATED = '2026 年 10 月 31 日';

const DOCS = {
  terms: {
    title: '服务条款',
    sub: 'TERMS OF SERVICE',
    html: `
    <p class="legal-updated">最后更新:${UPDATED}</p>
    <p>欢迎使用「云端机库 · 中国民航 3D 图鉴」(下称"本站")。请在使用前仔细阅读本条款;访问或使用本站即表示你已理解并接受以下全部内容。</p>

    <h3>一、服务性质</h3>
    <ul>
      <li>本站是由个人开发者维护的<b>非商业</b>民航科普与爱好者项目,托管于 GitHub Pages,所有功能免费提供。</li>
      <li>本站内容(3D 模型、涂装再现、机场/航司/百科数据、题库)依据公开渠道资料整理或程序化生成,<b>仅供学习、欣赏与参考</b>,不构成任何官方、运营或专业依据。</li>
      <li>本站不提供航班查询、购票、值机等任何实际航空运输服务,与任何航空公司、机场管理机构无隶属或合作关系。</li>
    </ul>

    <h3>二、账号</h3>
    <ul>
      <li>本站的注册登录为<b>纯浏览器本机账号</b>:用户名与经加盐哈希的密码仅保存在你设备浏览器的本地存储(localStorage)中,本站没有服务器数据库,不收集、不上传任何账号信息。</li>
      <li>你应妥善保管设备与浏览器;清除浏览器数据、更换设备会导致本机账号与相关数据消失,本站无法帮你找回。</li>
      <li>请勿使用侵害他人权益的用户名(冒充真实机构、包含侮辱歧视内容等)。</li>
    </ul>

    <h3>三、知识产权</h3>
    <ul>
      <li>本站源代码以 MIT 许可证开源,详见仓库 LICENSE 文件。</li>
      <li>各航空公司名称、标识、涂装方案等的商标权与著作权归 相应权利人所有;本站对涂装与标识的再现属于爱好者非商业性质的技术演示与科普再现,不代表任何官方立场。</li>
      <li>第三方素材(如 GLB 模型)的来源与许可详见站内 assets/CREDITS.md。</li>
    </ul>

    <h3>四、使用规范</h3>
    <ul>
      <li>不得利用本站从事任何违反法律法规或损害他人合法权益的活动。</li>
      <li>不得对本站实施恶意攻击、爬取压测或影响 GitHub Pages / CDN 正常服务的滥用行为。</li>
    </ul>

    <h3>五、免责声明</h3>
    <ul>
      <li>本站按"现状"提供,不作出任何明示或默示的适销性、准确性与适用性保证;数据可能存在错漏,使用前请以官方渠道信息为准。</li>
      <li>在法律允许的最大范围内,作者不对因使用或无法使用本站产生的任何直接或间接损失承担责任。</li>
    </ul>

    <h3>六、条款变更</h3>
    <ul>
      <li>本站可能随时更新本条款,更新后在页面标注新的"最后更新"日期;继续使用即视为接受更新后的条款。</li>
      <li>如有疑问或建议,欢迎通过 GitHub 仓库 Issues 联系。</li>
    </ul>`,
  },

  privacy: {
    title: '隐私政策',
    sub: 'PRIVACY POLICY',
    html: `
    <p class="legal-updated">最后更新:${UPDATED}</p>
    <p>本站高度重视你的隐私。本政策说明本站收集、使用与存储信息的方式。核心承诺一句话:<b>本站没有服务器,你的所有数据都只保存在你自己的浏览器里。</b></p>

    <h3>一、我们收集什么</h3>
    <ul>
      <li><b>我们不收集任何个人身份信息。</b>没有手机号、邮箱、真实姓名,注册仅需要一个自拟用户名。</li>
      <li><b>本机数据(localStorage):</b>浏览进度(看过的机型/涂装/机场/词条)、答题等级、成就徽章、本机账号(用户名 + 16 字节随机盐 + SHA-256 哈希后的密码,永不明文保存)、同意记录与界面偏好。以上数据只存在于你的设备,本站无法读取。</li>
      <li><b>标准访问日志:</b>GitHub Pages 与 jsDelivr CDN 作为托管/分发方会按其自身隐私政策处理请求 IP、User-Agent 等技术日志,本站作者无法识别到个人。</li>
    </ul>

    <h3>二、我们如何使用</h3>
    <ul>
      <li>本机数据仅用于在你自己的浏览器中呈现你的进度、成就与登录状态,不用于分析、画像、广告或向任何第三方出售。</li>
      <li>本站不接入任何统计埋点(如 Google Analytics)或广告 SDK。</li>
    </ul>

    <h3>三、第三方服务</h3>
    <ul>
      <li><b>GitHub Pages</b>(站点托管)与 <b>jsDelivr CDN</b>(Three.js 等前端库分发):仅用于把页面内容送达你的浏览器, 其各自隐私政策见其官网。</li>
      <li><b>get.geojs.io</b>(首次访问语言探测):当你尚未手动选择过语言时,浏览器会向该免费接口发送一次 IP 归属地查询(约 1.2 秒超时),仅用于选择默认界面语言;查询到的国家码只保存在你本机(localStorage,30 天)且可随时清除,本站自身不记录、不上传该信息。你可在页头手动切换语言,此后不再触发探测。</li>
      <li>除上述基础设施外,本站不向任何第三方传输你的数据。</li>
    </ul>

    <h3>四、儿童隐私</h3>
    <ul>
      <li>本站内容面向一般航空爱好者,不收集任何人(包括 14 周岁以下儿童)的个人信息。</li>
    </ul>

    <h3>五、你的控制权</h3>
    <ul>
      <li>在个人中心可随时<b>退出登录</b>或<b>注销本机账号</b>(仅删除账号凭据)。</li>
      <li>清除浏览器站点数据(或使用无痕窗口)即可彻底删除本站保存在你设备上的全部数据。</li>
    </ul>

    <h3>六、政策变更</h3>
    <ul>
      <li>本政策如有实质性变更(例如未来接入真实后端账号),会在本页显著位置更新日期并再次征求你的同意。</li>
    </ul>`,
  },

  cookies: {
    title: 'Cookie 说明',
    sub: 'COOKIE POLICY',
    html: `
    <p class="legal-updated">最后更新:${UPDATED}</p>
    <p>本页说明本站对 Cookie 及同类浏览器存储技术的使用情况。</p>

    <h3>一、本站不使用 Cookie</h3>
    <ul>
      <li>本站<b>自身不设置、也不读取任何 Cookie</b>,因此不需要你同意 Cookie。</li>
      <li>本站使用功能等价的 <b>localStorage(浏览器本地存储)</b> 保存必要信息,它不会随请求发送到任何服务器,只能被本站在你的浏览器中读取,可随时通过浏览器设置清除。</li>
    </ul>

    <h3>二、localStorage 存了什么</h3>
    <table class="legal-table">
      <thead><tr><th>键(cav3d. 前缀)</th><th>内容</th><th>用途</th></tr></thead>
      <tbody>
        <tr><td>users / session</td><td>用户名、盐化密码哈希 / 登录态</td><td>本机账号注册与登录</td></tr>
        <tr><td>pilotRank、badges</td><td>答题等级、成就徽章</td><td>成就系统</td></tr>
        <tr><td>seenVariants、seenLiveries 等</td><td>浏览打卡记录</td><td>收集进度仪表盘</td></tr>
        <tr><td>consent</td><td>同意记录与时间</td><td>记住你已知晓本说明</td></tr>
      </tbody>
    </table>

    <h3>三、第三方可能涉及的技术日志</h3>
    <ul>
      <li>托管方 GitHub Pages 与库分发方 jsDelivr 可能按各自政策记录请求级技术日志(如 IP),这不属于本站设置的 Cookie 或存储。</li>
      <li>若你从 GitHub 等外部链接跳转而来, 相应平台自身的 Cookie 与本站无关。</li>
    </ul>

    <h3>四、如何管理</h3>
    <ul>
      <li>浏览器均提供"清除站点数据 / 阻止站点存储"的能力,路径一般在隐私设置中;清除后本站进度将重置。</li>
      <li>首次访问横幅点"知道了"即记录同意;如需撤回,清除本站站点数据即可。</li>
    </ul>`,
  },
};

export function render(container, params) {
  const key = params?.segments?.[0];
  const doc = DOCS[key] || DOCS.terms;

  container.innerHTML = `
  <div class="container">
    <section class="page-head">
      <h2 class="section-title">${doc.title} <span class="sub">${doc.sub}</span></h2>
    </section>
    <nav class="legal-nav anim-fade-up">
      ${Object.entries(DOCS).map(([k, d]) => `
        <a href="#/${k}" class="btn btn-sm ${k === key ? 'btn-primary' : 'btn-ghost'}">${d.title}</a>`).join('')}
    </nav>
    <article class="legal-doc glass-card anim-fade-up">${doc.html}</article>
  </div>`;

  return null;
}
