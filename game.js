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
    {lv:3,min:9,max:11,title:'多工求生者',img:'assets/lv3.png',joke:'電話、訊息、紀錄一起來，你已經不會立刻靈魂出竅了。'},
    {lv:4,min:12,max:14,title:'長照老江湖',img:'assets/lv4.png',joke:'不是你太厲害，是這些情境你真的看過太多次了。'},
    {lv:5,min:15,max:16,title:'長照傳奇王',img:'assets/lv5.png',joke:'皇冠先戴好。今天魔王看到你，可能比較想自己請假。'}
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
    const bossSrc=state.bossCorrect===3?'assets/boss-win.png':state.bossCorrect>0?'assets/boss-draw.webp':'assets/boss-lose.png';
    $('generateBtn').disabled=true;
    $('generateBtn').textContent='生成中…';
    $('shareNote').textContent='正在生成你的長照求生戰績…';

    try{
      const [template,character,boss,qr] = await Promise.all([
        loadImage('assets/template.webp'),loadImage(lv.img),loadImage(bossSrc),makeQR()
      ]);
      ctx.clearRect(0,0,canvas.width,canvas.height);
      fitImage(ctx,template,0,0,1080,1350,'cover');

      const navy='#263947', orange='#c95236', brown='#654b3d', muted='#8b6c58', cream='rgba(255,250,241,.92)';

      // 品牌標題：保留大量留白，不做報表框。
      ctx.textAlign='center';
      ctx.fillStyle='#fff9ed';
      ctx.font='900 62px "Microsoft JhengHei","PingFang TC",sans-serif';
      ctx.fillText('長照求生王',540,112);
      ctx.font='700 19px Arial,sans-serif';
      ctx.fillText('LONG-TERM CARE SURVIVAL',540,144);

      // 等級像貼紙放在右上，不與角色搶視覺。
      roundedRect(ctx,665,190,300,92,46,'rgba(255,250,241,.93)','#d8a16f');
      ctx.fillStyle=navy; ctx.textAlign='center';
      ctx.font='900 29px "Microsoft JhengHei","PingFang TC",sans-serif';
      ctx.fillText(`Lv.${lv.lv}  ${lv.title}`,815,247);

      // 角色是整張分享圖的主角：不再塞進相框。
      // 依素材比例 contain，讓人物完整、背景透明。
      fitImage(ctx,character,55,170,650,735,'contain');

      // 總分做第二視覺焦點。
      ctx.textAlign='center';
      ctx.fillStyle=orange;
      ctx.font='900 122px Arial,sans-serif';
      ctx.fillText(String(score),820,445);
      const scoreW=ctx.measureText(String(score)).width;
      ctx.textAlign='left'; ctx.fillStyle=navy;
      ctx.font='900 39px Arial,sans-serif';
      ctx.fillText('/ 16',820+scoreW/2+18,445);
      ctx.textAlign='center'; ctx.fillStyle=muted;
      ctx.font='800 22px "Microsoft JhengHei","PingFang TC",sans-serif';
      ctx.fillText('總成績',820,482);

      // 一句結果吐槽：做成大對話泡泡，是第三視覺焦點。
      roundedRect(ctx,500,535,475,245,34,cream,'#d5a174');
      ctx.fillStyle=brown; ctx.textAlign='left';
      ctx.font='900 30px "Microsoft JhengHei","PingFang TC",sans-serif';
      wrapText(ctx,resultJoke(score,state.bossCorrect),545,600,385,48,4);

      // 底部品牌 + 小 QR，不再讓 QR 搶戲。
      ctx.textAlign='left'; ctx.fillStyle=navy;
      ctx.font='900 28px Arial,sans-serif';
      ctx.fillText('@longcare.notes',105,1115);
      ctx.fillStyle=muted; ctx.font='700 18px "Microsoft JhengHei","PingFang TC",sans-serif';
      ctx.fillText('掃碼換你挑戰',105,1148);
      if(qr) ctx.drawImage(qr,105,1170,115,115);
      else { roundedRect(ctx,105,1170,115,115,10,'#fffaf1','#8c755f'); }

      // 魔王是右下角彩蛋：沒有卡片、沒有方框。
      fitImage(ctx,boss,745,970,245,235,'contain');
      ctx.textAlign='center'; ctx.fillStyle=brown;
      ctx.font='900 21px "Microsoft JhengHei","PingFang TC",sans-serif';
      ctx.fillText('魔王成績',865,1212);
      ctx.fillStyle=orange; ctx.font='900 34px Arial,sans-serif';
      ctx.fillText(`${state.bossCorrect} / 3`,865,1252);

      ctx.textAlign='center'; ctx.fillStyle='#7c6657';
      ctx.font='700 16px "Microsoft JhengHei","PingFang TC",sans-serif';
      ctx.fillText('LTC 長照研究室 · Long-term Care Lab',540,1310);

      shareBlob = await new Promise(resolve=>canvas.toBlob(resolve,'image/png',1));
      $('sharePanel').hidden=false;
      $('shareNote').textContent='完成。這次改成海報式戰績卡：角色是主角，魔王是右下角彩蛋。';
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
