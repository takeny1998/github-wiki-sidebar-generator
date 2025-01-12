const fsp = require('fs').promises; // fs 모듈의 프로미스 API를 가져옵니다.
const path = require('path'); // 경로 관련 유틸리티를 가져옵니다.
const jsdom = require('jsdom'); // jsdom을 가져와서 DOM 조작을 가능하게 합니다.

/**
 * 주어진 파일 경로를 파싱하여 파일 정보를 추출합니다.
 * @param {string} filePath - 파일의 경로
 * @returns {Object|null} - 파일 정보 객체 또는 null
 */
function parseFile(filePath) {
  const fileName = path.parse(filePath).name; // 파일 이름을 가져옵니다.
  const tokens = fileName.split('_'); // '_'로 구분하여 토큰 배열을 생성합니다.

  // 형식에 맞지 않은 파일은 null을 반환합니다.
  if (!tokens || tokens.length !== 2) {
    return null;
  }

  const date = parseInt(tokens[0]);

  // yymmdd 형식이 아닌 경우 null을 반환합니다.
  if (isNaN(date)) {
    return null;
  }

  const name = `[${tokens[0]}] ${tokens[1].replace('-', '')}`; // 파일 이름 형식 생성

  return { src: fileName, date, name }; // 파일 정보 객체 반환
}

/**
 * 주어진 문서에서 작업 목록을 대체합니다.
 * @param {Document} document - jsdom의 Document 객체
 * @param {Array} parsedFiles - 파싱된 파일 정보 배열
 * @returns {HTMLElement} - 대체된 Div 객체
 */
function createWorkListDiv(document, parsedFiles) {
  let div = document.getElementById('work-list') || document.createElement('div'); 
  div.id = 'work-list'; 

  div.innerHTML = '';

  const header = document.createElement('h2');
  header.textContent = '작업 목록'; 

  div.appendChild(header); 

  const ul = document.createElement('ul');
  div.appendChild(ul);

  // 파싱된 파일 목록을 li 요소로 추가
  for (const file of parsedFiles) {
    const li = document.createElement('li');
    const a = document.createElement('a');

    a.href = file.src; // 링크 설정
    a.textContent = file.name; // 링크 텍스트 설정

    li.appendChild(a);
    ul.appendChild(li); 
  }

  return div;
}

(async function () {

  console.log('작업 목록 생성을 시작합니다.');

  const sourcePath = process.argv[2]; // 원본 디렉토리 경로
  const destPath = process.argv[3]; // 대상 파일 경로

  if (!sourcePath) {
    throw new Error(' - [!] 원본 디렉토리 경로를 지정하지 않았습니다.');
  }

  if (!destPath) {
    throw new Error(' - [!] 대상 파일을 지정하지 않았습니다.');
  }

  const sourceFiles = await fsp.readdir(sourcePath);
  console.log(` - [1/4] 원본 디렉토리 파일 읽기: ${sourceFiles.length}개 찾음`);

  const parsedFiles = sourceFiles
    .map(parseFile) // 파일 파싱
    .filter((e) => e) 
    .sort((a, b) => b.date - a.date); // desending by date
  console.log(` - [2/4] 작업 분석: ${sourceFiles.length}개 중 ${parsedFiles.length}개 처리`);

  const destFile = await fsp.readFile(destPath); 
  const dom = new jsdom.JSDOM(destFile.toString()); 
  const document = dom.window.document;

  const createdDiv = createWorkListDiv(document, parsedFiles);
  console.log(` - [3/4] 작업 목록 생성: 완료됨`);

  const prevDiv = document.getElementById('work-list')

  if (prevDiv) {
    prevDiv.replaceWith(createdDiv);
  } else {
    document.body.appendChild(createdDiv);
  }

  await fsp.writeFile(destPath, document.body.innerHTML);
  console.log(` - [4/4] HTML 파일에 쓰기: 완료됨`);

  console.log(' - [!] 모든 작업이 완료되었습니다.');
})();