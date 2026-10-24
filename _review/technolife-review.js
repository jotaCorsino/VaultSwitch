/* Technolife — Modo Revisão reutilizável · m0.3 (somente preview). */
(() => {
  'use strict';
  const script = document.currentScript;
  if (!script) return;
  const PROJECT = (script.dataset.project || '').trim();
  const REVISION = (script.dataset.revision || '').trim();
  const MODULE_VERSION = 'm0.3';
  const SCHEMA_VERSION = '1.0';
  // Relatório consolidado, mas cada anotação pertence a uma página identificada.
  // Em file://, omitir diretórios locais da identidade da página no JSON.
  const PAGE = window.location.protocol === 'file:'
    ? '/index.html'
    : window.location.pathname.replace(/\/$/, '/index.html');
  if (!PROJECT || !REVISION) {
    console.error('Modo Revisão: data-project e data-revision são obrigatórios.');
    return;
  }

  function initialize() {
    if (document.getElementById('tl-review-root')) {
      console.warn('Modo Revisão: módulo já inicializado nesta página.');
      return;
    }
    const root = document.createElement('div');
    root.id = 'tl-review-root';
    root.dataset.revUi = '';
    // Interface fixa e confiável. Dados de projeto/comentários entram apenas via textContent.
    root.innerHTML = `
<button class="tl-review-toggle" id="tl-toggle" data-rev-ui aria-controls="tl-panel" aria-expanded="false">✎ &nbsp; Ativar modo de revisão</button>
<button class="tl-review-comments-shortcut" type="button" id="tl-view-comments" data-rev-ui hidden>Ver comentários</button>
  <div class="tl-review-tip" id="tl-tip" data-rev-ui role="status" aria-live="polite" hidden>
    <span class="tl-tip-main">✎ Clique em qualquer ponto da página para comentar</span>
    <span class="tl-tip-exit"><kbd>Esc</kbd> Sair do modo revisão</span>
  </div>
  <div class="tl-pointer-hint" id="tl-pointer-hint" data-rev-ui hidden>✎ Comentar aqui</div>
  <aside class="tl-review-panel" id="tl-panel" data-rev-ui aria-label="Ferramenta de revisão visual">
    <div class="tl-panel-head"><strong>Revisão visual · VaultSwitch</strong><small id="tl-revision-label"></small><button type="button" id="tl-back-to-site">Voltar ao site</button></div>
    <div class="tl-panel-body">
      <p class="tl-helper">Clique na parte do site que você gostaria de comentar. Seus comentários ficam neste navegador até você baixar a revisão.</p>
      <div class="tl-editor" id="tl-editor" hidden>
        <label for="tl-comment">O que você gostaria de mudar aqui?</label>
        <div class="tl-editor-context" id="tl-context"></div>
        <button type="button" id="tl-widen" hidden>Comentar esta seção inteira</button>
        <textarea id="tl-comment" maxlength="2000" placeholder="Ex.: aumentar esse título e reduzir o espaço abaixo."></textarea>
        <div class="tl-actions"><button class="primary" id="tl-save">Salvar comentário</button><button id="tl-cancel">Cancelar</button></div>
      </div>
      <div class="tl-quick-actions" aria-label="Outras formas de comentar">
        <button type="button" id="tl-page-comment">Comentar sobre esta página</button>
        <button type="button" id="tl-site-comment">Comentar sobre todo o site</button>
      </div>
      <strong id="tl-count">Comentários (0)</strong>
      <div id="tl-list"></div>
    </div>
    <div class="tl-panel-foot"><div class="tl-actions"><button class="primary" id="tl-export">⬇ Baixar Revisão</button><button id="tl-copy">Copiar relatório</button><button class="danger" id="tl-clear">Limpar</button></div><div id="tl-status" role="status" aria-live="polite"></div></div>
  </aside>
    `;
    document.body.appendChild(root);
    const outline = document.createElement('div');
    outline.className = 'tl-review-outline';
    outline.dataset.revUi = '';
    outline.hidden = true;
    root.appendChild(outline);
    document.getElementById('tl-revision-label').textContent = `${PROJECT} · ${REVISION}`;

      const STORAGE_KEY = `technolife:review:${PROJECT}:${REVISION}`;
      const byId = id => document.getElementById(id);
      const panel = byId('tl-panel');
      const toggle = byId('tl-toggle');
      const tip = byId('tl-tip');
      const pointerHint = byId('tl-pointer-hint');
      const editor = byId('tl-editor');
      const input = byId('tl-comment');
      const list = byId('tl-list');
      const status = byId('tl-status');
      let active = false;
      let draft = null;
      let editingId = null;
      let selectedElement = null;
      let notes = [];

      function restore() {
        try {
          const loaded = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
          if (Array.isArray(loaded)) notes = loaded.filter(n => n && Number.isInteger(n.id) && typeof n.selector === 'string' && typeof n.note === 'string').slice(0, 200);
        } catch (_) { notes = []; }
      }
      function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); } catch (_) { showStatus('O navegador não permitiu salvar localmente. Exporte o JSON.'); } }
      function showStatus(message) { status.textContent = message; }
      // O seletor estrutural é uma alternativa; IDs repetidos não são âncoras estáveis.
      function isUnique(selector, element) {
        try {
          const matches = document.querySelectorAll(selector);
          return matches.length === 1 && matches[0] === element;
        } catch (_) { return false; }
      }
      function structuralSelector(element) {
        const parts = [];
        for (let node = element; node && node.nodeType === 1 && node !== document.documentElement; node = node.parentElement) {
          let part = node.tagName.toLowerCase();
          const siblings = node.parentElement ? Array.from(node.parentElement.children).filter(x => x.tagName === node.tagName) : [];
          if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
          parts.unshift(part);
        }
        return parts.join(' > ');
      }
      function stableSelector(element) {
        if (element.dataset?.reviewTarget) {
          const value = element.dataset.reviewTarget.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          const selector = `[data-review-target="${value}"]`;
          if (isUnique(selector, element)) return selector;
        }
        if (element.id) {
          const selector = `#${CSS.escape(element.id)}`;
          if (isUnique(selector, element)) return selector;
        }
        return null;
      }
      function uniqueSelector(element) { return stableSelector(element) || structuralSelector(element); }
      function findElement(selector) {
        if (!selector) return null;
        try {
          if (document.querySelectorAll(selector).length !== 1) return null;
          return document.querySelector(selector);
        } catch (_) { return null; }
      }
      function context(element) {
        // Não exportar dados de campos editáveis ou formulários.
        if (element.matches?.('input, textarea, select, [contenteditable]') ||
            element.closest?.('form, [contenteditable]') ||
            element.querySelector?.('input, textarea, select, [contenteditable]')) {
          return 'Área com formulário ou conteúdo editável';
        }
        return (element.innerText || element.alt || element.getAttribute?.('aria-label') || element.tagName)
          .trim().replace(/\s+/g, ' ').slice(0, 110);
      }
      function anchorFor(element) {
        return {
          primarySelector: stableSelector(element),
          fallbackSelector: structuralSelector(element),
          tag: element.tagName.toLowerCase(),
          context: context(element)
        };
      }
      function draftForElement(element, event = null, scope = 'element') {
        const rect = element.getBoundingClientRect();
        return {
          page: PAGE, selector: uniqueSelector(element), text: context(element),
          rx: event ? Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(rect.width, 1))) : .5,
          ry: event ? Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(rect.height, 1))) : .5,
          viewport: { width: innerWidth, height: innerHeight },
          scope, anchor: anchorFor(element)
        };
      }
      function generalDraft(scope) {
        return {
          page: PAGE, selector: '', text: scope === 'site' ? 'Comentário geral sobre todo o site' : 'Comentário geral sobre esta página',
          rx: 0, ry: 0, viewport: { width: innerWidth, height: innerHeight },
          scope, anchor: null
        };
      }
      function hidePointerHint() { pointerHint.hidden = true; }
      function hideOutline() { outline.hidden = true; }
      function resolveTarget(el) {
        if (!el?.closest || el.closest('[data-rev-ui]')) return null;
        if (el.closest('input, textarea, select, [contenteditable]')) return null;
        return el.closest('[data-review-target]')
          || el.closest('a, button, input, textarea, select, label, h1, h2, h3, h4, h5, h6, p, li, img, article, section, nav, header, footer, main, div')
          || el;
      }
      function showOutline(target) {
        if (!target || target === document.body || target === document.documentElement) { hideOutline(); return; }
        const r = target.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) { hideOutline(); return; }
        outline.style.left = `${r.left}px`;
        outline.style.top = `${r.top}px`;
        outline.style.width = `${r.width}px`;
        outline.style.height = `${r.height}px`;
        outline.hidden = false;
      }
      function compactView() { return window.innerWidth <= 780 || (typeof innerWidth !== 'undefined' && innerWidth <= 780); }
      function refreshPanelControls() {
        byId('tl-view-comments').hidden = !(active && compactView() && !panel.classList.contains('open'));
        byId('tl-back-to-site').hidden = !compactView();
        toggle.setAttribute('aria-expanded', String(panel.classList.contains('open')));
      }
      function setActive(on) {
        active = on;
        document.body.classList.toggle('tl-review-active', on);
        if (on && compactView()) panel.classList.remove('open');
        else panel.classList.add('open');
        toggle.textContent = on ? '✓ Encerrar modo de revisão' : '✎ Ativar modo de revisão';
        tip.hidden = !on;
        if (!on) { hidePointerHint(); hideOutline(); }
        refreshPanelControls();
      }
      function closeEditor() {
        draft = null; editingId = null; selectedElement = null; editor.hidden = true; input.value = '';
      }
      function openEditor(data, id = null, element = null) {
        draft = data; editingId = id;
        selectedElement = element || findElement(data.selector);
        panel.classList.add('open');
        refreshPanelControls();
        editor.hidden = false;
        const scope = data.scope || 'element';
        byId('tl-context').textContent =
          scope === 'site' ? 'Comentário sobre todo o site' :
          scope === 'page' ? 'Comentário sobre esta página' :
          scope === 'section' ? 'Comentário sobre esta seção' :
          'Comentário sobre esta parte da página';
        const section = selectedElement?.closest?.('section');
        byId('tl-widen').hidden = id !== null || !section || section === selectedElement ||
          scope === 'page' || scope === 'site' || scope === 'section';
        input.value = id === null ? '' : (notes.find(n => n.id === id)?.note || '');
        input.focus();
      }
      function renderPins() {
        document.querySelectorAll('.tl-pin').forEach(x => x.remove());
        for (const n of notes) {
          if (n.page !== PAGE || !n.selector || n.scope === 'page' || n.scope === 'site') continue;
          const el = findElement(n.selector);
          if (!el) continue;
          const r = el.getBoundingClientRect();
          const pin = document.createElement('button');
          pin.type = 'button'; pin.className = 'tl-pin'; pin.dataset.revUi = '';
          pin.textContent = String(n.id); pin.title = `Comentário ${n.id}: ${n.note}`;
          pin.style.left = `${window.scrollX + r.left + r.width * (Number.isFinite(n.rx) ? n.rx : .5)}px`;
          pin.style.top = `${window.scrollY + r.top + r.height * (Number.isFinite(n.ry) ? n.ry : .5)}px`;
          pin.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); panel.classList.add('open'); openEditor(n, n.id); });
          document.body.appendChild(pin);
        }
      }
      function makeButton(text, callback, danger = false) {
        const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = text;
        if (danger) btn.className = 'danger'; btn.addEventListener('click', callback); return btn;
      }
      function render() {
        byId('tl-count').textContent = `Comentários (${notes.length})`;
        list.replaceChildren();
        if (!notes.length) { const p = document.createElement('p'); p.className = 'tl-empty'; p.textContent = 'Nenhum comentário ainda. Ative a revisão e clique no site.'; list.appendChild(p); }
        for (const n of notes) {
          // Comentários gerais são exibidos só na página onde foram registrados.
          if ((n.scope === 'page' || n.scope === 'site') && n.page !== PAGE) continue;
          const card = document.createElement('div'); card.className = 'tl-note';
          const title = document.createElement('strong'); title.textContent = `#${n.id} · ${n.text || 'Parte do site'}`;
          const meta = document.createElement('div'); meta.className='tl-meta'; meta.textContent=n.page || 'Página não identificada (comentário antigo)';
          const body = document.createElement('p'); body.textContent=n.note;
          const actions = document.createElement('div'); actions.className='tl-actions';
          actions.append(makeButton('Editar', () => openEditor(n,n.id)), makeButton('Excluir', () => {notes=notes.filter(x=>x.id!==n.id);persist();render();showStatus(`Comentário ${n.id} removido.`);}, true));
          card.append(title,meta,body,actions); list.appendChild(card);
        }
        renderPins();
      }
      function report() { return {schemaVersion:SCHEMA_VERSION,moduleVersion:MODULE_VERSION,project:PROJECT,revision:REVISION,exportedFrom:PAGE,exportedAt:new Date().toISOString(),viewport:{width:innerWidth,height:innerHeight},comments:notes.map(n=>({...n}))}; }
      function download() {
        const data=JSON.stringify(report(),null,2), blob=new Blob([data],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
        a.href=url;a.download=`revisao-${PROJECT.toLowerCase()}-${REVISION}.json`;
        // O clique programático do download nunca pode virar um comentário da revisão.
        a.dataset.revUi='';
        try {
          document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
          showStatus('Sua revisão foi baixada. Agora, envie o arquivo à nossa equipe.');
        } catch (_) {
          a.remove();URL.revokeObjectURL(url);
          showStatus('Não foi possível baixar a revisão. Tente novamente.');
        }
      }
      async function copy() {
        const lines = [`PROJETO: ${PROJECT}`,`REVISÃO: ${REVISION}`,`EXPORTADO DE: ${PAGE}`,`VIEWPORT: ${innerWidth}x${innerHeight}`,...notes.map(n=>`#${n.id} — ${n.page || 'Página não identificada (legado)'} — ${n.selector}\nElemento: ${n.text}\nPosição no elemento: ${Math.round(n.rx*100)}% horizontal, ${Math.round(n.ry*100)}% vertical\nAlterar: ${n.note}`)];
        const plain=lines.join('\n\n');
        try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(plain); } else throw Error('Clipboard API indisponível'); showStatus('Relatório copiado. Cole no chat.'); }
        catch (_) {
          const temp=document.createElement('textarea');temp.value=plain;temp.style.position='fixed';temp.style.opacity='0';document.body.appendChild(temp);temp.select();
          let success=false;try { success=document.execCommand('copy'); } catch (_) { /* Sem permissão de cópia. */ }
          temp.remove();showStatus(success?'Relatório copiado. Cole no chat.':'Não foi possível copiar; use Baixar JSON.');
        }
      }
      toggle.addEventListener('click',()=>{ if(!panel.classList.contains('open')) {panel.classList.add('open');toggle.setAttribute('aria-expanded','true');} setActive(!active); });
      byId('tl-save').addEventListener('click',()=>{
        if(!draft)return;const note=input.value.trim();if(!note){showStatus('Descreva a alteração antes de salvar.');input.focus();return;}
        if(editingId!==null){const target=notes.find(n=>n.id===editingId);if(target)target.note=note;}
        else notes.push({...draft,id:notes.reduce((max,n)=>Math.max(max,n.id),0)+1,note});
        closeEditor();persist();render();showStatus('Comentário salvo.');
        if (active && compactView()) { panel.classList.remove('open'); refreshPanelControls(); }
      });
      byId('tl-cancel').addEventListener('click', () => {
        closeEditor();
        if (active && compactView()) { panel.classList.remove('open'); refreshPanelControls(); }
      });
      byId('tl-view-comments').addEventListener('click', () => {
        panel.classList.add('open');refreshPanelControls();
      });
      byId('tl-back-to-site').addEventListener('click', () => {
        if (!editor.hidden) closeEditor();
        panel.classList.remove('open');refreshPanelControls();
      });
      byId('tl-page-comment').addEventListener('click', () => openEditor(generalDraft('page')));
      byId('tl-site-comment').addEventListener('click', () => openEditor(generalDraft('site')));
      byId('tl-widen').addEventListener('click', () => {
        const section = selectedElement?.closest?.('section');
        if (section && draft && editingId === null) openEditor(draftForElement(section, null, 'section'), null, section);
      });
      byId('tl-export').addEventListener('click',download);
      byId('tl-copy').addEventListener('click',copy);
      byId('tl-clear').addEventListener('click',()=>{if(!notes.length)return;if(confirm('Excluir todos os comentários desta revisão?')){notes=[];closeEditor();persist();render();showStatus('Comentários apagados.');}});
      document.addEventListener('pointermove',e=>{
        if(!active||e.target.closest?.('[data-rev-ui]')){hidePointerHint();hideOutline();return;}
         const target = resolveTarget(e.target);
         showOutline(target);
        pointerHint.textContent=e.target.closest?.('[data-review-target]')?'✎ Comentar elemento':'✎ Comentar aqui';
        pointerHint.hidden=false;
        pointerHint.style.left=`${Math.max(8,Math.min(e.clientX+16,innerWidth-pointerHint.offsetWidth-10))}px`;
        pointerHint.style.top=`${Math.max(8,Math.min(e.clientY+19,innerHeight-pointerHint.offsetHeight-10))}px`;
      },true);
      document.addEventListener('click',e=>{
        if(!active||!e.isTrusted||e.target.closest?.('[data-rev-ui]'))return;
        e.preventDefault();e.stopImmediatePropagation();
        const target=resolveTarget(e.target);
        if(!target||target===document.body||target===document.documentElement)return;
        openEditor(draftForElement(target, e), null, target);
        showStatus('Descreva o ajuste e clique em Salvar comentário.');
      },true);
      document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!editor.hidden)closeEditor();if(active)setActive(false);else {panel.classList.remove('open');toggle.setAttribute('aria-expanded','false');}}});
      window.addEventListener('scroll',()=>{hideOutline();renderPins();},{passive:true});window.addEventListener('resize',()=>{hideOutline();renderPins();refreshPanelControls();});
      restore();render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
