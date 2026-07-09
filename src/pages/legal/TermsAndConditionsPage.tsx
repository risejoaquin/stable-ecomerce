import React from 'react';
import { SEO } from '../../components/SEO';

export function TermsAndConditionsPage() {
  return (
    <>
      <SEO title="Terms and Conditions" />
      <div className="max-w-3xl mx-auto px-8 py-16 prose prose-slate">
        <h1 className="text-3xl font-serif font-bold mb-8">Terms and Conditions</h1>
        <p className="mb-4 text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-600">By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using this website's particular services, you shall be subject to any posted guidelines or rules applicable to such services.</p>
        </section>
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">2. Provision of Services</h2>
          <p className="text-gray-600">You agree and acknowledge that the store is entitled to modify, improve or discontinue any of its services at its sole discretion and without notice to you even if it may result in you being prevented from accessing any information contained in it.</p>
        </section>
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">3. Proprietary Rights</h2>
          <p className="text-gray-600">You acknowledge and agree that the website may contain proprietary and confidential information including trademarks, service marks and patents protected by intellectual property laws and international intellectual property treaties.</p>
        </section>
      </div>
    </>
  );
}
