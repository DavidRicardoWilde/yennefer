import { MANUAL_FILL_MESSAGE } from '@/lib/messages';

export default defineBackground(() => {
  browser.commands.onCommand.addListener((command) => {
    if (command !== 'manual-fill') return;

    void browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;

      browser.tabs
        .sendMessage(tabId, { type: MANUAL_FILL_MESSAGE })
        .catch((error: unknown) => {
          console.info('Manual fill could not run on this tab.', error);
        });
    });
  });
});
