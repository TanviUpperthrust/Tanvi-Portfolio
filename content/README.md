# Original portfolio content

`portfolio-import.json` contains the content extracted from [Tanvi's earlier portfolio](https://tanvijainportfolio.framer.website/). Project covers, the illustrated portrait, the certificate and the linked résumé are stored locally under `public/assets/`.

Run `npm run import:portfolio` once when setting up a fresh database. The importer validates the content and image files, backs up the database, inserts missing projects, hides untouched fictional starter projects, and updates the contact details. It records completion so later runs preserve admin edits. It does not run on every server start.

| Original project | New page |
| --- | --- |
| Noise Pollution in Festivals & Events | `/work/noise-pollution-festivals-events` |
| Panchkalyanak Management System | `/work/panchkalyanak-management-system` |
| Smart Kitchen Management System | `/work/smart-kitchen-management-system` |
| Two Factor Authentication | `/work/two-factor-authentication` |
| StreamBot — Movie Recommendation Chatbot | `/work/streambot-movie-recommendation-chatbot` |

All available Framer project overviews, durations, actual creator and mentor credits, cover images and relevant links are retained. Incorrect template metadata and unrelated “More Projects” text are excluded. The old `procurement-and-inventory-management-system` URL actually describes StreamBot; the new URL follows its displayed title. The old festival-campaign URL describes the noise-pollution research project.

The source's Panchkalyanak and Smart Kitchen “View case study” buttons have no destination. Smart Kitchen also has no prototype destination; Panchkalyanak's prototype requires Google sign-in. No missing research chapters or results were invented. Valid Behance and Figma links remain available for the external presentations; their full galleries/canvas content could not be extracted. The three repeated certificate images on the source represent one unique course certificate, displayed once.

Biography, tools, process, portrait, phone and certificate details are defined in `src/portfolioProfile.js`. The main email is `tanvisjain108@gmail.com`, confirmed by Tanvi during this migration. Social links point to her actual Instagram and Behance profiles. No city is asserted because the source does not provide one.

Imported project cover, year, prototype URL and ordered text/image sections are stored in SQLite and supported by the content API. Metadata edits preserve those sections. The current admin form edits the existing project fields; ordered imported sections can be updated through the admin API or a subsequent content change.
