export interface MailJob {
  to: string;
  subject: string;
  title: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
}

export const MAIL_QUEUE = '2seats-mail';
