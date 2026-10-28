import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
import type { Environment } from '../config/environment';
import type { Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { MAIL_QUEUE, type MailJob } from './mail.types';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

@Processor(MAIL_QUEUE)
@Injectable()
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly config: ConfigService<Environment, true>) {
    super();
  }

  async process(job: Job<MailJob>): Promise<void> {
    const mail = job.data;
    const html = this.renderHtml(mail);
    const resendKey = this.config.get('RESEND_API_KEY', { infer: true });
    const smtpHost = this.config.get('SMTP_HOST', { infer: true });

    if (resendKey.length > 0) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.config.get('MAIL_FROM', { infer: true }),
          to: [mail.to],
          subject: mail.subject,
          html,
        }),
      });
      if (!response.ok) {
        throw new Error(
          `Resend email delivery failed with status ${response.status}`,
        );
      }
      return;
    }

    if (smtpHost.length > 0) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: this.config.get('SMTP_PORT', { infer: true }),
        secure: this.config.get('SMTP_PORT', { infer: true }) === 465,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 10_000,
        auth: this.smtpCredentials(),
      });
      await transporter.sendMail({
        from: this.config.get('MAIL_FROM', { infer: true }),
        to: mail.to,
        subject: mail.subject,
        html,
        text: `${mail.title}\n\n${mail.message}\n\n${mail.actionLabel}: ${mail.actionUrl}\n\nYour seat is always next to mine.`,
      });
      return;
    }

    this.logger.log(
      `Development email queued for ${mail.to}: ${mail.subject} ${mail.actionUrl}`,
    );
  }

  private smtpCredentials(): { user: string; pass: string } | undefined {
    const user = this.config.get('SMTP_USER', { infer: true });
    const pass = this.config.get('SMTP_PASSWORD', { infer: true });
    return user.length > 0 && pass.length > 0 ? { user, pass } : undefined;
  }

  private renderHtml(mail: MailJob): string {
    const title = escapeHtml(mail.title);
    const message = escapeHtml(mail.message);
    const label = escapeHtml(mail.actionLabel);
    const url = escapeHtml(mail.actionUrl);
    return `<div style="margin:0;background:#1A0B14;padding:40px 16px;color:#FFF4EC;font-family:Arial,sans-serif"><div style="max-width:520px;margin:auto;border:1px solid #E8466C55;border-radius:24px;background:#3B0F26;padding:36px"><div style="color:#E8466C;font-size:14px;font-weight:bold;letter-spacing:3px">2SEATS</div><h1 style="color:#FFF4EC;font-family:Georgia,serif;font-size:30px">${title}</h1><p style="color:#f2dce5;line-height:1.7">${message}</p><a href="${url}" style="display:inline-block;margin:20px 0;background:#E8466C;border-radius:999px;padding:14px 22px;color:#fff4ec;text-decoration:none;font-weight:bold">${label}</a><p style="margin-top:28px;color:#FFB3C6;font-size:13px">Your seat is always next to mine.</p></div></div>`;
  }
}
