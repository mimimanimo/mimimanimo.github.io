(function () {
  'use strict';

  // ---------- 문구 ----------

  // DASS-42 문항 번호 → 한국어. 예시가 있는 문항은 [본문, 예시].
  const ITEMS_KO = {
    1: '아주 사소한 일에도 속이 상하거나 화가 났다.',
    2: '입이 마르는 것을 느꼈다.',
    3: '긍정적인 감정을 전혀 느낄 수 없는 것 같았다.',
    4: ['숨쉬기가 힘들었다.', '몸을 움직이지 않았는데도 숨이 지나치게 가빠지거나 숨이 찼다'],
    5: '도무지 무언가를 시작할 기운이 나지 않았다.',
    6: '상황에 지나치게 반응하는 편이었다.',
    7: ['몸이 후들거리는 느낌이 들었다.', '다리에 힘이 풀릴 것 같았다'],
    8: '긴장을 풀기가 어려웠다.',
    9: '너무 불안해서, 끝나고 나서야 비로소 크게 안도했던 상황을 겪었다.',
    10: '앞으로 기대할 일이 아무것도 없다고 느꼈다.',
    11: '쉽게 속이 상하거나 기분이 상했다.',
    12: '신경을 곤두세우느라 에너지를 많이 쓰고 있다고 느꼈다.',
    13: '슬프고 우울했다.',
    14: ['무엇 때문이든 지체되면 조급해졌다.', '엘리베이터, 신호등, 기다려야 할 때'],
    15: '정신이 아득해지거나 쓰러질 것 같은 느낌이 들었다.',
    16: '거의 모든 것에 흥미를 잃었다고 느꼈다.',
    17: '내가 사람으로서 별 가치가 없다고 느꼈다.',
    18: '내가 꽤 예민해져 있다고 느꼈다.',
    19: ['덥지 않고 몸을 움직이지 않았는데도 눈에 띄게 땀이 났다.', '손에 땀이 남'],
    20: '뚜렷한 이유 없이 겁이 났다.',
    21: '삶이 살 만한 가치가 없다고 느꼈다.',
    22: '마음을 가라앉히고 쉬기가 어려웠다.',
    23: '음식을 삼키기가 어려웠다.',
    24: '내가 하는 일에서 아무런 즐거움도 느낄 수 없는 것 같았다.',
    25: ['몸을 움직이지 않았는데도 심장이 뛰는 것이 느껴졌다.', '심장이 빨리 뛰거나 박동이 한 번씩 건너뛰는 느낌'],
    26: '마음이 가라앉고 울적했다.',
    27: '몹시 짜증스러웠다.',
    28: '공황 상태에 가깝다고 느꼈다.',
    29: '속상한 일이 생기면 진정하기가 어려웠다.',
    30: '사소하지만 낯선 일 때문에 쩔쩔매게 될까 봐 두려웠다.',
    31: '어떤 일에도 열의를 가질 수 없었다.',
    32: '하던 일이 방해받는 것을 참기 어려웠다.',
    33: '신경이 몹시 긴장된 상태였다.',
    34: '내가 쓸모없는 사람이라고 느꼈다.',
    35: '하던 일을 계속하지 못하게 막는 것은 무엇이든 참지 못했다.',
    36: '몹시 겁에 질렸다.',
    37: '앞날에 희망을 가질 만한 것이 아무것도 보이지 않았다.',
    38: '삶이 무의미하다고 느꼈다.',
    39: '마음이 동요되어 안절부절못했다.',
    40: '당황해서 웃음거리가 될지도 모르는 상황이 걱정되었다.',
    41: ['몸이 떨렸다.', '손 떨림'],
    42: '무언가를 하려고 스스로 마음먹기가 어려웠다.',
  };

  // response_options 의 value 0~3 (원 보기 번호 1~4)
  const OPTIONS_KO = [
    '전혀 그렇지 않다',
    '가끔 그렇다',
    '자주 그렇다',
    '거의 항상 그렇다',
  ];
  

  const SCALE_KO = { Depression: '우울', Anxiety: '불안', Stress: '스트레스' };
  const GRADE_KO = { Normal: '정상', Mild: '경미', Moderate: '중등도', Severe: '심함', 'Extremely Severe': '매우 심함' };

  // ---------- 움직임 ----------

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HOLD_MS = 160;                      // 고른 보기를 잠깐 보여 준 뒤 넘어간다
  const SLIDE_MS = reduceMotion ? 1 : 1100;  // 답한 문항이 위로 올라가는 시간
  const FADE_MS = 200;                      // 다음 문항이 투명 → 불투명으로 나타나는 시간
  const SCREEN_MS = 220;

  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--slide', SLIDE_MS + 'ms');
  rootStyle.setProperty('--fade', FADE_MS + 'ms');
  rootStyle.setProperty('--screen', SCREEN_MS + 'ms');

  // ---------- 요소 ----------

  const $ = id => document.getElementById(id);
  const screens = { intro: $('intro'), survey: $('survey'), result: $('result') };
  const startBtn = $('start');
  const stage = $('stage');
  const track = $('track');
  const progressBar = stage.parentElement.querySelector('.progress');
  const progressFill = $('progress-fill');
  const backBtn = $('back');

  let data = null;       // { index, scales }
  let session = null;    // DassEngine.Session
  let current = null;    // 지금 보이는 문항 블록
  let busy = false;      // 넘어가는 동안 중복 입력 막기
  let record = null;     // 끝난 설문의 저장할 기록

  // ---------- 불러오기 ----------

  const cfg = window.DASS_CONFIG;
  $('save-fact').hidden = !cfg.submitUrl;
  DassEngine.load(cfg.dataDir, cfg.indexFile).then(loaded => {
    data = loaded;
    const t = loaded.index.total_items;
    // if (t && t.q1 != null && t.q3 != null) {
    //   $('length-fact').textContent = `응답에 따라 문항 수가 달라져요. 보통 ${t.q1}~${t.q3}문항이면 끝나요.`;
    // // }
    // $('length-fact').hidden = false;
    startBtn.disabled = false;
    startBtn.textContent = '시작하기';
  }).catch(err => {
    console.error(err);
    startBtn.textContent = '불러오지 못했어요';
    const msg = $('load-error');
    msg.textContent = location.protocol === 'file:'
      ? '파일을 직접 열면 문항 데이터를 읽을 수 없어요. 로컬 서버(예: python -m http.server)로 열어 주세요.'
      : '문항 데이터를 불러오지 못했어요. 잠시 후 새로고침해 주세요.';
    msg.hidden = false;
  });

  // ---------- 화면 전환 ----------

  function showScreen(next, beforeReveal) {
    const prev = Object.values(screens).find(s => !s.hidden);
    if (prev.classList.contains('is-hidden')) return false;  // 이미 전환 중 (두 번 누름)
    prev.classList.add('is-hidden');
    setTimeout(() => {
      prev.hidden = true;
      prev.classList.remove('is-hidden');
      next.classList.add('is-hidden');
      next.hidden = false;
      if (beforeReveal) beforeReveal();  // 화면이 배치된 뒤라 크기를 잴 수 있다
      next.offsetHeight;
      next.classList.remove('is-hidden');
    }, SCREEN_MS);
    return true;
  }

  // ---------- 문항 ----------

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderQuestion(item, number) {
    const ko = ITEMS_KO[item.item];
    const [text, example] = Array.isArray(ko) ? ko : [ko || item.text, null];

    const block = el('section', 'q');
    block.dataset.order = number;
    block.appendChild(el('p', 'q-num', String(number)));
    const h = el('h2', 'q-text', text);
    h.id = 'q-' + number;
    block.appendChild(h);
    if (example) block.appendChild(el('p', 'q-ex', '예: ' + example));

    const opts = el('div', 'opts');
    opts.setAttribute('role', 'radiogroup');
    opts.setAttribute('aria-labelledby', h.id);
    OPTIONS_KO.forEach((label, v) => {
      const b = el('button', 'opt');
      b.type = 'button';
      b.dataset.v = v;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      b.appendChild(el('span', 'opt-n', String(v + 1)));
      b.appendChild(el('span', null, label));
      opts.appendChild(b);
    });
    block.appendChild(opts);
    return block;
  }

  function renderLead() {
    const block = el('div', 'q q-intro');
    block.appendChild(el('p', 'q-lead', '지난 일주일 동안 다음 문장이 나에게 얼마나 해당되었는지 골라 주세요.'));
    return block;
  }

  // 답한 문항 블록 (지나간 모양, 고른 답 표시). 오래돼서 지웠으면 응답 기록으로 다시 만든다.
  function pastBlock(r) {
    let block = track.querySelector(`.q[data-order="${r.order}"]`);
    if (!block) {
      const scale = session.scales.find(s => s.name === r.scale);
      block = renderQuestion(scale.data.items[r.k - 1], r.order);
      block.classList.add('is-past');
    }
    markSelected(block, r.value - 1);
    return block;
  }

  // animate 가 아니면 nodes 의 움직임(transition)을 잠깐 끄고 바로 적용한다.
  function apply(animate, nodes, fn) {
    if (!animate) for (const n of nodes) n.style.transition = 'none';
    fn();
    if (!animate) {
      track.offsetHeight;
      for (const n of nodes) n.style.transition = '';
    }
  }

  const OPTS_LIFT = 50;  // 보기를 가운데쯤보다 이만큼 더 올린다
  const HEAD_TOP = 40;   // 번호(첫 문항이면 안내 문구) 글자 윗변이 멈추는 높이 (문항 영역 윗변에서)

  // 화면 맨 위에 맞출 글자: 번호, 첫 문항이면 그 위 안내 문구
  function headOf(block) {
    const lead = block.previousElementSibling;
    const withLead = lead && lead.classList.contains('q-intro') && !lead.classList.contains('is-past');
    return (withLead ? lead : block).firstElementChild;
  }

  // 지금 문항 블록이 화면 가운데쯤(정가운데보다 살짝 위)에서 OPTS_LIFT 만큼 더 위에 오도록 맞춘다.
  // 보기는 이 자리에 멈춘다. 다만 번호(첫 문항이면 안내 문구)가 HEAD_TOP 보다 위로 잘려 나가지 않을 만큼만 올린다.
  // 문항이 화면보다 길면 보기가 잘리지 않게 아래쪽에 맞춘다.
  let anchorY = 0;  // 맞춘 문항 블록 윗변의 화면 안 위치
  function anchorTo(block, animate) {
    const h = stage.clientHeight, space = h - block.offsetHeight;
    const highest = HEAD_TOP - (headOf(block).offsetTop - block.offsetTop);
    anchorY = Math.round(Math.min(space - 12, Math.max(highest, space * 0.40 - OPTS_LIFT)));
    apply(animate, [track], () => {
      track.style.transform = `translate3d(0, ${anchorY - block.offsetTop}px, 0)`;
    });
  }

  // 번호·질문(첫 문항이면 위 안내 문구까지)은 보기보다 더 올려 화면 위쪽(HEAD_TOP)에 둔다.
  // anchorTo 와 함께 부르면 처음엔 붙어 있다가 한 번에 올라가면서 벌어진다.
  // 그 위의 지난 문항도 같은 만큼 더 밀려 올라간다.
  function raise(block, animate) {
    const first = headOf(block);
    const up = Math.max(0, anchorY + first.offsetTop - block.offsetTop - HEAD_TOP);
    const transform = up ? `translate3d(0, ${-up}px, 0)` : '';
    const heads = [...block.children].filter(n => !n.classList.contains('opts'));
    const above = [...track.children].slice(0, [...track.children].indexOf(block));
    apply(animate, [...heads, ...above], () => {
      for (const n of [...heads, ...above]) n.style.transform = transform;
    });
  }

  // 올렸던 블록을 원래 모양으로 (이전 문항으로 돌아갈 때)
  function lower(block) {
    block.style.transform = '';
    for (const n of block.children) n.style.transform = '';
  }

  // 지금 문항과 바로 앞 두 블록만 남긴다. 위쪽 블록이 빠진 만큼 즉시 다시 맞춰서 화면은 그대로다.
  function prune() {
    const extra = track.children.length - 3;
    if (extra <= 0) return;
    for (let i = 0; i < extra; i++) track.firstElementChild.remove();
    anchorTo(current, false);
  }

  function setProgress() {
    const p = Math.round(session.progress() * 100);
    progressFill.style.width = p + '%';
    progressBar.setAttribute('aria-valuenow', p);
    backBtn.disabled = !session.responses.length;
  }

  function markSelected(block, v) {
    for (const b of block.querySelectorAll('.opt')) {
      const on = Number(b.dataset.v) === v;
      b.classList.toggle('is-selected', on);
      b.setAttribute('aria-checked', String(on));
    }
  }

  function startSurvey() {
    showScreen(screens.survey, () => {
      session = new DassEngine.Session(data.scales);
      record = null;
      busy = false;
      track.textContent = '';
      track.appendChild(renderLead());
      const next = session.next();
      current = renderQuestion(next.item, 1);
      track.appendChild(current);
      anchorTo(current, false);
      raise(current, false);
      setProgress();
    });
  }

  function pick(btn) {
    if (busy || !current || !current.contains(btn)) return;
    busy = true;
    markSelected(current, Number(btn.dataset.v));
    session.answer(Number(btn.dataset.v));
    setProgress();
    setTimeout(advance, HOLD_MS);
  }

  function advance() {
    const next = session.next();
    if (!next) {
      current.classList.add('is-past');
      record = buildRecord();
      save();
      showScreen(screens.result, renderResult);
      return;
    }
    for (const node of track.children) node.classList.add('is-past');
    current = renderQuestion(next.item, session.responses.length + 1);
    current.classList.add('is-entering');
    track.appendChild(current);
    anchorTo(current, true);     // 답한 문항은 위로 밀려 사라지고
    raise(current, true);        // 새 문항은 한 번에 올라오며 번호·질문만 맨 위까지 간다
    current.offsetHeight;
    current.classList.remove('is-entering');  // 새 문항이 서서히 나타난다
    setTimeout(() => {
      prune();
      busy = false;
    }, SLIDE_MS);
  }

  // 이전 문항으로: 마지막 응답을 취소하고 그 문항을 다시 내려 보여 준다 (전에 고른 답은 표시해 둔다).
  // 다시 답하면 그다음 문항은 새 응답을 바탕으로 다시 고른다.
  function goBack() {
    if (busy || !session || !session.responses.length) return;
    busy = true;
    const leaving = current;
    const popped = session.undo();
    const prev = pastBlock(popped);
    if (!prev.parentNode) track.insertBefore(prev, leaving);
    // 첫 문항이면 그 위 안내 문구도 다시 보이도록
    if (popped.order === 1) {
      const lead = prev.previousElementSibling || track.insertBefore(renderLead(), prev);
      lead.classList.remove('is-past');
      lower(lead);
    }
    lower(prev);
    anchorTo(leaving, false);             // 위에 끼운 만큼 즉시 맞춰서 화면은 그대로
    leaving.classList.add('is-leaving');  // 지금 문항은 사라지고
    current = prev;
    current.classList.remove('is-past');
    anchorTo(current, true);              // 이전 문항이 다시 내려오며
    raise(current, true);                 // 번호·질문은 맨 위에 멈춘다
    setProgress();
    setTimeout(() => {
      leaving.remove();
      busy = false;
    }, SLIDE_MS);
  }

  backBtn.addEventListener('click', goBack);

  track.addEventListener('click', e => {
    const btn = e.target.closest('.opt');
    if (btn) pick(btn);
  });

  // 키보드 1~4, 이전은 Backspace (PC 에서 시험할 때)
  document.addEventListener('keydown', e => {
    if (screens.survey.hidden || !current || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Backspace') return goBack();
    const v = '1234'.indexOf(e.key);
    if (v >= 0) pick(current.querySelectorAll('.opt')[v]);
  });

  window.addEventListener('resize', () => {
    if (screens.survey.hidden || !current) return;
    anchorTo(current, false);
    raise(current, false);
  });

  // ---------- 결과 ----------

  function renderResult() {
    $('result-summary').textContent = `총 ${session.responses.length}개 문항에 응답했어요.`;
    const list = $('scores');
    list.textContent = '';
    for (const s of session.scales) {
      const g = s.result.grade;
      const li = el('li', 'score');
      const head = el('div', 'score-head');
      head.appendChild(el('span', 'score-name', SCALE_KO[s.name] || s.name));
      head.appendChild(el('span', 'score-grade', GRADE_KO[s.data.grades[g]] || s.data.grades[g]));
      li.appendChild(head);
      const meter = el('div', 'meter');
      meter.setAttribute('aria-hidden', 'true');
      s.data.grades.forEach((_, i) => meter.appendChild(el('i', i <= g ? 'on' : null)));
      li.appendChild(meter);
      const labels = el('div', 'meter-labels');
      labels.appendChild(el('span', null, GRADE_KO[s.data.grades[0]]));
      labels.appendChild(el('span', null, GRADE_KO[s.data.grades[s.data.grades.length - 1]]));
      li.appendChild(labels);
      list.appendChild(li);
    }
    screens.result.querySelector('.result-body').scrollTop = 0;
  }

  // ---------- 응답 저장 ----------

  const PENDING_KEY = 'dass_pending';
  const DEVICE_KEY = 'dass_device';

  function newId() {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  }

  // 이 브라우저의 id. 처음 한 번 만들어 두고 계속 쓴다. 서버는 기기마다 첫 응답만 저장한다.
  let device = null;
  function deviceId() {
    if (device) return device;
    try {
      device = localStorage.getItem(DEVICE_KEY);
      if (!device) localStorage.setItem(DEVICE_KEY, device = newId());
    } catch (e) {
      device = newId();  // 저장소를 못 쓰는 브라우저면 이번 방문 동안만
    }
    return device;
  }

  // 저장할 기록: 문항 점수(원 보기 번호 1~4)와 척도별 등급(0~4)
  function buildRecord() {
    const answers = {};
    for (const r of session.responses) answers[r.item] = r.value;
    const grades = {};
    for (const s of session.scales) grades[s.name] = s.result.grade;
    return { id: newId(), device: deviceId(), answers, grades };
  }

  function readPending() {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY)) || []; } catch (e) { return []; }
  }

  function writePending(list) {
    try {
      if (list.length) localStorage.setItem(PENDING_KEY, JSON.stringify(list));
      else localStorage.removeItem(PENDING_KEY);
    } catch (e) { /* 저장소를 못 쓰는 브라우저 */ }
  }

  // 보내기 전에 이 브라우저에 먼저 남겨 두고, 서버가 받으면 지운다.
  // 못 보낸 기록은 다음에 사이트를 열 때 다시 보낸다 (같은 id 는 서버가 한 번만 저장).
  // 서버 답의 status: "saved" | "duplicate" | "device"(이미 참여한 기기라 저장 안 함)
  function submit(rec) {
    writePending(readPending().filter(r => r.id !== rec.id).concat([rec]));
    // text/plain 이라 다른 도메인(Google Apps Script)으로 보내도 사전 요청(preflight)이 없다
    return fetch(cfg.submitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(rec),
    }).then(res => res.json().catch(() => null).then(body => {
      // 받았거나(ok) 형식이 틀려 거절됐으면(4xx, 또는 Apps Script 의 ok:false) 보관함에서 뺀다.
      // 5xx·네트워크 오류·알 수 없는 답만 남겨 두었다가 나중에 다시 보낸다.
      const accepted = res.ok && body && body.ok === true;
      const rejected = (body && body.ok === false) || (res.status >= 400 && res.status < 500);
      if (accepted || rejected) writePending(readPending().filter(r => r.id !== rec.id));
      if (!accepted) throw new Error('HTTP ' + res.status + (body && body.error ? ' ' + body.error : ''));
      return body.status;
    }));
  }

  const saveBtn = $('save');
  const SAVE_TEXT = {
    saving: '응답을 저장하는 중…',
    saved: '응답이 저장되었어요',
    already: '이미 참여한 기록이 있어 이번 응답은 저장하지 않았어요',
    failed: '저장하지 못했어요 · 다시 시도',
  };

  function setSaveState(state) {
    saveBtn.hidden = !cfg.submitUrl;
    saveBtn.disabled = state !== 'failed';
    saveBtn.textContent = SAVE_TEXT[state];
  }

  function save() {
    if (!cfg.submitUrl || !record) return;
    setSaveState('saving');
    submit(record).then(status => setSaveState(status === 'device' ? 'already' : 'saved'), err => {
      console.error(err);
      setSaveState('failed');
    });
  }

  if (cfg.submitUrl) for (const rec of readPending()) submit(rec).catch(() => {});

  startBtn.addEventListener('click', () => { if (data) startSurvey(); });
  $('restart').addEventListener('click', () => showScreen(screens.intro));
  saveBtn.addEventListener('click', save);
})();
