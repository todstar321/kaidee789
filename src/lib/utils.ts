import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '฿0';
  return '฿' + Number(amount).toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatThaiDate(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatThaiTime(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getElapsedMinutes(openedAt: string | undefined | null): number {
  if (!openedAt) return 0;
  const start = new Date(openedAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - start) / 60000));
}

export function getBuffetRemainingMinutes(endTime: string | undefined | null): { minutes: number; isExpired: boolean } {
  if (!endTime) return { minutes: 0, isExpired: false };
  const end = new Date(endTime).getTime();
  const now = Date.now();
  const diff = end - now;
  const minutes = Math.floor(diff / 60000);
  return {
    minutes: Math.max(0, minutes),
    isExpired: diff <= 0,
  };
}
