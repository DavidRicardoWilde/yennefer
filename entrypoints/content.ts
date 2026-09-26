import { DeleteConfirmEngine } from '@/lib/engine';
import { MANUAL_FILL_MESSAGE } from '@/lib/messages';
import { SUPPORTED_MATCHES } from '@/lib/site-rules';

export default defineContentScript({
  matches: SUPPORTED_MATCHES,
  allFrames: true,
  runAt: 'document_idle',
  main() {
    const engine = new DeleteConfirmEngine();
    void engine.start();

    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type !== MANUAL_FILL_MESSAGE) return false;

      engine
        .fillManually()
        .then(sendResponse)
        .catch((error: unknown) => {
          sendResponse({
            ok: false,
            reason: error instanceof Error ? error.message : 'unknown-error',
          });
        });

      return true;
    });
  },
});
