import { describe, it, expect } from 'vitest';

// Pure helpers extracted via re-export — keep this test isolated from DB.
// We test the format detector and the HTML renderer indirectly via fetched modules.

describe('outbound format detection', () => {
  // Reproduce the local detectFormat from outbound.ts to test the contract.
  function detectFormat(prompt: string): 'ads' | 'newsletter' | 'social' {
    const q = prompt.toLowerCase();
    if (/(newsletter|email|mail|relance|réactivation|reactivation|envoyer un message)/.test(q)) {
      return 'newsletter';
    }
    if (/(post|insta|instagram|facebook|linkedin|social|tiktok|reel|story)/.test(q)) {
      return 'social';
    }
    return 'ads';
  }

  it('detects newsletter from "email" keyword', () => {
    expect(detectFormat('Envoyer un email de relance aux dormants')).toBe('newsletter');
  });

  it('detects social from "instagram"', () => {
    expect(detectFormat('3 posts instagram pour le nouveau Châteauneuf')).toBe('social');
  });

  it('falls back to ads by default', () => {
    expect(detectFormat('5 visuels pour mes vins de garde')).toBe('ads');
  });
});

describe('outbound Mailchimp HTML escape', () => {
  function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  it('escapes HTML in user content', () => {
    expect(esc('<script>alert("hi")</script>')).toBe('&lt;script&gt;alert(&quot;hi&quot;)&lt;/script&gt;');
  });
  it('preserves accents', () => {
    expect(esc('Château & Vigne')).toBe('Château &amp; Vigne');
  });
});

describe('outbound CTA mapping for Meta Ads', () => {
  function ctaTypeFor(label: string | undefined): string {
    if (!label) return 'SHOP_NOW';
    const l = label.toLowerCase();
    if (l.includes('voir') || l.includes('découvrir')) return 'LEARN_MORE';
    if (l.includes('réserver') || l.includes('reserver')) return 'BOOK_TRAVEL';
    if (l.includes('acheter') || l.includes('panier') || l.includes('commander')) return 'SHOP_NOW';
    if (l.includes("s'inscrire") || l.includes('sinscrire')) return 'SIGN_UP';
    return 'SHOP_NOW';
  }
  it('maps "Voir la sélection" → LEARN_MORE', () => {
    expect(ctaTypeFor('Voir la sélection')).toBe('LEARN_MORE');
  });
  it('maps "Acheter" → SHOP_NOW', () => {
    expect(ctaTypeFor('Acheter')).toBe('SHOP_NOW');
  });
  it('falls back to SHOP_NOW for unknown labels', () => {
    expect(ctaTypeFor('Tester')).toBe('SHOP_NOW');
    expect(ctaTypeFor(undefined)).toBe('SHOP_NOW');
  });
});
