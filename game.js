(() => {
  'use strict';
  const DATA = window.GAME_DATA;
  if (!DATA || !Array.isArray(DATA.normal) || !Array.isArray(DATA.boss)) {
    alert('題庫載入失敗，請確認 game-data.js 已上傳。');
    return;
  }

  const GAME_URL = 'https://yinyi114work-ai.github.io/knowlongterm/';
  const TOTAL_NORMAL = 13;
  const TOTAL_BOSS = 3;
  const TOTAL = TOTAL_NORMAL + TOTAL_BOSS;
  const $ = (id) => document.getElementById(id);
  const screens = ['startScreen','quizScreen','bossScreen','resultScreen'];
  let state = null;
  let shareBlob = null;

  const levels = [
    {lv:1,min:0,max:5,title:'長照新手村',img:'assets/lv1.webp',joke:'今天先不要逞強，活著回到新手村也算一種能力。'},
    {lv:2,min:6,max:8,title:'開始有點會',img:'assets/lv2.webp',joke:'手忙腳亂歸手忙腳亂，但至少已經知道哪個火要先滅。'},
    {lv:3,min:9,max:11,title:'多工求生者',img:'assets/lv3.webp',joke:'電話、訊息、紀錄一起來，你已經不會立刻靈魂出竅了。'},
    {lv:4,min:12,max:14,title:'長照老江湖',img:'assets/lv4.webp',joke:'不是你太厲害，是這些情境你真的看過太多次了。'},
    {lv:5,min:15,max:16,title:'長照傳奇王',img:'assets/lv5.webp',joke:'皇冠先戴好。今天魔王看到你，可能比較想自己請假。'}
  ];

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i=a.length-1;i>0;i--) {
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  };

  function show(id){
    screens.forEach(s => $(s).classList.toggle('active', s===id));
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function sampleNormal(){
    const hard = shuffle(DATA.normal.filter(q=>q.difficulty==='難'));
    const mid = shuffle(DATA.normal.filter(q=>q.difficulty==='中'));
    const easy = shuffle(DATA.normal.filter(q=>q.difficulty==='易'));
    const picked = [];
    const used = new Set();
    const add = (pool,n) => {
      for (const q of pool) {
        if (n<=0 || picked.length>=TOTAL_NORMAL) break;
        if (!used.has(q.id)) { picked.push(q); used.add(q.id); n--; }
      }
    };
    add(hard,5); add(mid,6); add(easy,2); add(shuffle(DATA.normal),TOTAL_NORMAL-picked.length);
    return shuffle(picked).slice(0,TOTAL_NORMAL);
  }

  function reset(){
    state = {
      normal: sampleNormal(),
      boss: shuffle(DATA.boss).slice(0,TOTAL_BOSS),
      phase:'normal', idx:0,
      normalCorrect:0,bossCorrect:0,
      answers:[]
    };
    shareBlob = null;
    $('sharePanel').hidden = true;
    show('quizScreen');
    renderQuestion();
  }

  function currentList(){ return state.phase==='normal' ? state.normal : state.boss; }
  function currentQ(){ return currentList()[state.idx]; }
  function absoluteIndex(){ return state.phase==='normal' ? state.idx : TOTAL_NORMAL + state.idx; }

  function renderQuestion(){
    const q = currentQ();
    const boss = state.phase==='boss';
    const abs = absoluteIndex();
    $('stageLabel').textContent = boss ? 'FINAL BATTLE' : 'SURVIVAL MISSION';
    $('stageName').textContent = boss ? '魔王題' : '長照求生題';
    $('qNow').textContent = String(abs+1);
    $('progressBar').style.width = `${(abs/TOTAL)*100}%`;
    $('categoryChip').textContent = q.category || '情境題';
    $('difficultyChip').textContent = boss ? '魔王' : (q.difficulty || '中');
    $('questionTitle').textContent = q.title || `第 ${abs+1} 題`;
    $('questionText').textContent = q.question;
    $('answerHint').textContent = boss ? '魔王題不提示，照你的專業判斷選。' : '選一個最符合你判斷的做法';

    const box = $('answers');
    box.innerHTML = '';
    const originalLetters = ['A','B','C'];
    const shownLetters = ['A','B','C'];
    const opts = shuffle(q.choices.map((text,i)=>({text,original:originalLetters[i]})));
    opts.forEach((opt,i)=>{
      const btn = document.createElement('button');
      btn.type='button';
      btn.className='answer-btn';
      btn.innerHTML = `<span class="answer-letter">${shownLetters[i]}</span><span></span>`;
      btn.querySelector('span:last-child').textContent = opt.text;
      btn.addEventListener('click',()=>selectAnswer(btn,opt.original));
      box.appendChild(btn);
    });
  }

  function selectAnswer(btn, original){
    const q = currentQ();
    [...$('answers').children].forEach(b=>b.disabled=true);
    btn.classList.add('selected');
    const correct = original === q.answer;
    if (state.phase==='normal' && correct) state.normalCorrect++;
    if (state.phase==='boss' && correct) state.bossCorrect++;
    state.answers.push({id:q.id,correct});

    window.setTimeout(()=>{
      const list = currentList();
      if (state.idx < list.length-1) {
        state.idx++;
        renderQuestion();
        return;
      }
      if (state.phase==='normal') {
        $('progressBar').style.width = `${(TOTAL_NORMAL/TOTAL)*100}%`;
        show('bossScreen');
      } else {
        showResult();
      }
    }, 260);
  }

  function beginBoss(){
    state.phase='boss';
    state.idx=0;
    show('quizScreen');
    renderQuestion();
  }

  function totalCorrect(){ return state.normalCorrect + state.bossCorrect; }
  function levelFor(score){ return levels.find(x=>score>=x.min && score<=x.max) || levels[0]; }

  function resultJoke(score, bossCorrect){
    const lv = levelFor(score);
    if (bossCorrect===3 && score>=12) return '魔王三題全收。你今天可以很有底氣地說：這題我真的會。';
    if (bossCorrect===0 && score>=12) return '前面一路很穩，結果最後被魔王偷襲。長照現場就是這麼會反轉。';
    if (bossCorrect===0) return '魔王今天很有精神，但至少你已經知道下次哪裡不要踩雷。';
    return lv.joke;
  }

  function showResult(){
    const score = totalCorrect();
    const lv = levelFor(score);
    $('rankText').textContent = `Lv.${lv.lv} ${lv.title}`;
    $('scoreBig').textContent = String(score);
    $('normalScore').textContent = `${state.normalCorrect} / ${TOTAL_NORMAL}`;
    $('bossScore').textContent = `${state.bossCorrect} / ${TOTAL_BOSS}`;
    $('resultJoke').textContent = resultJoke(score,state.bossCorrect);
    $('sharePanel').hidden = true;
    $('shareNote').textContent = '分享圖會使用你這局的等級角色、總成績與魔王戰況。';
    show('resultScreen');
  }

  function loadImage(src){
    return new Promise((resolve,reject)=>{
      const img = new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error(`圖片載入失敗：${src}`));
      img.src=src;
    });
  }

  function roundedRect(ctx,x,y,w,h,r,fill,stroke){
    ctx.beginPath();
    ctx.roundRect(x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke();}
  }

  function fitImage(ctx,img,x,y,w,h,mode='contain'){
    const ir=img.width/img.height, br=w/h;
    let dw,dh,dx,dy;
    if((mode==='cover' && ir>br)||(mode==='contain' && ir<br)){dh=h;dw=h*ir;}
    else{dw=w;dh=w/ir;}
    dx=x+(w-dw)/2;dy=y+(h-dh)/2;
    ctx.drawImage(img,dx,dy,dw,dh);
  }

  function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines=3){
    const chars=[...text]; let line='', lines=[];
    for(const ch of chars){
      const test=line+ch;
      if(ctx.measureText(test).width>maxWidth && line){lines.push(line);line=ch;if(lines.length>=maxLines-1)break;}
      else line=test;
    }
    if(line && lines.length<maxLines) lines.push(line);
    lines.forEach((ln,i)=>ctx.fillText(ln,x,y+i*lineHeight));
  }

  async function makeQR(){
    const maker = $('qrMaker'); maker.innerHTML='';
    if (typeof QRCode === 'undefined') return null;
    new QRCode(maker,{text:GAME_URL,width:220,height:220,colorDark:'#263947',colorLight:'#fffaf1',correctLevel:QRCode.CorrectLevel.M});
    await new Promise(r=>setTimeout(r,40));
    return maker.querySelector('canvas') || maker.querySelector('img');
  }

  async function generateShareCard(){
    const canvas=$('shareCanvas');
    const ctx=canvas.getContext('2d');
    const score=totalCorrect();
    const lv=levelFor(score);
    const bossSrc=state.bossCorrect===3?'assets/boss-win.webp':state.bossCorrect>0?'assets/boss-draw.webp':'assets/boss-lose.webp';
    $('generateBtn').disabled=true;
    $('generateBtn').textContent='生成中…';
    $('shareNote').textContent='正在把這局戰績拼進你的分享圖…';

    try{
      const [template,character,boss,qr] = await Promise.all([
        loadImage('assets/template.webp'),loadImage(lv.img),loadImage(bossSrc),makeQR()
      ]);
      ctx.clearRect(0,0,canvas.width,canvas.height);
      fitImage(ctx,template,0,0,1080,1350,'cover');

      // 頂部遊戲名稱
      ctx.textAlign='center';
      ctx.fillStyle='#fff9ed';
      ctx.font='900 66px "Microsoft JhengHei","PingFang TC",sans-serif';
      ctx.fillText('長照求生王',540,115);
      ctx.font='700 22px Arial,sans-serif';
      ctx.fillText('LONG-TERM CARE SURVIVAL',540,150);

      // 角色圖框
      roundedRect(ctx,115,225,390,500,34,'rgba(255,250,241,.92)','#e3b67d');
      ctx.save();
      ctx.beginPath();ctx.roundRect(127,237,366,476,25);ctx.clip();
      fitImage(ctx,character,127,237,366,476,'cover');
      ctx.restore();

      // 等級稱號與分數
      ctx.textAlign='left';
      ctx.fillStyle='#263947';
      ctx.font='900 32px "Microsoft JhengHei","PingFang TC",sans-serif';
      ctx.fillText(`Lv.${lv.lv}  ${lv.title}`,555,300);
      ctx.fillStyle='#c95236';
      ctx.font='900 118px Arial,sans-serif';
      ctx.fillText(String(score),555,445);
      ctx.fillStyle='#263947';
      ctx.font='900 39px Arial,sans-serif';
      ctx.fillText('/ 16',715,445);
      ctx.fillStyle='#8b6c58';
      ctx.font='800 24px "Microsoft JhengHei","PingFang TC",sans-serif';
      ctx.fillText('總成績',558,490);

      // 吐槽泡泡
      roundedRect(ctx,545,535,420,190,26,'rgba(255,248,234,.94)','#ce9d72');
      ctx.fillStyle='#5d4638';
      ctx.font='800 27px "Microsoft JhengHei","PingFang TC",sans-serif';
      wrapText(ctx,resultJoke(score,state.bossCorrect),575,588,360,44,3);

      // 品牌與 QR
      ctx.fillStyle='#263947';
      ctx.font='900 29px Arial,sans-serif';
      ctx.fillText('@longcare.notes',120,990);
      ctx.font='700 20px "Microsoft JhengHei","PingFang TC",sans-serif';
      ctx.fillStyle='#795f4d';
      ctx.fillText('掃碼挑戰你的長照求生力',120,1024);
      if(qr) ctx.drawImage(qr,120,1045,170,170);
      else {
        roundedRect(ctx,120,1045,170,170,10,'#fffaf1','#8c755f');
        ctx.fillStyle='#263947';ctx.font='800 18px Arial,sans-serif';ctx.fillText('QR CODE',150,1135);
      }

      // 魔王成績（右下小小的）
      roundedRect(ctx,690,950,260,280,27,'rgba(255,248,234,.95)','#d9aa7d');
      ctx.textAlign='center';
      ctx.fillStyle='#6f5140';
      ctx.font='900 23px "Microsoft JhengHei","PingFang TC",sans-serif';
      ctx.fillText('魔王成績',820,990);
      ctx.save();ctx.beginPath();ctx.roundRect(720,1010,200,145,18);ctx.clip();fitImage(ctx,boss,720,1010,200,145,'contain');ctx.restore();
      ctx.fillStyle='#c95236';
      ctx.font='900 38px Arial,sans-serif';
      ctx.fillText(`${state.bossCorrect} / 3`,820,1200);

      // 小品牌字
      ctx.textAlign='center';ctx.fillStyle='#7c6657';ctx.font='700 18px "Microsoft JhengHei","PingFang TC",sans-serif';
      ctx.fillText('LTC 長照研究室 · Long-term Care Lab',540,1290);

      shareBlob = await new Promise(resolve=>canvas.toBlob(resolve,'image/png',1));
      $('sharePanel').hidden=false;
      $('shareNote').textContent='完成。這張就是玩家可以分享出去的個人戰績圖。';
      $('sharePanel').scrollIntoView({behavior:'smooth',block:'start'});
    } catch(err){
      console.error(err);
      $('shareNote').textContent='分享圖生成失敗，請重新整理後再試一次。';
    } finally {
      $('generateBtn').disabled=false;
      $('generateBtn').textContent='重新生成分享圖';
    }
  }

  async function shareImage(){
    if(!shareBlob) await generateShareCard();
    if(!shareBlob) return;
    const file = new File([shareBlob],'長照求生王_我的戰績.png',{type:'image/png'});
    const text = `我在《長照求生王》拿到 ${totalCorrect()}/16！魔王題 ${state.bossCorrect}/3。換你來挑戰：${GAME_URL}`;
    try{
      if(navigator.canShare && navigator.canShare({files:[file]})){
        await navigator.share({title:'長照求生王｜我的戰績',text,files:[file]});
      } else if(navigator.share){
        await navigator.share({title:'長照求生王｜我的戰績',text,url:GAME_URL});
      } else {
        downloadImage();
        $('shareNote').textContent='瀏覽器不支援直接分享，已改為下載圖片。';
      }
    }catch(e){ if(e && e.name!=='AbortError') console.error(e); }
  }

  function downloadImage(){
    if(!shareBlob){generateShareCard().then(downloadImage);return;}
    const a=document.createElement('a');
    a.href=URL.createObjectURL(shareBlob);
    a.download='長照求生王_我的戰績.png';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  async function shareChallenge(){
    const text='來玩《長照求生王》：16 題測你的長照求生力，最後還有魔王題。';
    try{
      if(navigator.share) await navigator.share({title:'長照求生王',text,url:GAME_URL});
      else if(navigator.clipboard){await navigator.clipboard.writeText(`${text}\n${GAME_URL}`);$('shareNote').textContent='遊戲連結已複製，可以貼給朋友。';}
      else window.prompt('複製這個遊戲網址',GAME_URL);
    }catch(e){ if(e && e.name!=='AbortError') console.error(e); }
  }

  $('startBtn').addEventListener('click',reset);
  $('bossBtn').addEventListener('click',beginBoss);
  $('restartBtn').addEventListener('click',reset);
  $('generateBtn').addEventListener('click',generateShareCard);
  $('shareImageBtn').addEventListener('click',shareImage);
  $('downloadBtn').addEventListener('click',downloadImage);
  $('challengeShareBtn').addEventListener('click',shareChallenge);
  $('homeLink').addEventListener('click',(e)=>{e.preventDefault();show('startScreen');});
})();
