import { Phone } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { formatDate } from '@/lib/dates';
import type { PackageStatus } from '@/lib/types';

type ClientContactActionsProps = {
  name: string;
  phone: string;
  expiryDate: string;
  status: PackageStatus['status'];
  paused?: boolean;
};

function phoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

function whatsappUrl(name: string, phone: string, expiryDate: string, status: PackageStatus['status'], paused: boolean): string {
  const messageByStatus = paused
    ? `Hey ${name}! 👋
Your membership at *Body Garage Fitness Club* is currently *Paused*.
Reply *RESUME* if you would like to resume your membership and continue your fitness journey. 🏋️‍♂️💪`
    : status === 'expired'
      ? `Hey ${name}! 👋
Your membership at *Body Garage Fitness Club* has *Expired* on *${formatDate(expiryDate)}*.
Reply to this message or visit the front desk to renew your membership today. 🏋️‍♂️💪`
      : status === 'expiring'
        ? `Hey ${name}! 👋
Your membership at *Body Garage Fitness Club* is *Expiring Soon* on *${formatDate(expiryDate)}*.
Reply to this message or visit the front desk to renew before you miss any workout days. 🏋️‍♂️💪`
        : `Hey ${name}! 👋
Your membership at *Body Garage Fitness Club* is active until *${formatDate(expiryDate)}*.
Keep up your fitness journey! 🏋️‍♂️💪`;

  return `https://wa.me/${phoneDigits(phone)}?text=${encodeURIComponent(messageByStatus)}`;
}

export default function ClientContactActions({ name, phone, expiryDate, status, paused = false }: ClientContactActionsProps) {
  const digits = phoneDigits(phone);

  return (
    <div className="flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
      <a
        href={whatsappUrl(name, phone, expiryDate, status, paused)}
        target="_blank"
        rel="noreferrer"
        aria-label={`Message ${name} on WhatsApp`}
        title="Message on WhatsApp"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-success hover:bg-success/15 transition-colors"
      >
        <FaWhatsapp size={19} aria-hidden="true" />
      </a>
      <a
        href={`tel:${digits}`}
        aria-label={`Call ${name}`}
        title="Call client"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-accent hover:bg-accent/15 transition-colors"
      >
        <Phone size={17} />
      </a>
    </div>
  );
}