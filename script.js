(function(){
  const $ = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
  const root = $('#planner');

  /* ===== SFONDO ===== */
  (function(){
    const BG='plannerBackground', MODE='plannerBgMode', POSX='plannerBgX', POSY='plannerBgY';
    const body=document.body, menu=$('#plannerMenu');
    const btn=menu?.querySelector('.menu-btn'); const bgInput=$('#bgInput');
    const fitState=$('#plFitState'), moveState=$('#plMoveState');
    let moving=false, startX=0, startY=0, baseX=parseInt(localStorage.getItem(POSX)||'50'), baseY=parseInt(localStorage.getItem(POSY)||'50');
    function applyBg(){
      const saved=localStorage.getItem(BG); if(saved) body.style.backgroundImage='url('+saved+')';
      const mode=localStorage.getItem(MODE)||'cover'; body.style.backgroundSize=mode; body.style.backgroundPosition=baseX+'% '+baseY+'%';
      if(fitState) fitState.textContent = mode==='cover'?'Riempie':'Contiene';
      if(moveState) moveState.textContent = moving?'On':'Off';
    }
    applyBg();
    if(btn){ btn.addEventListener('click', ()=>menu.classList.toggle('open')); document.addEventListener('click', e=>{ if(!menu.contains(e.target)) menu.classList.remove('open'); }); }
    $('#plUpload')?.addEventListener('click', ()=>bgInput?.click());
    bgInput?.addEventListener('change', e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader();
      r.onload=ev=>{ const img=ev.target.result; body.style.backgroundImage='url('+img+')'; localStorage.setItem(BG,img); }; r.readAsDataURL(f); });
    $('#plFit')?.addEventListener('click', ()=>{ const cur=localStorage.getItem(MODE)||'cover'; const nxt=cur==='cover'?'contain':'cover'; localStorage.setItem(MODE,nxt); applyBg(); });
    $('#plMove')?.addEventListener('click', ()=>{ moving=!moving; applyBg(); });
    function onDown(e){ if(!moving) return; startX=e.clientX; startY=e.clientY; body.dataset.drag='1'; }
    function onMove(e){ if(!moving||!body.dataset.drag) return; const dx=e.clientX-startX, dy=e.clientY-startY;
      const nx=Math.max(0,Math.min(100, baseX+dx*0.1)); const ny=Math.max(0,Math.min(100, baseY+dy*0.1)); body.style.backgroundPosition=nx+'% '+ny+'%'; }
    function onUp(){ if(!moving) return; delete body.dataset.drag; const pos=getComputedStyle(body).backgroundPosition.split(' ');
      baseX=Math.round(parseFloat(pos[0])); baseY=Math.round(parseFloat(pos[1])); localStorage.setItem(POSX,baseX); localStorage.setItem(POSY,baseY); applyBg(); }
    body.addEventListener('mousedown', onDown); body.addEventListener('mousemove', onMove); body.addEventListener('mouseup', onUp); body.addEventListener('mouseleave', onUp);
    body.addEventListener('touchstart', e=>onDown(e.touches[0])); body.addEventListener('touchmove', e=>{onMove(e.touches[0]); e.preventDefault();},{passive:false}); body.addEventListener('touchend', onUp);
  })();

  /* ===== STATO ===== */
  const STORE = 'planner_final_inline';
  const SECTS = ['visit','stay','travel','notes'];
  const LABELS = { visit:'Luoghi da visitare', stay:'Alloggio', travel:'Voli / Spostamenti', notes:'Note' };
  function load(){ try{ return JSON.parse(localStorage.getItem(STORE)||'[]'); }catch{ return []; } }
  function save(v){ localStorage.setItem(STORE, JSON.stringify(v)); }

  function ensureState(){ let s=load(); if(s.length===0){ s.push(makeDay(new Date())); save(s);} return s; }
  function makeDay(date){ return { id: Date.now()+Math.random(), dateISO: date.toISOString().slice(0,10), html: {visit:'',stay:'',travel:'',notes:''} }; }
  function fdate(iso){ const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; }

  let lastEditor = null;

  function render(){
    const state = ensureState();
    root.innerHTML='';
    state.forEach((d,i)=>{
      const card=document.createElement('section'); card.className='day-card'; card.dataset.id=d.id;
      card.innerHTML=`
        <div class="toprow">
          <div class="pill">
            <span class="pill-date" role="button" title="Clicca per modificare la data">${fdate(d.dateISO)}</span>
            <input class="pill-edit" type="date" value="${d.dateISO}">
          </div>
          <div class="dayno">Giorno ${i+1}</div>
        </div>
        <div class="grid">
          ${SECTS.map(k=>`
            <div class="sect ${k}">
              <h4>${LABELS[k]}</h4>
              <div class="editor" contenteditable="true" data-key="${k}"></div>
            </div>
          `).join('')}
        </div>
        <div class="bottom">
          <button class="btn attach">📎 Allegati</button>
          <button class="btn dup">Duplica</button>
          <button class="btn del">Elimina</button>
        </div>`;
      root.appendChild(card);

      // hydrate editors
      SECTS.forEach(key=>{
        const ed=$('.editor[data-key="'+key+'"]', card);
        ed.innerHTML = d.html[key] || lineHTML(''); // at least one bullet line
        ed.addEventListener('focus', ()=>{ lastEditor = ed; });
        ed.addEventListener('keydown', (e)=>{
          if(e.key==='Enter' && !e.shiftKey){
            e.preventDefault(); insertBulletAtCaret(ed); persist();
          } // Shift+Enter = plain <br> (no handler)
        });
        ed.addEventListener('input', persist);
      });
      function persist(){ const s=load(); const day=s.find(x=>x.id===d.id); SECTS.forEach(k=>{ day.html[k] = $('.editor[data-key="'+k+'"]', card).innerHTML; }); save(s); }

      // date toggle
      const pill=card.querySelector('.pill'); const v=$('.pill-date',pill); const inp=$('.pill-edit',pill);
      v.addEventListener('click', ()=>{ pill.classList.add('editing'); inp.style.display='inline-block'; inp.focus(); });
      inp.addEventListener('blur', ()=>{ const s=load(); const day=s.find(x=>x.id===d.id); day.dateISO = inp.value || day.dateISO; save(s); pill.classList.remove('editing'); inp.style.display='none'; v.textContent=fdate(day.dateISO); });

      // ONE clip per day: inserts into last focused editor
      $('.attach', card).addEventListener('click', ()=>{
        const target = lastEditor || $('.editor[data-key="visit"]',card);
        const input=document.createElement('input'); input.type='file'; input.accept='image/*,.pdf';
        input.onchange = async ()=>{
          const f=input.files[0]; if(!f || !target) return;
          const dbKey = `d${d.id}-${Date.now()}-${f.name}-${f.size}`;
          if(window.AttachmentsDB){ await window.AttachmentsDB.put(dbKey, f); }
          const url = URL.createObjectURL(f);
          if(f.type && f.type.startsWith('image/')){
            const img=document.createElement('img'); img.src=url; img.alt=f.name; img.className='inline-thumb'; img.dataset.dbkey=dbKey;
            img.addEventListener('click',()=>{ if(window.InlineViewer){ window.InlineViewer.open(url, f.type); }else{ window.open(url,'_blank'); } });
            insertNodeAtCaret(target, img);
          }else{
            const a=document.createElement('a'); a.href='#'; a.textContent=f.name; a.className='inline-file'; a.dataset.dbkey=dbKey;
            a.addEventListener('click', (e)=>{ e.preventDefault(); if(window.InlineViewer){ window.InlineViewer.open(url, f.type||'application/pdf'); }else{ window.open(url,'_blank'); } });
            insertNodeAtCaret(target, a);
          }
          persist();
        };
        input.click();
      });

      // dup/del
      $('.dup', card).addEventListener('click', ()=>{ const s=load(); const idx=s.findIndex(x=>x.id===d.id);
        const copy=JSON.parse(JSON.stringify(d)); copy.id=Date.now()+Math.random(); s.splice(idx+1,0,copy); save(s); render(); });
      $('.del', card).addEventListener('click', ()=>{ const s=load().filter(x=>x.id!==d.id); save(s); render(); });
    });

    // top add
    $('#btnAdd').onclick = ()=>{
      const s=load(); const last=s[s.length-1]; const base=new Date((last?.dateISO||new Date().toISOString().slice(0,10))+'T12:00:00'); base.setDate(base.getDate()+1);
      s.push(makeDay(base)); save(s); render();
    };
  }

  function lineHTML(text){ const safe=String(text||'').replace(/&/g,'&amp;').replace(/</g,'&lt;'); return `<div class="line">${safe}</div>`; }
  function insertBulletAtCaret(ed){
    const sel=window.getSelection(); const range=(sel && sel.rangeCount)? sel.getRangeAt(0) : null;
    const node = htmlToNode(lineHTML(''));
    if(range && ed.contains(range.startContainer)){ range.collapse(false); range.insertNode(node); range.setStartAfter(node); range.setEndAfter(node); sel.removeAllRanges(); sel.addRange(range); }
    else{ ed.appendChild(node); placeCaretAfter(node); }
  }
  function insertNodeAtCaret(ed, node){
    const sel=window.getSelection(); const range=(sel && sel.rangeCount)? sel.getRangeAt(0) : null;
    if(range && ed.contains(range.startContainer)){ range.collapse(false); range.insertNode(node); range.setStartAfter(node); range.setEndAfter(node); sel.removeAllRanges(); sel.addRange(range); }
    else{ ed.appendChild(node); placeCaretAfter(node); }
  }
  function htmlToNode(html){ const tmp=document.createElement('div'); tmp.innerHTML=html.trim(); return tmp.firstChild; }
  function placeCaretAfter(node){ const sel=window.getSelection(); const range=document.createRange(); range.setStartAfter(node); range.collapse(true); sel.removeAllRanges(); sel.addRange(range); }

  document.addEventListener('DOMContentLoaded', render);
})();