import React from 'react';
import { SEO } from '../../components/SEO';

export function PrivacyPolicyPage() {
  return (
    <>
      <SEO title="Política de Privacidad" />
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-16 prose prose-slate">
        <h1 className="text-3xl font-serif font-bold mb-8">Política de Privacidad</h1>
        <p className="mb-4 text-gray-600">Última actualización: {new Date().toLocaleDateString()}</p>
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">1. Información que Recopilamos</h2>
          <p className="text-gray-600">We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us. This information may include: name, email, phone number, postal address, profile picture, payment method, and other information you choose to provide.</p>
        </section>
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">2. Uso de la Información</h2>
          <p className="text-gray-600">We may use the information we collect about you to provide, maintain, and improve our services, including, for example, to facilitate payments, send receipts, provide products and services you request, develop new features, provide customer support to Users, develop safety features, authenticate users, and send product updates and administrative messages.</p>
        </section>
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">3. Intercambio de Información</h2>
          <p className="text-gray-600">We may share the information we collect about you as described in this Statement or as described at the time of collection or sharing, including as follows: With third party Service Providers; With the general public if you submit content in a public forum, such as blog comments, social media posts, or other features of our Services that are viewable by the general public.</p>
        </section>
      </div>
    </>
  );
}
