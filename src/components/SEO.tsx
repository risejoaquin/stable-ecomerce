import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
}

export function SEO({ title, description, image }: SEOProps) {
  const defaultTitle = 'Terra & Tide Store';
  const defaultDesc = 'A modern, handcrafted store for your daily needs.';
  
  return (
    <Helmet>
      <title>{title ? `${title} | Store` : defaultTitle}</title>
      <meta name="description" content={description || defaultDesc} />
      {image && <meta property="og:image" content={image} />}
      <meta property="og:title" content={title || defaultTitle} />
      <meta property="og:description" content={description || defaultDesc} />
    </Helmet>
  );
}
