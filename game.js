(() => {
  'use strict';
  const D = window.GAME_DATA;
  if (!D) return;
  const $ = (s) => document.querySelector(s);
  const screens = ['#startScreen','#gameScreen','#bossIntro','#resultScreen'];
  const levelDefs = [
    {lv:1,min:0,name:'剛進戰場',flavor:'文件抱緊，先不要慌。',img:'assets/lv1.webp'},
    {lv:2,min:2,name:'開始上手',flavor:'手還很忙，但已經知道先做什麼。',img:'assets/lv2.webp'},
    {lv:3,min:4,name:'多工求生者',flavor:'電話、紀錄一起來，也能保持微笑。',img:'assets/lv3.webp'},
    {lv:4,min:6,name:'淡定處理王',flavor:'訊息跟文件一起炸，你還是很穩。',img:'assets/lv4.webp'},
    {lv:5,min:8,name:'魔王級長照人',flavor:'皇冠先戴著，真正的魔王還在後面。',img:'assets/lv5.webp'}
  ];
  let state = {};
  const shuffle = (arr) => { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
  const levelFor = (correct) => [...levelDefs].reverse().find(x => correct >= x.min) || levelDefs[0];
  function sampleNormal(){
    const hard=D.normal.filter(q=>q.difficulty==='難');
    const mid=D.normal.filter(q=>q.difficulty==='中');
    const easy=D.normal.filter(q=>q.difficulty==='易');
    const chosen=[]; const used=new Set();
    function add(pool,n){ for(const q of shuffle(pool)){ if(chosen.length>=10||n<=0)break; if(!used.has(q.id)){chosen.push(q);used.add(q.id);n--;} } }
    add(hard,4); add(mid,5); add(easy,1); add(D.normal,10-chosen.length);
    return shuffle(chosen);
  }
  function resetState(){ state={phase:'normal',normal:sampleNormal(),boss:shuffle(D.boss).slice(0,3),idx:0,normalCorrect:0,bossCorrect:0,streak:0,bestStreak:0,score:0,answered:false,lastLevel:1}; }
  function show(sel){ screens.forEach(s=>$(s).classList.toggle('active',s===sel)); window.scrollTo({top:0,behavior:'smooth'}); }
  function start(){ resetState(); show('#gameScreen'); renderQuestion(); }
  function currentList(){return state.phase==='normal'?state.normal:state.boss}
  function currentQ(){return currentList()[state.idx]}
  function updateCharacter(){
    const lv=levelFor(state.normalCorrect); $('#levelChip').textContent=`Lv.${lv.lv}`; $('#levelImage').src=lv.img; $('#levelName').textContent=lv.name; $('#levelFlavor').textContent=lv.flavor;
    $('#xpText').textContent=state.normalCorrect*100; const pct=Math.min(100,(state.normalCorrect/8)*100); $('#xpFill').style.width=`${pct}%`;
  }
  function renderQuestion(){
    state.answered=false; const q=currentQ(); const boss=state.phase==='boss';
    $('#stageKicker').textContent=boss?'FINAL BATTLE':'TODAY MISSION'; $('#stageTitle').textContent=boss?'魔王求生關':'一般求生關';
    $('#scoreText').textContent=state.score;
    const total=state.normal.length+state.boss.length; const absolute=boss?state.normal.length+state.idx:state.idx; $('#progressFill').style.width=`${(absolute/total)*100}%`;
    $('#questionCounter').textContent=boss?`BOSS ${String(state.idx+1).padStart(2,'0')} / 03`:`${String(state.idx+1).padStart(2,'0')} / ${String(state.normal.length).padStart(2,'0')}`;
    $('#streakText').textContent=`連勝 ${state.streak}`; $('#categoryChip').textContent=q.category; $('#difficultyChip').textContent=q.difficulty;
    $('#difficultyChip').className='difficulty-chip '+(boss?'boss':q.difficulty==='難'?'hard':''); $('#questionId').textContent=q.id; $('#questionTitle').textContent=q.title; $('#questionText').textContent=q.question;
    $('#feedback').hidden=true; $('#nextBtn').hidden=true; const box=$('#answers'); box.innerHTML='';
    const letters=['A','B','C']; const opts=q.choices.map((text,i)=>({text,original:letters[i]}));
    shuffle(opts).forEach((opt,i)=>{ const b=document.createElement('button'); b.type='button'; b.className='answer-btn'; b.dataset.original=opt.original; b.innerHTML=`<span class="answer-letter">${letters[i]}</span><span class="answer-text"></span>`; b.querySelector('.answer-text').textContent=opt.text; b.addEventListener('click',()=>answer(b,opt.original)); box.appendChild(b); });
    updateCharacter();
  }
  function answer(btn,original){
    if(state.answered)return; state.answered=true; const q=currentQ(); const ok=original===q.answer;
    const buttons=[...document.querySelectorAll('.answer-btn')]; buttons.forEach(b=>{b.disabled=true;if(b.dataset.original===q.answer)b.classList.add('correct')}); if(!ok)btn.classList.add('wrong');
    if(ok){state.score+=state.phase==='boss'?200:100; state.streak++; state.bestStreak=Math.max(state.bestStreak,state.streak); if(state.phase==='normal')state.normalCorrect++; else state.bossCorrect++;}
    else state.streak=0;
    $('#scoreText').textContent=state.score; $('#streakText').textContent=`連勝 ${state.streak}`; $('#feedbackIcon').textContent=ok?'✓':'!'; $('#feedbackTitle').textContent=ok?'漂亮，這題活下來了':'被陰到了，但先看解析';
    $('#feedbackShort').textContent=(ok?q.correctFeedback:q.wrongFeedback)|| (ok?'判斷正確。':'這個情境還有更安全的處理方式。'); $('#explanationText').textContent=q.explanation; $('#feedback').hidden=false; $('#nextBtn').hidden=false;
    if(state.phase==='normal'){ const newLv=levelFor(state.normalCorrect); if(newLv.lv>state.lastLevel){ state.lastLevel=newLv.lv; showLevelUp(newLv); } updateCharacter(); }
  }
  function showLevelUp(lv){ $('#levelUpImage').src=lv.img; $('#levelUpTitle').textContent=`Lv.${lv.lv} ${lv.name}`; $('#levelUpText').textContent=lv.flavor; $('#levelUpOverlay').hidden=false; }
  function next(){
    if(!state.answered)return; const list=currentList();
    if(state.idx<list.length-1){state.idx++;renderQuestion();return;}
    if(state.phase==='normal'){show('#bossIntro');return;}
    showResult();
  }
  function beginBoss(){state.phase='boss';state.idx=0;show('#gameScreen');renderQuestion();}
  function showResult(){
    show('#resultScreen'); const lv=levelFor(state.normalCorrect); $('#resultRank').textContent=`Lv.${lv.lv} ${lv.name}`; $('#normalScore').textContent=`${state.normalCorrect} / ${state.normal.length}`; $('#bossScore').textContent=`${state.bossCorrect} / 3`; $('#bestStreak').textContent=state.bestStreak;
    let title,desc,img,burst;
    if(state.bossCorrect===3){title='魔王被你打下班了';desc='三題全對。魔王皇冠歪掉、貼著 OK 繃，而你還站著。今天的長照求生認證：非常可以。';img='assets/boss-win.webp';burst='BOSS\nDOWN';}
    else if(state.bossCorrect>0){title='雙方冒煙，算你活下來';desc='你跟魔王互有來往，沒有全身而退，但至少沒有被留下加班。下一局再把皇冠搶過來。';img='assets/boss-draw.webp';burst='DRAW\nGAME';}
    else{title='魔王連沙發都幫你準備好了';desc='今天的魔王太兇。先坐一下，把解析看完再回來。長照人的技能就是：被打回 Lv.1 還是會再上線。';img='assets/boss-lose.webp';burst='BOSS\nWINS';}
    $('#resultTitle').textContent=title;$('#resultDesc').textContent=desc;$('#resultImage').src=img;$('#resultBurst').textContent=burst;$('#shareStatus').textContent='';
  }
  async function share(){ const lv=levelFor(state.normalCorrect); const text=`我在《長照求生王》拿到 Lv.${lv.lv} ${lv.name}！一般題 ${state.normalCorrect}/10、魔王題 ${state.bossCorrect}/3。你能成功下班嗎？ #長照研究室 #長照求生王`;
    try{ if(navigator.share){await navigator.share({title:'長照求生王｜我的求生戰績',text});$('#shareStatus').textContent='分享面板已開啟。';} else if(navigator.clipboard){await navigator.clipboard.writeText(text);$('#shareStatus').textContent='戰績文字已複製，可以直接貼到 IG／Threads。';} else {$('#shareStatus').textContent=text;} }catch(e){ if(e&&e.name!=='AbortError') $('#shareStatus').textContent=text; }
  }
  $('#startBtn').addEventListener('click',start); $('#nextBtn').addEventListener('click',next); $('#bossStartBtn').addEventListener('click',beginBoss); $('#restartBtn').addEventListener('click',start); $('#shareBtn').addEventListener('click',share);
  $('#howBtn').addEventListener('click',()=>$('#howDialog').showModal()); $('#closeHow').addEventListener('click',()=>$('#howDialog').close()); $('#levelUpContinue').addEventListener('click',()=>{$('#levelUpOverlay').hidden=true}); $('#brandHome').addEventListener('click',(e)=>{e.preventDefault();show('#startScreen')});
  $('#howDialog').addEventListener('click',(e)=>{if(e.target===$('#howDialog'))$('#howDialog').close()});
})();