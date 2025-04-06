chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'exportDialog') {
    try {
      const allDialogs = [];
      let currentDialog = [];
      const messageElements = document.querySelectorAll('[data-testid="union_message"]');
      
      let isNewDialog = true;
      messageElements.forEach(element => {
        try {
          // 检查是否为分隔符
          const divider = element.querySelector('[data-testid="message_section_divider"]');
          if (divider) {
            const dividerText = divider.querySelector('.text-WR4VbJ')?.textContent?.trim();
            if (dividerText) {
              // 如果当前对话不为空，将其添加到所有对话列表中
              if (currentDialog.length > 0 && !isNewDialog) {
                allDialogs.push([...currentDialog]);
              }
              // 开始新的对话，并添加标题
              currentDialog = [];
              currentDialog.push(['标题', dividerText]);
              isNewDialog = true;
              return; // 跳过后续处理，因为这是分隔符
            }
          }
          
          // 获取消息内容
          const messageBlock = element.querySelector('[data-testid="message-block-container"]');
          if (messageBlock) {
            const messageBox = messageBlock.querySelector('[data-testid="send_message"], [data-testid="receive_message"]');
            if (messageBox) {
              const isUserMessage = messageBox.getAttribute('data-testid') === 'send_message';
              const messageContentElement = messageBox.querySelector('[data-testid="message_text_content"]');
              
              if (messageContentElement) {
                const messageContent = messageContentElement.textContent?.trim();
                if (messageContent) {
                  currentDialog.push([isUserMessage ? '用户' : '豆包', messageContent]);
                  isNewDialog = false;
                }
              }
            }
          }
        } catch (blockError) {
          console.warn('处理单个消息块时出错：', blockError);
          // 继续处理下一个消息块
        }
      });
      
      // 添加最后一组对话
      if (currentDialog.length > 0) {
        allDialogs.push([...currentDialog]);
      }
      
      if (allDialogs.length === 0) {
        throw new Error('未找到任何对话内容');
      }
      
      sendResponse({ success: true, data: allDialogs });
    } catch (error) {
      console.error('解析对话内容时出错：', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  return true; // 保持消息通道开启
});