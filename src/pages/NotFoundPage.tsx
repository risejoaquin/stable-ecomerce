import React from 'react';
import { SEO } from '../components/SEO';
import { EmptyState } from '../components/EmptyState';

export function NotFoundPage() {
  return (
    <>
      <SEO title="Page Not Found" />
      <div className="min-h-[70vh] flex items-center justify-center">
        <EmptyState 
          title="404 - Page Not Found"
          description="The page you are looking for might have been removed, had its name changed, or is temporarily unavailable."
          actionText="Return Home"
          actionLink="/"
        />
      </div>
    </>
  );
}
