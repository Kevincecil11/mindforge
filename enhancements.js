(function () {
  'use strict';

  var PERSONAL_KEY = 'mf_personal_quotes_v1';
  var FONT_URL = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Manrope:wght@400;500;600;700&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Sora:wght@400;500;600;700&display=swap';
  var sharePalettes = {
    dark:['#171514','#f0ece8','#d87956'],light:['#f8f6f3','#24201e','#9b4c35'],warm:['#f2e3ca','#35251f','#a64f35'],ocean:['#10252e','#e7f1f3','#4db2c4'],forest:['#10241b','#e6efe9','#67ad7d'],midnight:['#131020','#e9e6f1','#b178d0'],ember:['#24100d','#f2e7e2','#e36f48'],parchment:['#eee4cf','#30271f','#8a5b31'],aurora:['#102522','#e5f1ed','#5fc4a8'],plum:['#241522','#f2e7ef','#d17bb9']
  };

  function safe(value) {
    return String(value || '').replace(/[&<>'"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]; });
  }
  function loadPersonal() {
    try { var data = JSON.parse(localStorage.getItem(PERSONAL_KEY) || '[]'); return Array.isArray(data) ? data : []; }
    catch (e) { return []; }
  }
  function savePersonal(data) { try { localStorage.setItem(PERSONAL_KEY, JSON.stringify(data)); } catch (e) {} }

  function extendSettings() {
    if (typeof MOODS === 'undefined' || typeof BF === 'undefined' || typeof HF === 'undefined') return;
    if (!MOODS.some(function (m) { return m.id === 'parchment'; })) {
      MOODS.push(
        {id:'parchment',name:'Parchment',dot:'oklch(84% 0.05 78)'},
        {id:'aurora',name:'Aurora',dot:'oklch(63% 0.11 165)'},
        {id:'plum',name:'Plum',dot:'oklch(48% 0.1 330)'}
      );
      BF.push(
        {id:'manrope',name:'Manrope',css:"'Manrope',system-ui,sans-serif"},
        {id:'sora',name:'Sora',css:"'Sora',system-ui,sans-serif"},
        {id:'merriweather',name:'Merriweather',css:"'Merriweather',serif"},
        {id:'libre',name:'Libre Baskerville',css:"'Libre Baskerville',serif"},
        {id:'cormorant',name:'Cormorant',css:"'Cormorant Garamond',serif"}
      );
      HF.push(
        {id:'cormorant',name:'Cormorant',css:"'Cormorant Garamond',serif"},
        {id:'libre',name:'Libre Baskerville',css:"'Libre Baskerville',serif"},
        {id:'merriweather',name:'Merriweather',css:"'Merriweather',serif"},
        {id:'sora',name:'Sora',css:"'Sora',system-ui,sans-serif"},
        {id:'manrope',name:'Manrope',css:"'Manrope',system-ui,sans-serif"}
      );
    }
    var link = document.createElement('link'); link.rel = 'stylesheet'; link.href = FONT_URL; document.head.appendChild(link);
    if (typeof renderSettings === 'function') renderSettings();
  }

  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = '[data-mood="parchment"]{--ink:oklch(22% .018 70);--ink-mid:oklch(42% .018 70);--ink-light:oklch(56% .015 70);--bg:oklch(92% .035 78);--bg-sub:oklch(88% .045 76);--surface:oklch(95% .025 78);--border:oklch(80% .035 72);--accent:oklch(47% .11 55);--accent-soft:oklch(87% .055 62)}[data-mood="aurora"]{--ink:oklch(92% .012 165);--ink-mid:oklch(70% .012 165);--ink-light:oklch(49% .014 165);--bg:oklch(13% .025 175);--bg-sub:oklch(17% .03 174);--surface:oklch(20% .026 172);--border:oklch(27% .025 170);--accent:oklch(72% .13 165);--accent-soft:oklch(24% .045 168)}[data-mood="plum"]{--ink:oklch(92% .012 330);--ink-mid:oklch(70% .012 330);--ink-light:oklch(48% .012 330);--bg:oklch(13% .025 330);--bg-sub:oklch(17% .032 330);--surface:oklch(20% .026 330);--border:oklch(27% .022 330);--accent:oklch(72% .14 335);--accent-soft:oklch(24% .05 333)}.share-btn{border:1.5px solid var(--border);background:var(--bg-sub);color:var(--ink-mid);font:700 .72rem var(--body-font);cursor:pointer;min-height:38px;border-radius:20px;padding:8px 13px;transition:transform .12s cubic-bezier(.25,1,.5,1),color .12s,border-color .12s}.share-btn:hover,.share-btn:focus-visible{color:var(--accent);border-color:var(--accent)}.share-btn:active{transform:scale(.96)}.hero-share{margin-top:8px}.card-share{position:absolute;top:12px;right:54px;width:34px;height:34px;min-height:34px;padding:0;border-radius:50%;font-size:1rem}.reading-progress{position:fixed;top:0;left:0;right:0;height:3px;background:var(--border);z-index:80;opacity:0;pointer-events:none;transition:opacity .2s}.reading-progress.visible{opacity:1}.reading-progress-fill{height:100%;width:0;background:var(--accent);transform-origin:left;transition:transform .1s linear}.reading-progress-label{position:fixed;top:10px;right:12px;z-index:81;background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:5px 9px;font-size:.66rem;font-weight:700;color:var(--accent);opacity:0;pointer-events:none}.reading-progress-label.visible{opacity:1}.personal-form{display:grid;gap:12px;padding:18px;background:var(--surface);border:1px solid var(--border);border-radius:14px;margin:4px 0 24px}.personal-form textarea,.personal-form input{width:100%;border:1.5px solid var(--border);border-radius:10px;background:var(--bg);color:var(--ink);font:inherit;padding:12px 14px}.personal-form textarea{min-height:112px;resize:vertical;line-height:1.55}.personal-form textarea:focus-visible,.personal-form input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.personal-form-row{display:grid;grid-template-columns:1fr auto;gap:10px}.primary-action,.quiet-action{min-height:44px;border-radius:10px;border:1.5px solid var(--accent);padding:10px 16px;font:700 .82rem var(--body-font);cursor:pointer}.primary-action{background:var(--accent);color:var(--bg)}.quiet-action{background:transparent;color:var(--accent)}.personal-actions{display:flex;gap:8px;margin-top:14px}.personal-actions button{min-height:38px;border:1px solid var(--border);border-radius:20px;background:var(--bg-sub);color:var(--ink-mid);padding:7px 12px;font:700 .7rem var(--body-font);cursor:pointer}.personal-actions button:hover{color:var(--accent);border-color:var(--accent)}.personal-empty{text-align:center;color:var(--ink-light);padding:64px 16px;grid-column:1/-1}.personal-empty strong{display:block;color:var(--ink);margin-bottom:6px}.bottom-nav{overflow-x:auto;justify-content:flex-start;scrollbar-width:none}.bottom-nav::-webkit-scrollbar{display:none}.bnav-btn{flex:1 0 62px;padding-left:8px;padding-right:8px}@media(min-width:768px){.bottom-nav{max-width:560px;justify-content:center}.personal-form-row{grid-template-columns:1fr 150px}}';
    document.head.appendChild(style);
  }

  function injectProgress() {
    var bar = document.createElement('div'); bar.className = 'reading-progress'; bar.innerHTML = '<div class="reading-progress-fill"></div>'; document.body.appendChild(bar);
    var label = document.createElement('div'); label.className = 'reading-progress-label'; label.textContent = '0% read'; document.body.appendChild(label);
    function update() {
      var active = document.querySelector('#sec-essays.active,#sec-laws.active');
      var visible = !!active;
      bar.classList.toggle('visible', visible); label.classList.toggle('visible', visible);
      if (!visible) return;
      var start = active.offsetTop;
      var distance = Math.max(1, active.scrollHeight - window.innerHeight);
      var pct = Math.max(0, Math.min(100, Math.round((window.scrollY - start) / distance * 100)));
      bar.firstChild.style.transform = 'scaleX(' + (pct / 100) + ')';
      label.textContent = pct + '% read';
    }
    window.addEventListener('scroll', update, {passive:true}); window.addEventListener('resize', update); document.addEventListener('click', function(){setTimeout(update,60);}); update();
  }

  function wrapLines(ctx, text, maxWidth) {
    var words = text.split(/\s+/), lines = [], line = '';
    words.forEach(function(word){ var test = line ? line + ' ' + word : word; if(ctx.measureText(test).width > maxWidth && line){lines.push(line);line=word;}else line=test; });
    if(line) lines.push(line); return lines;
  }
  function makeCard(quote, author) {
    var canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1080;
    var ctx = canvas.getContext('2d'), mood = (window.S && S.mood) || 'dark', palette = sharePalettes[mood] || sharePalettes.dark;
    ctx.fillStyle = palette[0]; ctx.fillRect(0,0,1080,1080);
    ctx.fillStyle = palette[2]; ctx.fillRect(84,84,92,8); ctx.font = '600 27px Arial'; ctx.letterSpacing = '4px'; ctx.fillText('MINDFORGE',84,142);
    var size = quote.length > 180 ? 46 : quote.length > 100 ? 54 : 64; ctx.font = 'italic ' + size + 'px Georgia'; ctx.fillStyle = palette[1];
    var lines = wrapLines(ctx, '“' + quote + '”', 880), lineHeight = size * 1.32, total = lines.length * lineHeight, y = Math.max(260, 520-total/2);
    lines.forEach(function(line){ctx.fillText(line,84,y);y+=lineHeight;});
    ctx.fillStyle = palette[2]; ctx.font = '600 30px Arial'; ctx.fillText('— ' + (author || 'Unknown'),84,918);
    ctx.fillStyle = palette[1]; ctx.globalAlpha=.48; ctx.font='24px Arial'; ctx.fillText('mtrxdigital.com',84,982); ctx.globalAlpha=1;
    return canvas;
  }
  function shareQuote(quote, author) {
    var canvas = makeCard(quote, author);
    canvas.toBlob(function(blob){
      if(!blob) return;
      var file = new File([blob], 'mindforge-quote.png', {type:'image/png'});
      if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})) navigator.share({title:'MindForge quote',text:'“'+quote+'” — '+author,files:[file]}).catch(function(){});
      else {var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mindforge-quote.png';a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},1000);}
    }, 'image/png');
  }
  function quoteFromCard(card) {
    var text = card.querySelector('.qc-text'); if(!text) return null;
    var quote = text.textContent.replace(/^[“\"]|[”\"]$/g,'');
    if(typeof Q !== 'undefined') for(var i=0;i<Q.length;i++) if(Q[i].q===quote) return {q:Q[i].q,a:Q[i].a};
    return {q:quote,a:(card.querySelector('.qc-author')||{}).textContent||'Unknown'};
  }
  function decorateShareButtons() {
    var hero = document.getElementById('hero');
    if(hero && !document.getElementById('hero-share')){var hb=document.createElement('button');hb.id='hero-share';hb.className='share-btn hero-share';hb.textContent='↗ Share card';var anchor=document.getElementById('hero-bookmark')||document.getElementById('hero-refresh');anchor.insertAdjacentElement('afterend',hb);hb.onclick=function(){shareQuote(document.getElementById('hero-quote').textContent.replace(/^[“\"]|[”\"]$/g,''),document.getElementById('hero-author').textContent);};}
    var cards=document.querySelectorAll('#qgrid .qc,#bookmarks-grid .qc');
    for(var i=0;i<cards.length;i++){if(cards[i].querySelector('.card-share'))continue;var b=document.createElement('button');b.className='share-btn card-share';b.title='Create share card';b.setAttribute('aria-label','Create share card');b.textContent='↗';b.onclick=function(e){e.stopPropagation();var item=quoteFromCard(this.closest('.qc'));if(item)shareQuote(item.q,item.a);};cards[i].appendChild(b);}
  }

  function renderPersonal() {
    var grid=document.getElementById('personal-grid'), count=document.getElementById('personal-count'); if(!grid)return;
    var data=loadPersonal(); count.textContent=data.length+(data.length===1?' personal quote':' personal quotes');
    if(!data.length){grid.innerHTML='<div class="personal-empty"><strong>Your words belong here.</strong>Add a quote, lesson, or line you want to keep.</div>';return;}
    grid.innerHTML=data.map(function(item,i){return '<article class="qc"><div class="qc-text">&quot;'+safe(item.q)+'&quot;</div><div class="qc-author">'+safe(item.a||'Me')+'</div><div class="personal-actions"><button data-personal-share="'+i+'">↗ Share</button><button data-personal-edit="'+i+'">Edit</button><button data-personal-delete="'+i+'">Delete</button></div></article>';}).join('');
    grid.querySelectorAll('[data-personal-share]').forEach(function(b){b.onclick=function(){var x=loadPersonal()[+this.dataset.personalShare];if(x)shareQuote(x.q,x.a||'Me');};});
    grid.querySelectorAll('[data-personal-edit]').forEach(function(b){b.onclick=function(){var data=loadPersonal(),x=data[+this.dataset.personalEdit];if(!x)return;document.getElementById('personal-text').value=x.q;document.getElementById('personal-author').value=x.a||'';document.getElementById('personal-edit-index').value=this.dataset.personalEdit;document.getElementById('personal-submit').textContent='Update quote';window.scrollTo({top:0,behavior:'smooth'});};});
    grid.querySelectorAll('[data-personal-delete]').forEach(function(b){b.onclick=function(){var data=loadPersonal();data.splice(+this.dataset.personalDelete,1);savePersonal(data);renderPersonal();};});
  }
  function showPersonal() {
    document.getElementById('hero').style.display='none';document.querySelectorAll('.section').forEach(function(s){s.classList.remove('active');});document.getElementById('sec-personal').classList.add('active');if(typeof setNav==='function')setNav('personal');renderPersonal();window.scrollTo({top:0});
  }
  function injectPersonal() {
    var section=document.createElement('section');section.className='section';section.id='sec-personal';section.innerHTML='<div class="section-top"><button class="back-btn" id="back-personal">← Back</button><div class="section-title">Personal Quotes</div><div class="section-sub">Your own lines, kept locally on this device</div></div><form class="personal-form" id="personal-form"><textarea id="personal-text" maxlength="420" placeholder="Write a quote or lesson..." required></textarea><div class="personal-form-row"><input id="personal-author" maxlength="80" placeholder="Author (optional)"><button class="primary-action" id="personal-submit" type="submit">Add quote</button></div><input type="hidden" id="personal-edit-index" value=""></form><div class="qcount" id="personal-count"></div><div class="qgrid" id="personal-grid"></div>';document.getElementById('bottom-nav').insertAdjacentElement('beforebegin',section);
    var nav=document.createElement('button');nav.className='bnav-btn';nav.dataset.nav='personal';nav.innerHTML='<span class="bnav-icon">✎</span>Mine';var settings=document.querySelector('[data-nav="settings"]');settings.parentNode.insertBefore(nav,settings);nav.onclick=showPersonal;document.getElementById('back-personal').onclick=showHero;
    document.getElementById('personal-form').onsubmit=function(e){e.preventDefault();var text=document.getElementById('personal-text'),author=document.getElementById('personal-author'),idx=document.getElementById('personal-edit-index'),data=loadPersonal(),item={q:text.value.trim(),a:author.value.trim()||'Me'};if(!item.q)return;if(idx.value==='')data.unshift(item);else data[+idx.value]=item;savePersonal(data);this.reset();idx.value='';document.getElementById('personal-submit').textContent='Add quote';renderPersonal();};renderPersonal();
  }

  function setup() {
    injectStyles();extendSettings();injectProgress();injectPersonal();decorateShareButtons();
    var observer=new MutationObserver(function(){decorateShareButtons();});observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
