// 等待XLSX库加载完成
function waitForXLSX(maxWaitTime = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = 3;
    
    function checkXLSX() {
      try {
        if (window.XLSX && 
            typeof window.XLSX === 'object' && 
            typeof window.XLSX.utils === 'object' && 
            typeof window.XLSX.utils.book_new === 'function') {
          console.log('XLSX库加载成功');
          resolve();
        } else {
          retryCount++;
          if (retryCount > maxRetries || Date.now() - startTime > maxWaitTime) {
            reject(new Error('XLSX库加载超时或未正确初始化，请刷新页面重试'));
          } else {
            console.log(`等待XLSX库加载，重试次数：${retryCount}`);
            setTimeout(checkXLSX, 500);
          }
        }
      } catch (error) {
        console.error('检查XLSX库时出错：', error);
        reject(error);
      }
    }
    
    // 确保脚本已加载
    const xlsxScript = document.querySelector('script[src="lib/xlsx.full.min.js"]');
    if (!xlsxScript) {
      reject(new Error('未找到XLSX库脚本'));
      return;
    }
    
    checkXLSX();
  });
}

// 导出对话内容到Excel
async function exportToExcel(allDialogs) {
  if (!window.XLSX) {
    throw new Error('XLSX库未正确加载');
  }

  try {
    const workbook = window.XLSX.utils.book_new();
    
    // 为每组对话创建独立的sheet
    allDialogs.forEach((dialogData, index) => {
      const worksheet = window.XLSX.utils.aoa_to_sheet(dialogData);
      window.XLSX.utils.book_append_sheet(workbook, worksheet, `对话${index + 1}`);
    });
    
    const excelBuffer = window.XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `豆包对话_${timestamp}.xlsx`;
    
    await chrome.downloads.download({
      url: URL.createObjectURL(blob),
      filename: filename,
      saveAs: true
    });
  } catch (error) {
    throw new Error(`Excel生成失败: ${error.message}`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const exportBtn = document.getElementById('exportBtn');
  const statusDiv = document.getElementById('status');

  exportBtn.addEventListener('click', async () => {
    statusDiv.textContent = '正在导出对话...';

    try {
      // 等待XLSX库加载
      await waitForXLSX();
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 确保content script已经注入
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'exportDialog' });
      
      if (response.success) {
        await exportToExcel(response.data);
        statusDiv.textContent = '导出成功！';
      } else {
        throw new Error(response.error || '导出失败');
      }
    } catch (error) {
      console.error('导出错误：', error);
      statusDiv.textContent = `导出失败：${error.message}`;
    }
  });
});