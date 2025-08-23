(function(){
  const el = (id)=>document.getElementById(id);
  const viewer = el('viewer'); const content = el('viewerContent');
  const btnClose = el('viewerClose'); const btnFit = el('vtFit');
  const btnIn = el('vtZoomIn'); const btnOut = el('vtZoomOut'); const btnRot = el('vtRotate');
  const btnNew = el('vtNewTab'); const aDl = el('vtDownload');
  let scale = 1, rot = 0, currentSrc = null, currentType = '';
  function show(src, mime){
    content.innerHTML = ''; currentSrc = src; currentType = mime || ''; aDl.href = src;
    if(mime && mime.includes('pdf')){ const iframe = document.createElement('iframe'); iframe.src = src; content.appendChild(iframe); }
    else{ const img = document.createElement('img'); img.src = src; img.alt = 'Allegato'; content.appendChild(img); }
    scale = 1; rot = 0; apply(); viewer.classList.add('show'); viewer.setAttribute('aria-hidden','false');
  }
  function hide(){ viewer.classList.remove('show'); viewer.setAttribute('aria-hidden','true'); content.innerHTML=''; }
  function apply(){ const node = content.firstElementChild; if(!node) return; node.style.transform = `scale(${scale}) rotate(${rot}deg)`; }
  btnFit.addEventListener('click',()=>{ scale = 1; rot = 0; apply(); });
  btnIn.addEventListener('click',()=>{ scale = Math.min(5, scale + 0.15); apply(); });
  btnOut.addEventListener('click',()=>{ scale = Math.max(0.2, scale - 0.15); apply(); });
  btnRot.addEventListener('click',()=>{ rot = (rot + 90) % 360; apply(); });
  btnNew.addEventListener('click',()=>{ if(currentSrc) window.open(currentSrc,'_blank'); });
  btnClose.addEventListener('click', hide);
  viewer.addEventListener('click', (e)=>{ if(e.target === viewer) hide(); });
  window.InlineViewer = { open: show, close: hide };
})();