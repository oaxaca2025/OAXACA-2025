(function(){
  const $ = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
  /* Background on HTML for persistence */
  (function(){
    const BG='plannerBackground', MODE='plannerBgMode', POSX='plannerBgX', POSY='plannerBgY';
    const html=document.documentElement, menu=$('#plannerMenu'), btn=menu?.querySelector('.menu-btn'); const bgInput=$('#bgInput');
    const fitState=$('#plFitState'), moveState=$('#plMoveState');
    let moving=false, startX=0, startY=0, baseX=parseInt(localStorage.getItem(POSX)||'50'), baseY=parseInt(localStorage.getItem(POSY)||'50');
    function applyBg(){ const saved=localStorage.getItem(BG); if(saved) html.style.backgroundImage='url('+saved+')';
      const mode=localStorage.getItem(MODE)||'cover'; html.style.backgroundSize=mode; html.style.backgroundPosition=baseX+'% '+baseY+'%';
      if(fitState) fitState.textContent = mode==='cover'?'Riempie':'Contiene'; if(moveState) moveState.textContent = moving?'On':'Off'; }
    addEventListener('pageshow', applyBg); applyBg();
    if(btn){ btn.addEventListener('click', ()=>menu.classList.toggle('open')); document.addEventListener('click', e=>{ if(!menu.contains(e.target)) menu.classList.remove('open'); }); }
    $('#plUpload')?.addEventListener('click', ()=>bgInput?.click());
    bgInput?.addEventListener('change', e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader();
      r.onload=ev=>{ const img=ev.target.result; html.style.backgroundImage='url('+img+')'; localStorage.setItem(BG,img); }; r.readAsDataURL(f); bgInput.value=''; });
    $('#plFit')?.addEventListener('click', ()=>{ const cur=localStorage.getItem(MODE)||'cover'; const nxt=cur==='cover'?'contain':'cover'; localStorage.setItem(MODE,nxt); applyBg(); });
    $('#plMove')?.addEventListener('click', ()=>{ moving=!moving; applyBg(); });
    function onDown(e){ if(!moving) return; startX=e.clientX; startY=e.clientY; html.dataset.drag='1'; }
    function onMove(e){ if(!moving||!html.dataset.drag) return; const dx=e.clientX-startX, dy=e.clientY-startY;
      const nx=Math.max(0,Math.min(100, baseX+dx*0.1)); const ny=Math.max(0,Math.min(100, baseY+dy*0.1)); html.style.backgroundPosition=nx+'% '+ny+'%'; }
    function onUp(){ if(!moving) return; delete html.dataset.drag; const pos=getComputedStyle(html).backgroundPosition.split(' ');
      baseX=Math.round(parseFloat(pos[0])); baseY=Math.round(parseFloat(pos[1])); localStorage.setItem(POSX,baseX); localStorage.setItem(POSY,baseY); applyBg(); }
    html.addEventListener('mousedown', onDown); html.addEventListener('mousemove', onMove); html.addEventListener('mouseup', onUp); html.addEventListener('mouseleave', onUp);
    html.addEventListener('touchstart', e=>onDown(e.touches[0])); html.addEventListener('touchmove', e=>{onMove(e.touches[0]); e.preventDefault();},{passive:false}); html.addEventListener('touchend', onUp);
  })();

  /* Planner state + bullets + attachments */
  const STORE = 'planner_stable_v4b'; const SECTS = ['visit','stay','travel','notes'];
  const LABELS = { visit:'Luoghi da visitare', stay:'Alloggio', travel:'Voli / Spostamenti', notes:'Note' };
  function load(){ try{ return JSON.parse(localStorage.getItem(STORE)||'[]'); }catch{ return []; } }
  function save(v){ localStorage.setItem(STORE, JSON.stringify(v)); }
  function ensureState(){ let s=load(); if(s.length===0){ s.push(makeDay(new Date())); save(s);} return s; }
  function makeDay(date){ return { id: Date.now()+Math.random(), dateISO: date.toISOString().slice(0,10), html: {visit:'',stay:'',travel:'',notes:''} }; }
  function fdate(iso){ const d = new Date(iso+'T12:00:00'); const w = d.toLocaleDateString('it-IT',{weekday:'long'});
    const W = w ? (w.charAt(0).toUpperCase()+w.slice(1)) : ''; const dd = String(d.getDate()).padStart(2,'0'); const mm = String(d.getMonth()+1).padStart(2,'0'); const yy = String(d.getFullYear()).slice(-2);
    return `${W} ${dd}/${mm}/${yy}`.trim(); }
  let lastEditor = null;

  function render(){
    const state = ensureState(); const root = document.getElementById('planner'); root.innerHTML='';
    state.forEach((d,i)=>{
      const card=document.createElement('section'); card.className='day-card'; card.dataset.id=d.id;
      card.innerHTML=`
        <div class="toprow">
          <div class="left"><span class="date-label" role="button">${fdate(d.dateISO)}</span><input class="date-input" type="date" value="${d.dateISO}" style="display:none"></div>
          <div class="dayno">Giorno ${i+1}</div>
        </div>
        <div class="grid">
          ${SECTS.map(k=>`<div class="sect ${k}"><h4>${LABELS[k]}</h4><div class="editor" contenteditable="true" data-key="${k}"></div></div>`).join('')}
        </div>
        <div class="bottom"><button class="btn attach">📎 Allegati</button><button class="btn dup">Duplica</button><button class="btn del">Elimina</button></div>`;
      root.appendChild(card);

      SECTS.forEach(key=>{
        const ed=card.querySelector('.editor[data-key="'+key+'"]'); const saved=d.html[key];
        ed.innerHTML = (saved && saved.trim()) ? saved : '<ul class="list"><li>\u200B</li></ul>';
        hydrateInlineFiles(ed);
        ed.addEventListener('focus', ()=>{ lastEditor=ed; ensureList(ed); });
        ed.addEventListener('keydown', e=>{
          if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); insertNewLiWithCursor(ed); persist(); }
          else if(e.key==='Enter' && e.shiftKey){ e.preventDefault(); insertBrInCurrentLi(ed); persist(); }
        });
        ed.addEventListener('input', persist);
      });
      function persist(){ const s=load(); const day=s.find(x=>x.id===d.id); SECTS.forEach(k=>{ day.html[k] = card.querySelector('.editor[data-key="'+k+'"]').innerHTML; }); save(s); }
      const lbl=card.querySelector('.date-label'), inp=card.querySelector('.date-input');
      lbl.onclick=()=>{ lbl.style.display='none'; inp.style.display='inline-block'; inp.focus(); };
      inp.onblur=()=>{ const s=load(); const day=s.find(x=>x.id===d.id); day.dateISO=inp.value||day.dateISO; save(s); lbl.textContent=fdate(day.dateISO); lbl.style.display='inline'; inp.style.display='none'; };
      card.querySelector('.attach').onclick=()=>{
        const target = lastEditor || card.querySelector('.editor[data-key="visit"]');
        const input=document.createElement('input'); input.type='file'; input.accept='image/*,.pdf';
        input.onchange=async ()=>{
          const f=input.files[0]; if(!f||!target) return;
          const dbKey=`d${d.id}-${Date.now()}-${f.name}-${f.size}`;
          let stored=true; try{ await window.AttachmentsDB.put(dbKey, f); }catch(e){ stored=false; }
          const type=f.type||''; const isImg = type.startsWith('image/');
          if(isImg){ const img=document.createElement('img'); img.className='inline-thumb'; img.alt=f.name;
            if(stored){ img.dataset.dbkey=dbKey; img.dataset.type=type; } else { img.src=URL.createObjectURL(f); img.onclick=()=>window.InlineViewer?.open(img.src,type); }
            insertNodeInCurrentLi(target, img);
          } else { const a=document.createElement('a'); a.className='inline-file'; a.href='#'; a.textContent=f.name;
            if(stored){ a.dataset.dbkey=dbKey; a.dataset.type=type||'application/pdf'; } else { const url=URL.createObjectURL(f); a.onclick=(e)=>{e.preventDefault(); window.InlineViewer?.open(url,type||'application/pdf');}; }
            insertNodeInCurrentLi(target,a);
          }
          hydrateInlineFiles(target); persist(); input.value='';
        }; input.click();
      };
      card.querySelector('.dup').onclick=()=>{ const s=load(); const idx=s.findIndex(x=>x.id===d.id); const copy=JSON.parse(JSON.stringify(d)); copy.id=Date.now()+Math.random(); s.splice(idx+1,0,copy); save(s); render(); };
      card.querySelector('.del').onclick=()=>{ const s=load().filter(x=>x.id!==d.id); save(s); render(); };
    });
    document.getElementById('btnAdd').onclick=()=>{ const s=load(); const last=s[s.length-1]; const base=new Date((last?.dateISO||new Date().toISOString().slice(0,10))+'T12:00:00'); base.setDate(base.getDate()+1); s.push(makeDay(base)); save(s); render(); };
  }

  async function hydrateInlineFiles(container){
    const nodes = $$('[data-dbkey]', container);
    for(const el of nodes){
      if(el.dataset.hydrated) continue;
      const key=el.dataset.dbkey, type=el.dataset.type||'';
      try{ const blob = await window.AttachmentsDB.get(key); if(!blob) continue; const url=URL.createObjectURL(blob);
        if(el.tagName==='IMG'){ el.src=url; el.onclick=()=>window.InlineViewer?.open(url,type); }
        else { el.onclick=(e)=>{ e.preventDefault(); window.InlineViewer?.open(url,type||'application/pdf'); }; }
        el.dataset.hydrated='1';
      }catch(e){}
    }
  }
  function ensureList(ed){ if(!ed.querySelector('ul')){ ed.innerHTML='<ul class="list"><li>\u200B</li></ul>'; placeCaretIntoFirstLi(ed); } }
  function placeCaretIntoFirstLi(ed){ const li=ed.querySelector('li')||(()=>{ const ul=document.createElement('ul'); ul.className='list'; const li=document.createElement('li'); li.appendChild(document.createTextNode('\u200B')); ul.appendChild(li); ed.appendChild(ul); return li; })(); placeCaretAtEnd(li); }
  function insertNewLiWithCursor(ed){ const cur=getCurrentLi(ed)||placeNewLiIfNeeded(ed); const ul=cur.parentNode; const li=document.createElement('li'); li.appendChild(document.createTextNode('\u200B')); if(cur.nextSibling) ul.insertBefore(li,cur.nextSibling); else ul.appendChild(li); placeCaretAtEnd(li); }
  function insertBrInCurrentLi(ed){ const li=getCurrentLi(ed)||placeNewLiIfNeeded(ed); li.appendChild(document.createElement('br')); placeCaretAtEnd(li); }
  function insertNodeInCurrentLi(ed,node){ const li=getCurrentLi(ed)||placeNewLiIfNeeded(ed); li.appendChild(node); placeCaretAfter(node); }
  function placeNewLiIfNeeded(ed){ let ul=ed.querySelector('ul'); if(!ul){ ul=document.createElement('ul'); ul.className='list'; ed.appendChild(ul); } const li=document.createElement('li'); li.appendChild(document.createTextNode('\u200B')); ul.appendChild(li); return li; }
  function getCurrentLi(ed){ const sel=window.getSelection(); if(!sel||!sel.rangeCount) return null; let node=sel.anchorNode; while(node && node!==ed){ if(node.nodeName==='LI') return node; node=node.parentNode; } return null; }
  function placeCaretAtEnd(node){ const sel=window.getSelection(); const range=document.createRange(); range.selectNodeContents(node); range.collapse(false); sel.removeAllRanges(); sel.addRange(range); }
  function placeCaretAfter(node){ const sel=window.getSelection(); const range=document.createRange(); range.setStartAfter(node); range.collapse(true); sel.removeAllRanges(); sel.addRange(range); }
  document.addEventListener('DOMContentLoaded', render);
})();