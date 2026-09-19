import { CircleAlert, CircleCheck, EyeOff, Lock, MessageSquare, Shield } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import peopleImage from '@/public/images/people.png'; // imported, so a replaced file is never served stale

// Where a visitor in crisis can find local help: a directory of helplines by country.
const CRISIS_URL = 'https://findahelpline.com';

// What the site actually does, worded to be true: there is no account, names are random, the
// connection is HTTPS, and reported posts are reviewed by moderators.
const privacyPoints: { icon: ReactNode; text: string }[] = [
  { icon: <EyeOff aria-hidden />, text: 'Do not include real names, phone numbers, or addresses.' },
  { icon: <Lock aria-hidden />, text: 'You get a random name. We never ask for your name, email or phone number.' },
  { icon: <CircleAlert aria-hidden />, text: 'Avoid sensitive data that could identify your workplace or family.' },
  { icon: <CircleAlert aria-hidden />, text: 'Reported content is reviewed and removed by moderators.' },
];

const checklist = [
  'Have you removed specific locations?',
  'Did you specify what kind of advice you need?',
  'Is the tone respectful and calm?',
];

function PrivacyPanel() {
  return (
    <div className="overflow-hidden rounded-card bg-wash p-2.5">
      <div className="relative aspect-square overflow-hidden rounded-xl">
        <Image
          src={peopleImage}
          alt="A family sitting together inside a ring of soft purple veils"
          fill
          sizes="(min-width: 1280px) 320px, 90vw"
          className="object-cover"
        />
      </div>
      <div className="px-3.5 pt-[11px] pb-3.5">
        <p className="flex items-center gap-2 text-[10px] leading-4 font-semibold tracking-[0.05em] text-primary-hover uppercase">
          <Shield aria-hidden className="size-3.5" />
          Community Safety
        </p>
        <h3 className="mt-2.5 font-heading text-[1.2rem] leading-7 font-semibold text-ink">Your Privacy Matters</h3>
        <p className="mt-1 text-sm leading-5 text-muted">
          GistVeil is a sanctuary for honest sharing. To keep this space safe, we ask that you:
        </p>
        <ul className="mt-[25px] space-y-[11px]">
          {privacyPoints.map((point) => (
            <li key={point.text} className="flex gap-3 text-sm leading-[23px] text-ink">
              <span className="mt-[3px] shrink-0 text-primary [&>svg]:size-4">{point.icon}</span>
              {point.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function QualityChecklist() {
  return (
    <Card outline={false} className="p-5">
      <h3 className="flex items-center gap-2.5 font-heading text-2xl leading-8 font-semibold text-ink">
        <CircleCheck aria-hidden className="size-4 text-success" />
        Quality Checklist
      </h3>
      <ol className="mt-4 space-y-4">
        {checklist.map((item, index) => (
          <li key={item} className="flex items-start gap-3 text-sm leading-5 text-ink">
            <span
              aria-hidden
              className="grid size-5 shrink-0 place-items-center rounded-full border border-border-soft text-[10px] text-muted"
            >
              {index + 1}
            </span>
            {item}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function SupportCard() {
  return (
    <div className="rounded-card bg-ink p-6 text-page">
      <h3 className="text-[15px] leading-5 font-semibold">Need immediate support?</h3>
      <p className="mt-[9px] text-xs leading-5 text-white/55">
        GistVeil is for peer advice. If you are in immediate danger or in a crisis, please contact local
        professional emergency services.
      </p>
      <a
        href={CRISIS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3.5 flex h-9 items-center justify-center rounded-full border border-page/70 text-xs font-semibold text-page transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        View Crisis Resources
      </a>
    </div>
  );
}

// The right-hand column of the compose page.
export function ComposeAside() {
  return (
    <aside aria-label="Posting guidance" className="flex flex-col gap-6">
      <PrivacyPanel />
      <QualityChecklist />
      <SupportCard />
    </aside>
  );
}

function Note({
  icon,
  title,
  className,
  titleClass,
  textClass,
  children,
}: {
  icon: ReactNode;
  title: string;
  className: string;
  titleClass: string;
  textClass: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex gap-3 rounded-2xl p-4 ${className}`}>
      <span className="mt-0.5 shrink-0 text-ink [&>svg]:size-3.5">{icon}</span>
      <div>
        <h3 className={`text-sm leading-5 font-medium ${titleClass}`}>{title}</h3>
        <p className={`text-sm leading-5 ${textClass}`}>{children}</p>
      </div>
    </div>
  );
}

// The two tinted notes under the form.
export function ComposeNotes() {
  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2">
      <Note
        icon={<MessageSquare aria-hidden />}
        title="What happens next?"
        className="bg-note-info"
        titleClass="text-note-info-title"
        textClass="text-note-info-text"
      >
        Once posted, members can reply with advice. You will see their comments but they will never know who
        you are.
      </Note>
      <Note
        icon={<Lock aria-hidden />}
        title="Encryption Active"
        className="bg-note-secure"
        titleClass="text-note-secure-title"
        textClass="text-note-secure-text"
      >
        Your post is sent over an encrypted (HTTPS) connection.
      </Note>
    </div>
  );
}
