import { PageContainer } from "@/components/shell";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <PageContainer size="narrow">
      <div className="py-16 text-center space-y-4 rounded-lg border border-hairline bg-paper-raised p-8 sm:p-12 shadow-[0_1px_0_rgba(43,47,39,0.04)]">
        <span className="eyebrow block text-sage-deep">404 NOT FOUND</span>
        <h1 className="font-display text-3xl sm:text-4xl font-medium text-ink">
          This record could not be found.
        </h1>
        <p className="text-sm text-ink-soft max-w-md mx-auto leading-relaxed">
          The requested page or document does not exist, has been relocated, or is no longer accessible.
        </p>
        <div className="pt-4">
          <Button variant="primary" size="md" href="/">
            Return to Discover
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
