/* ============================================================
   一分三科面料组 — 多人实时同步模块
   策略：轮询 DB，发现新行/更新行则合并到本地表格
   多人同时使用时，每个客户端每N秒拉取一次最新数据
   ============================================================ */

let _syncTimer      = null;
let _syncInterval   = 15000; // 默认15秒
let _lastSyncStamp  = 0;
let _isSyncing      = false;
let _clientId       = 'c_' + Math.random().toString(36).slice(2,8);
let _onlineClients  = {};   // clientId → timestamp

/* 启动同步 */
function startSync(intervalSec){
  _syncInterval = (intervalSec||15) * 1000;
  stopSync();
  _syncTimer = setInterval(doSync, _syncInterval);
  // 上线心跳
  doHeartbeat();
  setInterval(doHeartbeat, 10000);
}
function stopSync(){ if(_syncTimer){ clearInterval(_syncTimer); _syncTimer=null; } }

/* 心跳：记录在线状态（用 localStorage 模拟多 Tab） */
function doHeartbeat(){
  try{
    const key='fabric_online';
    const data=JSON.parse(localStorage.getItem(key)||'{}');
    // 清理超过30秒无心跳的
    const now=Date.now();
    Object.keys(data).forEach(k=>{ if(now-data[k]>30000) delete data[k]; });
    data[_clientId]=now;
    localStorage.setItem(key,JSON.stringify(data));
    const cnt=Object.keys(data).length;
    const el=document.getElementById('online-num');
    if(el) el.textContent=cnt;
  }catch(e){}
}

/* 主同步 */
async function doSync(){
  if(_isSyncing) return;
  _isSyncing=true;
  const ind=document.getElementById('sync-indicator');
  if(ind) ind.style.display='inline-flex';
  try{
    // 拉取最新的记录（limit适量，避免带宽过大）
    const res=await fetch('tables/fabric_records?limit=300&sort=created_at');
    if(!res.ok) throw new Error('sync fail '+res.status);
    const data=await res.json();
    const remoteRows=data.data||[];

    // 找出本地没有的 dbId（其他用户新增的行）
    const localDbIds=new Set(tableRows.map(r=>r.dbId).filter(Boolean));
    const newRemote=remoteRows.filter(r=>!localDbIds.has(r.id));

    if(newRemote.length>0){
      newRemote.forEach(r=>{
        // 避免重复
        if(tableRows.some(tr=>tr.dbId===r.id)) return;
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
          dbId:r.id,
        });
      });
      renderTable();
      addLog(`↓ 同步 ${newRemote.length} 条新记录（来自其他用户）`,'info');
      showToast(`同步到 ${newRemote.length} 条新记录`,'default');
    }

    // 检查本地行的更新（其他用户编辑）
    remoteRows.forEach(r=>{
      const local=tableRows.find(tr=>tr.dbId===r.id);
      if(!local) return;
      // 简单比对：若DB更新时间更新，且本地没有焦点在该行，则更新
      const activeEl=document.activeElement;
      const rowEl=document.getElementById(`tr_${local.id}`);
      if(rowEl&&rowEl.contains(activeEl)) return; // 用户正在编辑此行，跳过
      // 更新内存（轻量更新，不重绘整行）
      ['col_b','col_c','col_d','col_e','col_f','col_g','col_h','col_i'].forEach(col=>{
        if(r[col]!==undefined&&local[col]!==r[col]){
          local[col]=r[col];
          const cell=document.getElementById(`cell_${local.id}_${col.slice(-1).toLowerCase()}`);
          if(cell&&cell.tagName==='INPUT'&&document.activeElement!==cell){
            cell.value=r[col]||'';
          }
          if(col==='col_h'){
            const hEl=document.getElementById(`cell_${local.id}_h`);
            if(hEl) hEl.textContent=r[col]||'';
          }
        }
      });
    });

  }catch(e){
    // 静默失败，避免崩溃
    console.warn('sync error:',e.message);
  }finally{
    _isSyncing=false;
    if(ind) ind.style.display='none';
    _lastSyncStamp=Date.now();
  }
}
