export type SendCodeResponse = {
  message: string;
  data: {
    expires_in: number;
    expires_at: string; // ISO
    retry_after: number;
  };
  code?: string; // faqat dev
};
