import Link from "next/link";
import React from "react";

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-paper-raised py-6 text-xs text-ink-soft">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="font-medium text-center sm:text-left">
          GetSwydd prepares applications. You approve every submission.
        </p>
        <nav aria-label="Footer navigation" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
          <Link href="/" className="hover:text-ink hover:underline">
            Discover
          </Link>
          <Link href="/resumes" className="hover:text-ink hover:underline">
            Resumes
          </Link>
          <Link href="/applications" className="hover:text-ink hover:underline">
            Applications
          </Link>
          <Link href="/profile" className="hover:text-ink hover:underline">
            Profile
          </Link>
        </nav>
      </div>
    </footer>
  );
}

