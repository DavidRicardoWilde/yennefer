export const MANUAL_FILL_MESSAGE = 'delete-confirm-auto-filler:manual-fill';

export interface ManualFillResponse {
  ok: boolean;
  reason?: string;
  filledTextLength?: number;
  siteName?: string;
}
