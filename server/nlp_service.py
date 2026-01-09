import { Flask, request, jsonify }
from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
import pdfplumber
import os
import logging
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Global variables
model = None
df = None
use_bert = False

# Load Dataset
logger.info("Loading dataset...")
try:
    df = pd.read_csv("server/data/jobs.csv")
    df["job_title"] = df["job_title"].str.lower()
    logger.info("Dataset loaded successfully.")
except Exception as e:
    logger.error(f"Failed to load dataset: {e}")
    df = pd.DataFrame(columns=["job_title", "technical_skills", "soft_skills"])

# Load Model (Try BERT, fallback to TF-IDF)
logger.info("Loading NLP model...")
try:
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("all-MiniLM-L6-v2")
    use_bert = True
    logger.info("BERT model loaded successfully.")
except ImportError:
    logger.warning("sentence-transformers not found. Falling back to TF-IDF.")
    use_bert = False
except Exception as e:
    logger.error(f"Failed to load BERT model: {e}. Falling back to TF-IDF.")
    use_bert = False

def get_embeddings(texts):
    if use_bert and model:
        return model.encode(texts)
    else:
        # Fallback: TF-IDF
        vectorizer = TfidfVectorizer(stop_words='english')
        return vectorizer.fit_transform(texts).toarray()

def extract_text_from_pdf(pdf_path):
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + " "
    except Exception as e:
        logger.error(f"Error reading PDF: {e}")
    return text.lower().strip()

def get_job_skills(job_role):
    job_role = job_role.lower()
    filtered = df[df["job_title"].str.contains(job_role, na=False)]
    
    if filtered.empty:
        return [], [], ""

    tech_skills = []
    soft_skills = []

    for _, row in filtered.iterrows():
        tech_skills.extend(str(row["technical_skills"]).split(","))
        soft_skills.extend(str(row["soft_skills"]).split(","))

    tech_skills = sorted(set(s.strip().lower() for s in tech_skills if s.strip()))
    soft_skills = sorted(set(s.strip().lower() for s in soft_skills if s.strip()))

    job_text = " ".join(tech_skills + soft_skills)
    return tech_skills, soft_skills, job_text

def extract_skills_from_text(text, skill_list):
    found = []
    for skill in skill_list:
        if skill.lower() in text:
            found.append(skill)
    return sorted(set(found))

def get_all_skills():
    tech_skills = set()
    soft_skills = set()
    for _, row in df.iterrows():
        tech_skills.update(s.strip().lower() for s in str(row["technical_skills"]).split(","))
        soft_skills.update(s.strip().lower() for s in str(row["soft_skills"]).split(","))
    tech_skills.discard("")
    soft_skills.discard("")
    return sorted(list(tech_skills)), sorted(list(soft_skills))

@app.route('/analyze/resume', methods=['POST'])
def analyze_resume():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        job_role = request.form.get('job_role')
        
        if not job_role:
            return jsonify({"error": "No job role provided"}), 400

        # Save temporarily
        temp_path = f"/tmp/{file.filename}"
        file.save(temp_path)
        
        try:
            resume_text = extract_text_from_pdf(temp_path)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

        tech_skills, soft_skills, job_text = get_job_skills(job_role)
        
        if not job_text:
            return jsonify({"error": "Job role not found in dataset"}), 404

        resume_tech = extract_skills_from_text(resume_text, tech_skills)
        resume_soft = extract_skills_from_text(resume_text, soft_skills)
        
        missing_tech = sorted(list(set(tech_skills) - set(resume_tech)))
        missing_soft = sorted(list(set(soft_skills) - set(resume_soft)))
        
        # Calculate similarity
        if use_bert:
            embeddings = model.encode([resume_text, job_text])
            score = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
        else:
            # Simple TF-IDF similarity for fallback
            vectorizer = TfidfVectorizer(stop_words='english')
            tfidf_matrix = vectorizer.fit_transform([resume_text, job_text])
            score = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            
        match_score = round(score * 100, 2)
        
        recommendation = "Resume matches the role well."
        if missing_tech or missing_soft:
            recommendation = "Upskill using Coursera, Udemy, or LinkedIn Learning."

        return jsonify({
            "matchScore": match_score,
            "techSkillsFound": resume_tech,
            "softSkillsFound": resume_soft,
            "missingTechSkills": missing_tech,
            "missingSoftSkills": missing_soft,
            "recommendation": recommendation
        })

    except Exception as e:
        logger.error(f"Error in analyze_resume: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/analyze/jd', methods=['POST'])
def analyze_jd():
    try:
        data = request.json
        job_description = data.get('description', '')
        threshold = float(data.get('threshold', 0.4))
        
        if not job_description:
            return jsonify({"error": "No description provided"}), 400

        all_tech, all_soft = get_all_skills()
        all_skills = all_tech + all_soft
        job_desc_lower = job_description.lower()
        
        skill_scores = {}
        for skill in all_skills:
            skill_lower = skill.lower()
            exact_count = job_desc_lower.count(skill_lower)
            words = skill_lower.split()
            word_matches = sum(job_desc_lower.count(word) for word in words)
            
            if exact_count > 0:
                score = 0.7 + (exact_count * 0.1)
            else:
                score = word_matches * 0.05
            
            skill_scores[skill] = min(score, 1.0)
            
        # Boost keywords
        keywords = {'required': 1.2, 'must have': 1.3, 'mandatory': 1.4}
        for skill in all_skills:
            if skill.lower() in job_desc_lower:
                idx = job_desc_lower.find(skill.lower())
                context = job_desc_lower[max(0, idx-50):min(len(job_desc_lower), idx+len(skill)+50)]
                for k, v in keywords.items():
                    if k in context:
                        skill_scores[skill] = min(skill_scores[skill] * v, 1.0)
                        break
        
        found_tech = []
        found_soft = []
        
        for skill in all_skills:
            score = skill_scores[skill]
            if score >= threshold * 0.5:
                item = {"skill": skill, "score": score}
                if skill in all_tech:
                    found_tech.append(item)
                else:
                    found_soft.append(item)
                    
        found_tech.sort(key=lambda x: x['score'], reverse=True)
        found_soft.sort(key=lambda x: x['score'], reverse=True)
        
        return jsonify({
            "techSkills": found_tech,
            "softSkills": found_soft
        })

    except Exception as e:
        logger.error(f"Error in analyze_jd: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001)
