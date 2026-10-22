import { html } from './html.js';
import { CERTIFICATIONS } from '../portfolioProfile.js';

// The original site repeated this certificate; display the unique credential once.
export function certificationsSection() {
  return html`<section class="certifications page-wrap" id="certifications" aria-labelledby="certificationsTitle">
    <div class="certifications-intro"><h2 id="certificationsTitle" data-reveal>Always learning.<br><em>Always evolving.</em></h2><p data-reveal>Continued learning in design strategy, future trends and implementation with AI.</p></div>
    ${CERTIFICATIONS.map((certificate) => html`<article class="certification-feature" data-reveal>
      <a class="certification-image-link" href="${certificate.image}" target="_blank" rel="noopener" aria-label="Open full-size certificate: ${certificate.title}"><img class="certification-image" src="${certificate.image}" alt="Tanvi Jain’s certificate for ${certificate.title}, issued by ${certificate.issuer} through ${certificate.platform}" width="3130" height="2333" loading="lazy" decoding="async"/></a>
      <div class="certification-feature-copy"><p class="page-eyebrow">DESIGN / CONTINUED LEARNING</p><h3>${certificate.title}</h3><dl class="credential-meta"><div><dt>Issued by</dt><dd>${certificate.issuer}</dd></div><div><dt>Platform</dt><dd>${certificate.platform}</dd></div><div><dt>Completed</dt><dd><time datetime="${certificate.dateTime}">${certificate.date}</time></dd></div></dl><a class="outline-button credential-link" href="${certificate.credentialUrl}" target="_blank" rel="noopener">View credential <span aria-hidden="true">↗</span></a></div>
    </article>`)}
  </section>`;
}
