/* ============================================================
   一分三科面料组智能录入 — OCR 解析引擎 v5
   核心升级：单图多条解析 + 编号连续推理
   ============================================================ */

/* ---- 成分缩写表 ---- */
const DEFAULT_COMP_MAP = [
  {abbr:'P',  cn:'聚酯纤维',en:'Polyester'},
  {abbr:'PET',cn:'聚酯纤维',en:'Polyester'},
  {abbr:'C',  cn:'棉',      en:'Cotton'},
  {abbr:'CO', cn:'棉',      en:'Cotton'},
  {abbr:'V',  cn:'粘纤',   en:'Viscose'},
  {abbr:'R',  cn:'粘纤',   en:'Viscose'},
  {abbr:'CV', cn:'粘纤',   en:'Viscose'},
  {abbr:'L',  cn:'亚麻',   en:'Linen'},
  {abbr:'LI', cn:'亚麻',   en:'Linen'},
  {abbr:'N',  cn:'锦纶',   en:'Nylon'},
  {abbr:'PA', cn:'锦纶',   en:'Nylon'},
  {abbr:'SP', cn:'氨纶',   en:'Elastane'},
  {abbr:'E',  cn:'氨纶',   en:'Elastane'},
  {abbr:'EA', cn:'氨纶',   en:'Elastane'},
  {abbr:'M',  cn:'莫代尔', en:'Modal'},
  {abbr:'MD', cn:'莫代尔', en:'Modal'},
  {abbr:'TEN',cn:'天丝',   en:'Lyocell/Tencel'},
  {abbr:'T',  cn:'涤纶',   en:'Polyester'},
  {abbr:'ME', cn:'金属纤维',en:'Metallic'},
  {abbr:'LU', cn:'卢勒克斯',en:'Lurex'},
  {abbr:'W',  cn:'羊毛',   en:'Wool'},
  {abbr:'WO', cn:'羊毛',   en:'Wool'},
  {abbr:'A',  cn:'腈纶',   en:'Acrylic'},
  {abbr:'AC', cn:'腈纶',   en:'Acrylic'},
  {abbr:'PU', cn:'聚氨酯', en:'Polyurethane'},
  {abbr:'CVC',cn:'棉涤混纺',en:'CVC'},
  {abbr:'TC', cn:'涤棉混纺',en:'T/C'},
];
function getCompMap(){
  try{ const s=localStorage.getItem('fabric_comp_map'); return s?JSON.parse(s):DEFAULT_COMP_MAP; }
  catch(e){ return DEFAULT_COMP_MAP; }
}

/* ---- 成分展开 ---- */
function parseComposition(raw){
  if(!raw||!raw.trim()) return '';
  const map=[...getCompMap()].sort((a,b)=>b.abbr.length-a.abbr.length);
  let text=raw.trim().replace(/(\d+)\s*\/\s*([A-Za-z]+)/g,'$1%$2');
  const pairs=[];
  const re1=/(\d+\.?\d*)\s*%\s*([A-Za-z]+)/gi; let m;
  while((m=re1.exec(text))!==null) pairs.push({pct:m[1],abbr:m[2]});
  if(!pairs.length){
    const re2=/([A-Za-z]+)\s*(\d+\.?\d*)\s*%/gi;
    while((m=re2.exec(text))!==null) pairs.push({pct:m[2],abbr:m[1]});
  }
  if(!pairs.length){
    text.split(/[\s,，;；]+/).forEach(p=>{
      const rm=p.match(/^(\d+\.?\d*)([A-Za-z]+)$/i);
      if(rm) pairs.push({pct:rm[1],abbr:rm[2]});
    });
  }
  if(!pairs.length) return raw;
  return pairs.map(({pct,abbr})=>{
    const up=abbr.toUpperCase();
    const hit=map.find(c=>c.abbr.toUpperCase()===up)
             ||map.find(c=>up.startsWith(c.abbr.toUpperCase())&&c.abbr.length>=2);
    return `${pct}% ${hit?hit.en:abbr}`;
  }).join(' ');
}

/* ---- 英寸公式 ---- */
function calcInchDisplay(widthM){
  if(!widthM||isNaN(widthM)||widthM<=0) return '';
  const inches=widthM*100/2.54;
  return `${Math.round(inches-2)}/${Math.round(inches)}"`;
}

/* ---- 门幅解析 ---- */
function parseWidth(text){
  if(!text) return null;
  const isEff=['cuttable','cw','有效门幅','可裁门幅','可裁','有效'].some(k=>text.toLowerCase().includes(k));
  let cm=null,note='';
  const md=text.match(/(\d+)\s*\/\s*(\d+)\s*["''"″]/);
  if(md){ const lg=Math.max(+md[1],+md[2]); cm=lg*2.54; note=`英寸${md[1]}/${md[2]}"→${cm.toFixed(1)}cm`; }
  if(cm===null){ const ms=text.match(/(\d+\.?\d*)\s*["''"″]/); if(ms){cm=+ms[1]*2.54; note=`英寸${ms[1]}"`;} }
  if(cm===null){ const mc=text.match(/(\d+\.?\d*)\s*[Cc][Mm]/); if(mc){cm=+mc[1]; note=`${cm}cm`;} }
  if(cm===null){ const mn=text.match(/(\d{2,3}\.?\d*)/); if(mn){const n=+mn[1];if(n>10&&n<400){cm=n;note=`推断${cm}cm`;}} }
  if(cm===null) return null;
  if(isEff){ note+=`+5cm(有效)`; cm+=5; }
  const widthM=Math.round(cm)/100;
  return {widthM, widthInch:calcInchDisplay(widthM), note};
}

/* ---- 工厂简写 ---- */
const STRIP_WORDS=['浙江','广东','江苏','福建','山东','河北','安徽','四川','湖南','湖北',
  '省','市','县','区','纺织','织造','面料','服装','服饰','布料','印染',
  '有限公司','有限责任公司','股份','集团','公司','工厂','厂',
  'textile','fabric','co','ltd','limited'];
function extractFactoryShort(name){
  let s=name.trim().replace(/[\(（][^）)]*[\)）]/g,'');
  for(const w of STRIP_WORDS) s=s.replace(new RegExp(w,'gi'),'');
  return s.replace(/\s+/g,'').trim().slice(0,4)||name.slice(0,4);
}

/* ---- 行内值提取 ---- */
function extractVal(line,kw){
  const idx=line.toLowerCase().indexOf(kw.toLowerCase());
  if(idx===-1) return '';
  let rest=line.substring(idx+kw.length).trim().replace(/^[\s：:=\-–—\|｜\(（]+/,'').trim();
  const stop=rest.search(/[\t｜|]/); if(stop>0) rest=rest.substring(0,stop).trim();
  return rest;
}

/* ---- HLWG/HLFG 判断 ---- */
function resolveHLCode(num5){
  const s=String(num5).trim();
  if(/^\d{5}$/.test(s)){
    if(s.startsWith('1')) return `HLWG${s}`;
    if(s.startsWith('5')) return `HLFG${s}`;
  }
  return s;
}

/* ============================================================
   核心：将全文按"标签块"分割，返回多个块的行数组
   
   分割策略（按优先级）：
   1. 条形码行（全是特殊字符/空行段）作为分隔符
   2. 空行数 >= 2 作为分隔符
   3. 检测到我方编号（独立的5位数字行）作为新块开始标记
   4. 检测到工厂名（含"有限公司"等）作为新块开始标记
   5. 检测到货号/Art: 重复出现作为新块边界
   ============================================================ */
function splitIntoBlocks(rawText){
  const lines = rawText.split('\n');
  const blocks = [];
  let current = [];

  // 判断是否是条形码/噪声行（非打印字符多，内容无意义）
  function isBarcodeLine(line){
    const clean = line.trim();
    if(clean.length===0) return false;
    // 条形码识别出来通常是一大串乱码
    const nonAlphaNum = (clean.match(/[^a-zA-Z0-9\u4e00-\u9fa5\s\.\-\/\%\(\)\*\+\#\@]/g)||[]).length;
    return nonAlphaNum / clean.length > 0.4 && clean.length > 5;
  }

  // 判断是否是块边界（我方编号行）
  function isOurIdLine(line){
    // 独立的4-6位纯数字，或者前后有空格的5位数字
    return /^\s*[15]\d{3,5}\s*$/.test(line);
  }

  // 判断是否是工厂名行（新标签开始）
  function isFactoryLine(line){
    return ['有限公司','纺织有限','织造有限','Textile','fabric co'].some(k=>
      line.toLowerCase().includes(k.toLowerCase()));
  }

  // 是否是"货号/Art"字段行（新标签开始的强信号）
  function isArtLine(line){
    return /^\s*(货号|编号|Art\.?|Art号)\s*[：:]/i.test(line);
  }

  let consecutiveEmpty = 0;

  for(let i=0; i<lines.length; i++){
    const line = lines[i];
    const trimmed = line.trim();

    // 空行计数
    if(trimmed === ''){
      consecutiveEmpty++;
      if(consecutiveEmpty >= 2 && current.length > 0){
        blocks.push([...current]);
        current = [];
        consecutiveEmpty = 0;
      } else {
        current.push(line);
      }
      continue;
    }
    consecutiveEmpty = 0;

    // 条形码行 → 块分隔
    if(isBarcodeLine(trimmed)){
      if(current.length > 0){
        blocks.push([...current]);
        current = [];
      }
      continue;
    }

    // 我方编号行 → 新块开始（但放到当前块结尾，作为元数据）
    if(isOurIdLine(trimmed)){
      // 把编号附加到当前块作为 our_id 标记
      current.push('__OUR_ID__:' + trimmed.trim());
      continue;
    }

    // 工厂名行 → 若当前块已有内容，先保存
    if(isFactoryLine(trimmed) && current.some(l=>!l.startsWith('__OUR_ID__'))){
      // 检查当前块是否已有足够内容（至少3行有效行）
      const validLines = current.filter(l=>l.trim()&&!l.startsWith('__OUR_ID__'));
      if(validLines.length >= 3){
        blocks.push([...current]);
        current = [line];
        continue;
      }
    }

    // Art/货号行重复出现 → 新块
    if(isArtLine(trimmed) && current.some(l=>isArtLine(l))){
      blocks.push([...current]);
      current = [line];
      continue;
    }

    current.push(line);
  }

  if(current.length > 0) blocks.push(current);

  // 过滤掉太短的块（少于3行有效内容）
  return blocks.filter(b=>{
    const valid = b.filter(l=>l.trim()&&!l.startsWith('__OUR_ID__'));
    return valid.length >= 2;
  });
}

/* ============================================================
   单块解析 → 一行数据
   ============================================================ */
function parseBlock(blockLines, options={}){
  const factoryKwList=(options.factoryKw||'纺织\n织造\n面料\nTextile\n有限公司')
    .split('\n').map(k=>k.trim()).filter(k=>k);

  const out={
    col_b:'', col_c:'', col_d:'', col_e:'',
    col_f:'', col_g:'', col_h:'', col_i:'',
    our_id_raw:'', // 我方编号原始值（5位数）
    notes:[],
  };

  // 提取我方编号行
  const ourIdLines = blockLines.filter(l=>l.startsWith('__OUR_ID__:'));
  const normalLines = blockLines.filter(l=>!l.startsWith('__OUR_ID__'));

  if(ourIdLines.length>0){
    const raw = ourIdLines[ourIdLines.length-1].replace('__OUR_ID__:','').trim();
    out.our_id_raw = raw;
    // C列先不填，留给编号推理阶段统一处理
  }

  // 工厂名 → 工厂简写
  let factoryShort='', factoryNo='';
  const noKws=['货号','编号','art','no.','品号','款号','item no'];

  for(const line of normalLines){
    const ll=line.toLowerCase();
    if(!factoryShort && factoryKwList.some(k=>ll.includes(k.toLowerCase()))){
      factoryShort=extractFactoryShort(line);
    }
    if(!factoryNo){
      for(const kw of noKws){
        if(ll.includes(kw)){ const v=extractVal(line,kw); if(v){factoryNo=v;break;} }
      }
    }
  }
  out.col_i = factoryNo ? `${factoryShort}${factoryNo}` : '';

  // B列：品名+颜色
  const nameKws=['品名','名称','name'];
  const colorKws=['颜色','色名','color','colour','花型'];
  let desc='',color='';
  for(const line of normalLines){
    const ll=line.toLowerCase();
    if(!desc){ for(const k of nameKws){ if(ll.includes(k)){const v=extractVal(line,k);if(v){desc=v;break;}} } }
    for(const k of colorKws){ if(ll.includes(k)){const v=extractVal(line,k);if(v&&v!==desc){color=v;break;}} }
  }
  out.col_b=[desc,color].filter(Boolean).join('，');

  // D列：成分
  const compKws=['成分','成份','纤维含量','comp','composition','material','fiber','content'];
  for(const line of normalLines){
    if(out.col_d) break;
    const ll=line.toLowerCase();
    for(const kw of compKws){
      if(ll.includes(kw)){
        const raw=extractVal(line,kw);
        if(raw){ out.col_d=parseComposition(raw)||raw; out.notes.push(`成分:${raw}→${out.col_d}`); break; }
      }
    }
  }

  // E列：规格
  const specKws=['规格','纱支','spec','specification','density'];
  for(const line of normalLines){
    if(out.col_e) break;
    for(const kw of specKws){ if(line.toLowerCase().includes(kw)){const v=extractVal(line,kw);if(v){out.col_e=v;break;}} }
  }

  // F列：克重
  const wtKws=['克重','重量','gsm','g/m²','g/㎡','weight','gram'];
  for(const line of normalLines){
    if(out.col_f) break;
    const ll=line.toLowerCase();
    for(const kw of wtKws){
      if(ll.includes(kw)){
        const gm=line.match(/(\d+\.?\d*)\s*[Gg][Ss]?[Mm]/); if(gm){out.col_f=gm[1];break;}
        const v=extractVal(line,kw); if(v){out.col_f=v.replace(/[Gg][Ss]?[Mm].*/,'').trim();break;}
      }
    }
  }
  if(!out.col_f){
    const fullText=normalLines.join('\n');
    const gm=fullText.match(/(\d+\.?\d*)\s*[Gg][Ss][Mm]/); if(gm) out.col_f=gm[1];
  }

  // G/H列：门幅
  const widthKws=['门幅','幅宽','width','门宽','cuttable','cw','有效门幅','可裁门幅'];
  const wCands=normalLines.filter(l=>{
    const ll=l.toLowerCase();
    return widthKws.some(k=>ll.includes(k))
      ||/\d+\s*\/\s*\d+\s*["''"″]/.test(l)
      ||/\d+\s*[Cc][Mm]/.test(l);
  });
  if(wCands.length>0){
    const primary=wCands.find(l=>['门幅','幅宽','width'].some(k=>l.toLowerCase().includes(k)))||wCands[0];
    const wr=parseWidth(primary);
    if(wr){ out.col_g=wr.widthM.toFixed(2); out.col_h=wr.widthInch; out.notes.push(`门幅:${wr.note}`); }
  }

  return out;
}

/* ============================================================
   主入口：全图解析 → 多行结果
   返回：Array of parsed row objects
   ============================================================ */
function parseOCRMulti(rawText, options={}){
  const blocks = splitIntoBlocks(rawText);

  if(blocks.length === 0){
    // 兜底：整图当作一块
    return [parseBlock(rawText.split('\n'), options)];
  }

  const results = blocks.map(b => parseBlock(b, options));
  return results;
}

/* ============================================================
   编号连续性推理
   输入：已有的所有行（含新识别的行），处理 col_c 字段
   规则：
   1. 若某行有 our_id_raw（5位数），直接转为 HLWG/HLFG
   2. 若某行缺失编号，看相邻行的编号是否连续，则推断填入
   3. 对全表所有行统一做一遍推理
   ============================================================ */
function inferSequentialCodes(rows){
  // 第一步：解析已有编号为数字
  rows.forEach(row=>{
    if(row.our_id_raw && !row.col_c){
      row.col_c = resolveHLCode(row.our_id_raw);
    }
  });

  // 第二步：提取所有已知编号的数字部分和行索引
  // 格式：HLWG11471 / HLFG56802 → 数字 11471 / 56802
  function extractNum(code){
    if(!code) return null;
    const m=code.match(/(\d{4,6})$/);
    return m ? parseInt(m[1]) : null;
  }

  // 第三步：找到连续段，推断缺失值
  // 对每个缺失编号的行，看前后相邻已知行的编号差是否为 1
  for(let i=0;i<rows.length;i++){
    if(rows[i].col_c) continue; // 已有编号跳过

    // 向前找最近一个有编号的行
    let prevIdx=-1, prevNum=null;
    for(let j=i-1;j>=0;j--){
      const n=extractNum(rows[j].col_c);
      if(n!==null){ prevIdx=j; prevNum=n; break; }
    }

    // 向后找最近一个有编号的行
    let nextIdx=-1, nextNum=null;
    for(let j=i+1;j<rows.length;j++){
      const n=extractNum(rows[j].col_c);
      if(n!==null){ nextIdx=j; nextNum=n; break; }
    }

    // 推断逻辑
    if(prevNum!==null && nextNum!==null){
      // 前后都有 → 插值
      const expected = prevNum + (i - prevIdx);
      const expectedFromNext = nextNum - (nextIdx - i);
      if(expected === expectedFromNext){
        const inferred = resolveHLCode(String(expected));
        rows[i].col_c = inferred;
        rows[i]._inferred = true; // 标记为推理得出
        rows[i].notes = rows[i].notes||[];
        rows[i].notes.push(`编号推理: 前${prevNum}后${nextNum} → 推断为${expected}`);
      }
    } else if(prevNum!==null){
      // 只有前 → 递增
      const expected = prevNum + (i - prevIdx);
      const inferred = resolveHLCode(String(expected));
      rows[i].col_c = inferred;
      rows[i]._inferred = true;
      rows[i].notes = rows[i].notes||[];
      rows[i].notes.push(`编号推理: 前${prevNum} → 推断为${expected}`);
    } else if(nextNum!==null){
      // 只有后 → 递减
      const expected = nextNum - (nextIdx - i);
      const inferred = resolveHLCode(String(expected));
      rows[i].col_c = inferred;
      rows[i]._inferred = true;
      rows[i].notes = rows[i].notes||[];
      rows[i].notes.push(`编号推理: 后${nextNum} → 推断为${expected}`);
    }
  }

  return rows;
}

/* ---- 兼容旧接口（单块解析） ---- */
function parseOCRFull(rawText, options={}){
  return parseBlock(rawText.split('\n'), options);
}
