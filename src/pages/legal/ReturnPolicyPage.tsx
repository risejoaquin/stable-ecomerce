import React from 'react';
import { SEO } from '../../components/SEO';

export function ReturnPolicyPage() {
  return (
    <>
      <SEO title="Política de Devolución" />
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-16 prose prose-slate">
        <h1 className="text-3xl font-serif font-bold mb-8">Política de Devolución</h1>
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Devoluciones</h2>
          <p className="text-gray-600">You have 30 calendar days to return an item from the date you received it. To be eligible for a return, your item must be unused and in the same condition that you received it. Your item must be in the original packaging. Your item needs to have the receipt or proof of purchase.</p>
        </section>
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Reembolsos</h2>
          <p className="text-gray-600">Once we receive your item, we will inspect it and notify you that we have received your returned item. We will immediately notify you on the status of your refund after inspecting the item. If your return is approved, we will initiate a refund to your credit card (or original method of payment).</p>
        </section>
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Envíos</h2>
          <p className="text-gray-600">You will be responsible for paying for your own shipping costs for returning your item. Envíos costs are non-refundable. If you receive a refund, the cost of return shipping will be deducted from your refund.</p>
        </section>
      </div>
    </>
  );
}
