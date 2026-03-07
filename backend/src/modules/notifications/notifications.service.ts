import { Injectable, Logger } from '@nestjs/common';

export type NotificationChannel = 'push' | 'email';

export type NotificationPayload = {
  userId: string;
  type: string;
  title: string;
  body?: string;
  pushToken?: string;
  email?: string;
  channels?: NotificationChannel[];
  data?: Record<string, any>;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly isTest = process.env.NODE_ENV === 'test';
  private readonly pushEnabled =
    !this.isTest && process.env.NOTIFICATIONS_PUSH_ENABLED === 'true';
  private readonly emailEnabled =
    !this.isTest && process.env.NOTIFICATIONS_EMAIL_ENABLED === 'true';
  private transporterPromise: Promise<any> | null = null;

  async send(payload: NotificationPayload) {
    // This stub logs and pretends to queue notifications.
    // Replace with real push/email integrations (e.g., Firebase/Expo, SendGrid/SES).
    const channels = payload.channels ?? ['push'];
    const effectiveChannels = channels.filter((ch) =>
      ch === 'push' ? this.pushEnabled : this.emailEnabled,
    );

    if (effectiveChannels.length === 0) {
      this.logger.log(
        `Notification skipped (channels disabled): ${payload.type} -> ${payload.userId}`,
      );
      return { queued: false, reason: 'channels_disabled', payload };
    }

    effectiveChannels.forEach((ch) => {
      if (ch === 'push') {
        this.sendPush(payload).catch((err) =>
          this.logger.error('Push notification failed', err),
        );
      } else if (ch === 'email') {
        this.sendEmail(payload).catch((err) =>
          this.logger.error('Email notification failed', err),
        );
      }
    });

    return { queued: true, payload, channels: effectiveChannels };
  }

  private async sendPush(payload: NotificationPayload) {
    if (this.isTest) {
      return;
    }
    if (!payload.pushToken || !process.env.EXPO_ACCESS_TOKEN) {
      this.logger.log(
        `Push skipped (missing token or EXPO_ACCESS_TOKEN): ${payload.type} -> ${payload.userId}`,
      );
      return;
    }

    const body = {
      to: payload.pushToken,
      title: payload.title,
      body: payload.body,
      data: payload.data,
    };

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Expo push failed: ${res.status} ${text}`);
    }
  }

  private async sendEmail(payload: NotificationPayload) {
    if (this.isTest) {
      return;
    }
    const from = process.env.SMTP_FROM;
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const to = payload.email;

    if (!from || !host || !user || !pass || !to) {
      this.logger.log(
        `Email skipped (missing SMTP config or recipient): ${payload.type} -> ${payload.userId}`,
      );
      return;
    }

    const transporter = await this.getTransporter({
      host,
      port,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to,
      subject: payload.title,
      text: payload.body ?? '',
    });
  }

  private async getTransporter(options: any) {
    if (!this.transporterPromise) {
      const nodemailer = await import('nodemailer');
      this.transporterPromise = Promise.resolve(nodemailer.createTransport(options));
    }
    return this.transporterPromise;
  }
}
