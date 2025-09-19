/**
 * DOM Sanitization Security Tests
 * Tests for XSS prevention and safe HTML rendering
 */

import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Setup JSDOM for DOMPurify in Node.js environment
const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

describe('DOM Sanitization Security', () => {
  describe('XSS Prevention', () => {
    it('should sanitize script tags', () => {
      const maliciousHTML = '<script>alert("XSS")</script><p>Safe content</p>';
      const sanitized = purify.sanitize(maliciousHTML);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<p>Safe content</p>');
    });

    it('should remove onclick handlers', () => {
      const maliciousHTML = '<button onclick="alert(\'XSS\')">Click me</button>';
      const sanitized = purify.sanitize(maliciousHTML);

      expect(sanitized).not.toContain('onclick');
      expect(sanitized).toContain('<button>Click me</button>');
    });

    it('should remove javascript: protocols', () => {
      const maliciousHTML = '<a href="javascript:alert(\'XSS\')">Link</a>';
      const sanitized = purify.sanitize(maliciousHTML);

      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toContain('<a>Link</a>');
    });

    it('should remove data: URIs in dangerous contexts', () => {
      const maliciousHTML = '<img src="data:text/html,<script>alert(\'XSS\')</script>">';
      const sanitized = purify.sanitize(maliciousHTML);

      expect(sanitized).not.toContain('data:text/html');
    });

    it('should remove style attributes with expressions', () => {
      const maliciousHTML = '<div style="background: url(javascript:alert(\'XSS\'))">Content</div>';
      const sanitized = purify.sanitize(maliciousHTML);

      expect(sanitized).not.toContain('javascript:');
    });

    it('should handle nested XSS attempts', () => {
      const maliciousHTML = '<div><script>alert("XSS")</script><p>Safe <script>alert("nested")</script> content</p></div>';
      const sanitized = purify.sanitize(maliciousHTML);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<p>Safe  content</p>');
    });
  });

  describe('HTML Entity Security', () => {
    it('should handle HTML entities correctly', () => {
      const htmlWithEntities = '&lt;script&gt;alert("XSS")&lt;/script&gt;';
      const sanitized = purify.sanitize(htmlWithEntities);

      // Should preserve the escaped content
      expect(sanitized).toContain('&lt;script&gt;');
      expect(sanitized).not.toContain('<script>');
    });

    it('should prevent entity-based XSS', () => {
      const maliciousHTML = '<img src="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;&#97;&#108;&#101;&#114;&#116;&#40;&#39;&#88;&#83;&#83;&#39;&#41;">';
      const sanitized = purify.sanitize(maliciousHTML);

      expect(sanitized).not.toContain('javascript:');
    });
  });

  describe('Allowed Tags Configuration', () => {
    it('should respect allowed tags for message formatting', () => {
      const config = {
        ALLOWED_TAGS: ['strong', 'em', 'code'],
        ALLOWED_ATTR: []
      };

      const html = '<strong>Bold</strong> <em>Italic</em> <code>Code</code> <script>alert("XSS")</script>';
      const sanitized = purify.sanitize(html, config);

      expect(sanitized).toContain('<strong>Bold</strong>');
      expect(sanitized).toContain('<em>Italic</em>');
      expect(sanitized).toContain('<code>Code</code>');
      expect(sanitized).not.toContain('<script>');
    });

    it('should respect allowed tags for PDF export', () => {
      const config = {
        ALLOWED_TAGS: ['html', 'head', 'body', 'title', 'h1', 'h2', 'h3', 'p', 'div', 'table', 'tr', 'td', 'strong', 'em'],
        ALLOWED_ATTR: ['class', 'style']
      };

      const html = `
        <html>
          <head><title>Test</title></head>
          <body>
            <h1>Title</h1>
            <p class="text">Content</p>
            <script>alert("XSS")</script>
          </body>
        </html>
      `;

      const sanitized = purify.sanitize(html, config);

      expect(sanitized).toContain('<html>');
      expect(sanitized).toContain('<h1>Title</h1>');
      expect(sanitized).toContain('<p class="text">Content</p>');
      expect(sanitized).not.toContain('<script>');
    });

    it('should remove disallowed attributes', () => {
      const config = {
        ALLOWED_TAGS: ['div'],
        ALLOWED_ATTR: ['class']
      };

      const html = '<div class="safe" onclick="alert(\'XSS\')" data-malicious="bad">Content</div>';
      const sanitized = purify.sanitize(html, config);

      expect(sanitized).toContain('class="safe"');
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('data-malicious');
    });
  });

  describe('Advanced XSS Vectors', () => {
    it('should prevent SVG-based XSS', () => {
      const maliciousHTML = '<svg onload="alert(\'XSS\')"><circle/></svg>';
      const sanitized = purify.sanitize(maliciousHTML);

      expect(sanitized).not.toContain('onload');
    });

    it('should prevent iframe injection', () => {
      const maliciousHTML = '<iframe src="javascript:alert(\'XSS\')"></iframe>';
      const sanitized = purify.sanitize(maliciousHTML);

      expect(sanitized).not.toContain('<iframe>');
    });

    it('should prevent object/embed XSS', () => {
      const maliciousHTML = '<object data="javascript:alert(\'XSS\')"></object>';
      const sanitized = purify.sanitize(maliciousHTML);

      expect(sanitized).not.toContain('<object>');
    });

    it('should prevent form-based XSS', () => {
      const maliciousHTML = '<form action="javascript:alert(\'XSS\')"><input type="submit"></form>';
      const sanitized = purify.sanitize(maliciousHTML);

      expect(sanitized).not.toContain('javascript:');
    });

    it('should prevent CSS expression XSS', () => {
      const maliciousHTML = '<div style="width: expression(alert(\'XSS\'))">Content</div>';
      const sanitized = purify.sanitize(maliciousHTML);

      expect(sanitized).not.toContain('expression(');
    });
  });

  describe('Real-world XSS Test Cases', () => {
    it('should handle complex nested attacks', () => {
      const complexXSS = `
        <div>
          <p>Normal content</p>
          <img src="x" onerror="alert('XSS')">
          <a href="javascript:void(0)" onclick="alert('XSS')">Click</a>
          <style>body{background:url("javascript:alert('XSS')")}</style>
          <script>
            try {
              alert('XSS');
            } catch(e) {}
          </script>
          <iframe src="data:text/html,<script>alert('XSS')</script>"></iframe>
        </div>
      `;

      const sanitized = purify.sanitize(complexXSS);

      expect(sanitized).toContain('<p>Normal content</p>');
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('<style>');
      expect(sanitized).not.toContain('<iframe>');
    });

    it('should preserve safe content while removing threats', () => {
      const mixedContent = `
        <div>
          <h1>Conference Schedule</h1>
          <p>Welcome to <strong>ITC Vegas 2025</strong></p>
          <ul>
            <li>Session 1: <em>AI and Security</em></li>
            <li>Session 2: <code>React Best Practices</code></li>
          </ul>
          <script>steal_cookies()</script>
          <img src="logo.png" alt="Logo">
        </div>
      `;

      const sanitized = purify.sanitize(mixedContent);

      expect(sanitized).toContain('<h1>Conference Schedule</h1>');
      expect(sanitized).toContain('<strong>ITC Vegas 2025</strong>');
      expect(sanitized).toContain('<em>AI and Security</em>');
      expect(sanitized).toContain('<code>React Best Practices</code>');
      expect(sanitized).toContain('<img src="logo.png" alt="Logo">');
      expect(sanitized).not.toContain('steal_cookies');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large HTML strings efficiently', () => {
      const largeHTML = '<p>Content</p>'.repeat(10000);
      const start = performance.now();
      const sanitized = purify.sanitize(largeHTML);
      const end = performance.now();

      expect(sanitized).toContain('<p>Content</p>');
      expect(end - start).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle malformed HTML gracefully', () => {
      const malformedHTML = '<div><p>Unclosed tags<span><strong>Content</div>';
      const sanitized = purify.sanitize(malformedHTML);

      expect(sanitized).toContain('Content');
      expect(sanitized.match(/<div>/g)?.length).toEqual(sanitized.match(/<\/div>/g)?.length);
    });

    it('should handle empty and null inputs', () => {
      expect(purify.sanitize('')).toBe('');
      expect(purify.sanitize('   ')).toBe('   ');
    });

    it('should handle unicode and special characters', () => {
      const unicodeHTML = '<p>Hello 世界 🌍 © 2025</p>';
      const sanitized = purify.sanitize(unicodeHTML);

      expect(sanitized).toContain('Hello 世界 🌍 © 2025');
    });
  });
});