/* ============================================================
   一分三科面料组智能录入系统 — 主逻辑 v4
   ============================================================ */

/* ---- 全局状态 ---- */
let tableRows   = [];
let nextRowId   = 1;
let imgQueue    = [];
let _logCnt     = 0;
let _currentSessionId = genSessionId();
let _saveDebounce = {};

/* ---- 初始化 ---- */
document.addEventListener('DOMContentLoaded', ()=>{
  initDragDrop();
  loadFromDB();
  startSync(getCfg('sync_interval', 15));
  initCompMiniTable();
  // 恢复操作人
  const op=localStorage.getItem('fabric_operator');
  if(op) document.getElementById('operator-name').value=op;
});

function genSessionId(){ return 'sess_'+Date.now()+'_'+Math.random().toString(36).slice(2,6); }

/* ============================================================
   CONFIG
   ============================================================ */
function getCfg(key,def){
  const v=localStorage.getItem('fabric_cfg_'+key);
  return v!==null?(isNaN(+v)?v:+v):def;
}
function setCfg(key,val){ localStorage.setItem('fabric_cfg_'+key,val); }

function openSettings(){
  document.getElementById('settings-panel').style.display='flex';
  document.getElementById('settings-panel').classList.add('open');
  document.getElementById('overlay').style.display='block';
  document.getElementById('cfg-sheet-name').value=getCfg('sheet_name','面料数据库');
  document.getElementById('cfg-file-prefix').value=getCfg('file_prefix','一分三科面料');
  document.getElementById('cfg-sync-interval').value=getCfg('sync_interval',15);
  document.getElementById('cfg-thumb-size').value=getCfg('thumb_size',120);
}
function closeSettings(){
  document.getElementById('settings-panel').classList.remove('open');
  setTimeout(()=>{ document.getElementById('settings-panel').style.display='none'; },280);
  document.getElementById('overlay').style.display='none';
}
function saveSettings(){
  setCfg('sheet_name', document.getElementById('cfg-sheet-name').value||'面料数据库');
  setCfg('file_prefix', document.getElementById('cfg-file-prefix').value||'一分三科面料');
  setCfg('sync_interval', +document.getElementById('cfg-sync-interval').value||15);
  setCfg('thumb_size', +document.getElementById('cfg-thumb-size').value||120);
  startSync(getCfg('sync_interval',15));
  showToast('✅ 设置已保存','success');
  closeSettings();
}
function closeAllPanels(){ closeSettings(); closeHistory(); }

function initCompMiniTable(){
  const map=getCompMap();
  const el=document.getElementById('comp-mini-table');
  if(!el) return;
  el.innerHTML=`<div class="cmt-row cmt-head"><span>缩写</span><span>中文</span><span>英文</span></div>`
    +map.slice(0,15).map(c=>`<div class="cmt-row"><span><b>${esc(c.abbr)}</b></span><span>${esc(c.cn)}</span><span style="color:#64748b">${esc(c.en)}</span></div>`).join('');
}

/* ============================================================
   拖拽上传
   ============================================================ */
function initDragDrop(){
  const dz=document.getElementById('drop-zone');
  dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('over')});
  dz.addEventListener('dragleave',()=>dz.classList.remove('over'));
  dz.addEventListener('drop',e=>{
    e.preventDefault(); dz.classList.remove('over');
    const files=Array.from(e.dataTransfer.files).filter(f=>f.type.startsWith('image/'));
    addFiles(files);
  });
}
function handleFiles(evt){
  const files=Array.from(evt.target.files).filter(f=>f.type.startsWith('image/'));
  addFiles(files); evt.target.value='';
}
function addFiles(files){
  files.forEach(f=>{
    const id='img_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const url=URL.createObjectURL(f);
    imgQueue.push({id,file:f,url,name:f.name,status:'waiting',rowId:null});
  });
  renderImgQueue();
  document.getElementById('btn-ocr-all').disabled=imgQueue.length===0;
  document.getElementById('img-count-badge').textContent=imgQueue.length;
}

function renderImgQueue(){
  const el=document.getElementById('img-queue');
  el.innerHTML='';
  const sMap={
    waiting:{cls:'',icn:'fa-clock',txt:'等待识别'},
    running:{cls:'running',icn:'fa-spinner fa-spin',txt:'识别中...'},
    done:   {cls:'done',  icn:'fa-circle-check',txt:'已完成'},
    error:  {cls:'error', icn:'fa-triangle-exclamation',txt:'失败'},
  };
  imgQueue.forEach(item=>{
    const s=sMap[item.status]||sMap.waiting;
    const div=document.createElement('div');
    div.className=`img-item ${s.cls}`;
    div.id=`qi_${item.id}`;
    div.innerHTML=`
      <img class="img-thumb-sq" src="${item.url}" alt="${esc(item.name)}"
           onclick="showLightbox('${item.url}','${esc(item.name)}')"/>
      <div class="img-info">
        <div class="img-fname" title="${esc(item.name)}">${esc(item.name)}</div>
        <div class="img-fstatus ${item.status==='done'?'ok':item.status==='running'?'run':item.status==='error'?'err':''}">
          <i class="fa-solid ${s.icn}"></i> ${s.txt}
        </div>
      </div>
      <button class="img-del-btn" onclick="removeImg('${item.id}',event)">
        <i class="fa-solid fa-xmark"></i>
      </button>
      ${item.status==='running'?`<div class="mini-prog"><div class="mini-fill" id="mf_${item.id}" style="width:0%"></div></div>`:''}`;
    el.appendChild(div);
  });
  document.getElementById('img-count-badge').textContent=imgQueue.length;
}

function removeImg(id,evt){
  evt.stopPropagation();
  const i=imgQueue.findIndex(x=>x.id===id);
  if(i===-1) return;
  URL.revokeObjectURL(imgQueue[i].url);
  imgQueue.splice(i,1);
  renderImgQueue();
  document.getElementById('btn-ocr-all').disabled=imgQueue.length===0;
}

/* ============================================================
   全部 OCR — v5（多行识别 + 编号连续推理）
   ============================================================ */
async function ocrAll(){
  const pending=imgQueue.filter(i=>i.status!=='done');
  if(!pending.length){ showToast('所有图片已识别完毕','warning'); return; }

  // 保存操作人
  const op=document.getElementById('operator-name').value.trim();
  if(op) localStorage.setItem('fabric_operator',op);

  document.getElementById('btn-ocr-all').disabled=true;
  document.getElementById('ocr-prog').style.display='block';
  setHStatus('running',`<i class="fa-solid fa-spinner fa-spin"></i> 识别中 0/${pending.length}`);

  if(!window.Tesseract){
    setProgText(3,'加载 OCR 引擎...');
    try{ await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'); }
    catch(e){ showToast('OCR引擎加载失败','error'); document.getElementById('btn-ocr-all').disabled=false; return; }
  }

  const lang=document.getElementById('ocr-lang').value||'chi_sim+eng';
  const factoryKw=document.getElementById('factory-kw').value||'';
  const thumbSz=getCfg('thumb_size',120);
  let totalNewRows=0;

  for(let i=0;i<pending.length;i++){
    const item=pending[i];
    item.status='running'; item.rowIds=[]; renderImgQueue();
    setProgText(Math.round((i/pending.length)*100), `识别 ${i+1}/${pending.length}: ${item.name}`);
    setHStatus('running',`<i class="fa-solid fa-spinner fa-spin"></i> ${i+1}/${pending.length}`);
    addLog(`→ ${item.name}`,'info');

    try{
      // 生成缩略图（base64），限制大小
      const thumb=await resizeImageToDataURL(item.url, thumbSz);

      const result=await Tesseract.recognize(item.url, lang, {
        logger:m=>{
          if(m.status==='recognizing text'){
            const mf=document.getElementById(`mf_${item.id}`);
            if(mf) mf.style.width=Math.floor(m.progress*100)+'%';
          }
        }
      });

      const rawText=result.data.text;

      // ── 多条解析（v5核心）──
      const parsedList = parseOCRMulti(rawText, {factoryKw});
      addLog(`  📦 识别出 ${parsedList.length} 条记录`, parsedList.length>1?'ok':'info');

      const newRowIds=[];
      for(const parsed of parsedList){
        parsed.notes.forEach(n=>addLog(`    ${n}`,'ok'));
        const rowId=addRow(parsed, rawText, item.name, thumb);
        newRowIds.push(rowId);
        totalNewRows++;
      }
      item.rowIds=newRowIds;
      item.rowId=newRowIds[0]||null; // 兼容旧逻辑
      item.status='done'; renderImgQueue();
      addLog(`  ✓ 填入第 ${tableRows.length-parsedList.length+1}~${tableRows.length} 行`,'ok');

      // 每张图识别完，立即对全表做编号连续推理并刷新UI
      inferSequentialCodes(tableRows);
      refreshInferredCells();

      // 保存到DB（带图片）
      for(const rid of newRowIds) await saveRowToDB(rid);

    }catch(e){
      item.status='error'; renderImgQueue();
      addLog(`  ✗ ${e.message}`,'err');
    }
  }

  // 全批次完成后再做一次全表编号推理（兜底）
  inferSequentialCodes(tableRows);
  refreshInferredCells();

  // 保存 session 元信息
  const label=`${new Date().toLocaleString('zh-CN')} · ${op||'未知'}`;
  await saveSessionMeta(_currentSessionId, label, op, tableRows.length);

  setProgText(100,`完成！共 ${pending.length} 张图 / ${totalNewRows} 条记录`);
  setHStatus('done',`<i class="fa-solid fa-circle-check"></i> ${totalNewRows} 条`);
  document.getElementById('btn-ocr-all').disabled=false;
  showToast(`✅ 识别完成：${pending.length} 张图，共 ${totalNewRows} 条记录`,'success');
  if(document.getElementById('log-body').style.display==='none') toggleLog();
}

/* 图片压缩为DataURL（控制大小） */
function resizeImageToDataURL(url, maxPx){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement('canvas');
      const scale=Math.min(1, maxPx/Math.max(img.width,img.height));
      canvas.width=Math.round(img.width*scale);
      canvas.height=Math.round(img.height*scale);
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
      resolve(canvas.toDataURL('image/jpeg',0.75));
    };
    img.onerror=()=>resolve('');
    img.src=url;
  });
}

/* ============================================================
   表格行操作
   ============================================================ */
function addRow(data={}, ocrRaw='', imgName='', imgDataUrl=''){
  const id='row_'+(nextRowId++);
  const row={
    id,
    col_b:data.col_b||'', col_c:data.col_c||'',
    col_d:data.col_d||'', col_e:data.col_e||'',
    col_f:data.col_f||'', col_g:data.col_g||'',
    col_h:data.col_h||'', col_i:data.col_i||'',
    our_id_raw:data.our_id_raw||'',   // 原始5位编号
    _inferred:false,                   // 是否为推理编号
    notes:data.notes||[],
    imgDataUrl, imgName,
    ocr_raw:ocrRaw,
    sessionId:_currentSessionId,
    created_at_custom:new Date().toLocaleString('zh-CN'),
    dbId:null,
  };
  tableRows.push(row);
  renderTable();
  setTimeout(()=>{
    const el=document.getElementById(`tr_${id}`);
    if(el) el.scrollIntoView({behavior:'smooth',block:'nearest'});
  },60);
  return id;
}

function addEmptyRow(){ addRow(); }

function removeRow(id){
  const row=tableRows.find(r=>r.id===id);
  if(!row) return;
  if(row.dbId){ fetch(`tables/fabric_records/${row.dbId}`,{method:'DELETE'}).catch(()=>{}); }
  tableRows=tableRows.filter(r=>r.id!==id);
  renderTable();
}

function deleteSelectedRows(){
  const checked=Array.from(document.querySelectorAll('.row-cb:checked'));
  if(!checked.length){ showToast('未选中任何行','warning'); return; }
  if(!confirm(`删除选中的 ${checked.length} 行？`)) return;
  checked.forEach(c=>removeRow(c.dataset.rid));
  document.getElementById('sel-all').checked=false;
}

function selAll(cb){
  document.querySelectorAll('.row-cb').forEach(c=>c.checked=cb.checked);
}

function clearAllRows(){
  if(!tableRows.length){ showToast('表格已空','warning'); return; }
  if(!confirm(`清空全部 ${tableRows.length} 行？`)) return;
  tableRows.forEach(r=>{ if(r.dbId) fetch(`tables/fabric_records/${r.dbId}`,{method:'DELETE'}).catch(()=>{}); });
  tableRows=[]; renderTable();
  showToast('已清空','success');
}

/* ============================================================
   表格渲染（增量，避免全量重绘导致失去输入焦点）
   ============================================================ */
function renderTable(){
  const tbody=document.getElementById('excel-body');
  const empty=document.getElementById('empty-hint');
  document.getElementById('row-count').textContent=`${tableRows.length} 行`;
  if(!tableRows.length){ tbody.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display='none';

  const curIds=new Set(tableRows.map(r=>`tr_${r.id}`));
  // 移除多余行
  tbody.querySelectorAll('tr').forEach(tr=>{ if(!curIds.has(tr.id)) tr.remove(); });

  tableRows.forEach((row,idx)=>{
    const trId=`tr_${row.id}`;
    let tr=document.getElementById(trId);
    if(!tr){
      tr=buildTR(row,idx);
      tbody.appendChild(tr);
    } else {
      // 仅更新行号
      const numEl=tr.querySelector('.td-num');
      if(numEl) numEl.textContent=idx+1;
    }
  });
}

function buildTR(row,idx){
  const tr=document.createElement('tr');
  tr.id=`tr_${row.id}`;

  // 选框
  tr.appendChild(makeTD('td-sel',`<input type="checkbox" class="row-cb" data-rid="${row.id}"/>`));
  // 图片
  const imgCell=makeTD('td-img','');
  if(row.imgDataUrl){
    const imgEl=document.createElement('img');
    imgEl.className='row-thumb';
    imgEl.src=row.imgDataUrl;
    imgEl.alt=row.imgName||'';
    imgEl.title=row.imgName||'';
    imgEl.onclick=()=>showLightbox(row.imgDataUrl,row.imgName||'');
    imgCell.appendChild(imgEl);
  } else {
    imgCell.innerHTML=`<div class="row-thumb-placeholder"><i class="fa-solid fa-image"></i></div>`;
  }
  tr.appendChild(imgCell);
  // 行号
  tr.appendChild(makeTD('td-num',idx+1));

  // B~I 列
  const cols=['b','c','d','e','f','g','h','i'];
  cols.forEach(col=>{
    const td=document.createElement('td');
    td.className=`td-${col}`;
    if(col==='h'){
      // 只读公式列
      const span=document.createElement('span');
      span.className='cell-formula-val';
      span.id=`cell_${row.id}_h`;
      span.textContent=row.col_h||calcInchDisplay(parseFloat(row.col_g))||'';
      td.appendChild(span);
    } else if(col==='c'){
      // C列：编号，推理值特殊样式
      const inp=document.createElement('input');
      inp.type='text';
      inp.id=`cell_${row.id}_c`;
      inp.value=row.col_c||'';
      inp.placeholder=getPlaceholder('c');
      inp.dataset.rid=row.id;
      inp.dataset.col='c';
      // 推理值样式
      if(row._inferred && row.col_c){
        inp.className='cell-in ocr-hi cell-inferred';
        inp.title=`🤖 推理编号（${(row.notes||[]).find(n=>n.includes('推理'))||'相邻行推断'}）\n点击可手动修改`;
        td.className='td-c td-c-inferred';
      } else {
        inp.className='cell-in'+(row.col_c?' ocr-hi':'');
      }
      inp.addEventListener('input',e=>onCellInput(e,row.id,'c'));
      inp.addEventListener('blur', e=>{
        // 手动修改后消除推理标记
        row._inferred=false;
        inp.classList.remove('cell-inferred');
        td.classList.remove('td-c-inferred');
        onCellBlur(e,row.id);
      });
      td.appendChild(inp);
    } else {
      const inp=document.createElement('input');
      inp.type='text';
      inp.className='cell-in'+(row[`col_${col}`]?' ocr-hi':'');
      inp.id=`cell_${row.id}_${col}`;
      inp.value=row[`col_${col}`]||'';
      inp.placeholder=getPlaceholder(col);
      inp.dataset.rid=row.id;
      inp.dataset.col=col;
      inp.addEventListener('input',e=>onCellInput(e,row.id,col));
      inp.addEventListener('blur', e=>onCellBlur(e,row.id));
      td.appendChild(inp);
    }
    tr.appendChild(td);
  });

  // 删除按钮
  tr.appendChild(makeTD('td-act',`<button class="btn-del-row" onclick="removeRow('${row.id}')" title="删除"><i class="fa-solid fa-xmark"></i></button>`));
  return tr;
}

function makeTD(cls,content){
  const td=document.createElement('td');
  td.className=cls;
  if(typeof content==='number') td.textContent=content;
  else if(typeof content==='string') td.innerHTML=content;
  else td.appendChild(content);
  return td;
}

function getPlaceholder(col){
  return {b:'面料描述',c:'HLWG/HLFG编号',d:'成分Content',e:'规格Density',f:'克重',g:'幅宽(M)',i:'工厂批号'}[col]||'';
}

/* ============================================================
   推理编号刷新（不重建DOM，只更新值和样式）
   ============================================================ */
function refreshInferredCells(){
  tableRows.forEach(row=>{
    const inp=document.getElementById(`cell_${row.id}_c`);
    if(!inp) return;
    const td=inp.closest('td');
    // 同步值
    if(inp.value !== row.col_c) inp.value = row.col_c||'';
    // 同步样式
    if(row._inferred && row.col_c){
      inp.classList.add('cell-inferred','ocr-hi');
      inp.title=`🤖 推理编号（${(row.notes||[]).find(n=>n.includes('推理'))||'相邻行推断'}）\n点击可手动修改`;
      if(td) td.classList.add('td-c-inferred');
    } else {
      inp.classList.remove('cell-inferred');
      inp.title='';
      if(td) td.classList.remove('td-c-inferred');
    }
  });
}

/* ============================================================
   单元格编辑
   ============================================================ */
function onCellInput(e,rowId,col){
  const row=tableRows.find(r=>r.id===rowId);
  if(!row) return;
  const val=e.target.value;
  row[`col_${col}`]=val;
  e.target.classList.remove('ocr-hi');

  // C列：自动判断 HLWG/HLFG
  if(col==='c'){
    const m=val.match(/^([15]\d{4})$/);
    if(m){
      const resolved=resolveHLCode(m[1]);
      row.col_c=resolved;
      e.target.value=resolved;
    }
  }

  // G列：实时更新H列
  if(col==='g'){
    const m=parseFloat(val);
    const hv=(!isNaN(m)&&m>0)?calcInchDisplay(m):'';
    row.col_h=hv;
    const hEl=document.getElementById(`cell_${rowId}_h`);
    if(hEl) hEl.textContent=hv;
  }
}

function onCellBlur(e,rowId){
  // 防抖保存
  if(_saveDebounce[rowId]) clearTimeout(_saveDebounce[rowId]);
  _saveDebounce[rowId]=setTimeout(()=>saveRowToDB(rowId), 600);
}

/* ============================================================
   DB 读写
   ============================================================ */
async function saveRowToDB(rowId){
  const row=tableRows.find(r=>r.id===rowId);
  if(!row) return;
  const payload={
    session_id:    row.sessionId||_currentSessionId,
    session_time:  row.created_at_custom||'',
    row_index:     tableRows.findIndex(r=>r.id===rowId),
    img_data_url:  row.imgDataUrl||'',
    img_name:      row.imgName||'',
    col_b:row.col_b, col_c:row.col_c, col_d:row.col_d,
    col_e:row.col_e, col_f:row.col_f, col_g:row.col_g,
    col_h:row.col_h, col_i:row.col_i,
    ocr_raw:       (row.ocr_raw||'').slice(0,5000), // 限长避免超payload
    created_at_custom: row.created_at_custom||'',
  };
  try{
    if(row.dbId){
      await fetch(`tables/fabric_records/${row.dbId}`,{
        method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
      });
    } else {
      const res=await fetch('tables/fabric_records',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
      });
      if(res.ok){ const saved=await res.json(); row.dbId=saved.id; }
    }
  }catch(e){ console.warn('save fail',e); }
}

async function loadFromDB(){
  try{
    setHStatus('running','<i class="fa-solid fa-spinner fa-spin"></i> 加载...');
    const res=await fetch('tables/fabric_records?limit=300&sort=row_index');
    const data=await res.json();
    const records=data.data||[];
    if(!records.length){
      setHStatus('idle','<i class="fa-solid fa-circle-check"></i> 就绪');
      return;
    }
    // 只加载没有在本地的行（避免覆盖用户正在编辑的）
    const localDbIds=new Set(tableRows.map(r=>r.dbId).filter(Boolean));
    records.filter(r=>!localDbIds.has(r.id)).forEach(r=>{
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
        sessionId:r.session_id||'',
        created_at_custom:r.created_at_custom||'',
        dbId:r.id,
      });
    });
    renderTable();
    setHStatus('done',`<i class="fa-solid fa-circle-check"></i> ${records.length} 条`);
    showToast(`已加载 ${records.length} 条记录`,'success');
  }catch(e){
    setHStatus('error','加载失败');
  }
}

/* ============================================================
   导出 Excel
   ============================================================ */
function exportExcel(){
  if(!tableRows.length){ showToast('表格为空','warning'); return; }
  const sheetName=getCfg('sheet_name','面料数据库');
  const prefix=getCfg('file_prefix','一分三科面料');
  const headers=['面料描述','编号(HLWG/HLFG)','成分(Content)','规格(Density)','克重(g/m²)','幅宽(M)','幅宽(英寸)','工厂批号'];
  const rows=tableRows.map(r=>[r.col_b,r.col_c,r.col_d,r.col_e,r.col_f,r.col_g,r.col_h,r.col_i]);
  const wb=XLSX.utils.book_new();
  const ws=XLSX.utils.aoa_to_sheet([headers,...rows]);
  ws['!cols']=[{wch:18},{wch:14},{wch:32},{wch:20},{wch:10},{wch:10},{wch:12},{wch:24}];
  XLSX.utils.book_append_sheet(wb,ws,sheetName);
  XLSX.writeFile(wb,`${prefix}_${dateStr()}.xlsx`);
  showToast(`✅ 已导出 ${tableRows.length} 行`,'success');
}

/* ============================================================
   UI 工具
   ============================================================ */
function setHStatus(type,html){
  const el=document.getElementById('header-status');
  el.className=`hstatus ${type}`;el.innerHTML=html;
}
function setProgText(pct,text){
  document.getElementById('prog-fill').style.width=pct+'%';
  document.getElementById('prog-text').textContent=text;
}
function addLog(msg,type='info'){
  const el=document.getElementById('log-lines');
  const d=document.createElement('div');
  d.className=`ll ${type}`;
  const ts=new Date().toLocaleTimeString('zh-CN',{hour12:false});
  d.textContent=`[${ts}] ${msg}`;
  el.appendChild(d);
  // 限制日志行数，避免内存增长
  while(el.children.length>200) el.removeChild(el.firstChild);
  el.scrollTop=el.scrollHeight;
  _logCnt++;
  const b=document.getElementById('log-cnt');
  b.textContent=_logCnt; b.style.display='inline-flex';
}
function toggleLog(){
  const b=document.getElementById('log-body');
  const chev=document.getElementById('log-chev');
  const open=b.style.display!=='none';
  b.style.display=open?'none':'block';
  chev.style.transform=open?'':'rotate(180deg)';
}
function toggleOCRSettings(btn){
  const body=btn.nextElementSibling;
  const open=body.style.display!=='none';
  body.style.display=open?'none':'block';
  btn.classList.toggle('open',!open);
}
function showLightbox(src,name){
  document.getElementById('lb-img').src=src;
  document.getElementById('lb-name').textContent=name||'';
  document.getElementById('img-lightbox').style.display='flex';
}
function closeLightbox(){ document.getElementById('img-lightbox').style.display='none'; }

function loadScript(src){
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=src; s.onload=resolve; s.onerror=reject;
    document.head.appendChild(s);
  });
}
function dateStr(){
  const d=new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}
function esc(str){
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
let _tt=null;
function showToast(msg,type='default'){
  const t=document.getElementById('toast');
  t.textContent=msg; t.className=`toast show ${type}`;
  if(_tt) clearTimeout(_tt);
  _tt=setTimeout(()=>t.classList.remove('show'),3000);
}
