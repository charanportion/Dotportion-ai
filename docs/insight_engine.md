# 1. What the Insight Engine Must Do

Input (raw signals):

customer feedback  
support tickets  
interviews  
Slack messages  
analytics signals  
feature requests

Example raw data:

"It took 20 minutes to import data."  
"Import failed again."  
"Onboarding is confusing."  
"I don't know where to upload my CSV."

Output:

Top Problem:  
Data Import Confusion  
  
Evidence:  
• 42 mentions  
• onboarding drop rate 60%  
  
Suggested Feature:  
Guided Import Wizard  
  
Implementation:  
• Import validation API  
• UI wizard flow  
• Progress indicator

So the engine must do **5 stages of reasoning**.

---

# 2. Insight Engine Pipeline

Core pipeline:

Signal Extraction  
↓  
Embedding Generation  
↓  
Semantic Clustering  
↓  
Problem Detection  
↓  
Feature Reasoning  
↓  
PRD Generation

Each stage is **a separate AI module**.

---

# 3. Stage 1: Signal Extraction

Raw input:

support ticket  
customer message  
interview transcript

We convert it into **structured signals**.

Example prompt to Claude:

Extract product signals from this message.  
  
Return JSON:  
{  
problem,  
feature_area,  
sentiment,  
severity,  
user_intent  
}

Example output:

{  
 "problem": "data import confusing",  
 "feature_area": "onboarding",  
 "sentiment": "negative",  
 "severity": "medium"  
}

Now the system has **clean structured signals**.

Store in DB:

signals  
---------  
id  
project_id  
text  
problem  
sentiment  
feature_area  
embedding

---

# 4. Stage 2: Embedding Generation

We convert each signal into a vector.

Using embeddings from OpenAI.

Example:

"text": "Importing CSV is confusing"

Embedding:

[0.234, 0.552, 0.983, ...]

Store in:

- pgvector
    

This enables **semantic similarity search**.

---

# 5. Stage 3: Semantic Clustering

Now we group similar feedback.

Example signals:

CSV import confusing  
import failed  
can't upload data  
data upload unclear

Cluster:

Data Import Problems

Clustering algorithm options:

Option A (simple):

cosine similarity  
+ threshold clustering

Option B (better):

HDBSCAN clustering

Output:

cluster_id  
cluster_name  
signal_count

Example:

Cluster: Import Problems  
Signals: 42

---

# 6. Stage 4: Problem Detection

Clusters are **not yet product problems**.

Now AI reasons:

What underlying product issue causes these signals?

Example cluster:

Import failed  
CSV upload confusing  
Upload unclear

Claude reasoning:

Underlying problem:  
Users struggle with the data import process during onboarding.

Output:

Problem  
Evidence  
Severity  
Frequency

Example:

Problem:  
Data Import UX Confusing  
  
Evidence:  
42 user mentions  
  
Severity:  
High

---

# 7. Stage 5: Feature Reasoning

Now the system asks:

What feature would solve this problem?

Prompt:

Given the problem and evidence,  
suggest a product feature that solves it.

Example output:

Feature:  
Guided Import Wizard

Feature details:

Step-by-step CSV upload  
Data validation  
Error highlighting  
Sample templates

---

# 8. Stage 6: PRD Generation

Now generate:

Problem statement  
User story  
Feature description  
User flow  
Engineering tasks

Example:

User Story  
  
As a new user  
I want to easily import my data  
So that I can start using the product quickly

Engineering tasks:

Create CSV validation API  
Build import wizard UI  
Store import progress  
Track import analytics

---

# 9. Insight Engine Architecture

Full system:

Data Ingestion  
↓  
Signal Extraction Agent  
↓  
Embedding Generator  
↓  
Vector Store  
↓  
Clustering Engine  
↓  
Problem Detection Agent  
↓  
Feature Reasoning Agent  
↓  
PRD Generator

This is **perfect for LangGraph orchestration**.

Using:

LangGraph

---

# 10. LangGraph Flow

Graph structure:

start  
↓  
extract_signals  
↓  
generate_embeddings  
↓  
cluster_feedback  
↓  
detect_problems  
↓  
suggest_features  
↓  
generate_prd  
↓  
end

Each node is an **AI function**.

---

# 11. Database Model

Tables:

signals  
clusters  
problems  
features  
tasks

Relations:

signals → clusters  
clusters → problems  
problems → features  
features → tasks

This becomes a **Product Knowledge Graph**.

---

# 12. Why This Engine Is Powerful

Most tools today only do:

summarization

Your system does:

reasoning

It moves from:

feedback → decision

That is **much more valuable**.

---

# 13. MVP Version of Insight Engine

To ship fast, only implement:

signal extraction  
embeddings  
clustering  
problem detection  
feature suggestions

Skip complex analytics initially.

---

# 14. Example User Experience

User uploads:

200 support tickets

System processes.

Dashboard shows:

Top Product Problems  
  
1. Onboarding confusion (42 mentions)  
2. Import failures (19 mentions)  
3. Missing integrations (15 mentions)

Click problem:

Suggested Feature  
Guided Import Wizard

Click generate:

PRD created

---

# 15. The Hidden Moat

Your moat becomes the **Product Knowledge Graph**.

Over time the system learns:

signals  
problems  
features  
success metrics

This becomes extremely powerful.