(() => {
  'use strict';
  const GAME_URL = 'https://yinyi114work-ai.github.io/knowlongterm/';
  const TOTAL_NORMAL = 13;
  const TOTAL_BOSS = 3;
  const TOTAL = 16;
  const RESULT_ABILITIES = ['安全判斷', '溝通應變', '流程敏感'];
  const BASE_W = 941;
  const BASE_H = 1672;
  const $ = (id) => document.getElementById(id);
  const screens = ['startScreen', 'quizScreen', 'bossScreen', 'resultScreen'];
  let DATA = null;
  let state = null;
  let shareBlob = null;

  const levelImages = {
    1: 'assets/result-lv1.png',
    2: 'assets/result-lv2.png',
    3: 'assets/result-lv3.png',
    4: 'assets/result-lv4.png',
    5: 'assets/result-lv5.png'
  };

  const shuffle = (items) => {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  function normalizeQuestion(q) {
    return {
      ...q,
      choices: ['A', 'B', 'C'].map((letter) => q.choices[letter]),
      answer: q.correctAnswer,
      wrongFeedback: q.incorrectFeedback
    };
  }

  async function boot() {
    try {
      const response = await fetch('quiz-data.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('題庫下載失敗');
      const raw = await response.json();
      DATA = {
        normal: raw.generalQuestions.map(normalizeQuestion),
        boss: raw.bossQuestions.map(normalizeQuestion),
        levels: raw.levels,
        titleRules: raw.titleRules,
        bossResults: raw.bossResults
      };
      $('startBtn').disabled = false;
      $('loadingLabel').hidden = true;
    } catch (error) {
      console.error(error);
      $('loadingLabel').textContent = '題庫載入失敗，請重新整理';
    }
  }

  function show(id) {
    screens.forEach((screen) => $(screen).classList.toggle('active', screen === id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function sampleNormal() {
    const categories = [...new Set(DATA.normal.map((q) => q.category))];
    let fallback = [];
    for (let attempt = 0; attempt < 600; attempt++) {
      const picked = [];
      for (const category of categories) {
        picked.push(...shuffle(DATA.normal.filter((q) => q.category === category)).slice(0, 2));
      }
      const used = new Set(picked.map((q) => q.id));
      const bonusCategory = shuffle(categories)[0];
      const bonusPool = DATA.normal.filter((q) => q.category === bonusCategory && !used.has(q.id));
      const bonus = shuffle(bonusPool)[0] || shuffle(DATA.normal.filter((q) => !used.has(q.id)))[0];
      if (bonus) picked.push(bonus);
      fallback = picked;

      const hardCount = picked.filter((q) => q.difficulty === '難').length;
      const abilityCounts = Object.fromEntries(RESULT_ABILITIES.map((ability) => [
        ability,
        picked.filter((q) => q.resultAbility === ability).length
      ]));
      const answerCounts = ['A', 'B', 'C'].map((letter) => picked.filter((q) => q.answer === letter).length);
      const valid = picked.length === TOTAL_NORMAL &&
        hardCount >= 2 && hardCount <= 4 &&
        RESULT_ABILITIES.every((ability) => abilityCounts[ability] >= 2) &&
        Math.max(...answerCounts) <= 6;
      if (valid) return shuffle(picked);
    }
    return shuffle(fallback).slice(0, TOTAL_NORMAL);
  }

  function reset() {
    state = {
      normal: sampleNormal(),
      boss: shuffle(DATA.boss).slice(0, TOTAL_BOSS),
      phase: 'normal',
      idx: 0,
      normalCorrect: 0,
      bossCorrect: 0,
      answers: []
    };
    shareBlob = null;
    $('sharePanel').hidden = true;
    show('quizScreen');
    renderQuestion();
  }

  function currentList() { return state.phase === 'normal' ? state.normal : state.boss; }
  function currentQ() { return currentList()[state.idx]; }
  function absoluteIndex() { return state.phase === 'normal' ? state.idx : TOTAL_NORMAL + state.idx; }

  function renderQuestion() {
    const q = currentQ();
    const boss = state.phase === 'boss';
    const abs = absoluteIndex();
    $('stageLabel').textContent = boss ? 'FINAL BATTLE' : 'SURVIVAL MISSION';
    $('stageName').textContent = boss ? '魔王題' : '長照求生題';
    $('qNow').textContent = String(abs + 1);
    $('progressBar').style.width = `${((abs + 1) / TOTAL) * 100}%`;
    $('categoryChip').textContent = q.category;
    $('difficultyChip').textContent = boss ? '魔王' : q.difficulty;
    $('questionTitle').textContent = q.title;
    $('questionText').textContent = q.question;
    $('answerHint').textContent = boss ? '魔王題不提示，照你的專業判斷選。' : '選一個最符合你判斷的做法';
    $('answerHint').hidden = false;
    $('feedbackPanel').hidden = true;
    $('feedbackPanel').classList.remove('wrong');

    const box = $('answers');
    box.innerHTML = '';
    const options = shuffle(q.choices.map((text, index) => ({
      text,
      original: ['A', 'B', 'C'][index]
    })));
    options.forEach((option, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'answer-btn';
      button.dataset.original = option.original;
      const letter = document.createElement('span');
      letter.className = 'answer-letter';
      letter.textContent = ['A', 'B', 'C'][index];
      const copy = document.createElement('span');
      copy.textContent = option.text;
      button.append(letter, copy);
      button.addEventListener('click', () => selectAnswer(button, option.original));
      box.appendChild(button);
    });
  }

  function selectAnswer(button, original) {
    const q = currentQ();
    const correct = original === q.answer;
    const buttons = [...$('answers').children];
    buttons.forEach((item) => {
      item.disabled = true;
      if (item.dataset.original === q.answer) item.classList.add('correct');
    });
    button.classList.add('selected', correct ? 'correct' : 'wrong');
    if (state.phase === 'normal' && correct) state.normalCorrect++;
    if (state.phase === 'boss' && correct) state.bossCorrect++;
    state.answers.push({
      id: q.id,
      phase: state.phase,
      resultAbility: q.resultAbility,
      correct
    });

    $('answerHint').hidden = true;
    $('feedbackTitle').textContent = correct ? '答對了！' : '這題被偷襲了';
    $('feedbackText').textContent = correct ? q.correctFeedback : q.wrongFeedback;
    $('explanationText').textContent = `解析：${q.explanation}`;
    $('feedbackPanel').classList.toggle('wrong', !correct);
    $('feedbackPanel').hidden = false;

    const atEnd = state.idx === currentList().length - 1;
    $('nextBtn').textContent = atEnd
      ? (state.phase === 'normal' ? '進入魔王關 →' : '查看我的結果 →')
      : '下一題 →';
    $('nextBtn').focus({ preventScroll: true });
  }

  function advance() {
    if ($('feedbackPanel').hidden) return;
    if (state.idx < currentList().length - 1) {
      state.idx++;
      renderQuestion();
      return;
    }
    if (state.phase === 'normal') {
      $('progressBar').style.width = `${(TOTAL_NORMAL / TOTAL) * 100}%`;
      show('bossScreen');
      return;
    }
    showResult();
  }

  function beginBoss() {
    state.phase = 'boss';
    state.idx = 0;
    show('quizScreen');
    renderQuestion();
  }

  function totalCorrect() { return state.normalCorrect + state.bossCorrect; }

  function levelFor(score) {
    const found = DATA.levels.find((item) => score >= item.min && score <= item.max);
    return { lv: found.level, title: found.label, min: found.min, max: found.max };
  }

  function abilityStats() {
    const stats = {};
    for (const ability of RESULT_ABILITIES) {
      const related = state.answers.filter((answer) => answer.resultAbility === ability);
      const correct = related.filter((answer) => answer.correct).length;
      stats[ability] = {
        correct,
        total: related.length,
        percent: related.length ? Math.round((correct / related.length) * 100) : 0
      };
    }
    return stats;
  }

  function resultTitle(score, level, stats) {
    if (score === 16) return DATA.titleRules.special['16'];
    if (score === 15 && state.bossCorrect === 3) return DATA.titleRules.special['15_and_boss_3'];
    const values = RESULT_ABILITIES.map((ability) => ({ ability, value: stats[ability].percent }))
      .sort((a, b) => b.value - a.value);
    const key = values[0].value === values[1].value ? 'tie' : values[0].ability;
    return DATA.titleRules.byLevel[String(level.lv)][key];
  }

  function resultJoke(score, bossCorrect) {
    if (score === 16) return '全題通關，連魔王都得先抽號碼牌。你今天可以放心戴上皇冠了！';
    if (bossCorrect === 3) return '魔王三題全收。不是運氣，是你的安全、溝通與流程雷達真的有開。';
    if (bossCorrect === 0 && score >= 12) return '前面一路很穩，最後被魔王偷襲。沒關係，老江湖也會遇到突發狀況。';
    if (bossCorrect === 0) return '魔王今天很有精神，但你已經把下一次不該踩的雷看清楚了。';
    if (score <= 5) return '先不用硬撐，新手村就是拿來練功的。知道哪裡會出事，已經是第一步。';
    if (score <= 8) return '線索開始接上了。再多幾次現場練習，你的求生雷達會越來越穩。';
    if (score <= 11) return '多工情境已經不會讓你立刻斷線，下一步是把判斷做得更穩、更快。';
    if (score <= 14) return '不是你太厲害，是這些情境你真的看過太多次了。明天也繼續加油吧！';
    return '皇冠已經在路上。你離傳說只差最後一小步。';
  }

  function bossResult() {
    return DATA.bossResults.find((item) => state.bossCorrect >= item.min && state.bossCorrect <= item.max);
  }

  function showResult() {
    const score = totalCorrect();
    const level = levelFor(score);
    const stats = abilityStats();
    const title = resultTitle(score, level, stats);
    $('rankText').textContent = `Lv.${level.lv} ${level.title}`;
    $('titleText').textContent = title;
    $('scoreBig').textContent = String(score);
    $('normalScore').textContent = `${state.normalCorrect} / ${TOTAL_NORMAL}`;
    $('bossScore').textContent = `${state.bossCorrect} / ${TOTAL_BOSS}`;
    $('resultJoke').textContent = resultJoke(score, state.bossCorrect);
    $('sharePanel').hidden = true;
    $('shareNote').textContent = '正在生成你的完整 9:16 結果圖…';
    show('resultScreen');
    generateShareCard();
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`圖片載入失敗：${src}`));
      image.src = src;
    });
  }

  function roundedRect(ctx, x, y, width, height, radius, fill) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
  }

  function fitImage(ctx, image, x, y, width, height) {
    const scale = Math.min(width / image.width, height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function fittedFont(ctx, text, maxWidth, startSize, weight = 900) {
    let size = startSize;
    do {
      ctx.font = `${weight} ${size}px "PingFang TC","Microsoft JhengHei",sans-serif`;
      size--;
    } while (ctx.measureText(text).width > maxWidth && size > 19);
  }

  function wrapLines(ctx, text, maxWidth, maxLines) {
    const lines = [];
    let line = '';
    for (const char of [...text]) {
      const test = line + char;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = char;
        if (lines.length === maxLines - 1) break;
      } else {
        line = test;
      }
    }
    if (line && lines.length < maxLines) lines.push(line);
    return lines;
  }

  async function makeQR() {
    const maker = $('qrMaker');
    maker.innerHTML = '';
    if (typeof QRCode === 'undefined') return null;
    new QRCode(maker, {
      text: GAME_URL,
      width: 200,
      height: 200,
      colorDark: '#263947',
      colorLight: '#fffdf8',
      correctLevel: QRCode.CorrectLevel.M
    });
    await new Promise((resolve) => window.setTimeout(resolve, 60));
    return maker.querySelector('canvas') || maker.querySelector('img');
  }

  async function generateShareCard() {
    const canvas = $('shareCanvas');
    const ctx = canvas.getContext('2d');
    const score = totalCorrect();
    const level = levelFor(score);
    const stats = abilityStats();
    const title = resultTitle(score, level, stats);
    const battle = bossResult();
    const bossAsset = state.bossCorrect === 3
      ? 'assets/boss-perfect.png'
      : state.bossCorrect === 0
        ? 'assets/boss-low.png'
        : 'assets/boss-average.png';
    $('generateBtn').disabled = true;
    $('generateBtn').textContent = '生成中…';

    try {
      const [background, boss, qr] = await Promise.all([
        loadImage(levelImages[level.lv]),
        loadImage(bossAsset),
        makeQR()
      ]);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(canvas.width / BASE_W, 0, 0, canvas.height / BASE_H, 0, 0);
      ctx.drawImage(background, 0, 0, BASE_W, BASE_H);

      const ink = '#3d2d24';
      const orange = '#c8442f';
      const gold = '#f3b83f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      fittedFont(ctx, `Lv.${level.lv}  ${level.title}`, 360, 27);
      ctx.fillStyle = ink;
      ctx.fillText(`Lv.${level.lv}  ${level.title}`, 470, 895);

      fittedFont(ctx, title, 560, 43);
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#f7d97e';
      ctx.strokeText(title, 438, 974);
      ctx.fillStyle = ink;
      ctx.fillText(title, 438, 974);

      const scoreParts = [
        { text: '總成績', font: '900 24px "PingFang TC","Microsoft JhengHei",sans-serif', color: ink, offset: 0 },
        { text: String(score), font: '900 56px Arial,sans-serif', color: orange, offset: -4 },
        { text: '/ 16 題', font: '900 28px Arial,sans-serif', color: ink, offset: 0 }
      ];
      const scoreGap = 13;
      const scoreWidths = scoreParts.map((part) => {
        ctx.font = part.font;
        return ctx.measureText(part.text).width;
      });
      const scoreRowWidth = scoreWidths.reduce((sum, width) => sum + width, 0) + scoreGap * (scoreParts.length - 1);
      let scoreX = 438 - scoreRowWidth / 2;
      ctx.textAlign = 'left';
      scoreParts.forEach((part, index) => {
        ctx.font = part.font;
        ctx.fillStyle = part.color;
        ctx.fillText(part.text, scoreX, 1030 + part.offset);
        scoreX += scoreWidths[index] + scoreGap;
      });

      const rows = [
        { label: '安全判斷', percent: stats['安全判斷'].percent },
        { label: '溝通應變', percent: stats['溝通應變'].percent },
        { label: '流程敏感', percent: stats['流程敏感'].percent },
        { label: '今晚睡床機率', percent: Math.round((score / TOTAL) * 100) }
      ];
      rows.forEach((row, index) => {
        const y = 1093 + index * 51;
        ctx.textAlign = 'left';
        ctx.font = '900 20px "PingFang TC","Microsoft JhengHei",sans-serif';
        ctx.fillStyle = ink;
        ctx.fillText(row.label, 171, y);
        roundedRect(ctx, 307, y - 10, 354 * (row.percent / 100), 20, 10, gold);
        ctx.textAlign = 'right';
        ctx.font = '900 21px Arial,sans-serif';
        ctx.fillStyle = ink;
        ctx.fillText(`${row.percent}%`, 696, y);
      });

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.font = '800 21px "PingFang TC","Microsoft JhengHei",sans-serif';
      ctx.fillStyle = ink;
      const jokeLines = wrapLines(ctx, resultJoke(score, state.bossCorrect), 470, 3);
      jokeLines.forEach((line, index) => ctx.fillText(line, 190, 1340 + index * 34));

      fitImage(ctx, boss, 744, 940, 170, 170);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 21px "PingFang TC","Microsoft JhengHei",sans-serif';
      ctx.fillStyle = ink;
      ctx.fillText(battle.label, 823, 1140);
      ctx.font = '900 35px "PingFang TC","Microsoft JhengHei",sans-serif';
      ctx.fillStyle = orange;
      ctx.fillText(`${state.bossCorrect} / 3 題`, 823, 1194);

      if (qr) ctx.drawImage(qr, 722, 1316, 160, 160);
      else roundedRect(ctx, 722, 1316, 160, 160, 12, '#fffdf8');

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      shareBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1));
      $('sharePanel').hidden = false;
      $('shareNote').textContent = '完整結果圖已完成：包含專屬稱號、四項能力、魔王成績、QR Code 與 @longcare.notes。';
      $('generateBtn').textContent = '重新生成結果圖';
      $('sharePanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      console.error(error);
      $('shareNote').textContent = '結果圖生成失敗，請重新整理後再試一次。';
      $('generateBtn').textContent = '重新生成結果圖';
    } finally {
      $('generateBtn').disabled = false;
    }
  }

  function shareCopy() {
    const level = levelFor(totalCorrect());
    const title = resultTitle(totalCorrect(), level, abilityStats());
    return `我在《長照求生王》拿到 ${totalCorrect()}/16，稱號「${title}」，魔王題 ${state.bossCorrect}/3！換你挑戰：${GAME_URL}`;
  }

  async function shareImage() {
    if (!shareBlob) await generateShareCard();
    if (!shareBlob) return;
    const file = new File([shareBlob], '長照求生王_我的9x16戰績.png', { type: 'image/png' });
    const text = shareCopy();
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: '長照求生王｜我的戰績', text, files: [file] });
      } else if (navigator.share) {
        await navigator.share({ title: '長照求生王｜我的戰績', text, url: GAME_URL });
      } else {
        downloadImage();
        $('shareNote').textContent = '瀏覽器不支援直接分享，已改為下載圖片。';
      }
    } catch (error) {
      if (error?.name !== 'AbortError') console.error(error);
    }
  }

  function downloadImage() {
    if (!shareBlob) {
      generateShareCard().then(() => { if (shareBlob) downloadImage(); });
      return;
    }
    const anchor = document.createElement('a');
    const objectUrl = URL.createObjectURL(shareBlob);
    anchor.href = objectUrl;
    anchor.download = '長照求生王_我的9x16戰績.png';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  async function shareChallenge() {
    const text = '來玩《長照求生王》：16 題測你的長照求生力，最後還有魔王題。';
    try {
      if (navigator.share) {
        await navigator.share({ title: '長照求生王', text, url: GAME_URL });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text}\n${GAME_URL}`);
        $('shareNote').textContent = '遊戲介紹與網址已複製，可以貼給朋友。';
      } else {
        window.prompt('複製這個遊戲網址', GAME_URL);
      }
    } catch (error) {
      if (error?.name !== 'AbortError') console.error(error);
    }
  }

  $('startBtn').addEventListener('click', reset);
  $('bossBtn').addEventListener('click', beginBoss);
  $('nextBtn').addEventListener('click', advance);
  $('restartBtn').addEventListener('click', reset);
  $('generateBtn').addEventListener('click', generateShareCard);
  $('shareImageBtn').addEventListener('click', shareImage);
  $('downloadBtn').addEventListener('click', downloadImage);
  $('resultShareBtn').addEventListener('click', shareImage);
  $('challengeShareBtn').addEventListener('click', shareChallenge);
  $('homeLink').addEventListener('click', (event) => {
    event.preventDefault();
    show('startScreen');
  });

  boot();
})();
