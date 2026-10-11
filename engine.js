// DASS 조기 종료(curtail) 검사 엔진.
// curtail_one.py 가 내보낸 <척도>_site.json 의 "algorithm" 설명을 그대로 옮겼다. 화면과는 무관하다.
(function (global) {
  'use strict';

  // 오름차순 배열에서 x 미만인 원소 개수
  function countLess(arr, x) {
    let lo = 0, hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] < x) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  // 오름차순 배열에서 x 이하인 원소 개수
  function countLessEq(arr, x) {
    let lo = 0, hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] <= x) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  // score가 속한 등급: cutoffs[g][0] <= score 인 가장 큰 g
  function gradeOfScore(cutoffs, score) {
    let g = 0;
    for (let i = 0; i < cutoffs.length; i++) if (cutoffs[i][0] <= score) g = i;
    return g;
  }

  function leafValue(m, t, x) {
    const split = m.split, value = m.value, right = m.right;
    let i = m.roots[t];
    while (split[i] >= 0) i = x[split[i]] < value[i] ? i + 1 : i + right[i];
    return value[i];
  }

  // 회귀면 점수 하나, 분류면 등급 확률 배열을 돌려준다.
  function predict(model, answers, x, nGrades, isClf) {
    if (model.type === 'table') {
      let idx = 0;  // sum a_j * 4^(k-j), 첫 응답이 가장 높은 자리
      for (let j = 0; j < answers.length; j++) idx = idx * 4 + answers[j];
      return model.values[idx];
    }
    if (model.type !== 'trees') throw new Error('알 수 없는 model.type: ' + model.type);

    const members = model.members;
    if (!isClf) {
      let sum = 0;
      for (const m of members) {
        let z = [].concat(m.intercept)[0];
        for (let t = 0; t < m.roots.length; t++) z += leafValue(m, t, x);
        sum += z;
      }
      return sum / members.length;
    }
    const avg = new Array(nGrades).fill(0);
    for (const m of members) {
      const z = [].concat(m.intercept);
      for (let t = 0; t < m.roots.length; t++) z[m.root_class[t]] += leafValue(m, t, x);
      const top = Math.max.apply(null, z);
      let s = 0;
      const ex = z.map(v => { const e = Math.exp(v - top); s += e; return e; });
      for (let g = 0; g < nGrades; g++) avg[g] += ex[g] / s / members.length;
    }
    return avg;
  }

  function normalizeOrUniform(weights, feasible) {
    const total = weights.reduce((a, b) => a + b, 0);
    if (total > 0) return weights.map(w => w / total);
    const n = feasible.filter(Boolean).length;
    return feasible.map(f => (f ? 1 / n : 0));
  }

  // 한 척도의 응답 a_1..a_k (0~3) 를 받아 현재 판정과 멈춤 여부를 계산한다.
  function evaluate(scale, answers, demographics) {
    const K = scale.items.length, k = answers.length;
    const cutoffs = scale.cutoffs, G = cutoffs.length;
    let S = 0;
    for (const a of answers) S += a;
    const r = K - k, maxS = S + 3 * r;

    if (k >= K) {
      const g = gradeOfScore(cutoffs, S);
      return { k, S, score: S, grade: g, probs: cutoffs.map((_, i) => (i === g ? 1 : 0)), stop: true, final: true };
    }

    const feasible = cutoffs.map(c => c[0] <= maxS && c[1] >= S);
    const stage = scale.stages[k - 1];
    const isClf = scale.stage_model === 'classification';
    const x = demographics ? answers.concat(demographics) : answers;
    const out = predict(stage.model, answers, x, G, isClf);

    let probs, score = null;
    if (isClf) {
      probs = normalizeOrUniform(out.map((p, g) => (feasible[g] ? p : 0)), feasible);
    } else {
      score = Math.min(Math.max(out, S), maxS);
      const e = stage.residual.bins[countLessEq(stage.residual.edges, score)];
      const n = cutoffs.map(c => {
        const lo = Math.max(c[0], S) - 0.5 - score;
        const hi = Math.min(c[1], maxS) + 0.5 - score;
        return hi > lo ? countLess(e, hi) - countLess(e, lo) : 0;
      });
      probs = normalizeOrUniform(n, feasible);
    }

    let g = 0;
    for (let i = 1; i < G; i++) if (probs[i] > probs[g]) g = i;
    if (scale.stopping.decision_rule === 'score') g = gradeOfScore(cutoffs, score);

    const stop = k >= scale.stopping.min_items && probs[g] >= scale.stopping.tau[g];
    return { k, S, score, grade: g, probs, stop, final: false };
  }

  // 세 척도를 따로 돌리되, 묻는 순서는 척도를 섞는다.
  // 각 척도 안에서는 items 순서(모델이 정한 순서)를 지키고, 다음 척도는 아직 안 끝난 척도 중
  // 무작위로 고른다. 남은 척도가 둘 이상이면 방금 물은 척도는 연달아 고르지 않는다.
  function Session(scales, random) {
    this.random = random || Math.random;
    this.scales = scales.map(data => ({ name: data.scale, data, answers: [], result: null }));
    this.responses = [];
    this.current = null;
    this.last = null;
  }

  Session.prototype.next = function () {
    const active = this.scales.filter(s => !s.result);
    if (!active.length) return (this.current = null);
    const pool = active.length > 1 ? active.filter(s => s !== this.last) : active;
    const scale = pool[Math.floor(this.random() * pool.length)];
    return (this.current = { scale, item: scale.data.items[scale.answers.length] });
  };

  // a: 0~3 (원 보기 번호 1~4 에서 1을 뺀 값)
  Session.prototype.answer = function (a) {
    const { scale, item } = this.current;
    scale.answers.push(a);
    this.responses.push({
      order: this.responses.length + 1,
      scale: scale.name,
      k: scale.answers.length,
      item: item.item,
      column: item.column,
      value: a + 1,
    });
    const res = evaluate(scale.data, scale.answers);
    if (res.stop) scale.result = res;
    this.last = scale;
    return res;
  };

  // 마지막 응답을 취소하고 그 문항을 다시 묻는다. 취소한 응답을 돌려준다.
  // 그 응답 전에는 그 척도가 아직 안 끝났었으므로 판정도 지운다. 다시 답하면 그다음 문항은 새로 고른다.
  Session.prototype.undo = function () {
    const r = this.responses.pop();
    if (!r) return null;
    const scale = this.scales.find(s => s.name === r.scale);
    scale.answers.pop();
    scale.result = null;
    const before = this.responses[this.responses.length - 1];
    this.last = before ? this.scales.find(s => s.name === before.scale) : null;
    this.current = { scale, item: scale.data.items[scale.answers.length] };
    return r;
  };

  Session.prototype.isDone = function () {
    return this.scales.every(s => s.result);
  };

  // 진행률 추정: 안 끝난 척도마다 평균 문항 수(performance.mean_items)만큼 남았다고 본다.
  // 답할 때마다 늘기만 하고, 모든 척도가 끝나야 1이 된다.
  Session.prototype.progress = function () {
    const done = this.responses.length;
    let left = 0;
    for (const s of this.scales) {
      if (s.result) continue;
      const k = s.answers.length, K = s.data.items.length;
      const mean = (s.data.performance && s.data.performance.mean_items) || K;
      left += Math.min(K - k, Math.max(1, mean - k));
    }
    return done / (done + left);
  };

  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(url + ' (' + res.status + ')');
    return res.json();
  }

  async function load(dataDir, indexFile) {
    const index = await fetchJSON(dataDir + indexFile);
    if (index.format !== 'dass-curtail-site-index') throw new Error('index 형식이 아님: ' + indexFile);
    const scales = await Promise.all(index.scales.map(s => fetchJSON(dataDir + s.file)));
    for (const s of scales) {
      if (s.format !== 'dass-curtail-site') throw new Error('척도 파일 형식이 아님: ' + s.scale);
      if (s.demographics && s.demographics.length) {
        throw new Error(s.scale + ': 인구통계 입력을 쓰는 모델은 아직 지원하지 않음');
      }
    }
    return { index, scales };
  }

  const api = { evaluate, gradeOfScore, Session, load };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.DassEngine = api;
})(this);
