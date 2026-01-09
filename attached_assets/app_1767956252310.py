# -----------------------------
# Import required libraries
# -----------------------------
import streamlit as st                 # Web app framework
import pdfplumber                      # Read PDF files
import pandas as pd                    # Handle CSV data
import numpy as np                     # Numerical operations

from sentence_transformers import SentenceTransformer   # Pretrained NLP model
from sklearn.metrics.pairwise import cosine_similarity # Similarity score
from sklearn.feature_extraction.text import TfidfVectorizer  # TF-IDF scoring

# -----------------------------
# Load pretrained NLP model
# -----------------------------
@st.cache_resource                     # Cache model (loads once)
def load_model():
    return SentenceTransformer("all-MiniLM-L6-v2")  # Lightweight BERT model

model = load_model()                   # Load model into memory

# -----------------------------
# Load job-skill dataset
# -----------------------------
@st.cache_data                         # Cache CSV for performance
def load_dataset():
    return pd.read_csv("jobs_skillset_with_tech_soft_skills_1500_rows.csv")

df = load_dataset()                    # Read dataset

df["job_title"] = df["job_title"].str.lower()  # Normalize job titles

# -----------------------------
# Extract text from resume PDF
# -----------------------------
def extract_text_from_pdf(uploaded_file):
    text = ""
    with pdfplumber.open(uploaded_file) as pdf:  # Open PDF
        for page in pdf.pages:                   # Loop pages
            page_text = page.extract_text()      # Extract text
            if page_text:
                text += page_text + " "
    return text.lower().strip()                  # Clean text

# -----------------------------
# Extract skills from text
# -----------------------------
def extract_skills_from_text(text, skill_list):
    found = []
    for skill in skill_list:                     # Loop skills
        if skill.lower() in text:                # Match skill
            found.append(skill)
    return sorted(set(found))                    # Remove duplicates

# -----------------------------
# Fetch job skills from dataset
# -----------------------------
def get_job_skills(job_role):
    job_role = job_role.lower()

    # Filter rows matching job role
    filtered = df[df["job_title"].str.contains(job_role)]

    if filtered.empty:
        return [], [], ""                        # No match case

    tech_skills = []
    soft_skills = []

    # Collect skills from all matching rows
    for _, row in filtered.iterrows():
        tech_skills.extend(str(row["technical_skills"]).split(","))
        soft_skills.extend(str(row["soft_skills"]).split(","))

    # Clean skill text
    tech_skills = sorted(set(s.strip().lower() for s in tech_skills))
    soft_skills = sorted(set(s.strip().lower() for s in soft_skills))

    # Create pseudo job description
    job_text = " ".join(tech_skills + soft_skills)

    return tech_skills, soft_skills, job_text

# -----------------------------
# Calculate similarity score
# -----------------------------
def calculate_similarity(resume_text, job_text):
    embeddings = model.encode([resume_text, job_text])  # Convert text → vectors
    score = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
    return round(score * 100, 2)                         # Convert to %

# -----------------------------
# Extract all skills from dataset
# -----------------------------
@st.cache_resource
def get_all_skills():
    """Extract all unique technical and soft skills from dataset"""
    tech_skills = set()
    soft_skills = set()
    
    for _, row in df.iterrows():
        tech_skills.update(s.strip().lower() for s in str(row["technical_skills"]).split(","))
        soft_skills.update(s.strip().lower() for s in str(row["soft_skills"]).split(","))
    
    # Remove empty strings
    tech_skills.discard("")
    soft_skills.discard("")
    
    return sorted(list(tech_skills)), sorted(list(soft_skills))

# -----------------------------
# Extract mandatory skills from job description using TF-IDF + Keyword Matching
# -----------------------------
def extract_mandatory_skills(job_description, similarity_threshold=0.4):
    """
    Extract and rank technical and soft skills from job description.
    Uses TF-IDF scoring + keyword frequency analysis for better prioritization.
    """
    if not job_description or len(job_description.strip()) < 10:
        return [], []
    
    # Get all skills from dataset
    all_tech_skills, all_soft_skills = get_all_skills()
    all_skills = all_tech_skills + all_soft_skills
    
    job_desc_lower = job_description.lower()
    
    # Calculate frequency-based scores for each skill
    skill_scores = {}
    
    for skill in all_skills:
        skill_lower = skill.lower()
        
        # Count exact mentions
        exact_count = job_desc_lower.count(skill_lower)
        
        # Count word-level matches (for multi-word skills)
        words = skill_lower.split()
        word_matches = sum(job_desc_lower.count(word) for word in words)
        
        # Combined score: prioritize exact matches
        if exact_count > 0:
            score = 0.7 + (exact_count * 0.1)  # Boost for exact matches
        else:
            score = word_matches * 0.05  # Lower score for partial matches
        
        # Normalize score to 0-1 range
        score = min(score, 1.0)
        
        skill_scores[skill] = score
    
    # Additional boost for commonly required keywords in job descriptions
    importance_keywords = {
        'required': 1.2,
        'must have': 1.3,
        'mandatory': 1.4,
        'essential': 1.2,
        'critical': 1.3,
        'preferred': 0.8,
        'nice to have': 0.6,
        'optional': 0.5
    }
    
    # Check context around skills
    for skill in all_skills:
        skill_lower = skill.lower()
        if skill_lower in job_desc_lower:
            # Find context around skill
            idx = job_desc_lower.find(skill_lower)
            context_start = max(0, idx - 50)
            context_end = min(len(job_desc_lower), idx + len(skill_lower) + 50)
            context = job_desc_lower[context_start:context_end]
            
            # Apply keyword boosts
            for keyword, boost in importance_keywords.items():
                if keyword in context:
                    skill_scores[skill] = min(skill_scores[skill] * boost, 1.0)
                    break
    
    # Filter and categorize skills
    found_tech = []
    found_soft = []
    
    for skill in all_skills:
        score = skill_scores[skill]
        
        # Only include skills with minimum relevance
        if score >= similarity_threshold * 0.5:  # More lenient threshold
            if skill in all_tech_skills:
                found_tech.append((skill, score))
            else:
                found_soft.append((skill, score))
    
    # Sort by score (descending)
    found_tech = sorted(found_tech, key=lambda x: x[1], reverse=True)
    found_soft = sorted(found_soft, key=lambda x: x[1], reverse=True)
    
    return found_tech, found_soft

# -----------------------------
# Streamlit UI
# -----------------------------
st.set_page_config(page_title="AI Resume Screener")

st.title("📄 AI Resume Screening System")
st.write("Pretrained NLP + Real Job Dataset")

# Create tabs for different functionalities
tab1, tab2 = st.tabs(["Resume Screening", "Job Description Analysis"])

with tab1:
    st.subheader("Resume vs Job Role Matching")
    
    uploaded_file = st.file_uploader("Upload Resume (PDF)", type=["pdf"])
    job_role = st.text_input("Enter Target Job Role")

    # -----------------------------
    # Main logic
    # -----------------------------
    if uploaded_file and job_role:

        with st.spinner("Analyzing resume..."):

            resume_text = extract_text_from_pdf(uploaded_file)

            tech_skills, soft_skills, job_text = get_job_skills(job_role)

            if not job_text:
                st.error("Job role not found in dataset.")
                st.stop()

            resume_tech = extract_skills_from_text(resume_text, tech_skills)
            resume_soft = extract_skills_from_text(resume_text, soft_skills)

            missing_tech = sorted(set(tech_skills) - set(resume_tech))
            missing_soft = sorted(set(soft_skills) - set(resume_soft))

            match_score = calculate_similarity(resume_text, job_text)

        # -----------------------------
        # Display results
        # -----------------------------
        st.success("Analysis Complete")

        st.subheader("📊 ATS Match Score")
        st.progress(match_score / 100)
        st.write(f"Match Percentage: {match_score}%")

        st.subheader("✅ Technical Skills Found")
        st.write(", ".join(resume_tech) if resume_tech else "None")

        st.subheader("✅ Soft Skills Found")
        st.write(", ".join(resume_soft) if resume_soft else "None")

        st.subheader("❌ Missing Technical Skills")
        st.write(", ".join(missing_tech) if missing_tech else "No gaps")

        st.subheader("❌ Missing Soft Skills")
        st.write(", ".join(missing_soft) if missing_soft else "No gaps")

        st.subheader("📌 Recommendation")
        if missing_tech or missing_soft:
            st.write("Upskill using Coursera, Udemy, or LinkedIn Learning.")
        else:
            st.write("Resume matches the role well.")

    else:
        st.info("Upload resume and enter job role to begin.")

with tab2:
    st.subheader("Extract Skills from Company Job Description")
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.write("**Option 1: Paste Job Description**")
        job_description_text = st.text_area("Paste the job description here:", height=250, key="job_desc_text")
    
    with col2:
        st.write("**Option 2: Upload Job Description (TXT)**")
        job_desc_file = st.file_uploader("Upload job description file", type=["txt"], key="job_desc_file")
    
    if job_desc_file:
        job_description_text = job_desc_file.read().decode("utf-8")
    
    # Add controls
    col1, col2, col3 = st.columns([2, 1, 1])
    
    with col1:
        st.write("**Adjust Skill Relevance Threshold:**")
        similarity_threshold = st.slider(
            "Higher values = only most relevant skills",
            min_value=0.0,
            max_value=1.0,
            value=0.4,
            step=0.05,
            key="threshold_slider",
            help="Lower threshold = more skills found\nHigher threshold = only most mandatory skills"
        )
    
    with col2:
        st.write("**Top N Skills:**")
        top_n = st.number_input("Show top", min_value=1, max_value=50, value=10, key="top_n_skills")
    
    with col3:
        st.write("**Importance Color:**")
        show_importance = st.checkbox("Show Importance Bar", value=True, key="importance_check")
    
    if job_description_text:
        with st.spinner("Extracting and ranking skills..."):
            
            # Extract mandatory skills with scores
            mandatory_tech_scored, mandatory_soft_scored = extract_mandatory_skills(job_description_text, similarity_threshold)
            
            # Limit to top N
            mandatory_tech_scored = mandatory_tech_scored[:top_n]
            mandatory_soft_scored = mandatory_soft_scored[:top_n]
            
            st.subheader("📋 Skills Ranked by Relevance (Priority Order)")
            st.write("*Skills are ordered from most to least mandatory*")
            
            col1, col2 = st.columns(2)
            
            # Technical Skills
            with col1:
                st.subheader("🔧 Technical Skills")
                if mandatory_tech_scored:
                    for idx, (skill, score) in enumerate(mandatory_tech_scored, 1):
                        importance_pct = int(score * 100)
                        
                        # Show importance bar
                        if show_importance:
                            col_rank, col_bar = st.columns([1, 5])
                            with col_rank:
                                st.write(f"**{idx}.**")
                            with col_bar:
                                st.progress(score, text=f"{skill} ({importance_pct}%)")
                        else:
                            st.write(f"**{idx}.** {skill} - {importance_pct}% relevance")
                else:
                    st.write("No technical skills found")
            
            # Soft Skills
            with col2:
                st.subheader("💼 Soft Skills")
                if mandatory_soft_scored:
                    for idx, (skill, score) in enumerate(mandatory_soft_scored, 1):
                        importance_pct = int(score * 100)
                        
                        # Show importance bar
                        if show_importance:
                            col_rank, col_bar = st.columns([1, 5])
                            with col_rank:
                                st.write(f"**{idx}.**")
                            with col_bar:
                                st.progress(score, text=f"{skill} ({importance_pct}%)")
                        else:
                            st.write(f"**{idx}.** {skill} - {importance_pct}% relevance")
                else:
                    st.write("No soft skills found")
            
            # Summary
            st.subheader("📊 Skill Summary")
            total_skills = len(mandatory_tech_scored) + len(mandatory_soft_scored)
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Total Skills Found", total_skills)
            with col2:
                st.metric("Technical Skills", len(mandatory_tech_scored))
            with col3:
                st.metric("Soft Skills", len(mandatory_soft_scored))
            
            # Show priority levels
            st.subheader("🎯 Skill Priority Breakdown")
            
            # Categorize by importance level
            must_have_tech = [s for s, score in mandatory_tech_scored if score >= 0.65]
            good_to_have_tech = [s for s, score in mandatory_tech_scored if 0.45 <= score < 0.65]
            nice_to_have_tech = [s for s, score in mandatory_tech_scored if score < 0.45]
            
            must_have_soft = [s for s, score in mandatory_soft_scored if score >= 0.65]
            good_to_have_soft = [s for s, score in mandatory_soft_scored if 0.45 <= score < 0.65]
            nice_to_have_soft = [s for s, score in mandatory_soft_scored if score < 0.45]
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.write("**🔴 MUST HAVE (≥65%)**")
                all_must_have = must_have_tech + must_have_soft
                if all_must_have:
                    for skill in all_must_have:
                        st.write(f"• {skill}")
                else:
                    st.write("None")
            
            with col2:
                st.write("**🟡 GOOD TO HAVE (45-65%)**")
                all_good = good_to_have_tech + good_to_have_soft
                if all_good:
                    for skill in all_good:
                        st.write(f"• {skill}")
                else:
                    st.write("None")
            
            with col3:
                st.write("**🟢 NICE TO HAVE (<45%)**")
                all_nice = nice_to_have_tech + nice_to_have_soft
                if all_nice:
                    for skill in all_nice:
                        st.write(f"• {skill}")
                else:
                    st.write("None")
            
            # Export option
            st.subheader("📥 Export Skills")
            if st.button("Export as CSV"):
                export_data = []
                for skill, score in mandatory_tech_scored:
                    importance = "MUST HAVE" if score >= 0.65 else ("GOOD TO HAVE" if score >= 0.45 else "NICE TO HAVE")
                    export_data.append({"Skill": skill, "Type": "Technical", "Relevance Score": round(score, 3), "Priority": importance})
                for skill, score in mandatory_soft_scored:
                    importance = "MUST HAVE" if score >= 0.65 else ("GOOD TO HAVE" if score >= 0.45 else "NICE TO HAVE")
                    export_data.append({"Skill": skill, "Type": "Soft", "Relevance Score": round(score, 3), "Priority": importance})
                
                export_df = pd.DataFrame(export_data)
                csv = export_df.to_csv(index=False)
                st.download_button(
                    label="Download Skills with Priority CSV",
                    data=csv,
                    file_name="mandatory_skills_prioritized.csv",
                    mime="text/csv"
                )
    
    else:
        st.info("Paste or upload a job description to extract and rank mandatory skills.")
