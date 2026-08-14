/* DRC Block Calculator v6 – Multi-pass OCR + Better Dimension Detection */
(function(){
  'use strict';

  const BLOCKS=[
    {id:1,name:'6" Hollow (GH)',l:450,h:225},{id:2,name:'9" Hollow (GH)',l:450,h:225},
    {id:3,name:'5" Solid (GH)',l:450,h:225},{id:4,name:'6" Solid (GH)',l:450,h:225},
    {id:5,name:'US CMU 16"×8"',l:390,h:190},{id:6,name:'UK 440×215',l:440,h:215},
    {id:7,name:'Large 600×250',l:600,h:250},{id:8,name:'Custom',l:0,h:0},
  ];
  const LS_CALC='drc_calc_inputs',LS_TRACKER='drc_tracker_inputs',LS_WALLS='drc_walls_data',MAX_WALLS=50;

  function v(id){const el=document.getElementById(id);return el?parseFloat(el.value)||0:0;}
  function s(id,val){const el=document.getElementById(id);if(el)el.textContent=val;}

  let wallCounter=0;
  function addWallRow(length,height){
    const c=document.getElementById('wallsContainer');if(!c)return;const ex=c.querySelectorAll('.wall-row').length;
    if(ex>=MAX_WALLS){alert('Maximum '+MAX_WALLS+' walls');return;}wallCounter++;const n=ex+1;
    const div=document.createElement('div');div.className='wall-row';div.dataset.wallId=wallCounter;
    div.innerHTML=`<div class="row"><span class="label">Wall ${n} Length:</span><input type="number" class="wallLen" placeholder="m" step="0.01"><span class="unit">metres</span></div><div class="row"><span class="label">Wall ${n} Height:</span><input type="number" class="wallHt" placeholder="2.7" step="0.1" value="2.7"><span class="unit">metres</span></div><div class="row" style="justify-content:flex-end;border-bottom:2px solid var(--light)"><button class="plan-btn wall-remove" style="flex:none;padding:3px 10px;font-size:10px">✕ Remove</button></div>`;
    if(length)div.querySelector('.wallLen').value=length;if(height)div.querySelector('.wallHt').value=height;
    div.querySelectorAll('input').forEach(inp=>{inp.addEventListener('input',calculate);inp.addEventListener('change',calculate);});
    div.querySelector('.wall-remove').addEventListener('click',()=>{div.remove();renumberWalls();calculate();});
    c.appendChild(div);updateWallCount();calculate();
  }
  function renumberWalls(){document.querySelectorAll('#wallsContainer .wall-row').forEach((r,i)=>{const n=i+1;r.querySelector('.label').textContent='Wall '+n+' Length:';r.querySelectorAll('.label')[1].textContent='Wall '+n+' Height:';});updateWallCount();}
  function updateWallCount(){const n=document.querySelectorAll('#wallsContainer .wall-row').length;const el=document.getElementById('wallCount');if(el)el.textContent=n+' wall'+(n!==1?'s':'');}
  function getWallData(){const walls=[];document.querySelectorAll('#wallsContainer .wall-row').forEach(r=>{const l=parseFloat(r.querySelector('.wallLen').value)||0;const h=parseFloat(r.querySelector('.wallHt').value)||0;if(l>0)walls.push({length:l,height:h||2.7});});return walls;}
  function saveWallData(){const walls=[];document.querySelectorAll('#wallsContainer .wall-row').forEach(r=>{walls.push({length:r.querySelector('.wallLen').value,height:r.querySelector('.wallHt').value});});try{localStorage.setItem(LS_WALLS,JSON.stringify(walls));}catch(e){}}
  function loadWallData(){try{const raw=localStorage.getItem(LS_WALLS);if(!raw)return;JSON.parse(raw).forEach(w=>addWallRow(w.length,w.height));}catch(e){}}

  function saveCalcInputs(){const data={};['blockType','customLen','customHt','mortar','doorN','doorW','doorH','winN','winW','winH','otherOpen','wastage','price','delivered','used','remaining'].forEach(id=>{const el=document.getElementById(id);if(el)data[id]=el.value;});saveWallData();try{localStorage.setItem(LS_CALC,JSON.stringify(data));}catch(e){}}
  function loadCalcInputs(){try{const raw=localStorage.getItem(LS_CALC);if(!raw)return;const data=JSON.parse(raw);Object.keys(data).forEach(id=>{const el=document.getElementById(id);if(el)el.value=data[id];});}catch(e){}}
  function saveTrackerInputs(){const rows=[];document.querySelectorAll('#page-tracker .tracker-table tbody tr').forEach(tr=>{const inputs=tr.querySelectorAll('input');const row={};inputs.forEach((inp,i)=>{row['i'+i]=inp.value;});rows.push(row);});try{localStorage.setItem(LS_TRACKER,JSON.stringify(rows));}catch(e){}}
  function loadTrackerInputs(){try{const raw=localStorage.getItem(LS_TRACKER);if(!raw)return;const rows=JSON.parse(raw);const trs=document.querySelectorAll('#page-tracker .tracker-table tbody tr');rows.forEach((row,idx)=>{if(!trs[idx])return;const inputs=trs[idx].querySelectorAll('input');Object.keys(row).forEach(k=>{const i=parseInt(k.replace('i',''));if(inputs[i])inputs[i].value=row[k];});});}catch(e){}}

  function calculate(){
    const bt=parseInt(document.getElementById('blockType').value)||1;let bL,bH;
    if(bt===8){bL=v('customLen');bH=v('customHt');if(!bL||!bH){s('faceArea','—');s('bpsm','—');s('totalArea','—');s('deduction','—');s('netArea','—');s('netBlocks','—');s('wasteBlocks','—');s('totalBlocks','—');s('totalCost','—');saveCalcInputs();return;}}
    else{const blk=BLOCKS.find(b=>b.id===bt);bL=blk.l;bH=blk.h;s('blockLen',bL);s('blockHt',bH);}
    const mort=v('mortar');const faceArea=(bL+mort)*(bH+mort)/1e6;const bpsm=1/faceArea;
    s('faceArea',faceArea.toFixed(5));s('bpsm',bpsm.toFixed(1));
    const walls=getWallData();const area=walls.reduce((sum,w)=>sum+w.length*w.height,0);s('totalArea',area.toFixed(2));
    const ded=v('doorN')*v('doorW')*v('doorH')+v('winN')*v('winW')*v('winH')+v('otherOpen');s('deduction',ded.toFixed(2));
    const net=Math.max(0,area-ded);s('netArea',net.toFixed(2));
    const netBlocks=Math.round(net*bpsm);const wastPct=v('wastage');const wasteBlocks=Math.round(netBlocks*wastPct/100);const totalBlocks=netBlocks+wasteBlocks;
    s('netBlocks',netBlocks.toLocaleString());s('wasteBlocks',wasteBlocks.toLocaleString());s('totalBlocks',totalBlocks.toLocaleString());
    const price=v('price');if(price>0){s('totalCost',(totalBlocks*price).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}));}else{s('totalCost','—');}
    const del=v('delivered'),used=v('used'),rem=v('remaining');
    if(del>0){s('delVsEst',(del/totalBlocks*100).toFixed(1)+'%');s('shortSurp',(del-totalBlocks).toLocaleString());}
    if(used>0){s('useVsEst',(used/totalBlocks*100).toFixed(1)+'%');}
    if(del>0&&used>0&&rem>0){s('unaccounted',(del-used-rem).toLocaleString());}
    saveCalcInputs();
  }
  function onBlockTypeChange(){const bt=parseInt(document.getElementById('blockType').value)||1;const customRows=document.getElementById('customRows');if(bt===8){customRows.style.display='block';const cr2=document.getElementById('customRows2');if(cr2)cr2.style.display='block';}else{customRows.style.display='none';const cr2=document.getElementById('customRows2');if(cr2)cr2.style.display='none';const blk=BLOCKS.find(b=>b.id===bt);if(blk){s('blockLen',blk.l);s('blockHt',blk.h);}}calculate();}
  function calcTracker(){let runningBalance=0;document.querySelectorAll('#page-tracker .tracker-table tbody tr').forEach(tr=>{const inputs=tr.querySelectorAll('input');const del=parseFloat(inputs[1]?.value)||0;const used=parseFloat(inputs[2]?.value)||0;runningBalance+=del-used;const remCell=tr.querySelector('.remaining');if(remCell){if(del>0||used>0){remCell.textContent=runningBalance.toLocaleString();remCell.style.color=runningBalance<0?'#C00000':'#006100';}else{remCell.textContent='—';remCell.style.color='#006100';}}});saveTrackerInputs();}

  // ── IMAGE ENHANCEMENT ──
  function enhanceCanvas(srcCanvas,contrast,brightness){const w=srcCanvas.width,h=srcCanvas.height;const tmp=document.createElement('canvas');tmp.width=w;tmp.height=h;const ctx=tmp.getContext('2d');ctx.drawImage(srcCanvas,0,0);const imgData=ctx.getImageData(0,0,w,h);const d=imgData.data;const factor=(259*(contrast+255))/(255*(259-contrast));for(let i=0;i<d.length;i+=4){d[i]=Math.min(255,Math.max(0,factor*(d[i]-128)+128+brightness));d[i+1]=Math.min(255,Math.max(0,factor*(d[i+1]-128)+128+brightness));d[i+2]=Math.min(255,Math.max(0,factor*(d[i+2]-128)+128+brightness));}ctx.putImageData(imgData,0,0);return tmp;}

  function preprocessForOCR(srcCanvas,mode){
    const w=srcCanvas.width,h=srcCanvas.height;const tmp=document.createElement('canvas');tmp.width=w;tmp.height=h;const ctx=tmp.getContext('2d');ctx.drawImage(srcCanvas,0,0);const imgData=ctx.getImageData(0,0,w,h);const d=imgData.data;
    if(mode==='binary_high'){for(let i=0;i<d.length;i+=4){let g=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];g=((g-128)*3.0)+128;g=g>100?255:0;d[i]=d[i+1]=d[i+2]=g;}}
    else if(mode==='binary_low'){for(let i=0;i<d.length;i+=4){let g=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];g=((g-128)*2.0)+128;g=g>160?255:0;d[i]=d[i+1]=d[i+2]=g;}}
    else if(mode==='gray_contrast'){for(let i=0;i<d.length;i+=4){let g=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];g=((g-128)*2.5)+128;g=Math.min(255,Math.max(0,g));d[i]=d[i+1]=d[i+2]=g;}}
    else{for(let i=0;i<d.length;i+=4){let g=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];g=((g-128)*2.5)+128;g=g>140?255:0;d[i]=d[i+1]=d[i+2]=g;}}
    ctx.putImageData(imgData,0,0);
    const s2=ctx.getImageData(0,0,w,h),sd=s2.data;
    for(let y=1;y<h-1;y++){for(let x=1;x<w-1;x++){const idx=(y*w+x)*4;for(let c=0;c<3;c++){const ct=d[idx+c]*5;const nb=d[((y-1)*w+x)*4+c]+d[((y+1)*w+x)*4+c]+d[(y*w+x-1)*4+c]+d[(y*w+x+1)*4+c];sd[idx+c]=Math.min(255,Math.max(0,ct-nb));}}}
    ctx.putImageData(s2,0,0);return tmp;
  }

  // ── PLAN STATE ──
  let planState={img:null,pdfDoc:null,pdfPage:1,pdfTotalPages:0,scale:null,mode:null,points:[],scalePts:[],walls:[],canvasW:0,canvasH:0,zoom:1,enhance:false,displayW:0,displayH:0};
  const RENDER_SCALE=3;

  function drawPlan(){
    const canvas=document.getElementById('planCanvas');if(!canvas)return;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
    if(planState.img){if(planState.enhance){const e=enhanceCanvas(canvas,60,10);ctx.drawImage(e,0,0);}else{ctx.drawImage(planState.img,0,0,canvas.width,canvas.height);}}
    if(planState.scalePts.length>=2){const p1=planState.scalePts[0],p2=planState.scalePts[1];ctx.strokeStyle='#00AA00';ctx.lineWidth=3;ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();[p1,p2].forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fillStyle='#00AA00';ctx.fill();});if(planState.scale){const mx=(p1.x+p2.x)/2,my=(p1.y+p2.y)/2;const pxLen=Math.sqrt((p2.x-p1.x)**2+(p2.y-p1.y)**2);ctx.fillStyle='#00AA00';ctx.font='bold 14px sans-serif';ctx.fillText((pxLen/planState.scale).toFixed(2)+'m (SCALE)',mx+8,my-8);}}
    if(planState.mode==='scale'&&planState.points.length>0){ctx.strokeStyle='#00AA00';ctx.lineWidth=2;ctx.setLineDash([6,4]);planState.points.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,8,0,Math.PI*2);ctx.stroke();});}
    planState.walls.forEach((w,i)=>{ctx.strokeStyle='#ED7D31';ctx.lineWidth=3;ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(w.x1,w.y1);ctx.lineTo(w.x2,w.y2);ctx.stroke();[[w.x1,w.y1],[w.x2,w.y2]].forEach(([px,py])=>{ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);ctx.fillStyle='#ED7D31';ctx.fill();});const mx=(w.x1+w.x2)/2,my=(w.y1+w.y2)/2;ctx.fillStyle='#ED7D31';ctx.font='bold 13px sans-serif';ctx.fillText('W'+(i+1)+': '+w.metres.toFixed(2)+'m',mx+8,my-8);});
    if(planState.mode==='measure'&&planState.points.length>0){ctx.strokeStyle='#ED7D31';ctx.lineWidth=2;ctx.setLineDash([6,4]);planState.points.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,8,0,Math.PI*2);ctx.stroke();});}ctx.setLineDash([]);
  }

  function updateInstructions(text){const el=document.getElementById('planInstructions');if(el)el.innerHTML=text;}
  function updateMeasuredWallsList(){const c=document.getElementById('measuredWallsList'),sec=document.getElementById('planMeasures');if(!planState.walls.length){sec.style.display='none';return;}sec.style.display='';c.innerHTML=planState.walls.map((w,i)=>`<div class="measured-wall"><span class="wall-label">Wall ${i+1}</span><span class="wall-val">${w.metres.toFixed(2)} m</span><button class="plan-btn" style="flex:none;min-width:auto;padding:4px 8px;margin-left:6px" onclick="window._deleteWall(${i})">✕</button></div>`).join('');}
  window._deleteWall=function(i){planState.walls.splice(i,1);updateMeasuredWallsList();drawPlan();};
  function getCanvasPoint(e){
    const canvas=document.getElementById('planCanvas');if(!canvas)return null;
    const rect=canvas.getBoundingClientRect();
    const scaleX=canvas.width/rect.width,scaleY=canvas.height/rect.height;
    let cx,cy;
    if(e.touches&&e.touches.length>0){cx=e.touches[0].clientX;cy=e.touches[0].clientY;}
    else if(e.changedTouches&&e.changedTouches.length>0){cx=e.changedTouches[0].clientX;cy=e.changedTouches[0].clientY;}
    else{cx=e.clientX;cy=e.clientY;}
    return{x:(cx-rect.left)*scaleX,y:(cy-rect.top)*scaleY};
  }

  function onCanvasTap(e){
    const pt=getCanvasPoint(e);if(!pt)return;
    if(planState.mode==='scale'){planState.points.push(pt);if(planState.points.length===1){updateInstructions('<span class="step-badge">1</span> Now tap <strong>second point</strong>');drawPlan();}else if(planState.points.length>=2){planState.scalePts=[planState.points[0],planState.points[1]];planState.points=[];document.getElementById('scaleInput').style.display='block';updateInstructions('<span class="step-badge">2</span> Enter <strong>real length</strong> in metres');drawPlan();}}
    else if(planState.mode==='measure'){if(!planState.scale){updateInstructions('<span class="step-badge">!</span> Set scale first!');return;}if(planState.walls.length>=MAX_WALLS){return;}planState.points.push(pt);if(planState.points.length===1){updateInstructions(`<span class="step-badge">3</span> Tap <strong>end point</strong> of Wall ${planState.walls.length+1}`);drawPlan();}else if(planState.points.length>=2){const p1=planState.points[0],p2=planState.points[1];const pxLen=Math.sqrt((p2.x-p1.x)**2+(p2.y-p1.y)**2);const metres=pxLen/planState.scale;planState.walls.push({x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,metres});planState.points=[];updateInstructions(`<span class="step-badge">3</span> Wall ${planState.walls.length} = <strong>${metres.toFixed(2)}m</strong>`);updateMeasuredWallsList();drawPlan();}}
  }

  function applyZoom(nz){planState.zoom=Math.max(0.5,Math.min(5,nz));const canvas=document.getElementById('planCanvas');if(!canvas)return;canvas.style.width=Math.round(planState.displayW*planState.zoom)+'px';canvas.style.height=Math.round(planState.displayH*planState.zoom)+'px';const zl=document.getElementById('zoomLevel');if(zl)zl.textContent=Math.round(planState.zoom*100)+'%';}

  function loadImageToCanvas(img){
    planState.img=img;const canvas=document.getElementById('planCanvas');const maxDW=Math.min(600,window.innerWidth-30);const ratio=img.height/img.width;const dw=maxDW;const dh=Math.round(maxDW*ratio);
    const cw=Math.round(dw*RENDER_SCALE);const ch=Math.round(dh*RENDER_SCALE);canvas.width=cw;canvas.height=ch;planState.canvasW=cw;planState.canvasH=ch;planState.displayW=dw;planState.displayH=dh;
    const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,0,0,cw,ch);
    planState.zoom=1;canvas.style.width=dw+'px';canvas.style.height=dh+'px';const zl=document.getElementById('zoomLevel');if(zl)zl.textContent='100%';
    document.getElementById('planCanvasSection').style.display='';resetPlanState();
    updateInstructions('<span class="step-badge">1</span> Tap <strong>SET SCALE</strong> or <strong>🔍 AUTO-DETECT</strong>. ➕/➖ zoom, 🔆 enhance.');updateMeasuredWallsList();drawPlan();
  }

  // ══════════════════════════════════════════════════
  // ── MULTI-PASS OCR AUTO-DETECT ──
  // ══════════════════════════════════════════════════
  function runAutoDetect(){
    if(!planState.img){alert('Upload a plan first!');return;}
    const section=document.getElementById('autoDetectSection'),status=document.getElementById('detectStatus'),dimsC=document.getElementById('detectedDims');
    section.style.display='';dimsC.innerHTML='';
    if(!window.Tesseract){status.textContent='❌ OCR library not loaded. Check internet.';return;}

    const canvas=document.getElementById('planCanvas');
    // 4 passes: different preprocessing + Tesseract page segmentation modes
    const passes=[
      {pre:'binary_high',psm:6,label:'Pass 1/4: Dark text'},
      {pre:'gray_contrast',psm:11,label:'Pass 2/4: Grayscale sparse'},
      {pre:'binary_low',psm:3,label:'Pass 3/4: Light text'},
      {pre:null,psm:6,label:'Pass 4/4: Raw image'},
    ];
    let allText='',passIdx=0;

    function nextPass(){
      if(passIdx>=passes.length){
        console.log('ALL OCR:',allText);
        const dims=extractDimensions(allText);
        if(!dims.length){status.textContent='❌ No dimensions found. Try SET SCALE + MEASURE, or use 🔆 Enhance first then retry.';return;}
        status.textContent='✅ Found '+dims.length+' number(s)! Tap to add as wall. ⚠️ VERIFY — some may be wrong!';
        dimsC.innerHTML=dims.map((d,i)=>`<span class="dim-chip" data-dim="${d.metres}" data-idx="${i}">${d.display}</span>`).join('');
        dimsC.querySelectorAll('.dim-chip').forEach(chip=>{chip.addEventListener('click',()=>{const m=parseFloat(chip.dataset.dim);chip.classList.add('used');planState.walls.push({x1:0,y1:0,x2:0,y2:0,metres:m});updateMeasuredWallsList();});});
        return;
      }
      const pass=passes[passIdx];status.textContent='🔍 '+pass.label+'...';
      let ocrCanvas=pass.pre?preprocessForOCR(canvas,pass.pre):canvas;

      Tesseract.recognize(ocrCanvas,'eng',{tessedit_pagesegmode:pass.psm,logger:m=>{if(m.status==='recognizing text')status.textContent='🔍 '+pass.label+'... '+Math.round(m.progress*100)+'%';}})
      .then(({data:{text}})=>{console.log(pass.label+' text:',text);allText+='\n'+text;passIdx++;nextPass();})
      .catch(()=>{passIdx++;nextPass();});
    }
    nextPass();
  }

  // ══════════════════════════════════════════════════
  // ── COMPREHENSIVE DIMENSION EXTRACTION ──
  // ══════════════════════════════════════════════════
  function extractDimensions(text){
    const dims=[],seen=new Set();
    function addMetres(val,display){
      const key=val.toFixed(2);
      if(val>=0.3&&val<=60&&!seen.has(key)){seen.add(key);dims.push({metres:val,display});}
    }

    let m;

    // ── METRES: "6.0m" "3.2 m" "12.5m" "6.00m" ──
    const p1=/(\d+\.\d+|\d+)\s*m\b/gi;
    while((m=p1.exec(text))!==null)addMetres(parseFloat(m[1]),parseFloat(m[1]).toFixed(2)+' m');

    // ── MILLIMETRES: "6000mm" "3 000 mm" "4500mm" ──
    const p2=/(\d+\.\d+|\d+)\s*mm\b/gi;
    while((m=p2.exec(text))!==null){const val=parseFloat(m[1])/1000;addMetres(val,m[1]+'mm = '+val.toFixed(2)+' m');}

    // ── FEET/INCHES: "6'-0\"" "6'0\"" "6'-6\"" "20'-0\"" ──
    const p3=/(\d+)'-?(\d+)"?/g;
    while((m=p3.exec(text))!==null){const ft=parseInt(m[1]),inch=parseInt(m[2]);const val=(ft+inch/12)*0.3048;addMetres(val,m[0]+" = "+val.toFixed(2)+' m');}

    // ── FEET only: "6'" "20'" ──
    const p3b=/(\d+)'(?!-)/g;
    while((m=p3b.exec(text))!==null){const val=parseInt(m[1])*0.3048;addMetres(val,m[1]+"' = "+val.toFixed(2)+' m');}

    // ── SPACE-SEPARATED THOUSANDS: "6 000" "3 600" "12 500" ──
    const p4=/(\d{1,2})\s(\d{3})(?:\s*mm)?/g;
    while((m=p4.exec(text))!==null){const val=(parseFloat(m[1])*1000+parseFloat(m[2]))/1000;addMetres(val,m[0]+' → '+val.toFixed(2)+' m');}

    // ── AFTER KEYWORDS: length=6, width 3.6, span: 12 ──
    const p5=/(?:length|width|height|dim|size|span|wall|room|depth|bay)\s*[:=]?\s*(\d+\.?\d*)/gi;
    while((m=p5.exec(text))!==null)addMetres(parseFloat(m[1]),parseFloat(m[1]).toFixed(2)+' m (labelled)');

    // ── STANDALONE DECIMALS typical of plans: "6.00" "3.60" "12.50" "0.90" ──
    // These are very common on architectural drawings
    const p6=/(?:^|\s|[=x×@])(\d+\.\d{1,2})(?:\s|$|[x×,])/gm;
    while((m=p6.exec(text))!==null){const val=parseFloat(m[1]);if(val>=0.3&&val<=60)addMetres(val,val.toFixed(2)+' m (decimal)');}

    // ── BARE NUMBERS in typical dimension ranges (1-50) surrounded by whitespace/punctuation ──
    // Must be careful not to pick up random numbers
    const p7=/(?:^|\s|=)(\d{1,4})(?:\s|$|[,;])/gm;
    while((m=p7.exec(text))!==null){
      const val=parseFloat(m[1]);
      // Skip obviously non-dimension numbers
      if(val<1||val>50)continue;
      // Skip years, dates, common non-dims
      if(val>=2020||val===100||val===200||val===300||val===400||val===500||val===10||val===20||val===30)continue;
      addMetres(val,val+' m (bare number)');
    }

    // ── DIMENSION LINES pattern: "← 6.0 →" or "6.0" between arrows/dashes ──
    const p8=/[←<\-\—\–]\s*(\d+\.?\d*)\s*[→>\-\—\–]/g;
    while((m=p8.exec(text))!==null)addMetres(parseFloat(m[1]),parseFloat(m[1]).toFixed(2)+' m (dim line)');

    // ── NUMBERS WITH MM nearby: "6000" within 3 words of "mm" ──
    const words=text.split(/\s+/);
    for(let i=0;i<words.length;i++){
      const w=words[i].replace(/[,.:;()]/g,'');
      const val=parseFloat(w);
      if(isNaN(val))continue;
      // Check if "mm" within 2 words
      const nearby=words.slice(Math.max(0,i-2),Math.min(words.length,i+3)).join(' ');
      if(/mm/i.test(nearby)&&val>=100&&val<=50000){addMetres(val/1000,val+'mm = '+(val/1000).toFixed(2)+' m');}
      // Check if "m" within 2 words (not mm)
      if(/\bm\b/i.test(nearby)&&!(/mm/i.test(nearby))&&val>=0.3&&val<=60){addMetres(val,val.toFixed(2)+' m');}
    }

    // ── ROOM LABELS: "3x3" "3.6x3.6" "4.5 x 3.6" ──
    const p9=/(\d+\.?\d*)\s*[x×]\s*(\d+\.?\d*)/g;
    while((m=p9.exec(text))!==null){
      const l=parseFloat(m[1]),w=parseFloat(m[2]);
      if(l>=1&&l<=30)addMetres(l,l.toFixed(2)+' m (room L×W)');
      if(w>=1&&w<=30)addMetres(w,w.toFixed(2)+' m (room L×W)');
    }

    dims.sort((a,b)=>a.metres-b.metres);
    return dims;
  }

  // ── PDF / Plan helpers ──
  function hidePdfNav(){const nav=document.getElementById('pdfPageNav');if(nav)nav.style.display='none';}
  function showPdfNav(page,total){const nav=document.getElementById('pdfPageNav'),info=document.getElementById('pdfPageInfo');if(nav)nav.style.display='flex';if(info)info.textContent='Page '+page+' / '+total;}
  function resetPlanState(){planState.scale=null;planState.scalePts=[];planState.walls=[];planState.points=[];planState.mode=null;planState.enhance=false;document.getElementById('scaleInput').style.display='none';}

  function renderPdfPage(pageNum){
    if(!planState.pdfDoc)return;const canvas=document.getElementById('planCanvas');
    planState.pdfDoc.getPage(pageNum).then(function(page){
      const maxDW=Math.min(600,window.innerWidth-30);const viewport=page.getViewport({scale:1});
      const displayScale=maxDW/viewport.width;const renderScale=displayScale*RENDER_SCALE;
      const sv=page.getViewport({scale:renderScale});canvas.width=sv.width;canvas.height=sv.height;
      planState.canvasW=canvas.width;planState.canvasH=canvas.height;
      const dh=Math.round(maxDW*(sv.height/sv.width));planState.displayW=maxDW;planState.displayH=dh;planState.zoom=1;
      canvas.style.width=maxDW+'px';canvas.style.height=dh+'px';const zl=document.getElementById('zoomLevel');if(zl)zl.textContent='100%';
      const ctx=canvas.getContext('2d');
      page.render({canvasContext:ctx,viewport:sv}).promise.then(function(){const img=new Image();img.onload=function(){planState.img=img;document.getElementById('planCanvasSection').style.display='';resetPlanState();showPdfNav(pageNum,planState.pdfTotalPages);updateInstructions('<span class="step-badge">1</span> Tap <strong>SET SCALE</strong> or <strong>🔍 AUTO-DETECT</strong>');updateMeasuredWallsList();drawPlan();};img.src=canvas.toDataURL();});
    });
  }

  function initPlanTool(){
    const fileInput=document.getElementById('planFile'),canvas=document.getElementById('planCanvas');
    if(fileInput){fileInput.addEventListener('change',function(e){const file=e.target.files[0];if(!file)return;if(file.type==='application/pdf'){const reader=new FileReader();reader.onload=function(ev){const ta=new Uint8Array(ev.target.result);if(window.pdfjsLib){pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';pdfjsLib.getDocument({data:ta}).promise.then(function(pdf){planState.pdfDoc=pdf;planState.pdfPage=1;planState.pdfTotalPages=pdf.numPages;renderPdfPage(1);}).catch(function(err){alert('Could not read PDF: '+err.message);});}else{alert('PDF library not loaded.');}};reader.readAsArrayBuffer(file);}else{const reader=new FileReader();reader.onload=function(ev){const img=new Image();img.onload=function(){planState.pdfDoc=null;hidePdfNav();loadImageToCanvas(img);};img.src=ev.target.result;};reader.readAsDataURL(file);}});}
    if(canvas){
      const wrap=document.getElementById('planCanvasWrap');
      const loupe=document.getElementById('loupe');
      const loupeCanvas=document.getElementById('loupeCanvas');
      let pinchStartDist=0,pinchStartZoom=1;
      const LOUPE_R=75,LOUPE_Z=3;

      function showLoupe(cx,cy){
        if(!loupe||!loupeCanvas||!planState.mode)return;
        const rect=canvas.getBoundingClientRect();
        const sx=canvas.width/rect.width,sy=canvas.height/rect.height;
        const canX=(cx-rect.left)*sx,canY=(cy-rect.top)*sy;
        loupe.style.display='block';
        loupe.style.left=(cx-LOUPE_R)+'px';
        loupe.style.top=Math.max(10,cy-LOUPE_R-170)+'px';
        const lCtx=loupeCanvas.getContext('2d');
        const srcS=LOUPE_R*2/LOUPE_Z;
        lCtx.clearRect(0,0,150,150);
        lCtx.drawImage(canvas,canX-srcS/2,canY-srcS/2,srcS,srcS,0,0,150,150);
      }
      function hideLoupe(){if(loupe)loupe.style.display='none';}

      // Touch start
      wrap.addEventListener('touchstart',function(e){
        if(e.touches.length===2){
          const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
          pinchStartDist=Math.sqrt(dx*dx+dy*dy);pinchStartZoom=planState.zoom;hideLoupe();e.preventDefault();
        } else if(e.touches.length===1&&planState.mode){
          showLoupe(e.touches[0].clientX,e.touches[0].clientY);e.preventDefault();
        }
      },{passive:false});

      wrap.addEventListener('touchmove',function(e){
        if(e.touches.length===2){
          const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
          const dist=Math.sqrt(dx*dx+dy*dy);
          if(pinchStartDist>0)applyZoom(pinchStartZoom*(dist/pinchStartDist));
          e.preventDefault();
        } else if(e.touches.length===1&&planState.mode){
          showLoupe(e.touches[0].clientX,e.touches[0].clientY);e.preventDefault();
        }
      },{passive:false});

      wrap.addEventListener('touchend',function(e){
        if(e.touches.length===0&&e.changedTouches.length===1&&planState.mode){
          hideLoupe();
          const fake={clientX:e.changedTouches[0].clientX,clientY:e.changedTouches[0].clientY,preventDefault:()=>{}};
          onCanvasTap(fake);
        }
        pinchStartDist=0;hideLoupe();
      },{passive:false});

      canvas.addEventListener('click',function(e){if(planState.mode)onCanvasTap(e);});
      canvas.addEventListener('mousemove',function(e){if(planState.mode)showLoupe(e.clientX,e.clientY);});
      canvas.addEventListener('mouseleave',hideLoupe);
    }
    const btnPrev=document.getElementById('btnPrevPage'),btnNext=document.getElementById('btnNextPage');
    if(btnPrev)btnPrev.addEventListener('click',()=>{if(planState.pdfDoc&&planState.pdfPage>1){planState.pdfPage--;renderPdfPage(planState.pdfPage);}});
    if(btnNext)btnNext.addEventListener('click',()=>{if(planState.pdfDoc&&planState.pdfPage<planState.pdfTotalPages){planState.pdfPage++;renderPdfPage(planState.pdfPage);}});
    const btnZI=document.getElementById('btnZoomIn'),btnZO=document.getElementById('btnZoomOut');
    if(btnZI)btnZI.addEventListener('click',()=>{applyZoom(planState.zoom+0.25);});
    if(btnZO)btnZO.addEventListener('click',()=>{applyZoom(planState.zoom-0.25);});
    const btnE=document.getElementById('btnEnhance');if(btnE)btnE.addEventListener('click',()=>{planState.enhance=!planState.enhance;btnE.style.background=planState.enhance?'var(--mid)':'var(--white)';btnE.style.color=planState.enhance?'var(--white)':'var(--mid)';drawPlan();});
    const btnS=document.getElementById('btnSetScale');if(btnS)btnS.addEventListener('click',()=>{planState.mode='scale';planState.points=[];document.getElementById('scaleInput').style.display='none';updateInstructions('<span class="step-badge">1</span> Tap <strong>first point</strong> on a known wall');});
    const btnM=document.getElementById('btnMeasure');if(btnM)btnM.addEventListener('click',()=>{if(!planState.scale){updateInstructions('<span class="step-badge">!</span> Set scale first!');return;}planState.mode='measure';planState.points=[];updateInstructions(`<span class="step-badge">3</span> Tap <strong>start</strong> of Wall ${planState.walls.length+1}`);});
    const btnAD=document.getElementById('btnAutoDetect');if(btnAD)btnAD.addEventListener('click',runAutoDetect);
    const btnC=document.getElementById('btnClear');if(btnC)btnC.addEventListener('click',()=>{resetPlanState();updateInstructions('<span class="step-badge">1</span> Tap <strong>SET SCALE</strong> or <strong>🔍 AUTO-DETECT</strong>');updateMeasuredWallsList();drawPlan();document.getElementById('autoDetectSection').style.display='none';const be=document.getElementById('btnEnhance');if(be){be.style.background='var(--white)';be.style.color='var(--mid)';}});
    const btnCS=document.getElementById('btnConfirmScale');if(btnCS)btnCS.addEventListener('click',()=>{const kl=parseFloat(document.getElementById('scaleLength').value);if(!kl||kl<=0){alert('Enter a valid length in metres');return;}const p1=planState.scalePts[0],p2=planState.scalePts[1];const pxL=Math.sqrt((p2.x-p1.x)**2+(p2.y-p1.y)**2);planState.scale=pxL/kl;document.getElementById('scaleInput').style.display='none';planState.mode=null;updateInstructions(`<span class="step-badge">✓</span> Scale set! Tap <strong>MEASURE</strong> or <strong>🔍 AUTO-DETECT</strong>`);drawPlan();});
    const btnAF=document.getElementById('btnAutoFill');if(btnAF)btnAF.addEventListener('click',()=>{if(!planState.walls.length){alert('Measure at least 1 wall first!');return;}const wH=parseFloat(document.getElementById('planWallH')?.value)||2.7;planState.walls.forEach(w=>addWallRow(w.metres.toFixed(2),wH.toFixed(1)));switchTab('calc');calculate();alert('✅ '+planState.walls.length+' wall lengths filled!');});
  }

  function switchTab(tab){document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));const te=document.querySelector(`.tab[data-tab="${tab}"]`);if(te)te.classList.add('active');const pe=document.getElementById('page-'+tab);if(pe)pe.classList.add('active');}

  function init(){
    loadCalcInputs();loadWallData();loadTrackerInputs();
    if(!document.querySelectorAll('#wallsContainer .wall-row').length){addWallRow();addWallRow();addWallRow();addWallRow();}
    document.querySelectorAll('#page-calc input, #page-calc select').forEach(el=>{el.addEventListener('input',calculate);el.addEventListener('change',calculate);});
    const btSel=document.getElementById('blockType');if(btSel){btSel.addEventListener('change',onBlockTypeChange);btSel.addEventListener('input',onBlockTypeChange);}
    const btnAdd=document.getElementById('btnAddWall');if(btnAdd)btnAdd.addEventListener('click',()=>addWallRow());

    // Clear All button
    const btnClearAll=document.getElementById('btnClearAll');
    if(btnClearAll)btnClearAll.addEventListener('click',()=>{
      if(!confirm('Clear ALL figures? This cannot be undone.'))return;
      ['doorN','doorW','doorH','winN','winW','winH','otherOpen','price','delivered','used','remaining'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
      const mortEl=document.getElementById('mortar');if(mortEl)mortEl.value=10;
      const wastEl=document.getElementById('wastage');if(wastEl)wastEl.value=5;
      const wc=document.getElementById('wallsContainer');if(wc)wc.innerHTML='';
      addWallRow();addWallRow();addWallRow();addWallRow();
      const btEl=document.getElementById('blockType');if(btEl)btEl.value='1';
      onBlockTypeChange();
    });
    document.querySelectorAll('#page-tracker .tracker-table input').forEach(el=>{el.addEventListener('input',calcTracker);el.addEventListener('change',calcTracker);});
    document.querySelectorAll('.tab').forEach(t=>{t.addEventListener('click',()=>switchTab(t.dataset.tab));});
    initPlanTool();onBlockTypeChange();calcTracker();
    if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
    let deferredPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;const banner=document.getElementById('installBanner');if(banner)banner.classList.add('show');const installBtn=document.getElementById('installBtn');if(installBtn)installBtn.addEventListener('click',()=>{deferredPrompt.prompt();deferredPrompt.userChoice.then(()=>{deferredPrompt=null;banner.classList.remove('show');});});const closeBtn=document.getElementById('closeBanner');if(closeBtn)closeBtn.addEventListener('click',()=>banner.classList.remove('show'));});
  }

  document.addEventListener('DOMContentLoaded',init);
})();
