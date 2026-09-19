import { Sparkles } from 'lucide-react';
import { PublicShell } from '@/components/shell/PublicShell';
import { ComposeAside, ComposeNotes } from '@/components/site/ComposePanels';
import { PostForm } from '@/components/site/PostForm';

export default function NewPostPage() {
  return (
    <PublicShell crumbs={[{ label: 'Home', href: '/' }, { label: 'New Post' }]} title="Compose Advice Request">
      <div className="mx-auto w-full max-w-[1152px] px-4 pt-10 pb-16 sm:px-6">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_342px]">
          <div>
            <header>
              <p className="flex items-center gap-2 text-xs font-medium tracking-[0.05em] text-primary uppercase">
                <Sparkles aria-hidden className="size-[18px]" />
                New Anonymous Post
              </p>
              <h2 className="mt-2 font-heading text-4xl leading-9 font-semibold tracking-[-0.01em] text-ink">
                Share your thoughts calmly.
              </h2>
              <p className="mt-3 max-w-[690px] text-base leading-relaxed text-muted">
                Your identity remains hidden. Describe your situation clearly to receive the most helpful advice
                from our community.
              </p>
            </header>
            <PostForm />
            <ComposeNotes />
          </div>
          <ComposeAside />
        </div>
      </div>
    </PublicShell>
  );
}
