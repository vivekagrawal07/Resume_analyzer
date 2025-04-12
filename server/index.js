import express from 'express';
import cors from 'cors';
import multer from 'multer';
import mammoth from 'mammoth';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const upload = multer();

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:5173', // Vite's default port
  credentials: true
}));
app.use(express.json());

async function extractTextFromFile(file) {
  try {
    if (file.mimetype === 'application/pdf') {
      return "PDF content detected. Please paste the text content manually or use a DOCX file for automatic text extraction.";
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const buffer = Buffer.from(file.buffer);
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    return null;
  } catch (error) {
    console.error('Error extracting text from file:', error);
    return null;
  }
}

function analyzeResume(resumeText, jobDescription) {
  const resumeLower = resumeText.toLowerCase();
  const jobLower = jobDescription.toLowerCase();

  // Comprehensive skill categories
  const skillCategories = {
    programming: ['javascript', 'python', 'java', 'c++', 'ruby', 'php', 'swift', 'kotlin', 'go'],
    webTech: ['html', 'css', 'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask'],
    database: ['sql', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch'],
    cloud: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform'],
    tools: ['git', 'jenkins', 'jira', 'confluence', 'bitbucket', 'gitlab'],
    testing: ['jest', 'mocha', 'selenium', 'cypress', 'junit', 'pytest'],
    concepts: ['agile', 'scrum', 'ci/cd', 'tdd', 'rest api', 'microservices', 'design patterns']
  };

  const softSkills = {
    leadership: ['leadership', 'managed', 'led', 'supervised', 'mentored', 'coordinated'],
    communication: ['communication', 'presented', 'wrote', 'documented', 'collaborated'],
    problemSolving: ['solved', 'improved', 'optimized', 'debugged', 'troubleshot'],
    teamwork: ['team', 'collaborated', 'partnered', 'cross-functional', 'cooperation'],
    projectManagement: ['delivered', 'planned', 'organized', 'scheduled', 'budgeted']
  };

  // Analyze required skills by category
  const skillAnalysis = {};
  let totalJobSkills = 0;
  let matchedSkills = 0;

  for (const [category, skills] of Object.entries(skillCategories)) {
    const requiredSkills = skills.filter(skill => jobLower.includes(skill));
    const matchedSkillsInCategory = requiredSkills.filter(skill => resumeLower.includes(skill));
    
    if (requiredSkills.length > 0) {
      skillAnalysis[category] = {
        required: requiredSkills,
        matched: matchedSkillsInCategory,
        percentage: Math.round((matchedSkillsInCategory.length / requiredSkills.length) * 100)
      };
      totalJobSkills += requiredSkills.length;
      matchedSkills += matchedSkillsInCategory.length;
    }
  }

  // Analyze soft skills
  const softSkillAnalysis = {};
  let totalSoftSkills = 0;
  let matchedSoftSkills = 0;

  for (const [category, keywords] of Object.entries(softSkills)) {
    const hasSkill = keywords.some(skill => resumeLower.includes(skill));
    const requiredSkill = keywords.some(skill => jobLower.includes(skill));
    
    if (requiredSkill) {
      softSkillAnalysis[category] = {
        required: true,
        present: hasSkill
      };
      totalSoftSkills++;
      if (hasSkill) matchedSoftSkills++;
    }
  }

  // Resume structure analysis
  const sections = {
    contact: ['email', 'phone', 'linkedin', 'location'],
    summary: ['summary', 'objective', 'profile', 'about'],
    experience: ['experience', 'work history', 'employment'],
    education: ['education', 'degree', 'university', 'certification'],
    skills: ['skills', 'technologies', 'competencies'],
    projects: ['projects', 'portfolio', 'works']
  };

  const sectionAnalysis = {};
  const missingSections = [];

  for (const [section, keywords] of Object.entries(sections)) {
    const hasSection = keywords.some(keyword => resumeLower.includes(keyword));
    sectionAnalysis[section] = hasSection;
    if (!hasSection) missingSections.push(section);
  }

  // Content quality analysis
  const contentAnalysis = {
    hasQuantifiableResults: /\d+%|\$\d+|\d+ years|\d+\+?/.test(resumeText),
    hasActionVerbs: /\b(led|developed|created|implemented|managed|designed|improved)\b/i.test(resumeText),
    hasURLs: /https?:\/\/[^\s]+/.test(resumeText),
    hasBulletPoints: (resumeText.match(/[•·-]\s/g) || []).length >= 5,
    hasProperLength: resumeText.length >= 300 && resumeText.length <= 2000
  };

  // Calculate overall score
  let score = 100;
  
  // Technical skills weight (40%)
  const skillScore = totalJobSkills > 0 ? (matchedSkills / totalJobSkills) * 40 : 40;
  score += skillScore;

  // Soft skills weight (20%)
  const softSkillScore = totalSoftSkills > 0 ? (matchedSoftSkills / totalSoftSkills) * 20 : 20;
  score += softSkillScore;

  // Resume structure weight (20%)
  score -= (missingSections.length * 3);

  // Content quality weight (20%)
  Object.values(contentAnalysis).forEach(value => {
    if (!value) score -= 4;
  });

  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Generate insights and recommendations
  const strengths = [];
  const suggestions = [];
  const formatIssues = [];

  // Add insights based on analysis
  if (matchedSkills / totalJobSkills > 0.7) {
    strengths.push("Strong technical skill match with job requirements");
  }
  if (matchedSoftSkills / totalSoftSkills > 0.7) {
    strengths.push("Excellent soft skills alignment");
  }
  if (contentAnalysis.hasQuantifiableResults) {
    strengths.push("Good use of quantifiable achievements");
  }

  // Add targeted suggestions
  Object.entries(skillAnalysis).forEach(([category, analysis]) => {
    if (analysis.percentage < 70) {
      suggestions.push(`Strengthen ${category} skills: ${analysis.required.filter(skill => 
        !analysis.matched.includes(skill)).join(', ')}`);
    }
  });

  // Add format issues
  if (!contentAnalysis.hasProperLength) {
    formatIssues.push(resumeText.length < 300 ? 
      "Resume is too brief - add more detailed experience" : 
      "Resume is too long - aim for 1-2 pages");
  }
  if (!contentAnalysis.hasBulletPoints) {
    formatIssues.push("Use bullet points to better structure your experience");
  }
  if (missingSections.length > 0) {
    formatIssues.push(`Add missing sections: ${missingSections.join(', ')}`);
  }

  return {
    score,
    analysis: {
      sections: Object.entries(sectionAnalysis).map(([name, present]) => ({
        name,
        present
      })),
      jobMatch: {
        percentage: Math.round((matchedSkills / totalJobSkills) * 100) || 0,
        matchedSkills,
        totalSkills: totalJobSkills
      },
      skillBreakdown: Object.entries(skillAnalysis).map(([category, data]) => ({
        category,
        match: data.percentage,
        missing: data.required.filter(skill => !data.matched.includes(skill))
      }))
    },
    missingSkills: Object.entries(skillAnalysis)
      .filter(([_, data]) => data.required.length > data.matched.length)
      .map(([category, data]) => 
        `${category}: ${data.required.filter(skill => !data.matched.includes(skill)).join(', ')}`
      ),
    strengths: strengths.length > 0 ? strengths : ["Good overall presentation"],
    suggestions: suggestions.length > 0 ? suggestions : ["Your resume is well-aligned with the job requirements"],
    formatIssues: formatIssues.length > 0 ? formatIssues : ["No major format issues found"]
  };
}

app.post('/api/analyze', upload.single('file'), async (req, res) => {
  try {
    console.log('Received request with body:', req.body);
    console.log('Received file:', req.file);

    const { resumeText, jobDescription } = req.body;
    const file = req.file;

    if (!resumeText && !file) {
      return res.status(400).json({ 
        error: "Please provide either resume text or upload a file.",
        details: "No resume content provided"
      });
    }

    let finalResumeText = resumeText || '';
    if (file) {
      console.log('Processing file with mimetype:', file.mimetype);
      const extractedText = await extractTextFromFile(file);
      if (extractedText) {
        finalResumeText = extractedText;
      }
    }

    if (!finalResumeText.trim()) {
      return res.status(400).json({ 
        error: "No valid resume content found.",
        details: "Could not extract text from file or empty resume text"
      });
    }

    if (!jobDescription) {
      return res.status(400).json({ 
        error: "Job description is required.",
        details: "No job description provided"
      });
    }

    // Perform local analysis
    const analysis = analyzeResume(finalResumeText, jobDescription);
    return res.status(200).json({ result: analysis });
  } catch (error) {
    console.error("Analysis error:", error);
    return res.status(500).json({ 
      error: "Failed to analyze resume.",
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 