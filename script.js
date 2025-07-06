// 轮盘配置
const ROULETTE_CONFIG = {
  sliceCount: 99,
  successSlices: 1, // 默认1个Lu扇形
  colors: {
    success: '#F44336', // Lu - 红色
    normal: '#4CAF50', // 不Lu - 绿色
    text: '#000000'
  }
};

// 获取北京时间的日期字符串 (YYYY-MM-DD 格式)
function getBeijingDateString() {
  const now = new Date();
  // 获取UTC时间戳，然后加上8小时（北京时间UTC+8）
  const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  
  const year = beijingTime.getUTCFullYear();
  const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingTime.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// 获取北京时间的Date对象
function getBeijingDate() {
  const now = new Date();
  // 获取UTC时间戳，然后加上8小时（北京时间UTC+8）
  return new Date(now.getTime() + (8 * 60 * 60 * 1000));
}

// 全局状态
let hasSpunToday = false;
let isSpinning = false;
let isMultiMode = false; // 是否为多次模式
let todaySpinCount = 0; // 今日抽取次数
// 使用北京时间初始化当前月份和年份
const beijingNow = getBeijingDate();
let currentMonth = beijingNow.getUTCMonth();
let currentYear = beijingNow.getUTCFullYear();
let spinResult = null; // 存储抽取结果
let isPityTriggered = false; // 是否触发保底
let pendingImportData = null; // 待导入的数据
let selectedHistoryDate = null; // 选中的历史日期

// DOM 元素
const canvas = document.getElementById('rouletteCanvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spinBtn');
const tooltip = document.getElementById('tooltip');
const confirmDialog = document.getElementById('confirmDialog');
const overlay = document.getElementById('overlay');
const cancelBtn = document.getElementById('cancelBtn');
const confirmBtn = document.getElementById('confirmBtn');
const resultDisplay = document.getElementById('resultDisplay');
const resultChoice = document.getElementById('resultChoice');
const resultActions = document.getElementById('resultActions');
const pityNotice = document.getElementById('pityNotice');
const chooseYesBtn = document.getElementById('chooseYes');
const chooseNoBtn = document.getElementById('chooseNo');
const shareResultBtn = document.getElementById('shareResult');
const confirmResultBtn = document.getElementById('confirmResult');
const studioLink = document.getElementById('studioLink');

// 设置相关元素
const settingsBtn = document.getElementById('settingsBtn');
const settingsDialog = document.getElementById('settingsDialog');
const luProbabilitySlider = document.getElementById('luProbability');
const luProbabilityValue = document.getElementById('luProbabilityValue');
const singleModeBtn = document.getElementById('singleModeBtn');
const multiModeBtn = document.getElementById('multiModeBtn');
const pityDaysInput = document.getElementById('pityDays');
const exportDataBtn = document.getElementById('exportDataBtn');
const importDataBtn = document.getElementById('importDataBtn');
const importFileInput = document.getElementById('importFileInput');
const settingsCancelBtn = document.getElementById('settingsCancelBtn');
const settingsSaveBtn = document.getElementById('settingsSaveBtn');

// 导入确认对话框
const importConfirmDialog = document.getElementById('importConfirmDialog');
const importCancelBtn = document.getElementById('importCancelBtn');
const importConfirmBtn = document.getElementById('importConfirmBtn');

// 通知对话框
const notificationDialog = document.getElementById('notificationDialog');
const notificationOkBtn = document.getElementById('notificationOkBtn');

// 更新日志弹窗
const updateLogDialog = document.getElementById('updateLogDialog');
const updateLogOkBtn = document.getElementById('updateLogOkBtn');

// 历史编辑弹窗
const historyEditDialog = document.getElementById('historyEditDialog');
const historyEditDate = document.getElementById('historyEditDate');
const setLuBtn = document.getElementById('setLuBtn');
const setNoLuBtn = document.getElementById('setNoLuBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const historyEditCancelBtn = document.getElementById('historyEditCancelBtn');

// 统计元素
const successCountEl = document.getElementById('successCount');
const failureCountEl = document.getElementById('failureCount');
const totalCountEl = document.getElementById('totalCount');
const successRateEl = document.getElementById('successRate');

// 显示通知
function showNotification(message, icon = '💡') {
  const iconEl = notificationDialog.querySelector('.notification-icon');
  const messageEl = notificationDialog.querySelector('.notification-message');
  
  iconEl.textContent = icon;
  messageEl.textContent = message;
  
  notificationDialog.classList.remove('hidden');
  setTimeout(() => {
    notificationDialog.classList.add('show');
  }, 10);
}

// 隐藏通知
function hideNotification() {
  notificationDialog.classList.remove('show');
  setTimeout(() => {
    notificationDialog.classList.add('hidden');
  }, 300);
}

// 获取设置
function getSettings() {
  const settings = localStorage.getItem('lubuluSettings');
  return settings ? JSON.parse(settings) : { 
    pityDays: 0, 
    luProbability: 1,
    multiMode: false 
  };
}

// 保存设置
function saveSettings(settings) {
  localStorage.setItem('lubuluSettings', JSON.stringify(settings));
}

// 更新轮盘配置
function updateRouletteConfig() {
  const settings = getSettings();
  ROULETTE_CONFIG.successSlices = settings.luProbability;
  isMultiMode = settings.multiMode;
}

// 显示/隐藏更新日志
function showUpdateLogDialog() {
  updateLogDialog.classList.remove('hidden');
  overlay.classList.remove('hidden');
  setTimeout(() => {
    updateLogDialog.classList.add('show');
    overlay.classList.add('show');
  }, 10);
}

function hideUpdateLogDialog() {
  updateLogDialog.classList.remove('show');
  overlay.classList.remove('show');
  setTimeout(() => {
    updateLogDialog.classList.add('hidden');
    overlay.classList.add('hidden');
  }, 200);
}

// 检查是否需要显示更新日志
function checkForUpdates() {
  const lastVersion = localStorage.getItem('lubuluVersion');
  const currentVersion = '2.0';
  
  if (lastVersion !== currentVersion) {
    localStorage.setItem('lubuluVersion', currentVersion);
    setTimeout(() => {
      showUpdateLogDialog();
    }, 1000);
  }
}

// 显示/隐藏历史编辑弹窗
function showHistoryEditDialog(date) {
  selectedHistoryDate = date;
  historyEditDate.textContent = `编辑 ${date} 的记录`;
  historyEditDialog.classList.remove('hidden');
  overlay.classList.remove('hidden');
  setTimeout(() => {
    historyEditDialog.classList.add('show');
    overlay.classList.add('show');
  }, 10);
}

function hideHistoryEditDialog() {
  historyEditDialog.classList.remove('show');
  overlay.classList.remove('show');
  setTimeout(() => {
    historyEditDialog.classList.add('hidden');
    overlay.classList.add('hidden');
  }, 200);
  selectedHistoryDate = null;
}

// 获取今日抽取次数
function getTodaySpinCount() {
  const today = getBeijingDateString();
  const todaySpins = localStorage.getItem(`spinCount_${today}`);
  return todaySpins ? parseInt(todaySpins) : 0;
}

// 保存今日抽取次数
function saveTodaySpinCount(count) {
  const today = getBeijingDateString();
  localStorage.setItem(`spinCount_${today}`, count.toString());
}

// 计算距离上次Lu的天数
function getDaysSinceLastLu() {
  const history = JSON.parse(localStorage.getItem('spinHistory') || '{}');
  const dates = Object.keys(history).sort((a, b) => new Date(b) - new Date(a));
  
  for (const date of dates) {
    if (history[date] === 'success') {
      const lastLuDate = new Date(date + 'T00:00:00+08:00'); // 明确指定北京时间
      const today = getBeijingDate();
      const diffTime = today - lastLuDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
  }
  
  // 如果没找到Lu记录，返回总天数
  return dates.length;
}

// 检查是否应该触发保底
function shouldTriggerPity() {
  const settings = getSettings();
  if (settings.pityDays <= 0) return false;
  
  const daysSinceLu = getDaysSinceLastLu();
  return daysSinceLu >= settings.pityDays;
}

// 导出数据
function exportData() {
  const data = {
    spinHistory: JSON.parse(localStorage.getItem('spinHistory') || '{}'),
    settings: getSettings(),
    exportDate: getBeijingDate().toISOString(),
    version: '1.0'
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `lubulu-data-${getBeijingDateString()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 显示导入确认对话框
function showImportConfirmDialog(data) {
  pendingImportData = data;
  importConfirmDialog.classList.remove('hidden');
  overlay.classList.remove('hidden');
  setTimeout(() => {
    importConfirmDialog.classList.add('show');
    overlay.classList.add('show');
  }, 10);
}

// 隐藏导入确认对话框
function hideImportConfirmDialog() {
  importConfirmDialog.classList.remove('show');
  overlay.classList.remove('show');
  setTimeout(() => {
    importConfirmDialog.classList.add('hidden');
    overlay.classList.add('hidden');
  }, 200);
  pendingImportData = null;
}

// 执行导入
function executeImport() {
  if (!pendingImportData) return;
  
  try {
    // 导入数据
    localStorage.setItem('spinHistory', JSON.stringify(pendingImportData.spinHistory));
    if (pendingImportData.settings) {
      saveSettings(pendingImportData.settings);
      pityDaysInput.value = pendingImportData.settings.pityDays || 0;
    }
    
    // 更新UI
    updateAllUI();
    updateSpinButtonState();
    
    hideImportConfirmDialog();
    showNotification('数据导入成功！', '✅');
  } catch (error) {
    hideImportConfirmDialog();
    showNotification('导入失败：' + error.message, '❌');
  }
}

// 导入数据
function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      
      // 验证数据格式
      if (!data.spinHistory || typeof data.spinHistory !== 'object') {
        throw new Error('无效的数据格式');
      }
      
      // 显示确认对话框
      showImportConfirmDialog(data);
    } catch (error) {
      showNotification('导入失败：' + error.message, '❌');
    }
  };
  reader.readAsText(file);
}

// 音效创建函数
function createSpinSound() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // 创建旋转音效
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 3);
  
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 3);
  
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 3);
  
  return audioContext;
}

function createResultSound(isSuccess) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  if (isSuccess) {
    // 成功音效 - 上升音调
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.2);
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.4);
  } else {
    // 失败音效 - 下降音调
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(110, audioContext.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
  }
  
  return audioContext;
}

// 截图功能 - 保留结果弹窗
async function takeScreenshot() {
  try {
    // 使用html2canvas截图，不隐藏结果弹窗
    const canvas = await html2canvas(document.body, {
      allowTaint: true,
      useCORS: true,
      scale: 2, // 高清截图
      backgroundColor: '#EDE7F6',
      ignoreElements: (element) => {
        // 只忽略overlay和其他对话框，保留结果弹窗
        return element.classList.contains('overlay') || 
               (element.classList.contains('dialog') && !element.id.includes('result')) ||
               element.classList.contains('notification-dialog');
      },
      onclone: (clonedDoc) => {
        // 在克隆的文档中修复标题样式
        const clonedTitle = clonedDoc.querySelector('.title');
        if (clonedTitle) {
          // 直接设置文字内容和样式，避免渐变问题
          clonedTitle.innerHTML = 'Lubulu';
          clonedTitle.style.cssText = `
            font-family: 'Poppins', sans-serif !important;
            font-weight: 700 !important;
            font-size: 32px !important;
            margin: 0 !important;
            color: #673AB7 !important;
            background: none !important;
            -webkit-background-clip: initial !important;
            -webkit-text-fill-color: initial !important;
            background-clip: initial !important;
            text-shadow: none !important;
            display: block !important;
            width: auto !important;
            height: auto !important;
          `;
        }
        
        // 修复其他可能有渐变文字问题的元素
        const elementsWithGradient = clonedDoc.querySelectorAll('*');
        elementsWithGradient.forEach(el => {
          const style = el.style;
          if (style.webkitBackgroundClip === 'text' || style.backgroundClip === 'text') {
            el.style.color = '#673AB7';
            el.style.background = 'none';
            el.style.webkitBackgroundClip = 'initial';
            el.style.webkitTextFillColor = 'initial';
            el.style.backgroundClip = 'initial';
          }
        });
        
        // 确保AppBar样式正确
        const appBar = clonedDoc.querySelector('.app-bar');
        if (appBar) {
          appBar.style.background = 'rgba(255, 255, 255, 0.4)';
          appBar.style.backdropFilter = 'blur(20px)';
        }
      }
    });
    
    // 创建下载链接
    const link = document.createElement('a');
    link.download = `Lubulu-结果-${getBeijingDateString()}.png`;
    link.href = canvas.toDataURL('image/png');
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    showNotification('截图功能暂时不可用，请稍后重试', '❌');
    return false;
  }
}

// 验证保底天数输入
function validatePityDays(value) {
  const num = parseInt(value);
  return !isNaN(num) && num >= 0 && num <= 365 && num.toString() === value.toString();
}

// 限制输入框只能输入正整数
function setupPityDaysInput() {
  pityDaysInput.addEventListener('input', (e) => {
    let value = e.target.value;
    
    // 移除非数字字符
    value = value.replace(/[^\d]/g, '');
    
    // 限制最大值
    if (value && parseInt(value) > 365) {
      value = '365';
    }
    
    e.target.value = value;
  });
  
  // 防止粘贴非法内容
  pityDaysInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData('text');
    const cleanValue = paste.replace(/[^\d]/g, '');
    if (cleanValue && parseInt(cleanValue) <= 365) {
      e.target.value = cleanValue;
    }
  });
  
  // 防止输入非数字字符
  pityDaysInput.addEventListener('keydown', (e) => {
    // 允许的键：数字、退格、删除、左右箭头、Tab
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
    const isNumber = e.key >= '0' && e.key <= '9';
    
    if (!isNumber && !allowedKeys.includes(e.key)) {
      e.preventDefault();
    }
  });
}

// 绘制轮盘
function drawRoulette(rotation = 0) {
  const size = canvas.width;
  const center = size / 2;
  const radius = size / 2 - 10; // 留出边距
  const sliceAngle = (Math.PI * 2) / ROULETTE_CONFIG.sliceCount;
  
  // 清空画布
  ctx.clearRect(0, 0, size, size);

  // 保存当前状态
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(rotation);
  
  // 绘制扇形 - 从顶部开始（12点位置）
  for (let i = 0; i < ROULETTE_CONFIG.sliceCount; i++) {
    // 从-90度开始（顶部），顺时针绘制
    const startAngle = (i * sliceAngle) - (Math.PI / 2);
    const endAngle = ((i + 1) * sliceAngle) - (Math.PI / 2);
    
    // 绘制扇形
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();
    
    // 设置颜色
    if (i < ROULETTE_CONFIG.successSlices) {
      ctx.fillStyle = ROULETTE_CONFIG.colors.success;
    } else {
      ctx.fillStyle = ROULETTE_CONFIG.colors.normal;
    }
    ctx.fill();
    
    // 绘制边框
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  
  // 绘制文字（只在关键位置显示）
  ctx.fillStyle = ROULETTE_CONFIG.colors.text;
  ctx.font = 'bold 16px Poppins';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 显示"Lu!"文字 - 智能分布避免重叠
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px Poppins';
  
  if (ROULETTE_CONFIG.successSlices === 1) {
    // 只有1个Lu扇形，显示在中心
    const angle = (0 * sliceAngle) + (sliceAngle / 2) - (Math.PI / 2);
    const x = Math.cos(angle) * radius * 0.7;
    const y = Math.sin(angle) * radius * 0.7;
    ctx.fillText('Lu!', x, y);
  } else if (ROULETTE_CONFIG.successSlices <= 5) {
    // 5个或以下，每个都显示
    for (let i = 0; i < ROULETTE_CONFIG.successSlices; i++) {
      const angle = (i * sliceAngle) + (sliceAngle / 2) - (Math.PI / 2);
      const x = Math.cos(angle) * radius * 0.7;
      const y = Math.sin(angle) * radius * 0.7;
      ctx.fillText('Lu!', x, y);
    }
  } else if (ROULETTE_CONFIG.successSlices <= 15) {
    // 6-15个，每隔一个显示
    for (let i = 0; i < ROULETTE_CONFIG.successSlices; i += 2) {
      const angle = (i * sliceAngle) + (sliceAngle / 2) - (Math.PI / 2);
      const x = Math.cos(angle) * radius * 0.7;
      const y = Math.sin(angle) * radius * 0.7;
      ctx.fillText('Lu!', x, y);
    }
  } else if (ROULETTE_CONFIG.successSlices <= 30) {
    // 16-30个，每隔三个显示
    for (let i = 0; i < ROULETTE_CONFIG.successSlices; i += 4) {
      const angle = (i * sliceAngle) + (sliceAngle / 2) - (Math.PI / 2);
      const x = Math.cos(angle) * radius * 0.7;
      const y = Math.sin(angle) * radius * 0.7;
      ctx.fillText('Lu!', x, y);
    }
  } else {
    // 30个以上，显示在Lu区域的中心位置
    const centerAngle = (ROULETTE_CONFIG.successSlices / 2 * sliceAngle) - (Math.PI / 2);
    const x = Math.cos(centerAngle) * radius * 0.7;
    const y = Math.sin(centerAngle) * radius * 0.7;
    ctx.font = 'bold 24px Poppins'; // 更大的字体
    ctx.fillText('Lu!', x, y);
    
    // 在Lu区域两端也显示
    if (ROULETTE_CONFIG.successSlices > 40) {
      const startAngle = (0 * sliceAngle) + (sliceAngle / 2) - (Math.PI / 2);
      const endAngle = ((ROULETTE_CONFIG.successSlices - 1) * sliceAngle) + (sliceAngle / 2) - (Math.PI / 2);
      
      ctx.font = 'bold 16px Poppins';
      const startX = Math.cos(startAngle) * radius * 0.7;
      const startY = Math.sin(startAngle) * radius * 0.7;
      const endX = Math.cos(endAngle) * radius * 0.7;
      const endY = Math.sin(endAngle) * radius * 0.7;
      
      ctx.fillText('Lu!', startX, startY);
      ctx.fillText('Lu!', endX, endY);
    }
  }
  
  // 每隔几个扇形显示"不Lu"文字，避免拥挤
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px Poppins';
  const startNoLu = Math.max(ROULETTE_CONFIG.successSlices, 8);
  for (let i = startNoLu; i < ROULETTE_CONFIG.sliceCount; i += 12) {
    const angle = (i * sliceAngle) + (sliceAngle / 2) - (Math.PI / 2);
    const x = Math.cos(angle) * radius * 0.7;
    const y = Math.sin(angle) * radius * 0.7;
    ctx.fillText('不Lu', x, y);
  }
  
  // 恢复状态
  ctx.restore();
  
  // 绘制中心圆
  ctx.beginPath();
  ctx.arc(center, center, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = ROULETTE_CONFIG.colors.success;
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // 在中心圆上添加小装饰
  ctx.beginPath();
  ctx.arc(center, center, 15, 0, Math.PI * 2);
  ctx.fillStyle = ROULETTE_CONFIG.colors.success;
  ctx.fill();
}

// 空闲摆动动画
function startIdleSway() {
  if (isSpinning) return;
  
  const animation = canvas.animate([
    { transform: 'rotate(-5deg)' },
    { transform: 'rotate(5deg)' }
  ], {
    duration: 3000,
    iterations: Infinity,
    direction: 'alternate',
    easing: 'ease-in-out'
  });
  
  canvas._idleAnimation = animation;
}

// 停止空闲动画
function stopIdleSway() {
  if (canvas._idleAnimation) {
    canvas._idleAnimation.cancel();
    canvas._idleAnimation = null;
  }
}

// 显示/隐藏对话框
function showDialog() {
  confirmDialog.classList.remove('hidden');
  overlay.classList.remove('hidden');
  setTimeout(() => {
    confirmDialog.classList.add('show');
    overlay.classList.add('show');
  }, 10);
}

function hideDialog() {
  confirmDialog.classList.remove('show');
  overlay.classList.remove('show');
  setTimeout(() => {
    confirmDialog.classList.add('hidden');
    overlay.classList.add('hidden');
  }, 200);
}

// 显示/隐藏设置对话框
function showSettingsDialog() {
  const settings = getSettings();
  pityDaysInput.value = settings.pityDays || 0;
  luProbabilitySlider.value = settings.luProbability || 1;
  luProbabilityValue.textContent = `${settings.luProbability || 1}%`;
  singleModeBtn.classList.remove('active');
  multiModeBtn.classList.remove('active');
  if (settings.multiMode) {
    multiModeBtn.classList.add('active');
  } else {
    singleModeBtn.classList.add('active');
  }
  
  settingsDialog.classList.remove('hidden');
  overlay.classList.remove('hidden');
  setTimeout(() => {
    settingsDialog.classList.add('show');
    overlay.classList.add('show');
  }, 10);
}

function hideSettingsDialog() {
  settingsDialog.classList.remove('show');
  overlay.classList.remove('show');
  setTimeout(() => {
    settingsDialog.classList.add('hidden');
    overlay.classList.add('hidden');
  }, 200);
}

// 更新按钮状态
function updateSpinButtonState() {
  const today = getBeijingDateString();
  const history = JSON.parse(localStorage.getItem('spinHistory') || '{}');
  hasSpunToday = !!history[today];
  todaySpinCount = getTodaySpinCount();
  
  if (isMultiMode) {
    // 多次模式 - 始终可以抽取
    spinBtn.textContent = hasSpunToday ? `SPIN (${todaySpinCount + 1})` : 'SPIN';
    spinBtn.disabled = false;
  } else {
    // 单次模式 - 每天只能抽取一次
    if (hasSpunToday) {
      spinBtn.textContent = '今日已抽取';
      spinBtn.disabled = true;
    } else {
      spinBtn.textContent = 'SPIN';
      spinBtn.disabled = false;
    }
  }
}

// 显示结果
function showResult(isSuccess) {
  const resultIcon = resultDisplay.querySelector('.result-icon');
  const resultText = resultDisplay.querySelector('.result-text');
  
  spinResult = isSuccess; // 保存抽取结果
  
  if (isSuccess) {
    resultIcon.textContent = '🎯';
    resultText.textContent = '抽到了"Lu"！';
    resultText.className = 'result-text success';
    // 显示选择按钮
    resultChoice.classList.remove('hidden');
    resultActions.classList.add('hidden');
  } else {
    resultIcon.textContent = '😌';
    resultText.textContent = '抽到了"不Lu"！';
    resultText.className = 'result-text failure';
    // 直接保存结果，不显示选择
    saveResult(false);
    resultChoice.classList.add('hidden');
    resultActions.classList.remove('hidden');
  }
  
  // 显示或隐藏保底提示
  if (isPityTriggered && isSuccess) {
    pityNotice.classList.remove('hidden');
  } else {
    pityNotice.classList.add('hidden');
  }
  
  resultDisplay.classList.remove('hidden');
  setTimeout(() => {
    resultDisplay.classList.add('show');
  }, 100);
  
  // 播放结果音效
  try {
    createResultSound(isSuccess);
  } catch (e) {
    console.log('音效播放失败:', e);
  }
}

// 保存结果到localStorage
function saveResult(finalChoice) {
  const today = getBeijingDateString();
  const history = JSON.parse(localStorage.getItem('spinHistory') || '{}');
  
  // 只有第一次抽取才记录到历史
  if (!history[today]) {
    history[today] = finalChoice ? 'success' : 'fail';
    localStorage.setItem('spinHistory', JSON.stringify(history));
    hasSpunToday = true;
  }
  
  // 更新UI
  updateAllUI();
  // 更新按钮状态
  updateSpinButtonState();
}

// 隐藏结果
function hideResult() {
  resultDisplay.classList.remove('show');
  setTimeout(() => {
    resultDisplay.classList.add('hidden');
    resultChoice.classList.add('hidden');
    resultActions.classList.add('hidden');
    pityNotice.classList.add('hidden');
  }, 300);
}

// 更新所有UI
function updateAllUI() {
  updateStatistics();
  renderCalendar();
}

// 更新统计数据
function updateStatistics() {
  const history = JSON.parse(localStorage.getItem('spinHistory') || '{}');
  const entries = Object.entries(history);
  
  let successCount = 0;
  let failureCount = 0;
  
  entries.forEach(([date, result]) => {
    if (result === 'success') {
      successCount++;
    } else if (result === 'fail') {
      failureCount++;
    }
  });
  
  const totalCount = successCount + failureCount;
  const failureRate = totalCount > 0 ? Math.round((failureCount / totalCount) * 100) : 0;
  
  // 更新显示
  successCountEl.textContent = successCount;
  failureCountEl.textContent = failureCount;
  totalCountEl.textContent = totalCount;
  successRateEl.textContent = `${failureRate}%`;
}

// 显示五彩纸屑
function showConfetti(isSuccess) {
  const colors = isSuccess ? 
    ['#F44336', '#E57373', '#FFCDD2'] : 
    ['#4CAF50', '#8BC34A', '#C8E6C9'];
  
  const confettiContainer = document.createElement('div');
  confettiContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1000;
  `;
  document.body.appendChild(confettiContainer);

  // 创建纸屑
  for (let i = 0; i < 100; i++) {
    const piece = document.createElement('div');
    piece.style.cssText = `
      position: absolute;
      width: ${Math.random() * 10 + 5}px;
      height: ${Math.random() * 10 + 5}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      top: 50%;
      left: 50%;
      border-radius: 50%;
    `;
    confettiContainer.appendChild(piece);
    
    // 动画
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 300 + 200;
    const dx = Math.cos(angle) * velocity;
    const dy = Math.sin(angle) * velocity;
    
    piece.animate([
      { 
        transform: 'translate(-50%, -50%) scale(0)', 
        opacity: 1 
      },
      { 
        transform: `translate(${dx}px, ${dy}px) scale(1)`, 
        opacity: 0 
      }
    ], {
      duration: 1000,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    });
  }
  
  setTimeout(() => confettiContainer.remove(), 1000);
}

// 执行旋转
async function performSpin() {
  if (isSpinning) return;
  
  isSpinning = true;
  spinBtn.disabled = true;
  stopIdleSway();
  
  // 更新抽取次数
  todaySpinCount = getTodaySpinCount();
  todaySpinCount++;
  saveTodaySpinCount(todaySpinCount);
  
  // 检查是否触发保底
  isPityTriggered = shouldTriggerPity();
  
  // 播放旋转音效
  try {
    createSpinSound();
  } catch (e) {
    console.log('音效播放失败:', e);
  }
  
  // 获取随机数
  let randomIndex = 0;
  if (isPityTriggered) {
    // 保底必Lu
    randomIndex = 0; // 第一个扇形是Lu
  } else {
    // 使用浏览器的加密随机数
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    randomIndex = array[0] % 99;
  }
  
  // 计算最终角度 - 修复指向问题
  const degreesPerSlice = 360 / ROULETTE_CONFIG.sliceCount;
  
  // 指针在顶部（12点位置），我们需要计算让目标扇形的中心对准指针
  // randomIndex为0时应该指向"Lu!"扇形的中心
  const targetSliceCenter = randomIndex * degreesPerSlice + (degreesPerSlice / 2);
  
  // 因为指针在顶部，我们需要让目标扇形旋转到顶部位置
  // 最终角度 = 多圈旋转 + (360 - 目标角度)，这样目标会到达顶部
  const baseTurns = 360 * 12; // 12圈基础旋转
  const finalAngle = baseTurns + (360 - targetSliceCenter);
  
  
  // 执行旋转动画
  const spinAnimation = canvas.animate([
    { transform: 'rotate(0deg)' },
    { transform: `rotate(${finalAngle}deg)` }
  ], {
    duration: 5000, // 5秒
    easing: 'cubic-bezier(0.17, 0.67, 0.42, 1)',
    fill: 'forwards'
  });
  
  // 动画结束后显示结果
  spinAnimation.finished.then(() => {
    const isSuccess = randomIndex < ROULETTE_CONFIG.successSlices;
    
    setTimeout(() => {
      showResult(isSuccess);
      showConfetti(isSuccess);
      isSpinning = false;
    }, 500);
  });
}

// 日历渲染
function renderCalendar() {
  const calendarContainer = document.getElementById('calendar');
  // 使用UTC方法创建日期，因为我们已经在用北京时间的年月
  const firstDay = new Date(Date.UTC(currentYear, currentMonth, 1));
  const lastDay = new Date(Date.UTC(currentYear, currentMonth + 1, 0));
  const startWeekDay = firstDay.getUTCDay();
  const daysInMonth = lastDay.getUTCDate();
  const today = getBeijingDate();
  
  const history = JSON.parse(localStorage.getItem('spinHistory') || '{}');

  calendarContainer.innerHTML = `
    <div class="calendar-header">
    <button id="prevMonth">◀</button>
      <span>${currentYear}年${currentMonth + 1}月</span>
    <button id="nextMonth">▶</button>
    </div>
    <div class="calendar-grid" id="calendarGrid"></div>
  `;
  
  const grid = document.getElementById('calendarGrid');
  
  // 星期标题
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  weekdays.forEach(day => {
    const cell = document.createElement('div');
    cell.textContent = day;
    cell.style.fontWeight = 'bold';
    cell.style.color = '#666';
    grid.appendChild(cell);
  });
  
  // 空白日期
  for (let i = 0; i < startWeekDay; i++) {
    const cell = document.createElement('div');
    grid.appendChild(cell);
  }

  // 日期
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const status = history[dateKey];
    
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    cell.textContent = day;
    
    // 状态点
    const dot = document.createElement('div');
    dot.style.cssText = `
      position: absolute;
      bottom: 4px;
      left: 50%;
      transform: translateX(-50%);
      width: 6px;
      height: 6px;
      border-radius: 50%;
    `;
    
    if (status === 'success') {
      dot.style.backgroundColor = '#F44336'; // Lu - 红色
    } else if (status === 'fail') {
      dot.style.backgroundColor = '#4CAF50'; // 不Lu - 绿色
    } else {
      dot.style.cssText += 'width: 8px; height: 2px; background: #9E9E9E; border-radius: 1px;';
    }

    cell.appendChild(dot);
    grid.appendChild(cell);

    // 今天高亮 - 使用北京时间
    if (day === today.getUTCDate() && currentMonth === today.getUTCMonth() && currentYear === today.getUTCFullYear()) {
      cell.style.backgroundColor = 'rgba(103, 58, 183, 0.2)';
      cell.style.fontWeight = 'bold';
    }
    
    // 添加点击事件以编辑历史记录
    cell.addEventListener('click', () => {
      showHistoryEditDialog(dateKey);
    });
  }
  
  // 绑定月份切换事件
  document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar();
  });
  
  document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar();
  });
}

// 事件监听
spinBtn.addEventListener('click', () => {
  if (!isMultiMode && hasSpunToday) {
    tooltip.textContent = '今日仅可抽取 1 次';
    tooltip.classList.add('show');
    setTimeout(() => tooltip.classList.remove('show'), 2000);
    return;
  }
  
  if (isMultiMode || !hasSpunToday) {
    showDialog();
  }
});

cancelBtn.addEventListener('click', hideDialog);
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) {
    hideDialog();
    hideSettingsDialog();
    hideImportConfirmDialog();
    hideUpdateLogDialog();
    hideHistoryEditDialog();
  }
});

confirmBtn.addEventListener('click', () => {
  hideDialog();
  performSpin();
});

// 设置按钮事件
settingsBtn.addEventListener('click', showSettingsDialog);
settingsCancelBtn.addEventListener('click', hideSettingsDialog);

// 概率滑块事件
luProbabilitySlider.addEventListener('input', (e) => {
  const value = e.target.value;
  luProbabilityValue.textContent = `${value}%`;
  
  // 实时更新轮盘配置
  ROULETTE_CONFIG.successSlices = parseInt(value);
  drawRoulette();
});

// 模式按钮事件
singleModeBtn.addEventListener('click', () => {
  singleModeBtn.classList.add('active');
  multiModeBtn.classList.remove('active');
});

multiModeBtn.addEventListener('click', () => {
  multiModeBtn.classList.add('active');
  singleModeBtn.classList.remove('active');
});

settingsSaveBtn.addEventListener('click', () => {
  const pityDaysValue = pityDaysInput.value.trim();
  const luProbabilityValue = luProbabilitySlider.value;
  const multiMode = multiModeBtn.classList.contains('active');
  
  // 验证输入
  if (pityDaysValue === '') {
    showNotification('请输入保底天数！', '⚠️');
    return;
  }
  
  if (!validatePityDays(pityDaysValue)) {
    showNotification('保底天数必须是0-365之间的整数！', '⚠️');
    return;
  }
  
  const pityDays = parseInt(pityDaysValue);
  const luProbability = parseInt(luProbabilityValue);
  
  saveSettings({ pityDays, luProbability, multiMode });
  updateRouletteConfig();
  hideSettingsDialog();
  showNotification('设置已保存！', '✅');
  
  // 重新绘制轮盘和更新按钮状态
  drawRoulette();
  updateSpinButtonState();
});

// 数据管理事件
exportDataBtn.addEventListener('click', exportData);
importDataBtn.addEventListener('click', () => {
  importFileInput.click();
});
importFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    importData(file);
  }
  // 清空文件输入
  e.target.value = '';
});

// 导入确认事件
importCancelBtn.addEventListener('click', hideImportConfirmDialog);
importConfirmBtn.addEventListener('click', executeImport);

// 通知对话框事件
notificationOkBtn.addEventListener('click', hideNotification);

// 更新日志弹窗事件
updateLogOkBtn.addEventListener('click', hideUpdateLogDialog);

// 历史编辑弹窗事件
historyEditCancelBtn.addEventListener('click', hideHistoryEditDialog);

setLuBtn.addEventListener('click', () => {
  if (selectedHistoryDate) {
    const history = JSON.parse(localStorage.getItem('spinHistory') || '{}');
    history[selectedHistoryDate] = 'success';
    localStorage.setItem('spinHistory', JSON.stringify(history));
    updateAllUI();
    hideHistoryEditDialog();
    showNotification('历史记录已更新！', '✅');
  }
});

setNoLuBtn.addEventListener('click', () => {
  if (selectedHistoryDate) {
    const history = JSON.parse(localStorage.getItem('spinHistory') || '{}');
    history[selectedHistoryDate] = 'fail';
    localStorage.setItem('spinHistory', JSON.stringify(history));
    updateAllUI();
    hideHistoryEditDialog();
    showNotification('历史记录已更新！', '✅');
  }
});

clearHistoryBtn.addEventListener('click', () => {
  if (selectedHistoryDate) {
    const history = JSON.parse(localStorage.getItem('spinHistory') || '{}');
    delete history[selectedHistoryDate];
    localStorage.setItem('spinHistory', JSON.stringify(history));
    updateAllUI();
    updateSpinButtonState();
    hideHistoryEditDialog();
    showNotification('历史记录已清除！', '✅');
  }
});

// 选择按钮事件
chooseYesBtn.addEventListener('click', () => {
  saveResult(true); // 选择Lu
  resultChoice.classList.add('hidden');
  resultActions.classList.remove('hidden');
  
  // 更新结果显示
  const resultText = resultDisplay.querySelector('.result-text');
  resultText.textContent = '你选择了Lu！';
});

chooseNoBtn.addEventListener('click', () => {
  saveResult(false); // 选择不Lu
  resultChoice.classList.add('hidden');
  resultActions.classList.remove('hidden');
  
  // 更新结果显示
  const resultText = resultDisplay.querySelector('.result-text');
  resultText.textContent = '你选择了不Lu！';
  resultText.className = 'result-text failure';
});

// 分享按钮事件
shareResultBtn.addEventListener('click', async () => {
  const success = await takeScreenshot();
  if (success) {
    showNotification('截图已保存到下载文件夹！', '📸');
  }
});

// 确定按钮事件
confirmResultBtn.addEventListener('click', () => {
  hideResult();
});

// 版权链接事件
studioLink.addEventListener('click', (e) => {
  e.preventDefault();
  window.open('https://github.com/xvhuan/Lubulu', '_blank');
});

// 检查今日是否已抽取
function checkTodayStatus() {
  updateSpinButtonState();
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 设置canvas尺寸适配
  const container = canvas.parentElement;
  const containerWidth = container.clientWidth;
  if (containerWidth < 480) {
    canvas.width = 280;
    canvas.height = 280;
  }
  
  // 设置保底输入框验证
  setupPityDaysInput();
  
  // 初始化轮盘配置
  updateRouletteConfig();
  
  drawRoulette();
  startIdleSway();
  renderCalendar();
  checkTodayStatus();
  updateStatistics();
  checkForUpdates(); // 检查更新
}); 