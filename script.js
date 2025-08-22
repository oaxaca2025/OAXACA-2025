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
  const STORE = 'planner_bullets_v1';
  const SECTS = ['visit','stay','travel','notes'];
  const LABELS = { visit:'Luoghi da visitare', stay:'Alloggio', travel:'Voli / Spostamenti', notes:'Note' };
  function load(){ try{ return JSON.parse(localStorage.getItem(STORE)||'[]'); }catch{ return []; } }
  function save(v){ localStorage.setItem(STORE, JSON.stringify(v)); }

  function ensureState(){ let s=load(); if(s.length===0){ s.push(makeDay(new Date())); save(s);} return s; }
  function makeDay(date){ return { id: Date.now()+Math.random(), dateISO: date.toISOString().slice(0,10), html: {visit:'',stay:'',travel:'',notes:''} }; }
  function fdate(iso){
    const d = new Date(iso+'T12:00:00');
    const w = d.toLocaleDateString('it-IT',{weekday:'long'});
    const W = w.charAt(0).toUpperCase()+w.slice(1);
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yy = d.getFullYear();
    return `${W} ${dd}/${mm}/${yy}`;
  }

  let lastEditor = null;

  function render(){
    const state = ensureState();
    root.innerHTML='';
    state.forEach((d,i)=>{
      const card=document.createElement('section'); card.className='day-card'; card.dataset.id=d.id;
      card.innerHTML=`
        <div class="toprow">
          <div class="left">
            <span class="date-label" role="button" title="Clicca per modificare la data">${fdate(d.dateISO)}</span>
            <input class="date-input" type="date" value="${d.dateISO}" style="display:none">
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

      // hydrate editors as UL>LI
      SECTS.forEach(key=>{
        const ed=$('.editor[data-key="'+key+'"]', card);
        const saved = d.html[key];
        if(saved){ ed.innerHTML = saved; }
        else{ ed.innerHTML = '<ul class="list"><li><br></li></ul>'; }
        ed.addEventListener('focus', ()=>{ lastEditor = ed; });
        ed.addEventListener('keydown', (e)=>{
          if(e.key==='Enter' && !e.shiftKey){
            e.preventDefault();
            insertNewLi(ed);
            persist();
          }else if(e.key==='Enter' && e.shiftKey){
            e.preventDefault();
            insertBr(ed);
            persist();
          }
        });
        ed.addEventListener('input', persist);
      });

      function persist(){ const s=load(); const day=s.find(x=>x.id===d.id); SECTS.forEach(k=>{ day.html[k] = $('.editor[data-key="'+k+'"]', card).innerHTML; }); save(s); }

      // Date toggle behavior
      const lbl=$('.date-label',card), inp=$('.date-input',card);
      lbl.addEventListener('click', ()=>{ lbl.style.display='none'; inp.style.display='inline-block'; inp.focus(); });
      inp.addEventListener('blur', ()=>{ const s=load(); const day=s.find(x=>x.id===d.id); day.dateISO = inp.value || day.dateISO; save(s);
        lbl.textContent = fdate(day.dateISO); lbl.style.display='inline'; inp.style.display='none';
      });

      // Attachments -> insert at caret in last focused editor
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

      // Dup/Del
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

  /* ===== List helpers ===== */
  function getCurrentLi(ed){
    const sel=window.getSelection();
    if(!sel || !sel.rangeCount) return null;
    let node=sel.anchorNode;
    while(node && node !== ed){
      if(node.nodeName==='LI') return node;
      node = node.parentNode;
    }
    // if outside list, ensure one
    let ul = ed.querySelector('ul'); if(!ul){ ul=document.createElement('ul'); ul.className='list'; ed.appendChild(ul); }
    const li = document.createElement('li'); li.appendChild(document.createElement('br')); ul.appendChild(li);
    placeCaretAt(li, 0);
    return li;
  }
  function insertNewLi(ed){
    const cur = getCurrentLi(ed);
    const ul = cur.parentNode;
    const li = document.createElement('li'); li.appendChild(document.createElement('br'));
    ul.insertBefore(li, cur.nextSibling);
    placeCaretAt(li, 0); // caret inside new bullet ready to type
  }
  function insertBr(ed){
    const sel=window.getSelection(); if(!sel) return;
    const range=sel.getRangeAt(0);
    const br=document.createElement('br');
    range.insertNode(br);
    range.setStartAfter(br); range.setEndAfter(br);
    sel.removeAllRanges(); sel.addRange(range);
  }
  function placeCaretAt(node, offset){
    const sel=window.getSelection(); const range=document.createRange();
    range.setStart(node, offset); range.collapse(true);
    sel.removeAllRanges(); sel.addRange(range);
  }
  function insertNodeAtCaret(ed, node){
    const sel=window.getSelection(); const range=(sel && sel.rangeCount)? sel.getRangeAt(0) : null;
    if(range && ed.contains(range.startContainer)){ range.collapse(false); range.insertNode(node); range.setStartAfter(node); range.setEndAfter(node); sel.removeAllRanges(); sel.addRange(range); }
    else{ // if no selection, append into current li or create one
      const cur = getCurrentLi(ed); cur.appendChild(node); placeCaretAt(cur, cur.childNodes.length);
    }
  }

  document.addEventListener('DOMContentLoaded', render);
})(); 
