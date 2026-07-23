/* =============================================
   確認用 デザインオーダーフォーム — form.js
   フォームロジック・バリデーション・ナビゲーション
   ============================================= */

let currentStep = 1;
const totalSteps = 6;

const moodGroups = [
  {
    label: 'カラー',
    options: ['ゴールド','シルバー','ホワイト','ブラック','グレー','レッド','オレンジ','イエロー','グリーン','ブルー','パープル','ピンク','ブラウン・ベージュ','マルチカラー']
  },
  {
    label: 'テイスト',
    options: ['高級','ゴージャス','かわいい','きれい','清楚','クール','ネオン','ポップ','シンプル','和風']
  }
];
const MAX_REFERENCE_FILES = 5;
const MAX_REFERENCE_FILE_SIZE = 20 * 1024 * 1024;
const REFERENCE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'zip'];

/* Step2: 画像種別（rc-new等のIDサフィックス）と選択肢の対応表 */
const IMG_TYPE_CARD_KEYS = ['new', 'fix', 'pay', 'long'];
const IMG_KIND_OPTIONS_BY_TYPE = {
  1: ['媒体用画像', 'HP用画像', '紙媒体', 'その他'],
  2: ['媒体用画像', 'HP用画像', '紙媒体', 'その他']
};

/* Step5: 納期希望の値とラジオボタンIDの対応表 */
const DELIVERY_BUTTON_ID_BY_VALUE = { '希望なし': 'd1', '事前予約': 'd2', '納期指定': 'd3' };

/* ステップインジケーターのアイコンクラス（インデックス1〜6） */
const STEP_ICON_CLASSES = ['', 'ti-user', 'ti-photo', 'ti-layout', 'ti-brush', 'ti-clock', 'ti-check'];

let state = {
  office: '', officeId: 0,
  staff: '', client: '本人', agent: '', email: '',
  imgType: 0, imgKind: '', imcUrl: '', fixSource: '',
  pay: 'ポイント', payUrl: '',
  shop: '', area: '', shopUrl: '', shopUrl2: '', urlMode: 'あり',
  industry: '',
  selectedMedia: [],       // ['バニラ', '駅ちか', ...]
  mediumOther: '',
  mediaState: {},          // { 'バニラ': { checkedPlans:[idx,...], checkedSizes:[...], otherPlan:'', otherSize:'' } }
  printMethod: '', printCompany: '', printFiles: [], printBleed: '', printFormats: [], printVersion: '',
  imgsize: '', count: 0,
  imgMode: 'common',       // 'common' or 'individual'
  common: null,            // 共通指示（カードと同じ形のオブジェクト）
  imgCards: [],            // 個別モード時：枚数分のフルカード配列
  delivery: '', deliveryDate: '',
  des1: '', des2: '', des3: '',
  files: []
};

function makeBlankCard() {
  return {
    targetImage: '',
    person: '', personFreeNote: '', personCastNote: '', personFiles: [],
    design: '', designTxt: '',
    refNote: '', refFiles: [],
    moods: [], words: '', highlight: ''
  };
}
state.common = makeBlankCard();

/* ========== お知らせ・混雑状況 ========== */
/* 混雑状況はサンプル値。実運用では稼働状況データに接続する想定 */
function initCongestion() {
  const congestionLevel = 'normal'; // 'active' | 'normal' | 'busy'
  const iconEl = document.getElementById('congestion-icon');
  const labelEl = document.getElementById('congestion-label');
  const subEl = document.getElementById('congestion-sub');
  if (congestionLevel === 'busy') {
    iconEl.classList.add('busy');
    iconEl.innerHTML = '<i class="ti ti-alert-triangle"></i>';
    labelEl.textContent = '混雑中';
    subEl.innerHTML = '現在、ご依頼が集中しています。<br>納期短縮はご希望に沿えない場合があります。';
  } else if (congestionLevel === 'active') {
    iconEl.classList.remove('busy');
    iconEl.innerHTML = '<i class="ti ti-bolt"></i>';
    labelEl.textContent = '積極対応中';
    subEl.innerHTML = '比較的早めに対応できる状況です。<br>追加のご依頼も歓迎しています。';
  } else {
    iconEl.classList.remove('busy');
    iconEl.innerHTML = '<i class="ti ti-clock"></i>';
    labelEl.textContent = '通常稼働';
    subEl.textContent = '標準的な対応状況です。';
  }
}

function initNotices() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const noticeBody = document.getElementById('notice-body');
  if (!noticeBody) return;
  noticeBody.querySelectorAll('.info-entry[data-end-date]').forEach(entry => {
    const endDate = new Date(entry.dataset.endDate + 'T23:59:59');
    if (endDate < today) entry.remove();
  });
  if (!noticeBody.querySelector('.info-entry')) {
    noticeBody.innerHTML = '<div class="info-entry"><div class="info-entry-text">現在、お知らせはありません。</div></div>';
  }
}

/* ========== STEP 1 ========== */
function onOffice() {
  const officeSelect = document.getElementById('sel-office');
  const selectedOption = officeSelect.options[officeSelect.selectedIndex];
  state.office = officeSelect.value;
  state.officeId = parseInt(selectedOption.getAttribute('data-id') || 0) || 0;

  const staffSelect = document.getElementById('sel-staff');
  const staffOtherInput = document.getElementById('inp-staff-other');

  if (officeSelect.value === '確認用' || officeSelect.value === 'その他') {
    staffSelect.style.display = 'none';
    staffOtherInput.style.display = 'block';
    staffSelect.innerHTML = '<option value="">-</option>';
  } else {
    staffSelect.style.display = 'block';
    staffOtherInput.style.display = 'none';
    const staffList = staffData[state.officeId] || [];
    staffSelect.innerHTML = '<option value="">選択してください</option>' +
      staffList.map(name => `<option>${name}</option>`).join('');
  }

  const existingNote = document.getElementById('kansai-note');
  if (existingNote) existingNote.remove();
  if (officeSelect.value === '確認用支社8') {
    const noteEl = document.createElement('div');
    noteEl.id = 'kansai-note';
    noteEl.className = 'warn-box';
    noteEl.style.marginTop = '8px';
    noteEl.innerHTML = '<i class="ti ti-alert-triangle"></i>ご依頼前に太田さんへの確認が必要です';
    document.getElementById('f-office').appendChild(noteEl);
  }
  document.getElementById('f-office').classList.remove('inv');
}

function setClient(value) {
  state.client = value;
  document.getElementById('rb-honin').classList.toggle('sel', value === '本人');
  document.getElementById('rb-dairi').classList.toggle('sel', value === '代理');
  document.getElementById('f-agent').style.display = value === '代理' ? 'block' : 'none';
}

/* ========== STEP 2 ========== */
function setImgType(id, preserveFixSource = false) {
  if (!preserveFixSource) {
    state.fixSource = '';
    ['yes', 'no', 'unknown'].forEach(value =>
      document.getElementById('rb-fixsource-' + value).classList.remove('sel')
    );
    document.getElementById('fixsource-guidance').style.display = 'none';
  }
  state.imgType = id;
  IMG_TYPE_CARD_KEYS.forEach((key, index) =>
    document.getElementById('rc-' + key).classList.toggle('sel', index + 1 === id)
  );
  const imgKindField = document.getElementById('f-imgkind');
  const imcUrlField = document.getElementById('f-imcurl');
  const fixSourceField = document.getElementById('f-fixsource');
  fixSourceField.style.display = id === 2 ? 'block' : 'none';
  if (id !== 2) fixSourceField.classList.remove('inv');
  const kindOptions = IMG_KIND_OPTIONS_BY_TYPE[id];
  if (kindOptions) {
    imgKindField.style.display = 'block';
    document.getElementById('radios-imgkind').innerHTML =
      kindOptions.map(kind => `<div class="rbtn" onclick="setImgKind('${kind}')">${kind}</div>`).join('');
    state.imgKind = '';
  } else {
    imgKindField.style.display = 'none';
    state.imgKind = id === 3 ? '有料案件' : '長期保留再入稿';
  }
  imcUrlField.style.display = id === 4 ? 'block' : 'none';
  updatePrintMethodVisibility();
  setPay(id === 3 ? '有料' : 'ポイント');
  document.getElementById('f-imgtype').classList.remove('inv');
}

function setFixSource(value) {
  state.fixSource = value;
  ['yes', 'no', 'unknown'].forEach(option =>
    document.getElementById('rb-fixsource-' + option).classList.toggle('sel', option === value)
  );
  document.getElementById('f-fixsource').classList.remove('inv');

  const guidance = document.getElementById('fixsource-guidance');
  if (value === 'no') {
    setImgType(1, true);
    guidance.innerHTML = '<i class="ti ti-info-circle"></i>制作データがないため、「新規作成」として取り扱います。';
    guidance.style.display = 'flex';
  } else if (value === 'unknown') {
    guidance.innerHTML = '<i class="ti ti-info-circle"></i>制作データを確認し、データがある場合は「修正」、ない場合は「新規制作」として取り扱います。';
    guidance.style.display = 'flex';
  } else {
    guidance.style.display = 'none';
  }
}

function setImgKind(value) {
  state.imgKind = value;
  document.querySelectorAll('#radios-imgkind .rbtn').forEach(btn =>
    btn.classList.toggle('sel', btn.textContent === value)
  );
  updatePrintMethodVisibility();
}

function setPay(value) {
  state.pay = value;
  document.getElementById('rb-point').classList.toggle('sel', value === 'ポイント');
  document.getElementById('rb-yuryou').classList.toggle('sel', value === '有料');
  document.getElementById('f-pay-url').style.display = value === '有料' ? 'block' : 'none';
  if (value !== '有料') document.getElementById('f-pay-url').classList.remove('inv');
}

function setUrlMode(value) {
  state.urlMode = value;
  document.getElementById('rb-urlyes').classList.toggle('sel', value === 'あり');
  document.getElementById('rb-urlno').classList.toggle('sel', value === 'なし');
  document.getElementById('url-inputs').style.display = value === 'あり' ? 'block' : 'none';
}

/* ========== STEP 3: 業種・媒体・サイズ（複数媒体対応） ========== */
function setIndustry(name, el) {
  state.industry = name;
  document.querySelectorAll('#industry-btns .rbtn').forEach(btn => btn.classList.remove('sel'));
  el.classList.add('sel');
  document.getElementById('fuzoku-warn').style.display = name === '風俗' ? 'flex' : 'none';

  renderMediumChips(name);
  state.selectedMedia = [];
  state.mediumOther = '';
  state.mediaState = {};
  updatePrintMethodVisibility();
  document.getElementById('medium-blocks').innerHTML = '';
  document.getElementById('f-medium-other').style.display = 'none';
  document.getElementById('f-industry').classList.remove('inv');
  autoFillImgSize();
}

function renderMediumChips(industry) {
  const mediumList = mediaByIndustry[industry] || [];
  const chipsWrap = document.getElementById('medium-chips');
  chipsWrap.innerHTML = mediumList.map(mediumName => `
    <div class="rbtn" id="mchip-${cssId(mediumName)}" onclick="toggleMedium('${escJs(mediumName)}')">${mediumName}</div>
  `).join('');
}

function cssId(s) { return s.replace(/[^a-zA-Z0-9]/g, c => c.charCodeAt(0)); }
function escJs(s) { return (s || '').replace(/'/g, "\\'"); }

function toggleMedium(mediumName) {
  const existingIndex = state.selectedMedia.indexOf(mediumName);
  const chipEl = document.getElementById('mchip-' + cssId(mediumName));
  if (existingIndex === -1) {
    state.selectedMedia.push(mediumName);
    chipEl.classList.add('sel');
    if (!state.mediaState[mediumName]) state.mediaState[mediumName] = { checkedPlans: [], checkedSizes: [], otherPlan: '', otherSize: '' };
  } else {
    state.selectedMedia.splice(existingIndex, 1);
    chipEl.classList.remove('sel');
    delete state.mediaState[mediumName];
  }
  document.getElementById('f-medium-other').style.display = state.selectedMedia.includes('その他') ? 'block' : 'none';
  document.getElementById('f-medium').classList.remove('inv');
  renderMediumBlocks();
  autoFillImgSize();
}

function updatePrintMethodVisibility() {
  const field = document.getElementById('f-print-method');
  const hasPaper = state.imgKind === '紙媒体';
  field.style.display = hasPaper ? 'block' : 'none';
  if (!hasPaper) resetPrintMethod();
}

function resetPrintMethod() {
  state.printMethod = '';
  state.printCompany = '';
  state.printFiles = [];
  state.printBleed = '';
  state.printFormats = [];
  state.printVersion = '';
  document.querySelectorAll('#print-method-radios .rbtn').forEach(btn => btn.classList.remove('sel'));
  document.querySelectorAll('#print-bleed-radios .rbtn').forEach(btn => btn.classList.remove('sel'));
  document.querySelectorAll('#print-format-radios .rbtn').forEach(btn => btn.classList.remove('sel'));
  const companyInput = document.getElementById('inp-print-company');
  if (companyInput) companyInput.value = '';
  const fileList = document.getElementById('print-spec-file-list');
  if (fileList) fileList.innerHTML = '';
  const versionInput = document.getElementById('inp-print-version');
  if (versionInput) versionInput.value = '';
  const versionDetails = document.getElementById('print-version-details');
  if (versionDetails) versionDetails.style.display = 'none';
  const bleedSpecButton = document.getElementById('rb-print-bleed-spec');
  if (bleedSpecButton) bleedSpecButton.style.display = 'none';
  const externalDetails = document.getElementById('print-external-details');
  const inhouseGuidance = document.getElementById('print-inhouse-guidance');
  const unknownGuidance = document.getElementById('print-unknown-guidance');
  if (externalDetails) externalDetails.style.display = 'none';
  if (inhouseGuidance) inhouseGuidance.style.display = 'none';
  if (unknownGuidance) unknownGuidance.style.display = 'none';
}

function setPrintMethod(value) {
  state.printMethod = value;
  ['inhouse', 'external', 'unknown'].forEach(option => {
    document.getElementById('rb-print-' + option).classList.toggle('sel', option === value);
  });
  document.getElementById('print-external-details').style.display = value === 'external' ? 'block' : 'none';
  document.getElementById('print-inhouse-guidance').style.display = value === 'inhouse' ? 'flex' : 'none';
  document.getElementById('rb-print-bleed-spec').style.display = value === 'external' ? '' : 'none';
  if (value !== 'external' && state.printBleed === 'spec') {
    state.printBleed = '';
    document.getElementById('rb-print-bleed-spec').classList.remove('sel');
  }
  updatePrintUnknownGuidance();
  document.getElementById('f-print-method').classList.remove('inv');
}

function setPrintBleed(value) {
  state.printBleed = value;
  ['required', 'none', 'spec', 'unknown'].forEach(option => {
    document.getElementById('rb-print-bleed-' + option).classList.toggle('sel', option === value);
  });
  document.getElementById('f-print-bleed').classList.remove('inv');
  updatePrintUnknownGuidance();
}

function setPrintFormat(value) {
  if (value === 'unknown') {
    state.printFormats = ['unknown'];
  } else {
    state.printFormats = state.printFormats.filter(option => option !== 'unknown');
    state.printFormats = state.printFormats.includes(value)
      ? state.printFormats.filter(option => option !== value)
      : [...state.printFormats, value];
  }
  ['jpg', 'pdf', 'eps', 'ai', 'psd', 'other', 'unknown'].forEach(option => {
    document.getElementById('rb-print-format-' + option).classList.toggle('sel', state.printFormats.includes(option));
  });
  document.getElementById('print-version-details').style.display = state.printFormats.some(option => ['eps', 'ai', 'psd', 'other'].includes(option)) ? 'block' : 'none';
  document.getElementById('f-print-format').classList.remove('inv');
  updatePrintUnknownGuidance();
}

function updatePrintUnknownGuidance() {
  const hasUnknownSpec = [state.printMethod, state.printBleed].includes('unknown') || state.printFormats.includes('unknown');
  document.getElementById('print-unknown-guidance').style.display = hasUnknownSpec ? 'flex' : 'none';
}

function handlePrintFiles(input) {
  const errors = [];
  Array.from(input.files).forEach(file => {
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'ai', 'zip'].includes(extension)) errors.push(`${file.name}：対応していない形式です`);
    else if (file.size > MAX_REFERENCE_FILE_SIZE) errors.push(`${file.name}：20MBを超えています`);
    else if (state.printFiles.length >= MAX_REFERENCE_FILES) errors.push('資料は最大5ファイルまでです');
    else if (!state.printFiles.find(existingFile => existingFile.name === file.name)) state.printFiles.push(file);
  });
  const errorEl = document.getElementById('print-spec-file-error');
  errorEl.textContent = errors.join(' / ');
  errorEl.style.display = errors.length ? 'block' : 'none';
  renderFileTags('print-spec-file-list', state.printFiles, removePrintFile);
  input.value = '';
}

function removePrintFile(index) {
  state.printFiles.splice(index, 1);
  renderFileTags('print-spec-file-list', state.printFiles, removePrintFile);
}

function renderMediumBlocks() {
  const wrap = document.getElementById('medium-blocks');
  wrap.innerHTML = state.selectedMedia.filter(mediumName => mediumName !== 'その他').map(mediumName => {
    const plans = planSizeData[mediumName] || [{ plan: 'その他', sizes: [] }];
    const mediaEntry = state.mediaState[mediumName];
    return `
    <div class="medium-block" id="mb-${cssId(mediumName)}">
      <div class="medium-block-head"><i class="ti ti-tag"></i>${mediumName} のプラン・サイズ</div>
      <div class="field" style="margin-bottom:10px">
        <div class="lbl" style="font-size:12px">プラン・画像種別 <span class="req">必須</span></div>
        <div class="plan-section">
          <div class="chk-grid">
            ${plans.map((plan, planIndex) => `
              <label class="chk-item ${mediaEntry.checkedPlans.includes(planIndex) ? 'chk' : ''}" onclick="togglePlan('${escJs(mediumName)}',${planIndex},this)">
                <input type="checkbox" ${mediaEntry.checkedPlans.includes(planIndex) ? 'checked' : ''}>
                <div class="chk-label-text">${plan.plan}</div>
              </label>`).join('')}
          </div>
          <div class="other-input ${mediaEntry.checkedPlans.some(i => plans[i] && plans[i].plan === 'その他') ? 'show' : ''}">
            <input type="text" placeholder="その他のプランやサイズがある場合は入力してください" value="${escAttr(mediaEntry.otherPlan)}" oninput="updateMediumOther('${escJs(mediumName)}','otherPlan',this.value)" style="margin-top:6px">
          </div>
        </div>
      </div>
      <div id="size-area-${cssId(mediumName)}">${renderSizeAreaHtml(mediumName)}</div>
    </div>`;
  }).join('');
}

function renderSizeAreaHtml(mediumName) {
  const plans = planSizeData[mediumName] || [];
  const mediaEntry = state.mediaState[mediumName];
  let allSizes = [];
  mediaEntry.checkedPlans.forEach(planIndex => {
    if (plans[planIndex] && plans[planIndex].sizes) plans[planIndex].sizes.forEach(sizeLabel => { if (!allSizes.includes(sizeLabel)) allSizes.push(sizeLabel); });
  });
  if (mediaEntry.checkedPlans.length === 0) return '';
  if (allSizes.length === 0) {
    return `
      <div class="field">
        <div class="lbl" style="font-size:12px">バナーサイズ <span class="req">必須</span></div>
        <div class="hint">サイズを下に直接入力してください</div>
        <input type="text" placeholder="サイズを入力" value="${escAttr(mediaEntry.otherSize)}" oninput="updateMediumOther('${escJs(mediumName)}','otherSize',this.value)">
      </div>`;
  }
  return `
    <div class="field">
      <div class="lbl" style="font-size:12px">バナーサイズ <span class="req">必須</span>（複数可）</div>
      <div class="size-section">
        <div class="size-grid">
          ${allSizes.map(sizeLabel => `
            <label class="size-item ${mediaEntry.checkedSizes.includes(sizeLabel) ? 'chk' : ''}" onclick="toggleSize('${escJs(mediumName)}','${escJs(sizeLabel)}',this)">
              <input type="checkbox" ${mediaEntry.checkedSizes.includes(sizeLabel) ? 'checked' : ''}>
              <span>${sizeLabel}</span>
            </label>`).join('')}
        </div>
      </div>
      <input type="text" placeholder="その他のサイズがある場合は入力してください" value="${escAttr(mediaEntry.otherSize)}" oninput="updateMediumOther('${escJs(mediumName)}','otherSize',this.value)" style="margin-top:8px">
    </div>`;
}

function togglePlan(mediumName, planIndex, el) {
  // ネイティブのチェックボックス状態反映がonclickより後に起こるため、次のイベントループで読み取る
  setTimeout(() => {
    const mediaEntry = state.mediaState[mediumName];
    const checkbox = el.querySelector('input');
    el.classList.toggle('chk', checkbox.checked);
    if (checkbox.checked) {
      if (!mediaEntry.checkedPlans.includes(planIndex)) mediaEntry.checkedPlans.push(planIndex);
    } else {
      mediaEntry.checkedPlans = mediaEntry.checkedPlans.filter(i => i !== planIndex);
    }
    mediaEntry.checkedSizes = [];
    document.getElementById('size-area-' + cssId(mediumName)).innerHTML = renderSizeAreaHtml(mediumName);
    document.getElementById('mb-' + cssId(mediumName)).querySelector('.other-input').classList.toggle(
      'show',
      mediaEntry.checkedPlans.some(i => (planSizeData[mediumName] || [])[i] && (planSizeData[mediumName] || [])[i].plan === 'その他')
    );
    autoFillImgSize();
  }, 10);
}

function toggleSize(mediumName, sizeLabel, el) {
  // togglePlanと同様、チェックボックスの反映を待ってから状態を読み取る
  setTimeout(() => {
    const mediaEntry = state.mediaState[mediumName];
    const checkbox = el.querySelector('input');
    el.classList.toggle('chk', checkbox.checked);
    if (checkbox.checked) {
      if (!mediaEntry.checkedSizes.includes(sizeLabel)) mediaEntry.checkedSizes.push(sizeLabel);
    } else {
      mediaEntry.checkedSizes = mediaEntry.checkedSizes.filter(s => s !== sizeLabel);
    }
    autoFillImgSize();
  }, 10);
}

function updateMediumOther(mediumName, key, value) {
  state.mediaState[mediumName][key] = value;
  autoFillImgSize();
}

function allSelectedSizesFlat() {
  const flatSizes = [];
  state.selectedMedia.filter(mediumName => mediumName !== 'その他').forEach(mediumName => {
    const mediaEntry = state.mediaState[mediumName];
    mediaEntry.checkedSizes.forEach(sizeLabel => flatSizes.push(`【${mediumName}】${sizeLabel}`));
    if (mediaEntry.otherSize) flatSizes.push(`【${mediumName}】${mediaEntry.otherSize}`);
  });
  return flatSizes;
}

function autoFillImgSize() {
  const imgSizeTextarea = document.getElementById('inp-imgsize');
  if (!imgSizeTextarea._edited) {
    imgSizeTextarea.value = allSelectedSizesFlat().join(' / ');
  }
}

function onCountChange() {
  const count = parseInt(document.getElementById('inp-count').value) || 0;
  state.count = count;
  document.getElementById('f-count').classList.remove('inv');
}

/* ========== STEP 4: デザイン指示 ========== */
function initMoodTagsInto(containerId, cardObj, prefix) {
  const tagsWrap = document.getElementById(containerId);
  if (!tagsWrap) return;
  tagsWrap.innerHTML = moodGroups.map(group => `
    <div class="mood-group">
      <div class="mood-group-label">${group.label}</div>
      <div class="mood-options">
        ${group.options.map(moodLabel => `
          <label class="${cardObj.moods.includes(moodLabel) ? 'chk' : ''}" onclick="toggleCardMood('${prefix}','${escJs(moodLabel)}',this)">
            <input type="checkbox" ${cardObj.moods.includes(moodLabel) ? 'checked' : ''}>${moodLabel}
          </label>`).join('')}
      </div>
    </div>`).join('');
}

function getCard(prefix) {
  if (prefix === 'common') return state.common;
  const cardIndex = parseInt(prefix.split('-')[1]);
  return state.imgCards[cardIndex];
}

function toggleCardMood(prefix, moodLabel, el) {
  // togglePlan/toggleSizeと同様、チェックボックスの反映を待ってから状態を読み取る
  setTimeout(() => {
    const card = getCard(prefix);
    const isChecked = el.querySelector('input').checked;
    el.classList.toggle('chk', isChecked);
    if (isChecked) { if (!card.moods.includes(moodLabel)) card.moods.push(moodLabel); }
    else { card.moods = card.moods.filter(x => x !== moodLabel); }
  }, 10);
}

/* 共通／個別カードのフルテンプレートをHTML文字列で生成 */
function renderCardTemplate(prefix, card, opts) {
  opts = opts || {};
  const heading = opts.heading || '';
  const isIndividual = !!opts.individual;
  const canRemove = isIndividual && !!opts.canRemove;
  const idx = opts.idx != null ? opts.idx : '';
  return `
    ${heading ? `
      <div class="img-card-head">
        <div class="img-card-num">${opts.num || ''}</div>
        <div class="img-card-label">${heading}</div>
        ${canRemove ? `<div class="img-card-remove" onclick="removeImgCard(${idx})"><i class="ti ti-trash"></i> 削除</div>` : ''}
      </div>
      <div class="img-card-body open">` : ''}
    ${isIndividual ? `
    <div class="field">
      <div class="lbl">対象画像 <span class="req">必須</span></div>
      <input type="text" placeholder="例：メイン画像・700×300 / 全画像共通" value="${escAttr(card.targetImage)}" oninput="updateCardField('${prefix}','targetImage',this.value)">
      <div class="hint">どの画像・サイズへの指示かを明記してください（例：メイン、バナー700×300）</div>
    </div>` : ''}
    <div class="field" id="f-person-${prefix}">
      <div class="lbl">使用人物素材 <span class="req">必須</span></div>
      <div class="radios">
        <div class="rbtn ${card.person === 'フリーの人物素材' ? 'sel' : ''}" onclick="setCardPerson('${prefix}','フリーの人物素材',this)">フリーの人物素材</div>
        <div class="rbtn ${card.person === '店舗在籍の人物画像' ? 'sel' : ''}" onclick="setCardPerson('${prefix}','店舗在籍の人物画像',this)">店舗在籍の人物画像</div>
        <div class="rbtn ${card.person === '使用しない' ? 'sel' : ''}" onclick="setCardPerson('${prefix}','使用しない',this)">使用しない</div>
      </div>
      <div id="person-free-${prefix}" style="display:${card.person === 'フリーの人物素材' ? 'block' : 'none'};margin-top:8px">
        <textarea placeholder="希望素材：20代の清楚風女性（例）" oninput="updateCardField('${prefix}','personFreeNote',this.value)" style="min-height:60px">${escHtml(card.personFreeNote)}</textarea>
      </div>
      <div id="person-cast-${prefix}" style="display:${card.person === '店舗在籍の人物画像' ? 'block' : 'none'};margin-top:8px">
        <input type="text" placeholder="使用画像URLや名前を記入" value="${escAttr(card.personCastNote)}" oninput="updateCardField('${prefix}','personCastNote',this.value)">
        <div class="upload-box small" style="margin-top:8px" onclick="document.getElementById('pf-${prefix}').click()">
          <i class="ti ti-cloud-upload upload-icon"></i>
          <div class="upload-main">人物素材をアップロード</div>
          <div class="upload-sub">PNG / JPG · 在籍スタッフ写真など</div>
        </div>
        <input type="file" id="pf-${prefix}" multiple accept=".png,.jpg,.jpeg" style="display:none" onchange="handlePersonFiles('${prefix}',this)">
        <div class="flist" id="pf-list-${prefix}"></div>
      </div>
      <div class="err">人物素材の使用方法を選択してください</div>
    </div>

    <div class="field" id="f-design-${prefix}">
      <div class="lbl">デザインについて <span class="req">必須</span></div>
      <div class="radios">
        <div class="rbtn ${card.design === 'おまかせ' ? 'sel' : ''}" onclick="setCardDesign('${prefix}','おまかせ',this)">おまかせ</div>
        <div class="rbtn ${card.design === '参考画像あり' ? 'sel' : ''}" onclick="setCardDesign('${prefix}','参考画像あり',this)">参考画像あり</div>
      </div>
      <div class="hint" style="margin-top:6px">※おまかせの場合、作成後の要望・修正は追加料金が発生します</div>

      <div id="ref-block-${prefix}" style="display:${card.design === '参考画像あり' ? 'block' : 'none'};margin-top:10px">
        <div class="lbl" style="font-size:12px">参考画像URL、または画像IDなど</div>
        <textarea placeholder="例：143667 / 143668 / https://..." oninput="updateCardField('${prefix}','refNote',this.value)" style="min-height:60px">${escHtml(card.refNote)}</textarea>
        <div class="upload-box small" style="margin-top:8px" onclick="document.getElementById('rf-${prefix}').click()">
          <i class="ti ti-cloud-upload upload-icon"></i>
          <div class="upload-main">参考画像をアップロード</div>
          <div class="upload-sub">PNG / JPG / ZIP · 最大5ファイル・各20MBまで</div>
        </div>
        <input type="file" id="rf-${prefix}" multiple accept=".png,.jpg,.jpeg,.zip,application/zip" style="display:none" onchange="handleRefFiles('${prefix}',this)">
        <div class="flist" id="rf-list-${prefix}"></div>
        <div class="err upload-error" id="rf-error-${prefix}"></div>
      </div>
      <div class="err">デザイン方針を選択してください</div>
    </div>
    <div class="field" id="f-designtxt-${prefix}">
      <div class="lbl">デザイン指示 <span class="req">必須</span></div>
      <textarea placeholder="指示がない場合は必ず「おまかせ」と記載してください" oninput="updateCardField('${prefix}','designTxt',this.value)">${escHtml(card.designTxt)}</textarea>
      <div class="err">デザイン指示を入力してください</div>
    </div>
    <div class="field">
      <div class="lbl">画像の雰囲気・イメージ <span class="opt">任意・複数選択可</span></div>
      <div class="tag-chk" id="moodtags-${prefix}"></div>
    </div>
    <div class="field">
      <div class="lbl">挿入文言 <span class="opt">任意</span></div>
      <textarea placeholder="例：未経験大歓迎・ロゴ・日給〇万円可能　未経験っぽい文言おまかせします" oninput="updateCardField('${prefix}','words',this.value)" style="min-height:60px">${escHtml(card.words)}</textarea>
    </div>
    <div class="field">
      <div class="lbl">目立たせたい文言・部分 <span class="opt">任意</span></div>
      <textarea placeholder="例：日給を一番目立つようにして、未経験歓迎は次に目立つように" oninput="updateCardField('${prefix}','highlight',this.value)" style="min-height:60px">${escHtml(card.highlight)}</textarea>
    </div>
    ${heading ? `</div>` : ''}
  `;
}

function renderCommonBlock() {
  const commonBlockWrap = document.querySelector('#common-instructions-wrap .design-instruction-block');
  commonBlockWrap.innerHTML = renderCardTemplate('common', state.common);
  initMoodTagsInto('moodtags-common', state.common, 'common');
}

function setCardPerson(prefix, value, el) {
  const card = getCard(prefix);
  card.person = value;
  document.querySelectorAll(`#f-person-${prefix} .radios .rbtn`).forEach(btn => btn.classList.remove('sel'));
  el.classList.add('sel');
  document.getElementById(`person-free-${prefix}`).style.display = value === 'フリーの人物素材' ? 'block' : 'none';
  document.getElementById(`person-cast-${prefix}`).style.display = value === '店舗在籍の人物画像' ? 'block' : 'none';
  document.getElementById(`f-person-${prefix}`).classList.remove('inv');
}

function setCardDesign(prefix, value, el) {
  const card = getCard(prefix);
  card.design = value;
  document.querySelectorAll(`#f-design-${prefix} .radios .rbtn`).forEach(btn => btn.classList.remove('sel'));
  el.classList.add('sel');
  document.getElementById(`ref-block-${prefix}`).style.display = value === '参考画像あり' ? 'block' : 'none';
  document.getElementById(`f-design-${prefix}`).classList.remove('inv');
  const designTxtEl = document.querySelector(`#f-designtxt-${prefix} textarea`);
  if (value === 'おまかせ') {
    card.designTxt = 'おまかせ';
    designTxtEl.value = 'おまかせ';
    document.getElementById(`f-designtxt-${prefix}`).classList.remove('inv');
  } else if (designTxtEl.value === 'おまかせ') {
    card.designTxt = '';
    designTxtEl.value = '';
  }
}

function updateCardField(prefix, key, value) {
  getCard(prefix)[key] = value;
}

function handlePersonFiles(prefix, inp) {
  const card = getCard(prefix);
  Array.from(inp.files).forEach(file => { if (!card.personFiles.find(existingFile => existingFile.name === file.name)) card.personFiles.push(file); });
  renderFileTags(`pf-list-${prefix}`, card.personFiles, (i) => removeCardFile(prefix, 'personFiles', i, `pf-list-${prefix}`));
}

function handleRefFiles(prefix, inp) {
  const card = getCard(prefix);
  const errorEl = document.getElementById(`rf-error-${prefix}`);
  const errors = [];
  Array.from(inp.files).forEach(file => {
    const extension = file.name.split('.').pop().toLowerCase();
    if (!REFERENCE_EXTENSIONS.includes(extension)) errors.push(`${file.name}：対応していない形式です`);
    else if (file.size > MAX_REFERENCE_FILE_SIZE) errors.push(`${file.name}：20MBを超えています`);
    else if (card.refFiles.length >= MAX_REFERENCE_FILES) errors.push('参考資料は最大5ファイルまでです');
    else if (!card.refFiles.find(existingFile => existingFile.name === file.name)) card.refFiles.push(file);
  });
  errorEl.textContent = errors.join(' / ');
  errorEl.style.display = errors.length ? 'block' : 'none';
  inp.value = '';
  renderFileTags(`rf-list-${prefix}`, card.refFiles, (i) => removeCardFile(prefix, 'refFiles', i, `rf-list-${prefix}`));
}

function removeCardFile(prefix, key, i, listId) {
  const card = getCard(prefix);
  card[key].splice(i, 1);
  renderFileTags(listId, card[key], (j) => removeCardFile(prefix, key, j, listId));
}

function renderFileTags(listId, files, onRemove) {
  const listEl = document.getElementById(listId);
  if (!listEl) return;
  listEl.innerHTML = files.map((file, i) => `
    <div class="ftag">
      <i class="ti ti-file"></i>
      <span class="fn">${file.name}</span>
      <span class="fsize">${(file.size / 1024 / 1024).toFixed(1)}MB</span>
      <i class="ti ti-x dx" data-i="${i}"></i>
    </div>`).join('');
  listEl.querySelectorAll('.dx').forEach(x => x.addEventListener('click', () => onRemove(parseInt(x.dataset.i))));
}

/* 媒体・サイズのおさらい表示（Step4上部） */
function renderMediaRecap() {
  const recap = document.getElementById('selected-media-recap');
  const body = document.getElementById('media-recap-body');
  const sizes = allSelectedSizesFlat();
  if (state.selectedMedia.length === 0 && !sizes.length) {
    recap.style.display = 'none';
    return;
  }
  recap.style.display = 'block';
  body.innerHTML = `<strong>${state.selectedMedia.join(' / ') || '—'}</strong>` +
    sizes.map(sizeLabel => `<div class="size-summary-row">・ ${sizeLabel}</div>`).join('');
}

/* 画像枚数に応じて「画像ごとの指示」モード切替UIの表示を更新 */
function syncImgModeUI() {
  const multiImgBlock = document.getElementById('multi-img-block');
  const count = state.count;
  if (count >= 2) {
    multiImgBlock.style.display = 'block';
    document.getElementById('multi-count-label').textContent = count + '枚';
  } else {
    multiImgBlock.style.display = 'none';
    state.imgMode = 'common';
  }
  setImgMode(state.imgMode);
}

function setImgMode(mode) {
  state.imgMode = mode;
  const modeCommonBtn = document.getElementById('mode-common');
  const modeIndivBtn = document.getElementById('mode-individual');
  if (modeCommonBtn) modeCommonBtn.classList.toggle('sel', mode === 'common');
  if (modeIndivBtn) modeIndivBtn.classList.toggle('sel', mode === 'individual');

  const commonWrap = document.getElementById('common-instructions-wrap');
  const cardsWrap = document.getElementById('img-cards-wrap');

  if (mode === 'individual' && state.count >= 2) {
    commonWrap.style.display = 'none';
    cardsWrap.style.display = 'block';
    // 個別モード初回切り替え時のみカードを2枚に初期化（追加後はそのまま保持）
    if (state.imgCards.length < 2) {
      state.imgCards = [makeBlankCard(), makeBlankCard()];
    }
    renderImgCards();
  } else {
    commonWrap.style.display = 'block';
    cardsWrap.style.display = 'none';
    renderCommonBlock();
  }
}

function renderImgCards() {
  const cardsWrap = document.getElementById('img-cards');
  const canRemove = state.imgCards.length > 2;
  cardsWrap.innerHTML = state.imgCards.map((card, index) => `
    <div class="img-card" id="imgcard-${index}">
      ${renderCardTemplate('card-' + index, card, {
        heading: 'デザイン指示 ' + (index + 1),
        num: index + 1,
        individual: true,
        canRemove: canRemove,
        idx: index
      })}
    </div>`).join('') +
  `<button class="btn add-card-btn" onclick="addImgCard()">
    <i class="ti ti-plus"></i> さらにデザイン指示を追加
  </button>`;
  state.imgCards.forEach((card, index) => initMoodTagsInto('moodtags-card-' + index, card, 'card-' + index));
}

function addImgCard() {
  state.imgCards.push(makeBlankCard());
  renderImgCards();
  // 新カードまでスクロール
  const newCard = document.getElementById('imgcard-' + (state.imgCards.length - 1));
  if (newCard) newCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function removeImgCard(cardIndex) {
  if (state.imgCards.length <= 2) return; // 最低2枚は維持
  state.imgCards.splice(cardIndex, 1);
  renderImgCards();
}

/* ========== STEP 5: 納期・指名 ========== */
function setDelivery(value) {
  state.delivery = value;
  ['d1', 'd2', 'd3'].forEach(id => document.getElementById('rb-' + id).classList.remove('sel'));
  const targetButtonId = DELIVERY_BUTTON_ID_BY_VALUE[value];
  if (targetButtonId) document.getElementById('rb-' + targetButtonId).classList.add('sel');
  document.getElementById('date-input').style.display = value === '納期指定' ? 'block' : 'none';
  document.getElementById('f-delivery').classList.remove('inv');
}

function syncDes(changed) {
  const ids = ['sel-des1', 'sel-des2', 'sel-des3'];
  const vals = ids.map(id => document.getElementById(id).value);
  ids.forEach((id, i) => {
    const sel = document.getElementById(id);
    const curVal = sel.value;
    const others = vals.filter((_, j) => j !== i && _);
    sel.querySelectorAll('option').forEach(option => { if (option.value) option.disabled = others.includes(option.value); });
    sel.value = curVal;
  });
  state.des1 = document.getElementById('sel-des1').value;
  state.des2 = document.getElementById('sel-des2').value;
  state.des3 = document.getElementById('sel-des3').value;
}

/* ========== UTIL ========== */
function escAttr(s) { return (s || '').replace(/"/g, '&quot;'); }
function escHtml(s) { return (s || '').replace(/</g, '&lt;'); }

/* ========== PREVIEW ========== */
function cardSummary(card, isIndividual) {
  const moodTxt = card.moods.length ? card.moods.join('・') : '—';
  let refExtra = '';
  if (card.design === '参考画像あり') {
    refExtra = `<div class="prow"><span class="pk">参考画像URL/ID</span><span class="pv">${card.refNote || '—'}</span></div>
      <div class="prow"><span class="pk">参考画像添付</span><span class="pv">${card.refFiles.length ? card.refFiles.map(file => file.name).join(', ') : 'なし'}</span></div>`;
  }
  let personExtra = '';
  if (card.person === 'フリーの人物素材') {
    personExtra = `<div class="prow"><span class="pk">希望素材</span><span class="pv">${card.personFreeNote || '—'}</span></div>`;
  } else if (card.person === '店舗在籍の人物画像') {
    personExtra = `<div class="prow"><span class="pk">使用画像URL/名前</span><span class="pv">${card.personCastNote || '—'}</span></div>
      <div class="prow"><span class="pk">人物素材添付</span><span class="pv">${card.personFiles.length ? card.personFiles.map(file => file.name).join(', ') : 'なし'}</span></div>`;
  }
  return `
    ${isIndividual ? `<div class="prow"><span class="pk">対象画像</span><span class="pv">${card.targetImage || '—'}</span></div>` : ''}
    <div class="prow"><span class="pk">使用人物素材</span><span class="pv">${card.person || '—'}</span></div>
    ${personExtra}
    <div class="prow"><span class="pk">デザイン</span><span class="pv">${card.design || '—'}</span></div>
    ${refExtra}
    <div class="prow"><span class="pk">デザイン指示</span><span class="pv">${card.designTxt || '—'}</span></div>
    <div class="prow"><span class="pk">雰囲気・イメージ</span><span class="pv">${moodTxt}</span></div>
    <div class="prow"><span class="pk">挿入文言</span><span class="pv">${card.words || '—'}</span></div>
    <div class="prow"><span class="pk">目立たせたい部分</span><span class="pv">${card.highlight || '—'}</span></div>`;
}

function buildPreview() {
  const fieldValue = id => { const e = document.getElementById(id); return e ? e.value || '—' : '—'; };

  const mediaDetailHtml = state.selectedMedia.map(mediumName => {
    if (mediumName === 'その他') return `<div class="prow"><span class="pk">媒体（その他）</span><span class="pv">${fieldValue('inp-medium-other')}</span></div>`;
    const mediaEntry = state.mediaState[mediumName];
    const plans = planSizeData[mediumName] || [];
    const planLabels = mediaEntry.checkedPlans.map(i => plans[i] ? plans[i].plan : '').filter(Boolean);
    const sizes = mediaEntry.checkedSizes.concat(mediaEntry.otherSize ? [mediaEntry.otherSize] : []);
    return `<div class="prow"><span class="pk">${mediumName}</span><span class="pv">${planLabels.join(' / ') || '—'} ｜ ${sizes.join(' / ') || '—'}</span></div>`;
  }).join('');

  const printMethodLabels = {
    inhouse: '店舗・社内で印刷する',
    external: '外部の印刷会社へ入稿する',
    unknown: '未定・分からない'
  };
  const printBleedLabels = {
    required: 'トンボ・塗り足しが必要',
    none: '不要',
    spec: '印刷会社の指定に合わせる',
    unknown: '分からない'
  };
  const printFormatLabels = { jpg: 'JPG', pdf: 'PDF', eps: 'EPS', ai: 'AI', psd: 'PSD', other: 'その他', unknown: '分からない' };
  const hasUnknownPrintSpec = [state.printMethod, state.printBleed].includes('unknown') || state.printFormats.includes('unknown');
  const printFormatText = state.printFormats.map(format => printFormatLabels[format]).join(' / ');
  const printDetailHtml = state.imgKind === '紙媒体' ? `
      <div class="prow ${hasUnknownPrintSpec ? 'print-spec-alert' : ''}"><span class="pk">印刷仕様</span><span class="pv">${hasUnknownPrintSpec ? `<strong>未確定</strong>（${printMethodLabels[state.printMethod] || '—'}）` : printMethodLabels[state.printMethod] || '—'}</span></div>
      ${state.printMethod === 'external' ? `<div class="prow"><span class="pk">印刷会社・入稿先</span><span class="pv">${fieldValue('inp-print-company')}</span></div>
      <div class="prow"><span class="pk">入稿資料</span><span class="pv">${state.printFiles.length ? state.printFiles.map(file => file.name).join(', ') : 'なし'}</span></div>` : ''}
      <div class="prow ${state.printBleed === 'unknown' ? 'print-spec-alert' : ''}"><span class="pk">トンボ・塗り足し</span><span class="pv">${printBleedLabels[state.printBleed] || '—'}</span></div>
      <div class="prow ${state.printFormats.includes('unknown') ? 'print-spec-alert' : ''}"><span class="pk">データ形式</span><span class="pv">${printFormatText || '—'}${state.printVersion ? '（' + state.printVersion + '）' : ''}</span></div>` : '';

  let designHtml = '';
  if (state.count >= 2 && state.imgMode === 'individual') {
    designHtml = state.imgCards.map((card, i) => `
      <div class="psec-h" style="margin-top:10px">デザイン指示 ${i + 1}${card.targetImage ? '（' + card.targetImage + '）' : ''}</div>
      ${cardSummary(card, true)}`).join('');
  } else {
    designHtml = cardSummary(state.common, false);
    if (state.count >= 2) {
      designHtml = `<div class="prow"><span class="pk">適用範囲</span><span class="pv">共通指示を全${state.count}枚に適用</span></div>` + designHtml;
    }
  }

  return `
    <div class="psec">
      <div class="psec-h">依頼者情報</div>
      <div class="prow"><span class="pk">支社名</span><span class="pv">${state.office || '—'}</span></div>
      <div class="prow"><span class="pk">営業担当者</span><span class="pv">${fieldValue('sel-staff') || fieldValue('inp-staff-other') || '—'}</span></div>
      <div class="prow"><span class="pk">フォーム記入者</span><span class="pv">${state.client}</span></div>
      <div class="prow"><span class="pk">メールアドレス</span><span class="pv">${fieldValue('inp-email')}</span></div>
    </div>
    <div class="pdiv"></div>
    <div class="psec">
      <div class="psec-h">画像種別・依頼内容</div>
      <div class="prow"><span class="pk">画像について</span><span class="pv">${['', '新規作成', '修正', '有料案件', '長期保留再入稿'][state.imgType] || '—'}${state.imgKind ? ' / ' + state.imgKind : ''}</span></div>
      ${state.fixSource ? `<div class="prow"><span class="pk">制作データ</span><span class="pv">${{ yes: 'PSDあり（当社過去制作、またはデータ提供あり）', no: 'なし・画像のみ（新規作成へ変更）', unknown: '分からない（制作データの確認が必要）' }[state.fixSource]}</span></div>` : ''}
      <div class="prow"><span class="pk">請求方法</span><span class="pv">${state.pay}${state.pay === '有料' ? ' (入稿URL: ' + fieldValue('inp-pay-url') + ')' : ''}</span></div>
      <div class="prow"><span class="pk">店舗名</span><span class="pv">${fieldValue('inp-shop')}</span></div>
      <div class="prow"><span class="pk">エリア</span><span class="pv">${fieldValue('inp-area')}</span></div>
      <div class="prow"><span class="pk">掲載URL</span><span class="pv">${state.urlMode === 'なし' ? 'URLなし' : fieldValue('inp-shopurl')}</span></div>
    </div>
    <div class="pdiv"></div>
    <div class="psec">
      <div class="psec-h">業種・媒体・サイズ</div>
      <div class="prow"><span class="pk">業種</span><span class="pv">${state.industry || '—'}</span></div>
      ${mediaDetailHtml || '<div class="prow"><span class="pk">媒体</span><span class="pv">—</span></div>'}
      ${printDetailHtml}
      <div class="prow"><span class="pk">画像サイズ・種類名（まとめ）</span><span class="pv">${fieldValue('inp-imgsize')}</span></div>
      <div class="prow"><span class="pk">画像総枚数</span><span class="pv">${fieldValue('inp-count')}枚</span></div>
    </div>
    <div class="pdiv"></div>
    <div class="psec">
      <div class="psec-h">デザイン指示</div>
      ${designHtml}
    </div>
    <div class="pdiv"></div>
    <div class="psec">
      <div class="psec-h">納期・指名</div>
      <div class="prow"><span class="pk">納期希望</span><span class="pv">${state.delivery || '—'}${state.delivery === '納期指定' ? ' (' + fieldValue('inp-date') + ')' : ''}</span></div>
      <div class="prow"><span class="pk">デザイナー</span><span class="pv">${[state.des1, state.des2, state.des3].filter(Boolean).join(' / ') || '指名なし'}</span></div>
    </div>`;
}

/* ========== VALIDATION ========== */
function validateCard(prefix, card, validationRef, isIndividual) {
  const reqField = (fieldId, isValid) => {
    const fieldEl = document.getElementById(fieldId);
    if (!fieldEl) return;
    if (!isValid()) { fieldEl.classList.add('inv'); validationRef.ok = false; }
    else fieldEl.classList.remove('inv');
  };
  // 個別モードでは対象画像の入力も必須
  if (isIndividual) {
    const targetEl = document.querySelector(`#imgcard-${prefix.replace('card-', '')} .field:first-of-type`);
    if (!card.targetImage.trim()) {
      if (targetEl) targetEl.classList.add('inv');
      validationRef.ok = false;
    } else {
      if (targetEl) targetEl.classList.remove('inv');
    }
  }
  reqField(`f-person-${prefix}`, () => card.person);
  if (card.person === '店舗在籍の人物画像') {
    reqField(`person-cast-${prefix}`, () => card.personCastNote.trim());
  }
  reqField(`f-design-${prefix}`, () => card.design);
  reqField(`f-designtxt-${prefix}`, () => card.designTxt.trim());
}

function validate(step) {
  let ok = true;
  const req = (fieldId, isValid) => {
    const fieldEl = document.getElementById(fieldId);
    if (!fieldEl) return;
    if (!isValid()) { fieldEl.classList.add('inv'); ok = false; }
    else fieldEl.classList.remove('inv');
  };

  if (step === 1) {
    req('f-office', () => document.getElementById('sel-office').value);
    const officeValue = document.getElementById('sel-office').value;
    if (officeValue === '確認用' || officeValue === 'その他')
      req('f-staff', () => document.getElementById('inp-staff-other').value.trim());
    else
      req('f-staff', () => document.getElementById('sel-staff').value);
    if (state.client === '代理')
      req('f-agent', () => document.getElementById('inp-agent').value.trim());
    req('f-email', () => {
      const emailValue = document.getElementById('inp-email').value;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue) ? emailValue : '';
    });
  }
  if (step === 2) {
    req('f-imgtype', () => state.imgType ? 'ok' : '');
    if (state.imgType === 2)
      req('f-fixsource', () => state.fixSource);
    if (state.imgType === 4)
      req('f-imcurl', () => document.getElementById('inp-imcurl').value.trim());
    if (state.pay === '有料')
      req('f-pay-url', () => document.getElementById('inp-pay-url').value.trim());
    req('f-shop',    () => document.getElementById('inp-shop').value.trim());
    req('f-area',    () => document.getElementById('inp-area').value.trim());
    if (state.urlMode === 'あり')
      req('f-shopurl', () => document.getElementById('inp-shopurl').value.trim());
    if (state.imgKind === '紙媒体') {
      req('f-print-method', () => state.printMethod);
      req('f-print-bleed', () => state.printBleed);
      req('f-print-format', () => state.printFormats.length ? 'ok' : '');
    }
  }
  if (step === 3) {
    req('f-industry', () => state.industry);
    req('f-medium',   () => state.selectedMedia.length ? 'ok' : '');
    if (state.selectedMedia.includes('その他'))
      req('f-medium-other', () => document.getElementById('inp-medium-other').value.trim());
    state.selectedMedia.filter(mediumName => mediumName !== 'その他').forEach(mediumName => {
      const mediaEntry = state.mediaState[mediumName];
      if (!mediaEntry.checkedPlans.length) ok = false;
    });
    req('f-imgsize',  () => document.getElementById('inp-imgsize').value.trim());
    req('f-count',    () => document.getElementById('inp-count').value);
  }
  if (step === 4) {
    const validationRef = { ok: true };
    if (state.count >= 2 && state.imgMode === 'individual') {
      state.imgCards.forEach((card, i) => validateCard('card-' + i, card, validationRef, true));
    } else {
      validateCard('common', state.common, validationRef, false);
    }
    ok = ok && validationRef.ok;
  }
  if (step === 5) {
    req('f-delivery', () => state.delivery);
    if (state.delivery === '納期指定') {
      if (!document.getElementById('inp-date').value) {
        document.getElementById('f-delivery').classList.add('inv');
        ok = false;
      }
    }
  }
  return ok;
}

/* ========== NAVIGATION ========== */
function goTo(step) {
  document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('on'));
  const activePanel = document.getElementById(step <= totalSteps ? 'p' + step : 'p-success');
  activePanel.classList.add('on');

  const noticeStack = document.querySelector('.notice-stack');
  if (noticeStack) noticeStack.style.display = step === 1 ? 'grid' : 'none';

  for (let i = 1; i <= totalSteps; i++) {
    const dotEl = document.getElementById('d' + i);
    const labelEl = document.getElementById('l' + i);
    dotEl.className = 'dot' + (i < step ? ' done' : i === step ? ' on' : '');
    dotEl.innerHTML = i < step
      ? '<i class="ti ti-check"></i>'
      : `<i class="ti ${STEP_ICON_CLASSES[i]}"></i>`;
    labelEl.className = 'slbl' + (i === step ? ' on' : '');
  }

  document.getElementById('prog').style.width = (step / totalSteps * 100) + '%';
  document.getElementById('btn-back').style.display = step > 1 ? 'inline-flex' : 'none';

  const nextBtn = document.getElementById('btn-next');
  nextBtn.innerHTML = step === totalSteps
    ? '送信する <i class="ti ti-send"></i>'
    : '次へ <i class="ti ti-arrow-right"></i>';

  document.getElementById('header-step-label').textContent = `STEP ${Math.min(step, totalSteps)} / ${totalSteps}`;

  if (step > totalSteps) document.getElementById('nav-bar').style.display = 'none';

  requestAnimationFrame(() => activePanel.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function nextStep() {
  if (!validate(currentStep)) return;
  if (currentStep === totalSteps) { submit(); return; }
  currentStep++;
  if (currentStep === 4) {
    renderMediaRecap();
    syncImgModeUI();
  }
  if (currentStep === totalSteps) {
    document.getElementById('preview-content').innerHTML = buildPreview();
  }
  goTo(currentStep);
}

function prevStep() {
  if (currentStep > 1) { currentStep--; goTo(currentStep); }
}

function submit() {
  goTo(totalSteps + 1);
  document.getElementById('req-id').textContent = 'BNR-' + Date.now().toString(36).toUpperCase();
}

/* ========== INIT ========== */
function initDesigners() {
  ['sel-des1', 'sel-des2', 'sel-des3'].forEach(id => {
    const select = document.getElementById(id);
    select.innerHTML = '<option value="">選択しない</option>' +
      designerList.map(designerName => `<option>${designerName}</option>`).join('');
  });
}

document.getElementById('inp-imgsize').addEventListener('input', function () {
  this._edited = true;
});

initCongestion();
initNotices();
initDesigners();
renderCommonBlock();
