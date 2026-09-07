// ---- 数据模型 ----
const PROJ = {A:'A 公司（美股·云业务）', B:'B 公司（美股·供应链）'};
let cur = 'A', seq = 0;
const mems = [];        // 记忆库
let step = 'w1';

const $ = id => document.getElementById(id);
const now = () => new Date().toLocaleString('zh-CN',{hour12:false,month:'2-digit',day:'2-digit',
              hour:'2-digit',minute:'2-digit'});

// ---- 机制日志 ----
function log(t){ $('log').innerHTML = '· ' + t + '<br>' + $('log').innerHTML; }

// ---- 记忆增删改 ----
function addMem({text, type, proj, src, status='pend', conf='高', reason=''}){
  const m = {id:++seq, text, type, proj, src, status, conf, reason,
             time:now(), ver:1, hist:[]};
  mems.push(m); renderMem();
  log(`抽取候选记忆 <b>M${m.id}</b>（${label(type)}，置信度${conf}）→ ${status==='pend'?'等待用户确认':'静默写入'}`);
  return m;
}
function label(t){ return {state:'状态型',reason:'理由型',pref:'偏好型'}[t]; }
function stName(s){ return {pend:'待确认',ok:'已确认',fix:'已纠正',arch:'已归档'}[s]; }

function confirmMem(id, ok){
  const m = mems.find(x=>x.id===id); if(!m) return;
  if(ok){ m.status='ok'; log(`用户确认 <b>M${m.id}</b> → 写入记忆库，可被后续会话调用`); }
  else  { m.status='pend'; log(`用户否认 <b>M${m.id}</b> → 未写入，等待用户给出正确信息`); }
  renderMem();
}
function correctMem(id, newText, why){
  const m = mems.find(x=>x.id===id); if(!m) return;
  m.hist.unshift({ver:m.ver, text:m.text, time:m.time, why:'被新版本替换'});
  m.ver += 1; m.text = newText; m.status='fix'; m.time = now();
  m.src = m.src + ' → 纠正于本次会话';
  renderMem();
  log(`纠正 <b>M${m.id}</b>：写入 v${m.ver}，v${m.ver-1} 归档可追溯；后续调用全局切换至新版本`);
  if(why) log(`纠错原因记录：${why}`);
}

// ---- 记忆库渲染 ----
function renderMem(){
  $('projsel').innerHTML = Object.keys(PROJ).map(k=>
    `<button class="${k===cur?'on':''}" onclick="switchProj('${k}')">${PROJ[k].split('（')[0]}</button>`).join('');
  const list = mems.filter(m=>m.proj===cur);
  $('memN').textContent = list.length + ' 条 · ' + PROJ[cur].split('（')[0];
  const low = list.filter(m=>m.conf==='低');
  $('gate').style.display = low.length ? 'block':'none';
  if(low.length) $('gate').innerHTML = `置信度门控：${low.map(m=>'M'+m.id).join('、')} 为低置信记忆，不自动注入回答，仅在用户显式追问时提示可能已过期。`;

  $('memList').innerHTML = list.length ? list.map(m=>`
    <div class="mem ${m.status==='arch'?'arch':''}">
      <div class="top">
        <div class="txt">${m.text}</div>
        <span class="tag t-${m.type==='state'?'state':m.type==='reason'?'reason':'pref'}">${label(m.type)}</span>
      </div>
      <div class="meta">M${m.id} · v${m.ver} · 来源：${m.src}<br>写入：${m.time} · 置信度：${m.conf}</div>
      <span class="st s-${m.status==='ok'?'ok':m.status==='pend'?'pend':m.status==='fix'?'fix':'arch'}">
        ${m.status==='ok'?'✓ ':m.status==='pend'?'⏳ ':m.status==='fix'?'↺ ':''}${stName(m.status)}</span>
      ${m.hist.length?` · <span class="st s-arch" style="cursor:pointer" onclick="openM(${m.id})">查看 ${m.hist.length} 个历史版本</span>`:''}
    </div>`).join('') : '<p class="empty">该项目暂无记忆</p>';
}
function switchProj(k){ cur=k; renderMem(); log(`切换至项目 <b>${PROJ[k].split('（')[0]}</b>：默认仅调用本项目记忆`); }

// ---- 溯源弹窗 ----
function openM(id){
  const m = mems.find(x=>x.id===id); if(!m) return;
  $('mkv').innerHTML = `
    <dt>记忆编号</dt><dd>M${m.id}（当前 v${m.ver}）</dd>
    <dt>内容</dt><dd>${m.text}</dd>
    <dt>类型</dt><dd>${label(m.type)}</dd>
    <dt>所属项目</dt><dd>${PROJ[m.proj]}</dd>
    <dt>来源</dt><dd>${m.src}</dd>
    <dt>写入时间</dt><dd>${m.time}</dd>
    <dt>确认状态</dt><dd>${stName(m.status)}</dd>
    <dt>置信度</dt><dd>${m.conf}</dd>`;
  $('mvh').innerHTML = `<div class="ttl">版本历史</div>
    <div class="vrow cur">v${m.ver}（当前生效）：${m.text}<span class="vt">${m.time}</span></div>` +
    m.hist.map(h=>`<div class="vrow">v${h.ver}（已归档）：${h.text}<span class="vt">${h.time} · ${h.why}</span></div>`).join('');
  $('mask').classList.add('on');
  log(`用户点击角标核验 <b>M${m.id}</b> 的来源与版本历史`);
}
function closeM(){ $('mask').classList.remove('on'); }

// ---- 消息气泡 ----
function bubble(role, html, lead){
  const d = document.createElement('div');
  d.className = 'msg ' + (role==='u'?'u':'a') + (html.indexOf('class="confirm"')>-1?' wide':'');
  d.innerHTML = (lead?`<div class="lead">${lead}</div>`:'') + html;
  $('chat').appendChild(d); $('chat').scrollTop = 1e6; return d;
}
function sysline(t){
  const d=document.createElement('div'); d.className='sys'; d.textContent=t;
  $('chat').appendChild(d); $('chat').scrollTop=1e6;
}
function withCite(text){
  return text.replace(/\[M(\d+)\]/g, (s,n)=>{
    const m = mems.find(x=>x.id==n); if(!m) return '';
    const cls = m.conf==='低' ? 'cite stale':'cite';
    return `<span class="${cls}" onclick="openM(${m.id})" title="点击查看来源、时间与版本">M${m.id}·v${m.ver}</span>`;
  });
}
function askConfirm(m, q){
  const d = bubble('a', `<div class="q" style="font-size:13px">${q}</div>
    <div class="confirm">
      <div class="q">写入前确认 · ${label(m.type)} · 置信度${m.conf}</div>
      <div class="val">${m.text}</div>
      <div class="btns">
        <button class="b b-ok" onclick="confirmMem(${m.id},true);this.closest('.confirm').innerHTML='<div class=q>✓ 已确认写入，可被后续会话调用</div>'">确认写入</button>
        <button class="b b-no" onclick="confirmMem(${m.id},false);this.closest('.confirm').innerHTML='<div class=q>已放弃写入</div>'">不对，先不记</button>
      </div>
    </div>`, '记忆写入闸门');
  return d;
}

// ---- 时点剧本 ----
const STEPS = [
  {k:'w1', t:'Week 1', d:'建立框架'},
  {k:'w3', t:'Week 3', d:'例外判断'},
  {k:'w6', t:'Week 6', d:'对外答辩'},
  {k:'w8', t:'Week 8', d:'跨项目复用'},
  {k:'w11',t:'Week 11',d:'纠错与归档'}
];
const SCENE = {
  w1:'<b>Week 1 · A 公司</b>　新建研究框架。助理抽取候选记忆，<b>写入前请求确认</b>——事实类记忆不静默写入。',
  w3:'<b>Week 3 · A 公司</b>　财报数据触发例外判断。助理主动调出 Week 1 的阈值，并把「为什么这次可以放行」记为<b>理由型</b>记忆。',
  w6:'<b>Week 6 · A 公司</b>　投委会质询，用户已忘记 Week 3 的理由。助理<b>主动调用完整判断链</b>，每个事实附可点溯源角标。',
  w8:'<b>Week 8 · B 公司</b>　新项目遇到同类问题。默认只用本项目记忆，跨项目复用需<b>显式确认</b>后才引用。',
  w11:'<b>Week 11 · A 公司</b>　发现 Week 3 的依据有误。<b>纠正生成新版本、旧版本归档</b>，并标记受影响的下游引用。'
};

function goto(k){
  step = k;
  document.querySelectorAll('.step').forEach(b=>b.classList.toggle('on', b.dataset.k===k));
  $('scene').innerHTML = SCENE[k];
  $('chat').innerHTML = '';
  if(k==='w1') runW1(); if(k==='w3') runW3(); if(k==='w6') runW6();
  if(k==='w8') runW8(); if(k==='w11') runW11();
}

/* --- Week 1：记录 + 确认 --- */
function runW1(){
  cur='A'; mems.length=0; seq=0; renderMem();
  $('log').innerHTML='';
  log('新建项目 <b>A 公司</b>，记忆按项目隔离存储');
  bubble('u','我开始跟 A 公司了，重点看云业务增速，低于 25% 就要重新评估估值。报告 11 月 15 日交。');
  setTimeout(()=>{
    const m1=addMem({text:'A 公司核心变量为云业务增速，观察阈值 25%',type:'state',proj:'A',
      src:'Week 1 会话',conf:'高'});
    askConfirm(m1,'我从这段话里抽出两条要记的信息，先确认第一条：');
    setTimeout(()=>{
      const m2=addMem({text:'阈值设为 25% 的理由：低于此线需重新评估估值',type:'reason',proj:'A',
        src:'Week 1 会话',conf:'高'});
      askConfirm(m2,'第二条是这次判断的理由，理由型记忆复用价值最高：');
      setTimeout(()=>{
        const m3=addMem({text:'报告交付时间：11 月 15 日',type:'state',proj:'A',src:'Week 1 会话',conf:'高'});
        askConfirm(m3,'还有一条时间信息：');
        setTimeout(()=>{
          addMem({text:'偏好：结论先行、数字精确到小数一位',type:'pref',proj:'A',
            src:'Week 1 会话（推断）',conf:'高',status:'ok'});
          sysline('偏好型记忆低风险，静默写入，可在记忆库中查看或删除');
        },500);
      },500);
    },500);
  },400);
}

/* --- Week 3：主动调用 + 记录理由 --- */
function runW3(){
  cur='A'; renderMem();
  bubble('u','A 公司财报出来了，云业务增速 23%。我判断是供应链一次性扰动，先维持看多。');
  setTimeout(()=>{
    bubble('a', withCite('这个数字触及了你在 Week 1 设的阈值 [M1]，当时的理由是低于 25% 需重新评估估值 [M2]。你这次选择维持看多，属于对既定规则的例外，我建议把「为什么可以放行」记下来——否则几周后回看只剩结论。'),'主动调用 · 项目 A');
    setTimeout(()=>{
      const m=addMem({text:'Week 3 例外判断：增速 23% 低于阈值但维持看多，依据为供应链一次性扰动',
        type:'reason',proj:'A',src:'Week 3 会话',conf:'高'});
      askConfirm(m,'这条要记成例外判断吗？');
    },600);
  },400);
}

/* --- Week 6：完整判断链 + 溯源 --- */
function runW6(){
  cur='A'; renderMem();
  bubble('u','投委会问我为什么 A 公司增速掉到 23% 还在看多，我一时想不起当时的理由了。');
  setTimeout(()=>{
    bubble('a', withCite(
      '你的判断链是这样的：\n\n① Week 1 设定核心变量为云业务增速，阈值 25% [M1]，理由是低于此线需重新评估估值 [M2]；\n② Week 3 实际增速 23%，你判断为供应链一次性扰动，因此作为例外维持看多 [M4]。\n\n也就是说，你并没有推翻阈值，而是认定这次的偏离属于一次性因素。若要向投委会说明，建议补充该扰动的持续性证据——这是当时未记录的部分。'),
      '主动调用 · 完整判断链 · 每项事实可点角标核验');
    setTimeout(()=>{
      sysline('点击任一角标可查看该记忆的来源会话、写入时间、版本与确认状态');
      log('回答含 3 处记忆引用，<b>溯源覆盖率 100%</b>（每处均可点击核验）');
    },700);
  },400);
}

/* --- Week 8：跨项目复用需显式确认 --- */
function runW8(){
  cur='B'; renderMem();
  log('切换至项目 <b>B 公司</b>：默认仅调用本项目记忆');
  bubble('u','换到 B 公司。它也遇到供应链问题，我需要判断是不是一次性的。');
  setTimeout(()=>{
    bubble('a','B 公司项目目前没有相关记忆。默认情况下我只会调用当前项目的记忆，避免不同标的的判断互相污染。','项目隔离生效');
    setTimeout(()=>{
      const d=bubble('a',`不过我在<b>另一个项目</b>里检索到一条可能相关的结论。是否引用？
        <div class="confirm">
          <div class="q">跨项目复用 · 需显式确认</div>
          <div class="val">A 公司 Week 3：增速低于阈值但判断为供应链一次性扰动（理由型记忆）</div>
          <div class="btns">
            <button class="b b-gh" onclick="useCross(this)">引用并标注来源项目</button>
            <button class="b b-no" onclick="this.closest('.confirm').innerHTML='<div class=q>已忽略，不跨项目引用</div>'">不需要</button>
          </div>
        </div>`,'跨项目复用提示');
    },700);
  },400);
}
function useCross(btn){
  btn.closest('.confirm').innerHTML='<div class="q">✓ 已引用，来源项目已标注</div>';
  log('用户采纳跨项目复用建议 → 计入<b>跨项目复用命中率</b>（观察项）');
  setTimeout(()=>{
    bubble('a', withCite('引用 A 公司 Week 3 的判断框架 [M4]（来源项目：A 公司，已标注）：当时判定一次性扰动的依据是单季度偏离且管理层给出明确归因。建议对 B 公司核对同样两点，若任一不成立，则不应套用该结论。'),'跨项目引用 · 已标注来源');
  },500);
}

/* --- Week 11：纠错与归档 --- */
function runW11(){
  cur='A'; renderMem();
  bubble('u','Week 3 那个判断错了。后来两个季度都在掉，不是一次性扰动，是结构性的。');
  setTimeout(()=>{
    const m = mems.find(x=>x.text.indexOf('Week 3 例外判断')===0);
    if(!m){ bubble('a','请先运行 Week 3 剧本以生成该条记忆，再回到本步演示纠错。'); return; }
    const d=bubble('a',`定位到这条记忆，纠正后会生成新版本、旧版本归档，后续调用全局切换至新版本。
      <div class="confirm">
        <div class="q">纠正 · 需用户确认新内容</div>
        <div class="val">现有 v1：${m.text}</div>
        <div class="btns">
          <button class="b b-ok" onclick="doFix(${m.id},this)">确认纠正为「结构性下滑」</button>
          <button class="b b-no" onclick="this.closest('.confirm').innerHTML='<div class=q>已取消</div>'">取消</button>
        </div>
      </div>`,'纠错链路');
  },400);
}
function doFix(id, btn){
  btn.closest('.confirm').innerHTML='<div class="q">✓ 已纠正，v1 已归档</div>';
  correctMem(id,'Week 3 判断修订：增速下滑为结构性因素，原「一次性扰动」结论不成立','连续两个季度延续下滑，一次性归因被推翻');
  setTimeout(()=>{
    bumpStale();
    bubble('a', withCite('已更新 [M4]，v1 归档可追溯。同时我标记了受影响的下游引用：Week 6 向投委会说明时使用过该结论，Week 8 曾把它作为 B 公司的参考框架——这两处的结论都需要复核。\n\n点击角标可以看到完整版本历史，包括被替换的原始表述与替换原因。'),'纠正生效 · 下游引用已标记');
    log('标记受影响的下游引用 2 处（Week 6 答辩、Week 8 跨项目引用）→ 支撑<b>纠错生效率</b>指标');
  },500);
}
function bumpStale(){
  const m = mems.find(x=>x.text.indexOf('A 公司核心变量')===0);
  if(m){ m.conf='低'; renderMem();
    log('关联记忆 <b>M'+m.id+'</b> 因依据变化降为低置信 → 不再自动注入，仅提示可能已过期'); }
}

// ---- 自由输入 ----
function send(){
  const v = $('inp').value.trim(); if(!v) return; $('inp').value='';
  bubble('u', v);
  setTimeout(()=>{
    if(/记错|错了|不对|纠正|应该是|改成/.test(v)){
      const list = mems.filter(m=>m.proj===cur && m.status!=='arch');
      if(!list.length){ bubble('a','当前项目还没有记忆可纠正，先运行 Week 1 剧本。'); return; }
      const m = list[list.length-1];
      bubble('a',`定位到最近一条记忆 M${m.id}：「${m.text}」。请给出正确表述，我会写入新版本并归档旧版本；后续所有调用都会切到新版本。`,'纠错链路');
      log(`用户提出纠正意图 → 定位 <b>M${m.id}</b>，等待正确内容`);
    } else if(/记住|记一下|记下/.test(v)){
      const m = addMem({text:v.replace(/^(记住|记一下|记下)[:：,，]?/,'').slice(0,42),
        type:'state',proj:cur,src:'用户显式指令',conf:'高'});
      askConfirm(m,'收到，先确认要记的内容：');
    } else {
      const list = mems.filter(m=>m.proj===cur && m.status==='ok'||m.status==='fix');
      const cited = list.filter(m=>m.proj===cur && m.conf==='高').slice(0,2);
      if(cited.length){
        bubble('a', withCite('结合本项目已确认的记忆回答：' + cited.map(m=>`[M${m.id}]`).join(' ') +
          '\n\n' + cited.map(m=>'· '+m.text).join('\n') +
          '\n\n如需我基于这些前提继续推演，告诉我具体问题。'),'主动调用 · 项目 '+cur);
        log(`检索本项目记忆命中 ${cited.length} 条并注入回答，均带溯源角标`);
      } else {
        bubble('a','本项目暂无已确认的记忆可用，我不会凭推测作答。可以先运行 Week 1 剧本建立记忆，或直接告诉我要记住什么。');
        log('检索无命中 → <b>不注入</b>任何记忆，避免无关注入');
      }
    }
  },420);
}
$('inp').addEventListener('keydown',e=>{ if(e.key==='Enter') send(); });

// ---- 初始化 ----
$('steps').innerHTML = STEPS.map(s=>
  `<button class="step" data-k="${s.k}" onclick="goto('${s.k}')"><b>${s.t}</b>${s.d}</button>`).join('');
goto('w1');