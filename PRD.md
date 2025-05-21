# Product Requirements Document for MedEvidence

## App Overview
- Name: MedEvidence
- Tagline: Evidence-based medical answers powered by PubMed
- Category: web_application
- Visual Style: Refined Technical (e.g. Stripe)

## Workflow

Users enter medical research questions, the system queries PubMed API to retrieve relevant studies, processes the information using an LLM, and presents a synthesized answer with citations to the original research papers.

## Application Structure


### Route: /

Home page featuring a prominent search bar for entering medical research questions, brief explanation of the app's functionality, and a sample of recent queries. The design is clean and clinical with a focus on usability and trust.


### Route: /results

Results page displaying the synthesized answer to the user's query, with clear citation links to the original PubMed articles. The page includes a section showing the retrieved abstracts used as evidence, the query processing status, and options to refine the search or ask follow-up questions.


### Route: /history

Search history page showing the user's previous queries and their results, allowing them to revisit past searches. Each history item displays the query, timestamp, and a snippet of the answer, with the option to view the full result again.


## Potentially Relevant Utility Functions

### requestMultimodalModel

Potential usage: Used to process medical queries, synthesize information from retrieved PubMed abstracts, and generate evidence-based answers with proper citations

Look at the documentation for this utility function and determine whether or not it is relevant to the app's requirements.

## External APIs
- NCBI E-utilities API (PubMed)
  - Usage: Search and retrieve medical research abstracts, metadata, and citations from PubMed/MEDLINE database

## Resources
- NCBI E-utilities API Documentation (reference_site): https://www.ncbi.nlm.nih.gov/books/NBK25500/