/* ============================================================
   一分三科面料组 — 历史记录模块
   ============================================================ */

let _histSessions = [];

/* 打开历史面板 */
async function openHistory(){
  document.getElementById('history-panel').classList.add('open');
  document.getElementById('history-panel').style.display='flex';
  document.getElementById('overlay').style.display='block';
  await loadHistorySessions();
}
function closeHistory(){
  document.getElementById('history-panel').classList.remove('open');
  setTimeout(()=>{ document.getElementById('history-panel').style.display='none'; },280);
  document.getElementById('overlay').style.display='none';
}

/* 加载所有 session */
async function loadHistorySessions(){
  const body=document.getElementById('history-body');
  body.innerHTML='<div class="sp-loading"><i class="fa-solid fa-spinner fa-spin"></i> 加载中...</div>';
  try{
    const res=await fetch('tables/fabric_sessions?limit=200&sort=created_at');
    const data=await res.json();
    _histSessions=(data.data||[]).reverse(); // 最新在前
    renderHistorySessions();
  }catch(e){
    body.innerHTML='<div class="sp-loading" style="color:#f87171">加载失败，请重试</div>';
  }
}

function renderHistorySessions(){
  const body=document.getElementById('history-body');
  if(_histSessions.length===0){
    body.innerHTML='<div class="sp-loading">暂无历史记录</div>';
    return;
  }
  body.innerHTML='';
  _histSessions.forEach((s,i)=>{
    const div=document.createElement('div');
    div.className='hist-session';
    div.innerHTML=`
      <div class="hs-header" onclick="toggleHistDetail('hd_${i}',this,'${s.session_id}')">
        <div class="hs-icon"><i class="fa-solid fa-box-archive"></i></div>
        <div class="hs-info">
          <div class="hs-time">${esc(s.session_label||s.created_at_custom||'未知时间')}</div>
          <div class="hs-meta">
            <i class="fa-solid fa-user" style="margin-right:3px"></i>${esc(s.operator||'未知操作人')}
            &nbsp;·&nbsp;
            <i class="fa-solid fa-file-lines" style="margin-right:3px"></i>${s.row_count||0} 条记录
          </div>
        </div>
        <i class="fa-solid fa-chevron-right hs-arrow"></i>
      </div>
      <div class="hs-detail" id="hd_${i}"></div>`;
    body.appendChild(div);
  });
}

async function toggleHistDetail(detailId, header, sessionId){
  const detail=document.getElementById(detailId);
  const arrow=header.querySelector('.hs-arrow');
  if(detail.classList.contains('open')){
    detail.classList.remove('open');
    arrow.style.transform='';
    return;
  }
  // 关闭其他
  document.querySelectorAll('.hs-detail.open').forEach(d=>{
    d.classList.remove('open');
    const a=d.previousElementSibling.querySelector('.hs-arrow');
    if(a) a.style.transform='';
  });
  arrow.style.transform='rotate(90deg)';
  detail.classList.add('open');

  if(detail.innerHTML.trim()) return; // 已加载

  detail.innerHTML='<div style="padding:8px;color:#94a3b8;font-size:11px"><i class="fa-solid fa-spinner fa-spin"></i> 加载记录...</div>';
  try{
    const res=await fetch(`tables/fabric_records?limit=100&sort=row_index`);
    const data=await res.json();
    const rows=(data.data||[]).filter(r=>r.session_id===sessionId);
    renderHistDetail(detail, rows);
  }catch(e){
    detail.innerHTML='<div style="padding:8px;color:#f87171;font-size:11px">加载失败</div>';
  }
}

function renderHistDetail(container, rows){
  if(rows.length===0){
    container.innerHTML='<div style="padding:8px;color:#94a3b8;font-size:11px">该批次暂无记录</div>';
    return;
  }

  // 图片缩略图区
  const imgs=rows.filter(r=>r.img_data_url);
  let imgHtml='';
  if(imgs.length>0){
    imgHtml=`<div class="hist-img-grid">
      ${imgs.map(r=>`
        <div class="hist-img-item" onclick="showLightbox('${r.img_data_url}','${esc(r.img_name||'')}')">
          <img src="${r.img_data_url}" alt="${esc(r.img_name||'')}" loading="lazy"/>
          <span>${esc((r.img_name||'').slice(0,10))}</span>
        </div>`).join('')}
    </div>`;
  }

  // 数据行预览
  const tableHtml=`
    <div class="hist-row-preview">
      <div class="hrp-row hrp-head">
        <div class="hrp-cell">编号</div>
        <div class="hrp-cell">成分</div>
        <div class="hrp-cell">克重</div>
        <div class="hrp-cell">工厂批号</div>
      </div>
      ${rows.map(r=>`
        <div class="hrp-row">
          <div class="hrp-cell" title="${esc(r.col_c)}">${esc(r.col_c)||'—'}</div>
          <div class="hrp-cell" title="${esc(r.col_d)}">${esc((r.col_d||'').slice(0,18))}</div>
          <div class="hrp-cell">${esc(r.col_f)||'—'}</div>
          <div class="hrp-cell" title="${esc(r.col_i)}">${esc((r.col_i||'').slice(0,16))}</div>
        </div>`).join('')}
    </div>`;

  // 操作按钮
  const btnHtml=`
    <div style="display:flex;gap:8px;margin-top:10px;padding:0 2px">
      <button class="tbtn" style="font-size:11px;padding:5px 10px"
        onclick="loadSessionToTable('${rows[0].session_id}')">
        <i class="fa-solid fa-rotate"></i> 载入此批次
      </button>
    </div>`;

  container.innerHTML=`<div style="padding:0 4px 4px">${imgHtml}${tableHtml}${btnHtml}</div>`;
}

/* 将历史批次载入表格 */
async function loadSessionToTable(sessionId){
  if(!confirm('将此历史批次载入表格？当前表格数据将被清空。')) return;
  closeHistory();
  try{
    const res=await fetch(`tables/fabric_records?limit=200&sort=row_index`);
    const data=await res.json();
    const rows=(data.data||[]).filter(r=>r.session_id===sessionId);
    // 清空当前
    tableRows=[];
    rows.forEach(r=>{
      tableRows.push({
        id:'row_'+(nextRowId++),
        col_b:r.col_b||'', col_c:r.col_c||'',
        col_d:r.col_d||'', col_e:r.col_e||'',
        col_f:r.col_f||'', col_g:r.col_g||'',
        col_h:r.col_h||calcInchDisplay(parseFloat(r.col_g)),
        col_i:r.col_i||'',
        imgDataUrl:r.img_data_url||'',
        imgName:r.img_name||'',
        ocr_raw:r.ocr_raw||'',
        sessionId:r.session_id,
        dbId:r.id,
      });
    });
    renderTable();
    showToast(`✅ 已载入 ${rows.length} 条历史记录`,'success');
  }catch(e){
    showToast('载入失败','error');
  }
}

/* 保存本次 session 元信息 */
async function saveSessionMeta(sessionId, label, operator, rowCount){
  try{
    await fetch('tables/fabric_sessions',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        session_id:sessionId,
        session_label:label,
        operator:operator||'未知',
        row_count:rowCount,
        created_at_custom:new Date().toLocaleString('zh-CN'),
      })
    });
  }catch(e){ console.warn('session meta save fail',e); }
}
