import React, { useState } from 'react';
import { SEO } from '../../components/SEO';
import { toast } from 'react-hot-toast';
import { useStoreConfig } from '../../hooks/useStoreConfig';

export function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: store } = useStoreConfig();
  const themeColor = store?.config?.themeColor || '#6B705C';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to send message');
      toast.success('Message sent successfully! We will get back to you soon.');
      setFormData({ name: '', email: '', message: '' });
    } catch (err) {
      toast.error('Could not send message. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO title="Contact Us" />
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8 sm:py-16">
        <h1 className="text-3xl font-serif font-bold mb-4 text-center">Contact Us</h1>
        <p className="text-gray-500 text-center mb-12">Have a question or feedback? We'd love to hear from you.</p>
        
        <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Name</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none"
              style={{ focusRingColor: themeColor }}
              placeholder="Your name"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Email</label>
            <input 
              required
              type="email" 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none"
              placeholder="your@email.com"
            />
          </div>
          <div className="mb-8">
            <label className="block text-sm font-medium mb-2">Message</label>
            <textarea 
              required
              rows={5}
              value={formData.message}
              onChange={e => setFormData({...formData, message: e.target.value})}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none resize-none"
              placeholder="How can we help?"
            />
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-4 text-white rounded-xl font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: themeColor }}
          >
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </>
  );
}
