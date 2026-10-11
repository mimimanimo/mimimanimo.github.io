// curtail_one.py 를 다시 돌려 curtail_site_json 이 바뀌면, 그 폴더의 json 들을 data/ 에 복사하고
// 꼬리표가 달라졌다면 아래 index 파일 이름만 바꾸면 된다. (척도 파일 이름은 index 안에 적혀 있다)

// Google Apps Script 웹 앱 주소 (apps_script.gs 를 배포하면 나오는 https://script.google.com/macros/s/.../exec)
const APPS_SCRIPT_URL = '';

window.DASS_CONFIG = {
  dataDir: 'data/',
  indexFile: 'all_scales_no_demo_reg_n1ratio_tuneall_greedy_argmax_balanced_target_dass21plus0p02_site_index.json',
  // 설문이 끝나면 응답(문항 점수, 척도별 등급)을 보낼 주소. null 이면 저장하지 않는다.
  // GitHub Pages(github.io)에서는 Google 스프레드시트로, 내 PC 의 survey_server.py 로 열면 responses/ 의 CSV 로 간다.
  submitUrl: location.hostname.endsWith('github.io') ? (APPS_SCRIPT_URL || null) : 'api/submit',
};
