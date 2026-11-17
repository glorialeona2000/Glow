export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-14 leading-relaxed text-taupe md:py-20 [&_h2]:display [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_li]:mb-1.5 [&_p]:mb-4 [&_strong]:font-medium [&_strong]:text-ink [&_a]:underline [&_a]:underline-offset-2">
      {children}
    </div>
  );
}
