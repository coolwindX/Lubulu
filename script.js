// 轮盘配置
const ROULETTE_CONFIG = {
  sliceCount: 99,
  successSlice: 0, // 第0个扇形是"Lu!"
  colors: {
    success: '#F44336', // Lu - 红色
    normal: '#4CAF50', // 不Lu - 绿色
    text: '#000000'
  }
};

// 全局状态
let hasSpunToday = false;
let isSpinning = false;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let spinResult = null; // 存储抽取结果
let isPityTriggered = false; // 是否触发保底
let pendingImportData = null; // 待导入的数据

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
  return settings ? JSON.parse(settings) : { pityDays: 0 };
}

// 保存设置
function saveSettings(settings) {
  localStorage.setItem('lubuluSettings', JSON.stringify(settings));
}

// 计算距离上次Lu的天数
function getDaysSinceLastLu() {
  const history = JSON.parse(localStorage.getItem('spinHistory') || '{}');
  const dates = Object.keys(history).sort((a, b) => new Date(b) - new Date(a));
  
  for (const date of dates) {
    if (history[date] === 'success') {
      const lastLuDate = new Date(date);
      const today = new Date();
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
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `lubulu-data-${new Date().toISOString().split('T')[0]}.json`;
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
    link.download = `Lubulu-结果-${new Date().toISOString().split('T')[0]}.png`;
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
    if (i === ROULETTE_CONFIG.successSlice) {
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
  
  // 显示"Lu!"文字 - 确保在第0个扇形中心
  const successSliceAngle = (ROULETTE_CONFIG.successSlice * sliceAngle) + (sliceAngle / 2) - (Math.PI / 2);
  const successX = Math.cos(successSliceAngle) * radius * 0.7;
  const successY = Math.sin(successSliceAngle) * radius * 0.7;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px Poppins'; // 稍微大一点的字体
  ctx.fillText('Lu!', successX, successY);
  
  // 每隔几个扇形显示"不Lu"文字，避免拥挤
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px Poppins';
  for (let i = 8; i < ROULETTE_CONFIG.sliceCount; i += 12) {
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
  const today = new Date().toISOString().split('T')[0];
  const history = JSON.parse(localStorage.getItem('spinHistory') || '{}');
  hasSpunToday = !!history[today];
  
  if (hasSpunToday) {
    spinBtn.textContent = '今日已抽取';
    spinBtn.disabled = true;
  } else {
    spinBtn.textContent = 'SPIN';
    spinBtn.disabled = false;
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
  const today = new Date().toISOString().split('T')[0];
  const history = JSON.parse(localStorage.getItem('spinHistory') || '{}');
  history[today] = finalChoice ? 'success' : 'fail';
  localStorage.setItem('spinHistory', JSON.stringify(history));
  
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
  hasSpunToday = true;
  spinBtn.disabled = true;
  stopIdleSway();
  
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
    randomIndex = ROULETTE_CONFIG.successSlice;
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
    const isSuccess = randomIndex === ROULETTE_CONFIG.successSlice;
    
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
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const startWeekDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const today = new Date();
  
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
    
    // 今天高亮
    if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
      cell.style.backgroundColor = 'rgba(103, 58, 183, 0.2)';
      cell.style.fontWeight = 'bold';
    }
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
  if (hasSpunToday) {
    tooltip.classList.add('show');
    setTimeout(() => tooltip.classList.remove('show'), 2000);
    return;
  }
  showDialog();
});

cancelBtn.addEventListener('click', hideDialog);
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) {
    hideDialog();
    hideSettingsDialog();
    hideImportConfirmDialog();
  }
});

confirmBtn.addEventListener('click', () => {
  hideDialog();
  performSpin();
});

// 设置按钮事件
settingsBtn.addEventListener('click', showSettingsDialog);
settingsCancelBtn.addEventListener('click', hideSettingsDialog);
settingsSaveBtn.addEventListener('click', () => {
  const pityDaysValue = pityDaysInput.value.trim();
  
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
  saveSettings({ pityDays });
  hideSettingsDialog();
  showNotification('设置已保存！', '✅');
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
  
  drawRoulette();
  startIdleSway();
  renderCalendar();
  checkTodayStatus();
  updateStatistics();
}); 